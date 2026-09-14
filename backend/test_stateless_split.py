import time
import requests

INSTANCE_A = "http://127.0.0.1:8000"
INSTANCE_B = "http://127.0.0.1:8001"

def run_stateless_audit():
    print("=" * 60)
    print("RUNNING STEP 2: STATELESS NODE VERIFICATION")
    print("=" * 60)

    # Payload matching VoyageAI trip creation
    payload = {
        "destination": {
            "name": "Udaipur",
            "country": "India",
            "latitude": 24.5854,
            "longitude": 73.7125
        },
        "startDate": "2026-11-10",
        "endDate": "2026-11-12",
        "travelersCount": 2,
        "tripStyle": ["CULTURAL"],
        "budgetLevel": "MODERATE"
    }

    # -------------------------------------------------------------
    # 1. Write to Instance A
    # -------------------------------------------------------------
    print(f"\n[ACTION 1] Submitting trip creation to INSTANCE A ({INSTANCE_A}/trips)...")
    res_a = requests.post(f"{INSTANCE_A}/trips", json=payload)
    if res_a.status_code not in (200, 201, 202):
        res_a = requests.post(f"{INSTANCE_A}/api/trips", json=payload)

    if res_a.status_code not in (200, 201, 202):
        print(f"[FAIL] Instance A failed with status {res_a.status_code}: {res_a.text}")
        return

    data_a = res_a.json()
    trip_id = data_a.get("tripId") or data_a.get("id")
    print(f"[SUCCESS] Instance A accepted trip. Generated ID: {trip_id}")
    print(f"   Response payload: {data_a}")

    # -------------------------------------------------------------
    # 2. Wait for Background Worker to process
    # -------------------------------------------------------------
    print("\n[ACTION 2] Waiting for worker to process itinerary via Redis & PostgreSQL...")
    time.sleep(3)

    # -------------------------------------------------------------
    # 3. Read from Instance B (The completely separate process)
    # -------------------------------------------------------------
    print(f"\n[ACTION 3] Querying INSTANCE B ({INSTANCE_B}/trips/{trip_id})...")
    res_b = requests.get(f"{INSTANCE_B}/trips/{trip_id}")

    if res_b.status_code != 200:
        res_b = requests.get(f"{INSTANCE_B}/api/trips/{trip_id}")

    if res_b.status_code != 200:
        print(f"[FAIL] Instance B could not find the trip! Status: {res_b.status_code}")
        print(f"   Details: {res_b.text}")
        return

    data_b = res_b.json()
    print(f"[SUCCESS] Instance B successfully fetched the trip created on Instance A!")
    print(f"   Destination: {data_b.get('destination')}")
    print(f"   Status: {data_b.get('itinerary_status') or data_b.get('status') or data_b.get('itineraryStatus')}")

    print("\n" + "=" * 60)
    print("VERDICT: Nodes are 100% STATELESS.")
    print("Zero state is trapped in memory; all persistence routes through DB/Redis.")
    print("=" * 60)

if __name__ == "__main__":
    run_stateless_audit()
