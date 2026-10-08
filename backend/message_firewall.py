import re
import random
from typing import Tuple

# ==========================================
# GATE 0: Exact Match Canned Cache ($0)
# ==========================================
EXACT_REPLIES = {
    "hi": "Hey! VoyageAI concierge here. Where are we heading today?",
    "hello": "Hello! Looking for places to eat, sights, or trip planning?",
    "help": "Tell me your destination or ask for food, spots, and local hacks around you.",
    "kaha jau": "Apna current location ya planned city batao, best spots batata hoon.",
}

# ==========================================
# CHEEKY REPLY POOLS (travel-flavoured, never answer the off-topic thing)
# Random pick keeps the bot from feeling like a broken record.
# ==========================================
CHEEKY_CODING = [
    "Bhai, main GPS hoon, compiler nahi 😄 Code ka nahi, Jaipur ka rasta puchho!",
    "Bugs sirf hotel ke bistar mein dhundhta hoon, code mein nahi 🐛 Kahan ghoomna hai?",
    "Binary search mein main sirf best chai ki dukaan dhundh sakta hoon ☕ Kahan ke ho?",
    "Ye wala rasta mere map pe nahi hai 🗺️ Travel ka sawal ho toh bolo, turant route bata dunga!",
    "Mera stack overflow sirf tab hota hai jab thali bahut badi ho 🍛 Chalo khane ki baat karein?",
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
    "Arre wah, philosophical! Par main sirf itna jaanta hoon ki sunset kahan sabse mast dikhta hai 🌅",
]

def _pick(pool):
    return random.choice(pool)

# ==========================================
# GATE 1a: Genuine essentials / emergencies -> ALWAYS pass to LLM
# (pads, medicines, ATM, toilets, police, lost stuff, charger...)
# Checked BEFORE off-topic so these never get blocked.
# ==========================================
ESSENTIAL_NEEDS = re.compile(
    r'\b(pad|pads|sanitary|napkin|napkins|tampon|tampons|period|periods|cramps?|'
    r'pharmacy|medical\s*store|chemist|medicine|medicines|dawai|dawa|paracetamol|painkiller|first\s*aid|ors|'
    r'doctor|hospital|clinic|ambulance|emergency|bukhar|fever|ulti|vomit|motion\s*sickness|'
    r'atm|washroom|toilet|restroom|charger|power\s*bank|sim\s*card|wifi|'
    r'petrol\s*pump|police|lost|kho\s*gaya|wallet|passport|luggage|locker|cloakroom)\b',
    re.IGNORECASE
)

# ==========================================
# GATE 1b: Adult / vulgar denylist (strict whole words, no prefix wildcards,
# so Gandhi / chutney / chutti / chodna(leave) don't get caught)
# ==========================================
ADULT_REGEX = re.compile(
    r'\b(brothel|prostitut\w*|escorts?|call\s*girls?|red\s*light\s*area|randi(\s*khana|\s*ghar)?|randa|chhamiya|'
    r'slut\w*|sex\s*workers?|chudai|behen\s*chod\w*|madar\s*chod\w*|maa\s*ki|'
    r'chut|choot|gand|gaand|gandu|lauda|loda|lund|bhosad\w*|mutth|sexy?|nudes?|porn\w*|'
    r'ladki\s*(chahiye|patana|set|dila)|room\s*me\s*ladki|pad\s*sungh|sungh\s*lu)\b',
    re.IGNORECASE
)

# ==========================================
# GATE 1c: Coding / homework denylist
# Only strong, unambiguous terms (dropped tree/queue/stack/graph/program/script).
# ==========================================
SAFE_TRAVEL_TERMS = re.compile(
    r'\b(dress\s*code|qr\s*code|promo\s*code|pin\s*code|area\s*code|discount\s*code|coupon\s*code)\b',
    re.IGNORECASE
)

CODING_REGEX = re.compile(
    r'(c\+\+|\bcpp\b|\bpython\b|\bjavascript\b|\btypescript\b|\bhtml\b|\bcss\b|\bsql\b|\bgolang\b|\bphp\b|\bkotlin\b|'
    r'\b(source\s*code|coding|code\s*(de|likh|likho|do|write|snippet)|write\s*(a\s*)?(code|program|script))\b|'
    r'\b(algorithm|binary\s*search|bianry\s*search|merge\s*sort|dsa|leetcode|recursion|linked\s*list|hashmap)\b|'
    r'\b(backend|postgres|redis|kafka|system\s*design|load\s*balancer|users?\s*(ho\s*jaye|badh\s*jaye))\b)',
    re.IGNORECASE
)

