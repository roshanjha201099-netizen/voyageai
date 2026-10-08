import os
import json
import re
import uuid
import random
import requests
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from dotenv import load_dotenv

# Load .env explicitly so API keys and DB credentials resolve
load_dotenv()

try:
    import google.generativeai as genai
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
except ImportError:
    genai = None

from sqlalchemy import text
from cost_guard import evaluate_cost_guards
from database import engine

JARVIS_SYSTEM_PROMPT = """
You are VoyageAI's Jarvis-grade Travel Concierge.
You provide verified, real-time insider guidance and proactive assistance.

RULES:
1. Speak concisely (2 to 4 crisp sentences). Natural Hinglish or English based on user query language.
2. If recommending an activity or sight, explain the ground reality: best timing or any heads-up (closures, peak queues, ticket hacks).
3. If recommending a concrete spot to add in Trip Mode, append a structured card at the very end:
<<<CARD:{"id": "rec_id_1", "title": "Place Name", "category": "Food/Sight/Stay", "location": "Area", "duration": "1.5h", "cost": 300, "heads_up": "Live warning or None"}>>>
4. Always provide 2-3 short contextual follow-up chips at the end:
<<<CHIPS:["Check timings", "Alternative spot", "Show on Map"]>>>
5. Under NO circumstances output markdown code blocks (```). You are strictly a travel companion.
"""

EMERGENCY_SYSTEM_PROMPT = """
You are VoyageAI's Emergency & Essentials Travel Assistant.
The traveler has an urgent, hygiene, or medical requirement (e.g. sanitary pads, medicine, doctor, clinic, fever, period cramps, police, lost items).

RULES:
1. Be immediate, empathetic, calm, and 100% practical. No travel fluff or poetic descriptions.
2. Directly advise nearest action: mention 24x7 pharmacies, Apollo/MedPlus/local chemist availability, quick delivery apps (Blinkit, Zepto, Swiggy Instamart) if applicable, or local hospital emergency desk.
3. If nearby emergency places data is provided in context, use those exact names and areas.
4. Keep the response crisp (2-3 sentences).
5. Output relevant emergency follow-up chips at the end:
<<<CHIPS:["Locate "Emergency "Quick Delivery", Helpline"] Map", on>>>
6. Do NOT output markdown code blocks (```).
"""

def parse_blocks(raw_text: str):
    chips = []
    card = None
    chips_match = re.search(r'<<<CHIPS:(.*?)>>>', raw_text, re.DOTALL)
    if chips_match:
        try:
            chips = json.loads(chips_match.group(1))
        except Exception:
            chips = []

    card_match = re.search(r'<<<CARD:(.*?)>>>', raw_text, re.DOTALL)
    if card_match:
        try:
            card = json.loads(card_match.group(1))
        except Exception:
            card = None

    clean_text = re.sub(r'<<<.*?>>>', '', raw_text, flags=re.DOTALL).strip()
    return clean_text, chips, card
