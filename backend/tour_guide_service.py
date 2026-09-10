"""
VoyageAI — AI Tour Guide Service
Provides:
  1. Nearby POI discovery via Overpass API (OpenStreetMap)
  2. Place ranking by distance, importance, category
  3. Gemini-powered conversational tour guide AI
  4. In-memory session management with conversation history
"""

import math
import json
import time
import hashlib
import urllib.request
import urllib.parse
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone


# ── Haversine Distance (meters) ──

def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Overpass API Nearby POI Search ──

# Category weights for ranking (higher = more important for tour guide)
CATEGORY_WEIGHTS = {
    "historic": 10,
    "monument": 9,
    "fort": 9,
    "palace": 9,
    "museum": 8,
    "religious": 7,
    "temple": 7,
    "mosque": 7,
    "church": 7,
    "cultural": 6,
    "viewpoint": 6,
    "park": 5,
    "market": 5,
    "architecture": 6,
    "memorial": 7,
    "ruins": 8,
    "archaeological": 9,
    "tourism": 5,
    "food_landmark": 4,
}

# Overpass query for interesting POIs (optimized query with 5s timeout)
OVERPASS_QUERY_TEMPLATE = """
[out:json][timeout:5];
(
  node["historic"](around:{radius},{lat},{lng});
  way["historic"](around:{radius},{lat},{lng});
  node["tourism"](around:{radius},{lat},{lng});
  way["tourism"](around:{radius},{lat},{lng});
  node["amenity"="place_of_worship"](around:{radius},{lat},{lng});
  way["amenity"="place_of_worship"](around:{radius},{lat},{lng});
  node["leisure"~"park|garden"](around:{radius},{lat},{lng});
  way["leisure"~"park|garden"](around:{radius},{lat},{lng});
  node["man_made"~"tower|monument|memorial"](around:{radius},{lat},{lng});
  way["man_made"~"tower|monument|memorial"](around:{radius},{lat},{lng});
  node["shop"="marketplace"](around:{radius},{lat},{lng});
);
out center 40;
"""

# Overpass response cache: key → (timestamp, results)
_overpass_cache: Dict[str, tuple] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes


def _cache_key(lat: float, lng: float, radius: int) -> str:
    """Grid-based cache key (~100m cells)."""
    return f"{round(lat, 3)}_{round(lng, 3)}_{radius}"


def _classify_category(tags: Dict[str, str]) -> str:
    """Classify OSM tags into a tour guide category."""
    historic = tags.get("historic", "")
    tourism = tags.get("tourism", "")
    amenity = tags.get("amenity", "")
    building = tags.get("building", "")
    leisure = tags.get("leisure", "")
    man_made = tags.get("man_made", "")
    religion = tags.get("religion", "")

    if historic in ("castle", "fort", "citadel"):
        return "fort"
    if historic in ("palace",):
        return "palace"
    if historic in ("ruins", "archaeological_site"):
        return "ruins"
    if historic in ("monument", "memorial", "battlefield"):
        return "monument"
    if historic:
        return "historic"

    if tourism == "museum":
        return "museum"
    if tourism == "viewpoint":
        return "viewpoint"
    if tourism in ("attraction", "artwork", "gallery"):
        return "cultural"

    if amenity == "place_of_worship":
        if religion == "hindu":
            return "temple"
        if religion == "muslim" or religion == "islam":
            return "mosque"
        if religion == "christian":
            return "church"
        return "religious"

    if building in ("temple", "church", "mosque", "cathedral"):
        return "religious"
    if building in ("palace", "fort"):
        return "fort"

    if man_made in ("tower", "monument", "memorial"):
        return "monument"

    if leisure in ("park", "garden"):
        return "park"

    return "tourism"


def _extract_name(tags: Dict[str, str]) -> Optional[str]:
    """Extract best available name from OSM tags."""
    return (
        tags.get("name:en") or
        tags.get("name") or
        tags.get("alt_name") or
        tags.get("official_name") or
        None
    )


