"""
Cost guard: decides whether a message deserves a (paid) LLM call.

Pipeline, in order. The first gate that matches wins:
    Gate 0    exact canned replies ("hi", "thanks", ...)            -> free
    Gate 1    adult words                                           -> free deflect
    Gate 1.5  medical / hygiene essentials                          -> ALWAYS go to LLM (emergency mode)
    Gate 1    coding / finance / homework                           -> free deflect
    Gate 2A   obvious travel words (incl. Hinglish transport words) -> go to LLM
    Gate 2B   everything else is "ambiguous" -> ask the Laya ML router
              Laya says TRAVEL     -> go to LLM
              Laya says OFF_TOPIC  -> free deflect
              Laya unavailable     -> go to LLM (fail open, see ask_laya)

Debug: set env COST_GUARD_DEBUG=1 to print every decision and the raw Laya output.

Returns (should_call_llm, gate_reason, reply_if_deflected).
"""

import os
import random
import re
from typing import Optional, Tuple

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

DEBUG = os.getenv("COST_GUARD_DEBUG") == "1"


def _dbg(*args):
    if DEBUG:
        print("[COST GUARD DEBUG]", *args, flush=True)


def _normalize(s: str) -> str:
    """lowercase, drop punctuation, trim. Used for BOTH the incoming query and the exact-match keys."""
    return re.sub(r"[^\w\s]", "", s.strip().lower()).strip()


# ============================================================================
# Gate 0: exact replies (0 ms, 0 tokens)
# ============================================================================
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
# FIX: keys that had "?" could never match because the query's "?" is stripped. Normalize keys too.
EXACT_REPLIES = {_normalize(k): v for k, v in _RAW_EXACT_REPLIES.items()}

CHEEKY_CODING = [
    "Bhai, main GPS hoon, compiler nahi 😄 Code ka nahi, local raste aur khane ka puchho!",
    "Bugs sirf hotel ke bistar mein dhundhta hoon, code mein nahi 🐛 Kahan ghoomna hai?",
    "Binary search mein main sirf best chai ki dukaan dhundh sakta hoon ☕ Kahan ghoom rahe ho?",
    "Mera stack overflow sirf tab hota hai jab thali bahut badi ho 🍛 Chalo khane ki baat karein?",
]
CHEEKY_FINANCE = [
    "Bhai main itinerary planner hoon, Zerodha broker nahi 📈 Paisa travel pe lagao, stock market Google se poocho!",
    "Mutual funds sahi honge dost, par abhi konsi chai sahi hai wo main bata sakta hoon ☕",
    "Bull market ho ya bear market, ghoomna hamesha all-time high pe hona chahiye! Kahan chalna hai?",
]
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


def _pick(pool):
    return random.choice(pool)


# ============================================================================
# Gate 1: regex rules
# ============================================================================
# FIX: the original had  ...|khoon beh rha waha se'  'pharmacy|...  with NO "|" between the two
# string pieces, so "pharmacy" was glued into "...waha sepharmacy" and never matched on its own.
# Also: "pad thai" and "best period to visit" used to trigger emergency mode.
ESSENTIAL_NEEDS = re.compile(
    r"\b("
    r"pads?(?!\s*thai)|sanitary|napkins?|tampons?|"
    r"(?<!best\s)(?<!good\s)(?<!ideal\s)(?<!right\s)periods?(?!\s+(?:to|for|of|in)\b)|cramps?|maasik|khoon\s*beh\w*|"
    r"pharm\w*|phara|farmacy|medical\s*store|chemist|medicines?|dawai|dawa|paracetamol|painkiller|first\s*aid|ors|"
    r"doctor|hospital|clinic|ambulance|emergency|bukhar|fever|ulti|vomit|motion\s*sickness|"
    r"atm|washroom|toilet|restroom|charger|power\s*bank|sim\s*card|wifi|"
    r"petrol\s*pump|police|lost|kho\s*gaya|wallet|passport|luggage|locker|cloakroom"
    r")\b",
    re.IGNORECASE,
)

