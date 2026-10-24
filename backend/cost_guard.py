"""
Cost guard: decides whether a message deserves a (paid) LLM call or an API action.

Pipeline order:
    Gate 0    Exact canned matches ("hi", "thanks", etc.)        -> 0ms, free canned reply
    Gate 1    Adult / explicit filter via fast regex             -> 0ms, free deflect
    Gate 2    In-process Semantic Router (FastEmbed CPU vectors) -> ~5ms
              - "emergency"          -> Handled as emergency mode
              - "places_and_transit" -> Dispatched to Google Maps / Places API
              - "travel_itinerary"   -> Handled via main LLM prompt
              - "deflect"            -> Deflected with cheeky canned response
    Fallback  Ambiguous / Low Confidence                         -> Fail OPEN to LLM
"""

import os
import random
import re
from typing import Optional, Tuple
from semantic_router import Route
from semantic_router.encoders import FastEmbedEncoder
from semantic_router.routers import IndexedRouter

# ----------------------------------------------------------------------
# Environment & Debug Configuration
# ----------------------------------------------------------------------
DEBUG = os.getenv("COST_GUARD_DEBUG") == "1"


def _dbg(*args):
    if DEBUG:
        print("[COST GUARD DEBUG]", *args, flush=True)


def _normalize(s: str) -> str:
    """Lowercase, remove punctuation, and strip whitespace for clean dictionary matching."""
    return re.sub(r"[^\w\s]", "", s.strip().lower()).strip()


def _pick(pool: list) -> str:
    return random.choice(pool)


# ----------------------------------------------------------------------
# Gate 0: Exact Canned Replies (0ms, 0 Tokens)
# ----------------------------------------------------------------------
_RAW_EXACT_REPLIES = {
    "hi": "Hey! VoyageAI concierge here. Where are we heading today?",
    "hello": "Hello! Looking for places to eat, sights, or trip planning?",
    "hey": "Hey! Need food spots, navigation, or local guides?",
    "help": "Tell me your destination or ask for food, spots, and local hacks around you.",
    "kaha jau": "Apna current location ya planned city batao, best spots batata hoon.",
    "kahan ghoome": "Sheher ka naam batao ya GPS share karo, mast jagah nikalta hoon!",
    "thanks": "Anytime! Have a great journey. Kuch aur chahiye toh batana!",
    "thank you": "Happy to help! Let me know if you need anything else on the road.",
    "aaj mood kharab hai gaana sunao": "Arre! Mood theek ho jayega. Pehle batao, kahan ghoomne chal rahe ho?",
    "baarish mein bache kahan masti karein?": "Rainy day fun! Indoor games, cafes, museums... batao kaun si city hai?",
    "cricket score kya chal raha hai?": "Bhai, cricket ka update baad mein, pehle plan batao - kahan jaana hai?",
}
EXACT_REPLIES = {_normalize(k): v for k, v in _RAW_EXACT_REPLIES.items()}


# ----------------------------------------------------------------------
# Deflection Response Pools
# ----------------------------------------------------------------------
CHEEKY_ADULT = [
    "Bhai, ye wala rasta mere map pe hi nahi hai 🙅 Khana, sights, stay — kuch aur puchho!",
    "Main sirf ghoomne wali baatein karta hoon. Chai, fort, sunset — kuch bhi puchho, ye nahi 😌",
    "Wrong turn le liya dost 🚧 U-turn maaro aur batao kahan ghoomna hai!",
]

CHEEKY_GENERAL = [
    "Ye sawal meri zone se bahar hai dost 😅 Main sirf khana, ghoomna aur raste janta hoon.",
    "Iska jawab Google dega, par best chai kahan milegi wo sirf mere paas hai ☕",
    "Homework ke liye teacher hain, chill ke liye main hoon 😎 Kahan ghoomne chalein?",
    "Mera GPS sirf travel wale raste jaanta hai 🧭 Destination batao, baaki main sambhal lunga!",
]


# ----------------------------------------------------------------------
# Gate 1: Adult / Explicit Filter Regex
# ----------------------------------------------------------------------
ADULT_REGEX = re.compile(
    r"\b("
    r"brothel|prostitut\w*|escorts?|call\s*girls?|red\s*light\s*area|"
    r"r[a|aa]+nd[i|a|e]?(\s*khana|\s*ghar)?|chhamiya|slut\w*|sex\s*workers?|"
    r"chud\w*|chod\w*|behen\s*chod\w*|madar\s*chod\w*|maa\s*ki|"
    r"chut|choot|gand|gaand|gandu|lauda|loda|lund|bhosad\w*|mutth|sexy?|nudes?|porn\w*|xxx|"
    r"sambhog\w*|sanbhog\w*|jism\s*farosh\w*|gigolos?|hook\s*ups?|happy\s*ending|one\s*night\s*stand|"
    r"ladki\s*(chahiye|patana|set|dila)|room\s*me\s*ladki"
    r")\b",
    re.IGNORECASE,
)