def persist_message(user_id: str, role: str, content: str, mode: str, trip_id: Optional[str] = None, metadata: dict = None):
    try:
        msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        meta_json_str = json.dumps(metadata or {})
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO chat_messages (id, user_id, trip_id, role, content, mode, metadata)
                    VALUES (:id, :user_id, :trip_id, :role, :content, :mode, CAST(:meta AS JSONB))
                """),
                {
                    "id": msg_id,
                    "user_id": user_id or "guest_user",
                    "trip_id": trip_id,
                    "role": role,
                    "content": content,
                    "mode": mode or "local",
                    "meta": meta_json_str
                }
            )
    except Exception as e:
        print(f"[DB LOG ERROR] {e}", flush=True)
# Alias for backward compatibility
save_chat_message = persist_message

def fetch_chat_history(user_id: str = "guest_user", limit: int = 50, db = None) -> List[Dict[str, Any]]:
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("""
                    SELECT id, role, content, mode, trip_id, metadata, created_at
                    FROM chat_messages
                    WHERE user_id = :user_id
                    ORDER BY created_at ASC
                    LIMIT :limit
                """),
                {"user_id": user_id or "guest_user", "limit": limit}
            )
            records = result.mappings().all()
            history = []
            for r in records:
                m_data = r.get("metadata") or {}
                if isinstance(m_data, str):
                    try:
                        m_data = json.loads(m_data)
                    except Exception:
                        m_data = {}
                created_val = r.get("created_at")
                history.append({
                    "id": str(r.get("id")),
                    "role": r.get("role"),
                    "content": r.get("content"),
                    "mode": r.get("mode"),
                    "trip_id": r.get("trip_id"),
                    "metadata": m_data,
                    "created_at": created_val.isoformat() if hasattr(created_val, "isoformat") else str(created_val)
                })
            return history
    except Exception as err:
        print(f"[CHAT HISTORY WARN] History fetch failed: {err}", flush=True)
        return []

def get_grounded_model(m_name: str, system_prompt: str = JARVIS_SYSTEM_PROMPT):
    if genai and hasattr(genai, "GenerativeModel"):
        try:
            return genai.GenerativeModel(
                model_name=m_name,
                tools=[{"google_search": {}}],
                system_instruction=system_prompt
            )
        except Exception:
            pass
    return None

def get_plain_model(m_name: str, system_prompt: str = JARVIS_SYSTEM_PROMPT):
    if genai and hasattr(genai, "GenerativeModel"):
        try:
            return genai.GenerativeModel(
                model_name=m_name,
                system_instruction=system_prompt
            )
        except Exception:
            pass
    return None

def process_concierge_message(
    user_id: str,
    message: str,
    mode: str = "local",
    trip_id: Optional[str] = None,
    destination_name: Optional[str] = None,
    trip_destination: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    recent_history: Optional[List[Dict[str, str]]] = None,
    db = None
) -> Dict[str, Any]:
    dest = destination_name or trip_destination
    eff_lat = lat if lat is not None else user_lat
    eff_lng = lng if lng is not None else user_lng

    # 1. Zero-Cost Shield Evaluation (Gate 0, Gate 1, Gate 1.5, Gate 2)
    should_call_llm, gate_reason, deflection_reply = evaluate_cost_guards(message)

    if not should_call_llm:
        response_payload = {
            "reply": deflection_reply,
            "chips": ["Must-try street food", "Top sights today", "Hidden gems"],
            "card": None,
            "mode": mode,
            "gate": gate_reason
        }
        persist_message(user_id, "user", message, mode, trip_id)
        persist_message(user_id, "assistant", deflection_reply, mode, trip_id, response_payload)
        return response_payload

    # 2. Urgent / Essential Need Handling
    is_essential = (gate_reason == "PASSED_ESSENTIAL_NEED")
    active_system_prompt = EMERGENCY_SYSTEM_PROMPT if is_essential else JARVIS_SYSTEM_PROMPT

    # 3. Context Anchor & Location Isolation
    context_anchor = ""
    if is_essential:
        emergency_places_info = ""
        if eff_lat is not None and eff_lng is not None:
            try:
                from places import get_progressive_nearby_places
                nearby_pharmacies = get_progressive_nearby_places(eff_lat, eff_lng, "pharmacy")[:3]
                if nearby_pharmacies:
                    names = [p.get("name", "Local Chemist") for p in nearby_pharmacies]
                    emergency_places_info = f" | Nearby verified stores: {', '.join(names)}"
            except Exception:
                pass
        context_anchor = f"[URGENT MEDICAL/ESSENTIAL MODE | User Location: lat={eff_lat}, lng={eff_lng}{emergency_places_info}]"
    elif mode == "trip":
        context_anchor = f"[Active Trip Mode | Destination: {dest or 'Planned Trip'} | STRICT: DO NOT consider current user GPS coordinates]"
    else:
        if eff_lat is not None and eff_lng is not None:
            context_anchor = f"[Local Mode | User Coordinates: lat={eff_lat:.5f}, lng={eff_lng:.5f}]"
        else:
            context_anchor = "[Local Mode | Current location unknown, suggest asking destination if broad]"

    # 4. Context Memory Window (Use passed history or fallback to DB)
    if recent_history is None:
        db_records = fetch_chat_history(user_id, limit=6)
        history_items = [{"role": r["role"], "content": r["content"]} for r in db_records]
    else:
        history_items = recent_history

    history_lines = []
    for item in history_items[-5:]:  # Sliding window: last 5 messages
        role_tag = "Traveler" if item.get("role") == "user" else "Assistant"
        content_snippet = str(item.get("content", ""))[:250]
        history_lines.append(f"{role_tag}: {content_snippet}")

    history_block = ""
    if history_lines:
        history_block = "Recent Conversation Snippet:\n" + "\n".join(history_lines) + "\n\n"

    augmented_prompt = (
        f"{context_anchor}\n\n"
        f"{history_block}"
        f"Traveler current query: {message}"
    )

    # 5. Three-Tier Resilient LLM Invocation
    raw_text = None
    model_candidates = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-1.5-flash"]

    # Tier A: Real-time grounded search first
    for m_name in model_candidates:
        g_model = get_grounded_model(m_name, system_prompt=active_system_prompt)
        if g_model:
            try:
                resp = g_model.generate_content(augmented_prompt)
                if resp and resp.text:
                    raw_text = resp.text.strip()
                    break
            except Exception as search_err:
                print(f"[SEARCH TOOL GLITCH] Model {m_name}: {search_err}", flush=True)

    # Tier B: Plain model fallback
    if not raw_text:
        for m_name in model_candidates:
            p_model = get_plain_model(m_name, system_prompt=active_system_prompt)
            if p_model:
                try:
                    resp = p_model.generate_content(augmented_prompt)
                    if resp and resp.text:
                        raw_text = resp.text.strip()
                        break
                except Exception as plain_err:
                    print(f"[PLAIN MODEL GLITCH] Model {m_name}: {plain_err}", flush=True)

    # Tier C: Direct REST fallback
    if not raw_text:
        api_key_env = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if api_key_env and api_key_env.strip():
            full_prompt = f"{active_system_prompt}\n\n{augmented_prompt}"
            for m_name in model_candidates:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m_name}:generateContent?key={api_key_env}"
                    payload = {
                        "contents": [{"parts": [{"text": full_prompt}]}],
                        "generationConfig": {"temperature": 0.2 if is_essential else 0.4, "maxOutputTokens": 1024}
                    }
                    res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=12.0)
                    if res.status_code == 200:
                        res_json = res.json()
                        candidates = res_json.get("candidates") or []
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts") or []
                            if parts and "text" in parts[0]:
                                raw_text = parts[0]["text"].strip()
                                break
                except Exception as r_err:
                    print(f"[REST LLM WARN] {m_name}: {r_err}", flush=True)

    # Fatal Safeguard
    if not raw_text:
        print("[FATAL LLM FAILURE] All LLM tiers failed", flush=True)
        fallback_msg = (
            "Aapke paas ke medical store ya 24x7 pharmacy ke liye Google Maps check karein ya Blinkit/Instamart se order karein."
            if is_essential else
            "Connection thoda slow chal raha hai dost. Ek baar query dobara bhej kar dekho!"
        )
        return {
            "reply": fallback_msg,
            "chips": ["Locate nearby pharmacy", "Nearest hospital", "Retry"] if is_essential else ["Retry now", "Nearby food", "Top sights"],
            "card": None,
            "mode": mode,
            "gate": gate_reason,
            "error": "LLM_TOTAL_FAILURE"
        }

    # 6. Parse and Clean Response
    clean_text, chips, card = parse_blocks(raw_text)

    if "```" in clean_text:
        clean_text = "Safar mein coding chhoriye dost! Main sirf travel, sightseeing aur local experiences mein madad karta hoon. Kahan chalna hai bataiye?"

    result_payload = {
        "reply": clean_text,
        "chips": chips or (["Locate on Map", "Quick Delivery"] if is_essential else ["Show map", "Nearby food", "Timing tips"]),
        "card": card,
        "mode": mode,
        "gate": gate_reason,
        "error": None
    }

    # 7. Persist to PostgreSQL
    persist_message(user_id, "user", message, mode, trip_id)
    persist_message(user_id, "assistant", clean_text, mode, trip_id, result_payload)

    return result_payload

# Alias function handle_tour_guide_chat
async def handle_tour_guide_chat(
    user_id: str,
    message: str,
    mode: str,
    trip_id: Optional[str] = None,
    trip_destination: Optional[str] = None,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None
) -> Dict[str, Any]:
    return process_concierge_message(
        user_id=user_id,
        message=message,
        mode=mode,
        trip_id=trip_id,
        destination_name=trip_destination,
        trip_destination=trip_destination,
        user_lat=user_lat,
        user_lng=user_lng
    )

# Legacy helper compatibility functions
def search_nearby_pois(lat: float, lng: float, radius_m: int = 5000, category: str = "all") -> List[Dict[str, Any]]:
    try:
        from places import get_progressive_nearby_places
        return get_progressive_nearby_places(lat, lng, category)
    except Exception as e:
        print(f"[NEARBY POIS ERR] {e}", flush=True)
        return []

def rank_places(places: List[Dict[str, Any]], user_prefs: Optional[Dict[str, Any]] = None, limit: int = 10) -> List[Dict[str, Any]]:
    return places

def get_or_create_session(user_id: str) -> Dict[str, Any]:
    return {"user_id": user_id, "messages": []}

def should_refresh_nearby(session: Dict[str, Any], lat: float, lng: float) -> bool:
    return False

def resolve_active_place(req_place_id: Optional[str], message_text: str, session: Dict[str, Any], nearby_places: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    return None

def add_message_to_session(session: Dict[str, Any], role: str, text: str, place_id: Optional[str] = None):
    pass

def generate_tour_guide_response(messages: List[Dict[str, str]], place_context: Optional[Dict[str, Any]], nearby_places: List[Dict[str, Any]], user_location: Optional[Dict[str, float]], trip_context: Optional[Dict[str, Any]] = None, user_prefs: Optional[Dict[str, Any]] = None, mode: str = "local") -> Dict[str, Any]:
    last_msg = messages[-1].get("text", "") if messages else ""
    user_id = "guest_user"
    dest_name = (trip_context.get("destination") or {}).get("name") if trip_context else None
    lat = user_location.get("latitude") if user_location else None
    lng = user_location.get("longitude") if user_location else None
    return process_concierge_message(user_id, last_msg, mode, trip_context.get("id") if trip_context else None, dest_name, lat=lat, lng=lng)

def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    return 0.0

def fetch_nearby_places(lat: float, lng: float, radius: int = 5000) -> List[Dict[str, Any]]:
    return []

def check_proactive_alert(session: Dict[str, Any], lat: float, lng: float, places: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    return None