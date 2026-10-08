import re
import random
from typing import Tuple, Optional
import os
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

# ============================================================================
# Gate 0: Normalized Exact & Quick Responses (0ms Latency, 0 Tokens)
# ============================================================================

EXACT_REPLIES={
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
    "cricket score kya chal raha hai?": "Bhai, cricket ka update baad mein, pehle plan batao - kahan jaana hai?"
}

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
# Gate 1: Safety, Essentials & Deflection Regex Rules
# ============================================================================
ESSENTIAL_NEEDS = re.compile(
    r'\b(pad|pads|sanitary|napkin|napkins|tampon|tampons|period|periods|cramps?|maasik|khoon beh rha waha se'
    r'pharmacy|medical\s*store|chemist|medicine|medicines|dawai|dawa|paracetamol|painkiller|first\s*aid|ors|'
    r'doctor|hospital|clinic|ambulance|emergency|bukhar|fever|ulti|vomit|motion\s*sickness|'
    r'atm|washroom|toilet|restroom|charger|power\s*bank|sim\s*card|wifi|'
    r'petrol\s*pump|police|lost|kho\s*gaya|wallet|passport|luggage|locker|cloakroom)\b',
    re.IGNORECASE
)

ADULT_REGEX = re.compile(
    r'\b(brothel|prostitut\w*|escorts?|call\s*girls?|red\s*light\s*area|randi(\s*khana|\s*ghar)?|randa|chhamiya|'
    r'slut\w*|sex\s*workers?|chudai|behen\s*chod\w*|madar\s*chod\w*|maa\s*ki|'
    r'chut|choot|gand|gaand|gandu|lauda|loda|lund|bhosad\w*|mutth|sexy?|nudes?|porn\w*|'
    r'ladki\s*(chahiye|patana|set|dila)|room\s*me\s*ladki)\b',
    re.IGNORECASE
)

SAFE_TRAVEL_TERMS = re.compile(
    r'\b(dress\s*code|qr\s*code|promo\s*code|pin\s*code|area\s*code|discount\s*code|coupon\s*code)\b',
    re.IGNORECASE
)

CODING_REGEX = re.compile(
    r'(c\+\+|\bcpp\b|\bpython\b|\bjavascript\b|\btypescript\b|\bhtml\b|\bcss\b|\bsql\b|\bgolang\b|\bphp\b|\bkotlin\b|'
    r'\b(source\s*code|coding|code\s*(de|likh|likho|do|write|snippet)|write\s*(a\s*)?(code|program|script))\b|'
    r'\b(algorithm|binary\s*search|bianry\s*search|merge\s*sort|dsa|leetcode|recursion|linked\s*list|hashmap)\b|'
    r'\b(backend|postgres|redis|kafka|system\s*design|load\s*balancer))\b',
    re.IGNORECASE
)

FINANCE_REGEX = re.compile(
    r'\b(stock|stocks|stock\s*market|nifty|sensex|crypto|bitcoin|mutual\s*fund|sip|portfolio|trading|invest|investing|investment|shares?)\b',
    re.IGNORECASE
)

HOMEWORK_REGEX = re.compile(
    r'\b(homework|assignment|solve\s*(this|equation)|derivative|integral|maths?|essay|who\s*is|who\s*won)\b',
    re.IGNORECASE
)

TRAVEL_SIGNALS = re.compile(
    r'('
    r'\b(hotel|stay|hostel|resort|flight|train|bus|auto|cab|taxi|metro|route|distance|km|ticket|entry|timing|open|close)\b|'
    r'\b(food|restaurant|cafe|dhaba|thali|chai|tea|coffee|breakfast|lunch|dinner|eat|drink|street\s*food|biryani|snack)\b|'
    r'\b(fort|palace|temple|mandir|masjid|church|beach|viewpoint|sunset|sunrise|park|garden|museum|(?<!stock\s)(market|bazaar)|shopping|mall)\b|'
    r'\b(itinerary|guide|trip|travel|visit|reach|pacing|explore|city|famous|historical|pack|weather|safe|nightlife)\b|'
    r'\b(jagah|place|places|ghoom\w*|dekh\w*|kaha\s*jau|batao|asspas|aas\s*paas|aaspass|near\s*me|nearby|paas|kahan|kaha\s*milega|kaise\s*jaye|route)\b'
    r')',
    re.IGNORECASE
)

