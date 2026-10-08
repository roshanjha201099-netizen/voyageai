import time
from cost_guard import evaluate_cost_guards, ask_laya

print("=" * 65)
print("1. DIRECT LAYA SYSTEM 1 CHECK")
print("=" * 65)
test_laya_queries = [
    "aaj mood kharab hai gaana sunao",
    "baarish mein bache kahan masti karein?",
    "cricket score kya chal raha hai?"
]
for q in test_laya_queries:
    t0 = time.perf_counter()
    res = ask_laya(q)
    ms = (time.perf_counter() - t0) * 1000
    print(f"Query: {q}")
    print(f"-> Is Travel? {res} ({ms:.1f}ms)\n")

print("=" * 65)
print("2. FULL COST_GUARD PIPELINE CHECK")
print("=" * 65)
test_pipeline = [
    "hello",
    "write quicksort in cpp",
    "stock market mein portfolio kaise banaye?",
    "emergency medical store near me",
    "aaj mood kharab hai gaana sunao",
    "sunset point ke baad shaam ko kya karein?"
]
for q in test_pipeline:
    t0 = time.perf_counter()
    allowed, gate, reply = evaluate_cost_guards(q)
    ms = (time.perf_counter() - t0) * 1000
    print(f"Query: {q}")
    print(f"-> Allowed: {allowed} | Gate: {gate} ({ms:.1f}ms)")
    if reply:
        print(f"   Reply: {reply}")
    print()

print("=" * 65)
print("3. INTERACTIVE TERMINAL TESTER (Type query or 'exit')")
print("=" * 65)
while True:
    try:
        query = input("Enter test query: ").strip()
        if not query or query.lower() in ["exit", "quit"]:
            break
        t0 = time.perf_counter()
        allowed, gate, reply = evaluate_cost_guards(query)
        ms = (time.perf_counter() - t0) * 1000
        print(f"-> Allowed: {allowed} | Gate: {gate} ({ms:.1f}ms)")
        if reply:
            print(f"-> Reply: {reply}")
        print()
    except (KeyboardInterrupt, EOFError):
        break