def _fetch_nominatim_location(lat: float, lng: float) -> List[Dict[str, Any]]:
    """Fast Nominatim reverse-geocoding fallback if Overpass times out."""
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json&zoom=16"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "VoyageAI-TourGuide/1.0 (contact@voyageai.local)"}
        )
        with urllib.request.urlopen(req, timeout=4) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                addr = data.get("address", {})
                place_name = (
                    data.get("name") or
                    addr.get("amenity") or
                    addr.get("historic") or
                    addr.get("village") or
                    addr.get("town") or
                    addr.get("suburb") or
                    addr.get("county") or
                    "Local Area"
                )
                display_name = data.get("display_name", place_name)
                return [{
                    "id": f"tg_nom_{hashlib.md5(display_name.encode()).hexdigest()[:8]}",
                    "name": place_name,
                    "category": "tourism",
                    "latitude": lat,
                    "longitude": lng,
                    "distanceMeters": 0,
                    "address": display_name,
                    "source": "nominatim_fallback",
                    "dataReliability": "VERIFIED"
                }]
    except Exception as e:
        print(f"[TOUR GUIDE WARN] Nominatim fallback failed: {e}", flush=True)
    return []


def search_nearby_pois(lat: float, lng: float, radius_m: int = 5000) -> List[Dict[str, Any]]:
    """
    Search for real nearby POIs using the Overpass API (OpenStreetMap).
    Returns places within the specified radius, each with Haversine distance.
    Maximum radius: 5000m.
    """
    radius_m = min(radius_m, 5000)

    # Check cache
    ck = _cache_key(lat, lng, radius_m)
    if ck in _overpass_cache:
        cached_time, cached_results = _overpass_cache[ck]
        if time.time() - cached_time < CACHE_TTL_SECONDS:
            # Recalculate distances from exact current position
            for p in cached_results:
                p["distanceMeters"] = round(haversine_meters(lat, lng, p["latitude"], p["longitude"]))
            return cached_results

    query = OVERPASS_QUERY_TEMPLATE.format(lat=lat, lng=lng, radius=radius_m)
    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.private.coffee/api/interpreter",
        "https://overpass.nchc.org.tw/api/interpreter"
    ]

    raw = None
    for url in endpoints:
        try:
            data = urllib.parse.urlencode({"data": query}).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data,
                headers={"User-Agent": "VoyageAI-TourGuide/1.0 (contact@voyageai.local)"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=4) as response:
                if response.status == 200:
                    raw = json.loads(response.read().decode("utf-8"))
                    break
        except Exception as e:
            print(f"[TOUR GUIDE WARN] Overpass endpoint {url} failed: {e}. Trying fallback...", flush=True)

    if not raw:
        print("[TOUR GUIDE WARN] All Overpass API endpoints timed out. Using Nominatim reverse geocode fallback.", flush=True)
        fallback_places = _fetch_nominatim_location(lat, lng)
        if fallback_places:
            _overpass_cache[ck] = (time.time(), fallback_places)
        return fallback_places

    elements = raw.get("elements", [])
    places = []
    seen_names = set()

    for el in elements:
        tags = el.get("tags") or {}
        name = _extract_name(tags)
        if not name or len(name.strip()) < 3:
            continue

        # Deduplicate by name
        name_key = name.strip().lower()
        if name_key in seen_names:
            continue
        seen_names.add(name_key)

        # Get coordinates (nodes have lat/lon directly, ways have center)
        el_lat = el.get("lat") or ((el.get("center") or {}).get("lat"))
        el_lng = el.get("lon") or ((el.get("center") or {}).get("lon"))
        if el_lat is None or el_lng is None:
            continue

        el_lat = float(el_lat)
        el_lng = float(el_lng)

        # Strict radius filter (Haversine)
        dist = haversine_meters(lat, lng, el_lat, el_lng)
        if dist > radius_m:
            continue

        category = _classify_category(tags)
        place_id = f"tg_{el.get('id', 0)}_{el.get('type', 'node')}"

        place = {
            "id": place_id,
            "name": name.strip(),
            "category": category,
            "latitude": el_lat,
            "longitude": el_lng,
            "distanceMeters": round(dist),
            "address": tags.get("addr:full") or tags.get("addr:street") or tags.get("addr:city") or None,
            "openingHours": tags.get("opening_hours") or None,
            "description": tags.get("description") or tags.get("description:en") or None,
            "wikipedia": tags.get("wikipedia") or tags.get("wikidata") or None,
            "source": "osm",
            "dataReliability": "VERIFIED"
        }
        places.append(place)

    # Cache results
    _overpass_cache[ck] = (time.time(), places)

    return places