ADULT_REGEX = re.compile(
    r"\b(brothel|prostitut\w*|escorts?|call\s*girls?|red\s*light\s*area|randi(\s*khana|\s*ghar)?|randa|chhamiya|"
    r"slut\w*|sex\s*workers?|chudai|behen\s*chod\w*|madar\s*chod\w*|maa\s*ki|"
    r"chut|choot|gand|gaand|gandu|lauda|loda|lund|bhosad\w*|mutth|sexy?|nudes?|porn\w*|xxx|"
    r"sambhog\w*|sanbhog\w*|jism\s*farosh\w*|gigolos?|hook\s*ups?|happy\s*ending|one\s*night\s*stand|"
    r"ladki\s*(chahiye|patana|set|dila)|room\s*me\s*ladki)\b",
    re.IGNORECASE,
)

SAFE_TRAVEL_TERMS = re.compile(
    r"\b(dress\s*code|qr\s*code|promo\s*code|pin\s*code|area\s*code|discount\s*code|coupon\s*code)\b",
    re.IGNORECASE,
)

CODING_REGEX = re.compile(
    r"(c\+\+|\bcpp\b|\bpython\b|\bjavascript\b|\btypescript\b|\bhtml\b|\bcss\b|\bsql\b|\bgolang\b|\bphp\b|\bkotlin\b|"
    r"\b(source\s*code|coding|code\s*(de|likh|likho|do|write|snippet)|write\s*(a\s*)?(code|program|script))\b|"
    r"\b(algorithm|binary\s*search|bianry\s*search|merge\s*sort|dsa|leetcode|recursion|linked\s*list|hashmap)\b|"
    r"\b(backend|postgres|redis|kafka|system\s*design|load\s*balancer))\b",
    re.IGNORECASE,
)

# FIX: bare "sip" and "shares" blocked "sip chai" and "share auto/cab", which are travel questions.
FINANCE_REGEX = re.compile(
    r"\b(stocks?|stock\s*market|share\s*market|shares?\s*(price|prices|broker|trading)|nifty|sensex|crypto|bitcoin|"
    r"mutual\s*funds?|sips?\s*(invest\w*|plan|amount|returns?)|portfolio|trading|invest\w*)\b",
    re.IGNORECASE,
)

# FIX: removed "who is" (blocked "who is the best guide in Jaipur").
HOMEWORK_REGEX = re.compile(
    r"\b(homework|assignment|solve\s*(this|equation)|derivative|integral|maths?|essay|who\s*won)\b",
    re.IGNORECASE,
)

# ============================================================================
# Gate 2A: obvious travel words
# ============================================================================
# FIX: no Hinglish "going / how to reach / which is best" words existed, so
# "baguati kolkata se newton jaana hai best kya rahega" matched NOTHING and went to the ML router,
# which wrongly called it OFF_TOPIC. The two new groups at the end cover that.
TRAVEL_SIGNALS = re.compile(
    r"("
    r"\b(hotel|stay|hostel|resort|flight|train|bus|auto|cab|taxi|metro|route|distance|km|ticket|entry|timing|open|close)\b|"
    r"\b(food|restaurant|cafe|dhaba|thali|chai|tea|coffee|breakfast|lunch|dinner|eat|drink|street\s*food|biryani|snack)\b|"
    r"\b(fort|palace|temple|mandir|masjid|church|beach|viewpoint|sunset|sunrise|park|garden|museum|(?<!stock\s)(market|bazaar)|shopping|mall)\b|"
    r"\b(itinerary|guide|trip|travel|visit|reach|pacing|explore|city|famous|historical|pack|weather|safe|nightlife)\b|"
    r"\b(jagah|place|places|ghoom\w*|dekh\w*|kaha\s*jau|batao|asspas|aas\s*paas|aaspass|near\s*me|nearby|paas|kahan|kaha\s*milega|kaise\s*jaye|route)\b|"
    # NEW: Hinglish movement / transport words
    r"\b(jaana|jana|jaane|jaaun|jaun|jayein|jaye|jaaye|chalna|pahunch\w*|pohoch\w*|rasta|raasta|raste|"
    r"bhada|bhaada|fare|kharcha|ola|uber|rapido|rickshaw|bike|scooter|ferry)\b|"
    # NEW: "A se B tak", "kya rahega", "best option/way"
    r"\bse\b.{1,40}\b(tak|jaana|jana|jaane)\b|"
    r"\bkya\s*rahega\b|\bbest\s*(option|way|rahega|hoga)\b"
    r")",
    re.IGNORECASE,
)