# ============================================================================
# Gate 2: Laya System 1 Router Setup
# ============================================================================
_laya_router_instance = None

def get_laya():
    global _laya_router_instance
    if _laya_router_instance is None:
        try:
            from laya.laya import LayaRouter
            criteria = {
                "TRAVEL": "Questions strictly seeking trip planning, hotels, flights, itineraries, tourist spots, sights, local food, or packing.",
                "OFF_TOPIC": "Chit-chat, mood, asking for songs or music, jokes, emotional talk, personal life, philosophy, finance, or anything unrelated to a physical trip."
            }

            _laya_router_instance = LayaRouter(
                criteria=criteria,
                instructions="Route to TRAVEL ONLY if the user is asking about a travel destination, trip, or tourism. Everything else is OFF_TOPIC.",
                fallback="OFF_TOPIC"
            )
            print("[COST GUARD] LayaRouter initialized successfully.", flush=True)
        except Exception as e:
            print(f"[COST GUARD] Laya init notice: {e}", flush=True)
            _laya_router_instance = False
    return _laya_router_instance if _laya_router_instance is not False else None

def ask_laya(query: str) -> Optional[bool]:
    router = get_laya()
    if not router:
        return None
    try:
        route_decision = router(query)
        route_val = getattr(route_decision, "route", str(route_decision))
        return route_val == "TRAVEL"
    except Exception as e:
        print(f"[LAYA ROUTE ERROR] {e}", flush=True)
        return None

# ============================================================================
# Main Evaluation Pipeline
# ============================================================================
def evaluate_cost_guards(query: str) -> Tuple[bool, str, str]:
    clean_q = query.strip().lower()
    normalized = re.sub(r'[^\w\s]', '', clean_q).strip()

    # Gate 0: Exact match check
    if normalized in EXACT_REPLIES:
        return False, "GATE_0_EXACT_MATCH_FREE", EXACT_REPLIES[normalized]

    # Gate 1: Adult / Vulgarity block
    if ADULT_REGEX.search(clean_q):
        return False, "GATE_1_ADULT_BLOCKED_FREE", _pick(CHEEKY_ADULT)

    # Gate 1.5: Medical / Hygiene emergency -> Always allow
    if ESSENTIAL_NEEDS.search(clean_q):
        return True, "PASSED_ESSENTIAL_NEED", ""

    # Gate 1: Coding block
    if not SAFE_TRAVEL_TERMS.search(clean_q) and CODING_REGEX.search(clean_q):
        return False, "GATE_1_CODING_BLOCKED_FREE", _pick(CHEEKY_CODING)

    # Gate 1: Finance & Trading Block
    if FINANCE_REGEX.search(clean_q):
        return False, "GATE_1_FINANCE_BLOCKED_FREE", _pick(CHEEKY_FINANCE)

    # Gate 1: Homework block
    if HOMEWORK_REGEX.search(clean_q):
        return False, "GATE_1_HOMEWORK_BLOCKED_FREE", _pick(CHEEKY_GENERAL)

    # Gate 2A: Known travel signals -> Direct allow
    if TRAVEL_SIGNALS.search(clean_q):
        return True, "PASSED_TO_LLM", ""

    # Gate 2B: Ambiguous query? Pass to Laya System 1 Router
    laya_result = ask_laya(clean_q)
    if laya_result is True:
        return True, "PASSED_VIA_LAYA", ""
    elif laya_result is False:
        return False, "GATE_2_LAYA_DEFLECT_FREE", _pick(CHEEKY_GENERAL)

    # Fallback if Laya fails or is unavailable
    return False, "GATE_2_OFF_DOMAIN_FREE", _pick(CHEEKY_GENERAL)