# ── Place Ranking ──

def rank_places(
    places: List[Dict[str, Any]],
    user_prefs: Optional[Dict[str, Any]] = None,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Rank nearby places by importance × inverse distance.
    Returns top N places.
    """
    if not places:
        return []

    max_dist = max(p["distanceMeters"] for p in places) or 1

    def score(place: Dict[str, Any]) -> float:
        cat_weight = CATEGORY_WEIGHTS.get(place["category"], 3)
        # Inverse distance score (closer = higher)
        dist_score = 1.0 - (place["distanceMeters"] / (max_dist + 1))
        # Bonus for having Wikipedia/description (likely more notable)
        notable_bonus = 1.5 if place.get("wikipedia") else 1.0
        desc_bonus = 1.2 if place.get("description") else 1.0
        # User preference bonus
        pref_bonus = 1.0
        if user_prefs:
            interests = [i.lower() for i in user_prefs.get("activityInterests", [])]
            cat_lower = place["category"].lower()
            if any(cat_lower in i or i in cat_lower for i in interests):
                pref_bonus = 1.3

        return cat_weight * dist_score * notable_bonus * desc_bonus * pref_bonus

    scored = sorted(places, key=lambda p: score(p), reverse=True)
    return scored[:limit]


# ── Active Place Context Resolver ──

def resolve_active_place(
    req_place_id: Optional[str],
    message_text: str,
    session: Dict[str, Any],
    nearby_places: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """
    Resolves active place context accurately based on request place_id,
    explicit place name mentions in user message text, or existing session context.
    """
    msg_lower = (message_text or "").strip().lower()

    IGNORE_TERMS = {
        "history", "famous", "worth", "visit", "visiting", "nearby", "around",
        "story", "facts", "far", "distance", "where", "open", "hours", "price",
        "cost", "built", "who", "why", "when", "how", "what", "tell", "show",
        "more", "it", "this", "place", "here", "there", "anything", "else", "food", "ride", "expense"
    }

    # 1. Direct match in nearby_places by place_id if provided
    if req_place_id:
        for p in nearby_places:
            if p.get("id") == req_place_id:
                session["current_place_id"] = req_place_id
                session["current_place"] = p
                return p

    # 2. Check if user message explicitly names a place from nearby_places
    if nearby_places:
        for p in nearby_places:
            p_name = p.get("name", "").lower()
            if len(p_name) >= 3 and (p_name in msg_lower or f"about {p_name}" in msg_lower):
                session["current_place_id"] = p["id"]
                session["current_place"] = p
                return p

    # 3. Check regex pattern for "tell me about <Name>" or "what about <Name>"
    import re
    match = (
        re.search(r"(?:tell me about|what about|tell about|info on|where is|details of)\s+(.+)", msg_lower) or
        re.search(r"^about\s+(.+)", msg_lower)
    )
    if match:
        extracted = match.group(1).strip().strip("?.!\"'")
        words = [w for w in extracted.split() if w not in IGNORE_TERMS]
        if words and len(" ".join(words)) >= 3:
            clean_name = " ".join(words).title()
            curr_p = session.get("current_place")
            if curr_p and curr_p.get("name", "").lower() == clean_name.lower():
                return curr_p

            custom_id = f"tg_custom_{hashlib.md5(clean_name.encode()).hexdigest()[:8]}"
            custom_place = {
                "id": custom_id,
                "name": clean_name,
                "category": "attraction",
                "latitude": session.get("last_nearby_lat") or 0.0,
                "longitude": session.get("last_nearby_lng") or 0.0,
                "distanceMeters": 0,
                "source": "user_mention",
                "dataReliability": "ESTIMATED"
            }
            session["current_place_id"] = custom_id
            session["current_place"] = custom_place
            return custom_place

    # 4. Retain existing session active place if user is asking a follow-up question
    curr_id = session.get("current_place_id")
    if curr_id:
        for p in nearby_places:
            if p.get("id") == curr_id:
                return p
        if session.get("current_place"):
            return session["current_place"]

    return None


# ── Tour Guide AI (Gemini) ──

TOUR_GUIDE_SYSTEM_PROMPT = """You are a knowledgeable, friendly local tour guide for VoyageAI — a travel companion app.

PERSONALITY:
- Curious, concise, conversational, locally aware, warm, helpful.
- You sound like a real, experienced human guide walking alongside the traveler.
- You are NOT a Wikipedia dumping tool, a corporate chatbot, or a repetitive assistant.

OPERATING MODES:
1. LOCAL MODE (Current Physical Location Context):
   - Answer based primarily on the user's current physical location and local surroundings.
   - When asked about "famous food", "what to eat here", "nearby places", or "culture", answer using the local region/city context where the user physically is right now.
   - Do NOT mention or inject the user's upcoming trip unless the user explicitly asks about their trip or mentions the trip destination by name.

2. TRIP MODE (Selected Planned Journey Context):
   - Answer based primarily on the selected trip destination, itinerary, booked stays, and trip plans.
   - Focus on itinerary activities, trip dining, trip attractions, and travel tips for that trip destination.
   - Do NOT claim the user is physically near their trip destination unless GPS coordinates confirm it.

CRITICAL ISOLATION RULE:
Never mix up the user's physical current location with their upcoming trip destination. If the user is physically in Bihar and has an upcoming trip to Goa:
- "What's famous near me?" -> Answer about Bihar.
- "What food is famous here?" -> Answer about Bihar cuisine.
- "What should I see in Goa?" -> Answer about Goa attractions.
- "What food should I try on my Goa trip?" -> Answer about Goa cuisine.

STRICT CONVERSATIONAL & CONTEXT RULES:
1. ACTIVE PLACE FOCUS & FOLLOW-UPS:
   - When a CURRENTLY SELECTED PLACE is provided in the context, all follow-up questions ("tell me the history", "why is it famous?", "is it worth visiting?", "how old is it?", "who built it?") refer to THIS active place.
   - Answer the user's EXACT question about the active place directly.
   - NEVER repeat the initial greeting, distance introduction, or category overview when answering a follow-up question unless specifically asked ("where is it?" or "how far is it?").
   - If the user asks about a NEW place by name, switch your focus immediately to that new place.

2. FACTUAL GROUNDING & HALLUCINATION PREVENTION:
   - Use the verified OpenStreetMap data and verified location details provided in the context.
   - If the user asks for historical origins, dates, or builders, and the exact fact is NOT in the provided metadata or established verified history, answer clearly and naturally without inventing facts:
     "I can confirm it's an important landmark in this area, but I don't have a verified historical record for its exact founding date or builder."
   - NEVER invent historical dates, kings, religious myths, or prices.

3. SUGGESTED ACTIONS:
   - Return 2-3 logical follow-up action chips that continue the conversation in the current mode.
"""


def _clean_reply_text(raw_text: Any) -> str:
    """Extract clean conversational reply string from raw text, dict, or stringified JSON."""
    if not raw_text:
        return "I'm here to help you explore!"
    
    if isinstance(raw_text, dict):
        val = raw_text.get("reply") or raw_text.get("text") or raw_text.get("message")
        return str(val) if val else str(raw_text)
    
    text = str(raw_text).strip()
    
    import re
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text).strip()
        
    if text.startswith("{") and text.endswith("}"):
        try:
            data = json.loads(text)
            if isinstance(data, dict):
                val = data.get("reply") or data.get("text") or data.get("message")
                if val:
                    return str(val).strip()
        except Exception:
            pass
            
    return text


def generate_tour_guide_response(
    messages: List[Dict[str, str]],
    place_context: Optional[Dict[str, Any]],
    nearby_places: List[Dict[str, Any]],
    user_location: Optional[Dict[str, float]],
    trip_context: Optional[Dict[str, Any]] = None,
    user_prefs: Optional[Dict[str, Any]] = None,
    mode: str = "local"
) -> Dict[str, Any]:
    """
    Generate a conversational tour guide AI response using Gemini.
    Falls back to MockAIProvider if Gemini is unavailable.
    """
    import os
    from dotenv import load_dotenv
    load_dotenv(override=True)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not api_key.strip():
        return _mock_tour_guide_response(messages, place_context, nearby_places, user_location, trip_context=trip_context, mode=mode)

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    # Build context prompt
    context_parts = []
    context_parts.append(f"CURRENT GUIDE MODE: {mode.upper()} MODE")

    if mode == "local":
        if user_location:
            context_parts.append(
                f"USER'S CURRENT PHYSICAL LOCATION: Latitude {user_location.get('latitude', 0):.5f}, "
                f"Longitude {user_location.get('longitude', 0):.5f}"
            )
        if nearby_places:
            nearby_summary = "\n".join([
                f"  - {p['name']} ({p['category']}, {p['distanceMeters']}m away)"
                for p in nearby_places[:8]
            ])
            context_parts.append(f"LOCAL NEARBY PLACES (within 5km of user's physical location):\n{nearby_summary}")
        if trip_context:
            dest_name = (trip_context.get("destination") or {}).get("name", "")
            if dest_name:
                context_parts.append(f"UPCOMING TRIP (Background info only — DO NOT use for local queries unless user explicitly asks about it): Traveling to {dest_name}")
    else:  # mode == "trip"
        if trip_context:
            dest = trip_context.get("destination") or {}
            dest_name = dest.get("name", "Trip Destination")
            title = trip_context.get("title", dest_name)
            context_parts.append(f"SELECTED TRIP CONTEXT:\n- Trip Title: {title}\n- Destination: {dest_name}")
            days = trip_context.get("days") or []
            if days:
                activities_summary = []
                for day in days[:3]:
                    acts = [a.get("title", "") for a in day.get("activities", [])[:3]]
                    if acts:
                        activities_summary.append(f"  Day {day.get('dayNumber', 1)}: {', '.join(acts)}")
                if activities_summary:
                    context_parts.append("TRIP ITINERARY HIGHLIGHTS:\n" + "\n".join(activities_summary))
        if nearby_places:
            nearby_summary = "\n".join([
                f"  - {p['name']} ({p['category']})"
                for p in nearby_places[:8]
            ])
            context_parts.append(f"DESTINATION PLACES:\n{nearby_summary}")

    if user_prefs:
        interests = user_prefs.get("activityInterests", [])
        if interests:
            context_parts.append(f"USER INTERESTS: {', '.join(interests)}")

    context_block = "\n\n".join(context_parts)

    # Format conversation history (last 8 messages)
    formatted_msgs = "\n".join([
        f"{'USER' if m.get('role') == 'user' else 'GUIDE'}: {m.get('text', '')}"
        for m in messages[-8:]
    ])

    full_prompt = f"""{TOUR_GUIDE_SYSTEM_PROMPT}

{context_block}

CONVERSATION HISTORY:
{formatted_msgs}

Respond as the tour guide. Return ONLY valid JSON:
{{
  "reply": "Your conversational response directly answering the last user message",
  "suggestedActions": ["Tell me the history", "Why is it famous?", "What else is nearby?"],
  "mentionedPlaceId": null
}}
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.4,
            "maxOutputTokens": 1024
        }
    }

    try:
        import requests
        res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=15)
        if res.status_code == 200:
            res_json = res.json()
            candidates = res_json.get("candidates") or []
            if candidates:
                first_cand = candidates[0]
                content = first_cand.get("content") or {}
                parts = content.get("parts") or []
                if parts and isinstance(parts[0], dict) and "text" in parts[0]:
                    text = parts[0]["text"].strip()
                    import re
                    if text.startswith("```"):
                        text = re.sub(r"^```(?:json)?\n?", "", text, flags=re.IGNORECASE)
                        text = re.sub(r"\n?```$", "", text)
                    try:
                        data = json.loads(text)
                        if isinstance(data, dict):
                            raw_rep = data.get("reply") or "I'm here to help you explore!"
                            cleaned = _clean_reply_text(raw_rep)
                            return {
                                "reply": cleaned,
                                "suggestedActions": data.get("suggestedActions", []),
                                "mentionedPlaceId": data.get("mentionedPlaceId"),
                                "source": "gemini"
                            }
                    except Exception:
                        pass
                    
                    return {
                        "reply": _clean_reply_text(text),
                        "suggestedActions": ["Tell me more", "What's nearby?"],
                        "mentionedPlaceId": None,
                        "source": "gemini"
                    }
    except Exception as err:
        print(f"[TOUR GUIDE WARN] Gemini tour guide error: {err}. Using fallback.", flush=True)

    return _mock_tour_guide_response(messages, place_context, nearby_places, user_location)