# ============================================================================
# Gate 2B: Laya ML router (only for messages no rule could decide)
# ============================================================================
_laya_router_instance = None


def get_laya():
    global _laya_router_instance
    if _laya_router_instance is None:
        try:
            from laya.laya import LayaRouter

            criteria = {
                "TRAVEL": (
                    "Anything about going somewhere or being somewhere: trip planning, directions, how to reach a place "
                    "(bus, metro, cab, train), hotels, flights, itineraries, tourist spots, sights, local food, packing."
                ),
                "OFF_TOPIC": (
                    "Chit-chat, mood, asking for songs or music, jokes, emotional talk, personal life, philosophy, "
                    "finance, or anything unrelated to a physical trip."
                ),
            }
            _laya_router_instance = LayaRouter(
                criteria=criteria,
                instructions="Route to TRAVEL if the user wants to go somewhere, reach a place, or asks about a destination, trip, or tourism. Everything else is OFF_TOPIC.",
                fallback="OFF_TOPIC",
            )
            print("[COST GUARD] LayaRouter initialized successfully.", flush=True)
        except Exception as e:
            print(f"[COST GUARD] Laya init notice: {e}", flush=True)
            _laya_router_instance = False
    return _laya_router_instance if _laya_router_instance is not False else None


def ask_laya(query: str) -> Optional[bool]:
    """True = travel, False = off-topic, None = router unavailable/errored."""
    router = get_laya()
    if not router:
        return None
    try:
        decision = router(query)
        _dbg("raw laya decision:", repr(decision))  # shows route + any confidence fields
        route_val = getattr(decision, "route", str(decision))
        return route_val == "TRAVEL"
    except Exception as e:
        print(f"[LAYA ROUTE ERROR] {e}", flush=True)
        return None


# ============================================================================
# Main pipeline
# ============================================================================
def _evaluate(query: str) -> Tuple[bool, str, str]:
    clean_q = query.strip().lower()
    normalized = _normalize(query)

    # Gate 0
    if normalized in EXACT_REPLIES:
        return False, "GATE_0_EXACT_MATCH_FREE", EXACT_REPLIES[normalized]

    # Gate 1: adult
    if ADULT_REGEX.search(clean_q):
        return False, "GATE_1_ADULT_BLOCKED_FREE", _pick(CHEEKY_ADULT)

    # Gate 1.5: medical / hygiene -> always allow (service switches to emergency prompt)
    if ESSENTIAL_NEEDS.search(clean_q):
        return True, "PASSED_ESSENTIAL_NEED", ""

    # Gate 1: coding
    if not SAFE_TRAVEL_TERMS.search(clean_q) and CODING_REGEX.search(clean_q):
        return False, "GATE_1_CODING_BLOCKED_FREE", _pick(CHEEKY_CODING)

    # Gate 1: finance
    if FINANCE_REGEX.search(clean_q):
        return False, "GATE_1_FINANCE_BLOCKED_FREE", _pick(CHEEKY_FINANCE)

    # Gate 1: homework
    if HOMEWORK_REGEX.search(clean_q):
        return False, "GATE_1_HOMEWORK_BLOCKED_FREE", _pick(CHEEKY_GENERAL)

    # Gate 2A: known travel words -> allow
    if TRAVEL_SIGNALS.search(clean_q):
        return True, "PASSED_TO_LLM", ""

    # Gate 2B: ambiguous -> ML router
    laya_result = ask_laya(clean_q)
    if laya_result is True:
        return True, "PASSED_VIA_LAYA", ""
    if laya_result is False:
        return False, "GATE_2_LAYA_DEFLECT_FREE", _pick(CHEEKY_GENERAL)

    # Router unavailable. FIX: was "deflect everything" (blocks real users when the model fails to load).
    # Now we fail OPEN: a wasted LLM call is cheap; a blocked real traveller is not.
    return True, "PASSED_LAYA_UNAVAILABLE", ""


def evaluate_cost_guards(query: str) -> Tuple[bool, str, str]:
    result = _evaluate(query)
    _dbg(f"{query!r} -> call_llm={result[0]} gate={result[1]}")
    return result