import time
import json
from ai_provider import ai_provider_service

TEST_PROMPTS = [
    {
        "name": "Standard Itinerary Generation",
        "messages": [{"role": "user", "text": "Create a 1-day itinerary for Jaipur with 3 short activities. Return strictly valid JSON with an 'activities' list containing title, timeSlot, and estimatedCostInr."}],
        "context": {"destination": {"name": "Jaipur"}, "totalDays": 1, "budgetLevel": "MODERATE"}
    },
    {
        "name": "Activity Swap Intent",
        "messages": [{"role": "user", "text": "Recommend 3 indoor alternatives for 'City Palace visit' because it is raining heavily."}],
        "context": {"destination": {"name": "Jaipur"}, "totalDays": 1, "budgetLevel": "MODERATE"}
    },
    {
        "name": "Tour Guide Personality / Contextual Query",
        "messages": [{"role": "user", "text": "Tell me a short interesting historical anecdote about Hawa Mahal in 2 sentences."}],
        "context": {"destination": {"name": "Jaipur"}, "currentPlace": "Hawa Mahal"}
    }
]

print("===================================================================")
print("             STARTING GEMINI LLM TEST SUITE                       ")
print("===================================================================")

for idx, test in enumerate(TEST_PROMPTS, 1):
    print(f"\n[{idx}/3] Testing: {test['name']}")
    t0 = time.time()
    try:
        response = ai_provider_service.generate_chat_response(
            messages=test["messages"],
            trip_context=test["context"]
        )
        duration_ms = round((time.time() - t0) * 1000, 1)
        print(f"  [Gemini] SUCCESS ({duration_ms}ms)")
        
        # Display sample payload
        resp_str = json.dumps(response, indent=2) if isinstance(response, (dict, list)) else str(response)
        snippet = resp_str[:250].replace('\n', ' ')
        print(f"  Snippet -> {snippet}...")
    except Exception as e:
        print(f"  [Gemini] FAILED -> {e}")

print("\n===================================================================")
print("                      GEMINI SUITE COMPLETE                       ")
print("===================================================================")