def _mock_tour_guide_response(
    messages: List[Dict[str, str]],
    place_context: Optional[Dict[str, Any]],
    nearby_places: List[Dict[str, Any]],
    user_location: Optional[Dict[str, float]],
    trip_context: Optional[Dict[str, Any]] = None,
    mode: str = "local"
) -> Dict[str, Any]:
    """Fallback mock response when Gemini is unavailable."""
    last_user_msg = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            last_user_msg = m.get("text", "").lower()
            break

    dest_name = (trip_context.get("destination") or {}).get("name", "your destination") if trip_context else "your destination"

    # Food & Cuisine handling
    if any(k in last_user_msg for k in ["food", "cuisine", "eat", "dishes", "dish", "specialty", "specialties", "taste"]):
        if mode == "trip" or "trip" in last_user_msg or (dest_name.lower() in last_user_msg and dest_name.lower() != "your destination"):
            if "goa" in dest_name.lower() or "goa" in last_user_msg:
                return {
                    "reply": f"On your trip to Goa, key local food specialties to try include Goan Fish Curry with rice, Pork/Chicken Vindaloo, Chicken Xacuti, Bebinca dessert, and fresh seafood at beach shacks!",
                    "suggestedActions": ["Recommend beach shacks", "What else is on my itinerary?", "Local drinks in Goa"],
                    "source": "mock"
                }
            return {
                "reply": f"On your trip to {dest_name}, recommended local culinary experiences include authentic regional specialties, popular dining spots, and local street delicacies.",
                "suggestedActions": [f"Popular restaurants in {dest_name}", "Trip itinerary food spots", "Local dishes to try"],
                "source": "mock"
            }
        else:  # Local Mode food
            lat = user_location.get("latitude", 0) if user_location else 0
            lng = user_location.get("longitude", 0) if user_location else 0
            # Check Bihar / Patna region coordinates (~24.5-27.5, 83.5-88.0)
            if (24.0 <= lat <= 27.5 and 83.5 <= lng <= 88.0) or "bihar" in last_user_msg or "patna" in last_user_msg:
                return {
                    "reply": "In this local area (Bihar region), famous authentic dishes include Litti Chokha served with melted ghee, Sattu Paratha, Tilkut, Khaja sweet, and Malpua. Local street markets and traditional eateries offer these freshly made delicacies!",
                    "suggestedActions": ["Where to get authentic Litti Chokha?", "Local sweet specialties", "Nearby food spots"],
                    "source": "mock"
                }
            return {
                "reply": "Around your current local area, authentic culinary options include regional thali meals, famous street snacks, and popular local eateries.",
                "suggestedActions": ["Find nearby food spots", "Popular local dishes", "Tell me what's nearby"],
                "source": "mock"
            }

    # Explicit destination query handling (e.g. "What should I see in Goa?")
    if "goa" in last_user_msg and not place_context:
        return {
            "reply": "For your trip to Goa, top recommended highlights include Baga & Anjuna beaches, Fort Aguada, Basilica of Bom Jesus, Dudhsagar Falls, and vibrant local night markets!",
            "suggestedActions": ["Goa beaches", "Historic churches in Goa", "Best food on Goa trip"],
            "source": "mock"
        }

    # Trip Mode queries without specific place
    if mode == "trip" and not place_context:
        if any(k in last_user_msg for k in ["see", "do", "attraction", "visit", "goa", "itinerary", "places"]):
            return {
                "reply": f"For your trip to {dest_name}, great highlights include historic landmarks, scenic viewpoints, local markets, and popular beaches/attractions. Would you like day-by-day itinerary suggestions?",
                "suggestedActions": [f"Top spots in {dest_name}", "Trip itinerary check", "Best food on trip"],
                "source": "mock"
            }

    if place_context:
        name = place_context.get("name", "this place")
        dist = place_context.get("distanceMeters", "?")
        cat = place_context.get("category", "attraction")

        # History question
        if any(k in last_user_msg for k in ["history", "built", "past", "origin", "old", "who"]):
            desc = place_context.get("description")
            wiki = place_context.get("wikipedia")
            if desc:
                reply_text = f"Here is what is known about {name}: {desc}. From OpenStreetMap records, it is an established {cat} in this area."
            elif wiki:
                reply_text = f"{name} has a recorded reference on Wikipedia ({wiki}). It is recognized as a notable {cat} landmark."
            else:
                reply_text = f"{name} is an established {cat} in this area, located about {dist} meters from you. I can confirm its location and category, but I don't have a verified historical founding record for its exact origin date."
            return {
                "reply": reply_text,
                "suggestedActions": ["Why is it famous?", "Is it worth visiting?", "What else is nearby?"],
                "source": "mock"
            }

        # Famous / significance question
        if any(k in last_user_msg for k in ["famous", "special", "why", "significance"]):
            return {
                "reply": f"{name} is widely visited as a key {cat} landmark in the area. Travelers and locals visit to experience its cultural presence and surroundings.",
                "suggestedActions": ["Tell me the history", "Is it worth visiting?", "What else is nearby?"],
                "source": "mock"
            }

        # Worth visiting question
        if any(k in last_user_msg for k in ["worth", "visit", "should i", "good"]):
            return {
                "reply": f"Yes, {name} is worth visiting if you are exploring nearby! Since it's only {dist} meters away from your location, it's a convenient and rewarding stop.",
                "suggestedActions": ["Tell me the history", "Why is it famous?", "What else is nearby?"],
                "source": "mock"
            }

        # Distance / location question
        if any(k in last_user_msg for k in ["far", "distance", "where", "how to get"]):
            return {
                "reply": f"{name} is located approximately {dist} meters from your current position.",
                "suggestedActions": ["Tell me the history", "Is it worth visiting?", "What else is nearby?"],
                "source": "mock"
            }

        # Nearby question
        if any(k in last_user_msg for k in ["nearby", "what else", "around"]):
            if nearby_places:
                other_spots = [p for p in nearby_places if p.get("name") != name]
                suggestions = ", ".join([f"{p['name']} ({p['distanceMeters']}m)" for p in other_spots[:3]])
                return {
                    "reply": f"Besides {name}, here are other spots nearby: {suggestions}. Would you like details on any of these?",
                    "suggestedActions": [f"Tell me about {other_spots[0]['name']}" if other_spots else "What's around?"],
                    "source": "mock"
                }

        # Default intro for initial inquiry about place
        return {
            "reply": f"You're about {dist} meters from {name}, a prominent {cat} landmark in this area. Would you like to know its history, why it's famous, or whether it's worth visiting?",
            "suggestedActions": ["Tell me the history", "Why is it famous?", "Is it worth visiting?"],
            "source": "mock"
        }

    # No place_context selected
    if nearby_places:
        top = nearby_places[0]
        return {
            "reply": f"Looking at what's around you — the nearest interesting spot is {top['name']}, about {top['distanceMeters']} meters away. It's a {top['category']} site. Want me to tell you about it?",
            "suggestedActions": [f"Tell me about {top['name']}", "Show me more places", "What's the most historic site?"],
            "source": "mock"
        }

    return {
        "reply": f"I'm your VoyageAI tour guide! Operating in {mode.upper()} mode. Ask me about nearby landmarks, local cuisine, culture, or your trip plans!",
        "suggestedActions": ["What's nearby?", "What food is famous here?", "Recommend something interesting"],
        "source": "mock"
    }