HOMEWORK_REGEX = re.compile(
    r'\b(homework|assignment|solve\s*(this|equation)|derivative|integral|maths?|essay)\b',
    re.IGNORECASE
)

# ==========================================
# GATE 2: Travel keyword whitelist
# ==========================================
TRAVEL_SIGNALS = re.compile(
    r'\b(hotel|stay|hostel|flight|train|bus|auto|cab|taxi|metro|route|distance|km|ticket|entry|timing|open|close|'
    r'food|restaurant|cafe|dhaba|thali|chai|breakfast|lunch|dinner|eat|drink|street\s*food|biryani|'
    r'fort|palace|temple|mandir|beach|viewpoint|sunset|sunrise|park|museum|market|bazaar|shopping|'
    r'itinerary|guide|trip|travel|visit|reach|pacing|explore|city|famous|historical|pack|weather|safe|nightlife|'
    r'near\s*me|nearby|paas|kahan|kaha\s*milega|kaise\s*jaye)\b',
    re.IGNORECASE
)


def evaluate_cost_guards(query: str) -> Tuple[bool, str, str]:
    """
    Returns: (should_call_llm: bool, cost_reason: str, reply: str)
    """
    clean_q = query.strip().lower()

    # --- Gate 0: Exact match (free) ---
    if clean_q in EXACT_REPLIES:
        return False, "GATE_0_EXACT_MATCH_FREE", EXACT_REPLIES[clean_q]

    # --- Gate 1b: Adult/vulgar (free). Runs first so nobody bypasses it
    #     by tacking on "pharmacy" etc. ---
    if ADULT_REGEX.search(clean_q):
        return False, "GATE_1_ADULT_BLOCKED_FREE", _pick(CHEEKY_ADULT)

    # --- Gate 1a: Genuine essentials/emergencies -> always LLM ---
    if ESSENTIAL_NEEDS.search(clean_q):
        return True, "PASSED_ESSENTIAL_NEED", ""

    # --- Gate 1c: Coding / homework (free) ---
    if not SAFE_TRAVEL_TERMS.search(clean_q) and CODING_REGEX.search(clean_q):
        return False, "GATE_1_CODING_BLOCKED_FREE", _pick(CHEEKY_CODING)

    if HOMEWORK_REGEX.search(clean_q):
        return False, "GATE_1_HOMEWORK_BLOCKED_FREE", _pick(CHEEKY_GENERAL)

    # --- Gate 2: Travel signals / short natural queries ---
    if TRAVEL_SIGNALS.search(clean_q) or len(clean_q.split()) <= 4:
        return True, "PASSED_TO_LLM", ""

    return False, "GATE_2_OFF_DOMAIN_FREE", _pick(CHEEKY_GENERAL)


if __name__ == "__main__":
    tests = [
        # should be FREE (blocked)
        "hi",
        "mere lie ek bianry search ka c++ code de",
        "bhai mujhe randi chodna hai",
        "yaha slut house kaha hai",
        "bhai jab user 1000000 ho jaye toh piche kya karna chaiye?",
        "write an essay on global warming",
        "tell me the meaning of life and the universe please",
        # should be PAID (passed)
        "Is there any dress code for the temple?",
        "Best street food near Hawa Mahal?",
        "station se hotel tak auto wale kitna lenge?",
        "Amber fort ticket booking online hoti hai kya?",
        # the edge cases
        "meri gf ko period hai pad kaha milega yaha",
        "sanitary pad chahiye urgent",
        "mujhe fever hai koi medical store paas mein hai",
        "Gandhi Ghat kaise jaye",
        "chutney wala famous dhaba batao",
        "kal hotel chodna hai checkout timing kya hai",
        "treehouse stay in Munnar",
        "temple queue kitna lamba hota hai",
        "Amsterdam red light district walking tour safe hai?",
    ]
    print(f"\n{'QUERY':<58} | {'CALL LLM?':<10} | GATE")
    print("=" * 110)
    for q in tests:
        call, gate, reply = evaluate_cost_guards(q)
        badge = "[PAID]" if call else "[FREE]"
        print(f"{q[:56]:<58} | {badge:<10} | {gate}")
        if reply:
            print(f"    -> {reply}")