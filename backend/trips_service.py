import os
import json
import requests
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from redis_client import redis_conn

SPOTLIGHT_CACHE_TTL = 172800  # 2 days (172,800 seconds)

def generate_destination_spotlight_llm(dest_name: str) -> Dict[str, Any]:
    """
    Generates authentic, punchy activities and live events via Gemini LLM in strict JSON format.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    clean_dest = dest_name.strip().title() if dest_name else "Goa"

    if api_key and api_key.strip():
        prompt = f"""You are an expert local tour guide. Provide a curated spotlight for travelers visiting {clean_dest}, India.
Return a valid JSON object matching this schema:
{{
  "destination": "{clean_dest}",
  "famous_activities": [
    {{
      "id": "act_1",
      "title": "Activity name",
      "location": "Exact area or landmark in {clean_dest}",
      "tag": "Adventure / Heritage / Culinary / Nature / Water Sports",
      "price": "Price in INR, e.g. ₹500 or Free",
      "duration": "e.g. 2 hours"
    }}
  ],
  "upcoming_events": [
    {{
      "id": "evt_1",
      "title": "Local event or happening",
      "date": "When it takes place, e.g. Daily Sunset / Weekend Nights",
      "venue": "Venue name in {clean_dest}",
      "type": "Music / Nightlife / Culture"
    }}
  ]
}}
Provide 4 diverse activities and 2 realistic events/happenings. Keep names and locations authentic to {clean_dest}."""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.4,
                "maxOutputTokens": 1024
            }
        }
        try:
            res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=8.0)
            if res.status_code == 200:
                res_data = res.json()
                text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                parsed = json.loads(text)
                if isinstance(parsed, dict) and "famous_activities" in parsed:
                    print(f">>> [LLM SPOTLIGHT GENERATED] Destination: {clean_dest}", flush=True)
                    return parsed
        except Exception as e:
            print(f"[LLM GENERATION ERROR]: {e}", flush=True)

    # Fallback if API offline or quota exhausted
    from places import get_destination_highlights
    return get_destination_highlights(clean_dest)

def get_destination_spotlight(dest_name: str, redis_client=None) -> Dict[str, Any]:
    r_conn = redis_client or redis_conn
    key_name = (dest_name or "Goa").strip().lower()
    cache_key = f"cache:spotlight:{key_name}"

    # 1. Check Redis Cache
    if r_conn:
        try:
            cached = r_conn.get(cache_key)
            if cached:
                if isinstance(cached, bytes):
                    cached = cached.decode("utf-8")
                print(f">>> [REDIS SPOTLIGHT HIT] Key: {cache_key} (2-day TTL cache)", flush=True)
                return json.loads(cached)
        except Exception as ce:
            print(f"[REDIS SPOTLIGHT WARN] Cache read error: {ce}", flush=True)

    # 2. Dynamic generation via LLM
    try:
        data = generate_destination_spotlight_llm(dest_name)
    except Exception as err:
        print(f"[SPOTLIGHT EXCEPTION] {err}", flush=True)
        from places import get_destination_highlights
        data = get_destination_highlights(dest_name)

    # 3. Cache in Redis for exactly 2 days (172800 seconds)
    if r_conn:
        try:
            r_conn.setex(cache_key, SPOTLIGHT_CACHE_TTL, json.dumps(data))
            print(f">>> [REDIS SPOTLIGHT CACHED] Saved key: {cache_key} (172,800s TTL)", flush=True)
        except Exception as ce:
            print(f"[REDIS SPOTLIGHT WARN] Cache write error: {ce}", flush=True)

    return data