# ── Session Management ──

_tour_guide_sessions: Dict[str, Dict[str, Any]] = {}
SESSION_EXPIRY_SECONDS = 7200  # 2 hours


def get_or_create_session(user_id: str) -> Dict[str, Any]:
    """Get or create a tour guide session for the given user."""
    now = time.time()

    if user_id in _tour_guide_sessions:
        session = _tour_guide_sessions[user_id]
        if now - session.get("created_at", 0) < SESSION_EXPIRY_SECONDS:
            session["last_active"] = now
            return session
        # Expired — create new
        del _tour_guide_sessions[user_id]

    session = {
        "user_id": user_id,
        "current_place_id": None,
        "messages": [],
        "nearby_places": [],
        "last_nearby_lat": None,
        "last_nearby_lng": None,
        "last_nearby_refresh": 0,
        "auto_guide_enabled": False,
        "notified_place_ids": {},  # place_id -> timestamp (cooldown tracking)
        "created_at": now,
        "last_active": now
    }
    _tour_guide_sessions[user_id] = session
    return session


def add_message_to_session(session: Dict[str, Any], role: str, text: str, place_id: str = None):
    """Add a message to the session conversation history. Keep last 20."""
    session["messages"].append({
        "role": role,
        "text": text,
        "timestamp": time.time(),
        "placeId": place_id
    })
    if len(session["messages"]) > 20:
        session["messages"] = session["messages"][-20:]
    session["last_active"] = time.time()


def should_refresh_nearby(session: Dict[str, Any], lat: float, lng: float) -> bool:
    """Check if nearby places should be refreshed (moved >200m or 3 min elapsed)."""
    last_lat = session.get("last_nearby_lat")
    last_lng = session.get("last_nearby_lng")
    last_time = session.get("last_nearby_refresh", 0)

    if last_lat is None or last_lng is None:
        return True

    dist = haversine_meters(last_lat, last_lng, lat, lng)
    elapsed = time.time() - last_time

    return dist > 200 or elapsed > 180


def check_proactive_alert(session: Dict[str, Any], lat: float, lng: float, places: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Check if user has entered the 500m radius of an interesting place
    that hasn't been notified recently (30 min cooldown).
    Returns the place to alert about, or None.
    """
    if not session.get("auto_guide_enabled", False):
        return None

    now = time.time()
    cooldown = 1800  # 30 minutes

    for place in places:
        if place["distanceMeters"] <= 500:
            pid = place["id"]
            last_notified = session.get("notified_place_ids", {}).get(pid, 0)
            if now - last_notified > cooldown:
                # Mark as notified
                session.setdefault("notified_place_ids", {})[pid] = now
                return place

    return None