# ----------------------------------------------------------------------
# Gate 2: Semantic Router Singleton (Loaded in RAM)
# ----------------------------------------------------------------------
_router_instance: Optional[IndexedRouter] = None


def get_semantic_router() -> Optional[IndexedRouter]:
    global _router_instance
    if _router_instance is None:
        try:
            encoder = FastEmbedEncoder(name="BAAI/bge-small-en-v1.5")

            # Route 1: Medical, Safety & Hygiene Essentials
            emergency_route = Route(
                name="emergency",
                utterances=[
                    "need sanitary pads urgently",
                    "tampon or napkin nearby",
                    "hospital emergency room or clinic",
                    "24 hour pharmacy chemist dawa",
                    "vomiting fever motion sickness doctor",
                    "lost my wallet passport luggage",
                    "police station help ambulance",
                    "kho gaya mera bag",
                    "accident ho gaya help chahiye",
                    "first aid kit or bandaid",
                ],
                score_threshold=0.72,
            )

            # Route 2: Location, Navigation & Food (Maps / Places API Candidates)
            places_route = Route(
                name="places_and_transit",
                utterances=[
                    "where is the nearest cafe or restaurant",
                    "directions to maurya lok",
                    "top food nearby",
                    "how to reach railway station from hotel",
                    "auto cab fare kitna lagega",
                    "famous sights and places to visit around me",
                    "dhaba thali tea breakfast nearby",
                    "baguati se newtown jana hai best option kya hai",
                    "nearest petrol pump or atm",
                    "metro station route and timings",
                ],
                score_threshold=0.68,
            )

            # Route 3: Travel Concierge & Itinerary
            travel_route = Route(
                name="travel_itinerary",
                utterances=[
                    "plan a 3 day itinerary for jaipur",
                    "what is the best season to explore goa",
                    "packing tips and dress code for temples",
                    "tell me the history of amer fort",
                    "is it safe to travel at night here",
                    "budget friendly backpacking advice",
                    "what are the local customs in this town",
                ],
                score_threshold=0.70,
            )

            # Route 4: Deflection (Coding, Homework, Trading, General Trivia)
            deflect_route = Route(
                name="deflect",
                utterances=[
                    "write code for binary search tree",
                    "python script to connect postgres database",
                    "how to invest in stock market nifty zerodha",
                    "solve this math calculus equation",
                    "who won yesterday cricket match",
                    "tell me a romantic joke",
                    "write an essay on climate change",
                    "explain quantum physics",
                ],
                score_threshold=0.70,
            )

            # Use IndexedRouter with encoder
            _router_instance = IndexedRouter(
                encoder=encoder,
                routes=[emergency_route, places_route, travel_route, deflect_route],
            )
            print("[COST GUARD] Semantic Router initialized successfully with FastEmbed in RAM.", flush=True)
        except Exception as e:
            print(f"[COST GUARD] Semantic Router init failed: {e}", flush=True)
            _router_instance = None

    return _router_instance


# ----------------------------------------------------------------------
# Main Evaluation Pipeline
# ----------------------------------------------------------------------
def _evaluate(query: str) -> Tuple[bool, str, str]:
    clean_q = query.strip().lower()
    normalized = _normalize(query)

    # Gate 0: Exact canned strings (0ms, 0 tokens)
    if normalized in EXACT_REPLIES:
        return False, "GATE_0_EXACT_MATCH_FREE", EXACT_REPLIES[normalized]

    # Gate 1: Adult / explicit filter
    if ADULT_REGEX.search(clean_q):
        return False, "GATE_1_ADULT_BLOCKED_FREE", _pick(CHEEKY_ADULT)

    # Gate 2: Semantic vector classification
    router = get_semantic_router()
    if router:
        try:
            match = router(query)
            route_name = match.name if match else None

            if route_name == "emergency":
                return True, "PASSED_EMERGENCY", ""

            if route_name == "places_and_transit":
                return True, "PASSED_PLACES_API", ""

            if route_name == "travel_itinerary":
                return True, "PASSED_TRAVEL_LLM", ""

            if route_name == "deflect":
                return False, "GATE_SEMANTIC_DEFLECT_FREE", _pick(CHEEKY_GENERAL)
        except Exception as e:
            print(f"[ROUTER ERROR] {e}", flush=True)

    # Fallback: Fail open so legitimate, nuanced travel queries are not blocked
    return True, "PASSED_FAIL_OPEN", ""


def evaluate_cost_guards(query: str) -> Tuple[bool, str, str]:
    result = _evaluate(query)
    _dbg(f"{query!r} -> call_llm={result[0]} gate={result[1]}")
    return result