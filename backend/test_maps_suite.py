import time
import json
from places import search_places
from tour_guide_service import search_nearby_pois

TEST_LOCATIONS = [
    {"query": "Hawa Mahal, Jaipur", "lat": 26.9239, "lng": 75.8267},
    {"query": "Gateway of India, Mumbai", "lat": 18.9220, "lng": 72.8347},
    {"query": "Victoria Memorial, Kolkata", "lat": 22.5448, "lng": 88.3426},
    {"query": "Qutub Minar, Delhi", "lat": 28.5245, "lng": 77.1855},
    {"query": "Charminar, Hyderabad", "lat": 17.3616, "lng": 78.4747},
    {"query": "Mysore Palace, Mysuru", "lat": 12.3051, "lng": 76.6551},
    {"query": "Meenakshi Temple, Madurai", "lat": 9.9195, "lng": 78.1193},
    {"query": "Golden Temple, Amritsar", "lat": 31.6200, "lng": 74.8765},
    {"query": "Basilica of Bom Jesus, Goa", "lat": 15.5009, "lng": 73.9116},
    {"query": "Marina Beach, Chennai", "lat": 13.0500, "lng": 80.2824},
    {"query": "Dal Lake, Srinagar", "lat": 34.1230, "lng": 74.8700},
    {"query": "Rann of Kutch, Gujarat", "lat": 23.8342, "lng": 69.8322},
]

print("===================================================================")
print("     STARTING 12-LOCATION STRESS & RESILIENCE TEST SUITE          ")
print("===================================================================")

nominatim_results = []
overpass_results = []

for idx, loc in enumerate(TEST_LOCATIONS, 1):
    q = loc["query"]
    lat, lng = loc["lat"], loc["lng"]
    print(f"\n[{idx}/12] Testing: '{q}' (Lat: {lat}, Lng: {lng})")
    
    # 1. Test Nominatim Geocoding
    t0 = time.time()
    try:
        geo_res = search_places(q)
        duration_ms = round((time.time() - t0) * 1000, 1)
        
        if geo_res and len(geo_res) > 0:
            top = geo_res[0]
            display_name = top.get("display_name", "")[:60]
            nominatim_results.append({"status": "PASS", "ms": duration_ms, "name": q})
            print(f"  [Nominatim] SUCCESS ({duration_ms}ms) -> {display_name}...")
        else:
            nominatim_results.append({"status": "EMPTY", "ms": duration_ms, "name": q})
            print(f"  [Nominatim] WARNING: 0 matches returned ({duration_ms}ms)")
    except Exception as e:
        nominatim_results.append({"status": "FAIL", "error": str(e), "name": q})
        print(f"  [Nominatim] CRASHED -> {e}")

    # 2. Test Overpass POI Spatial Query (2km radius)
    t1 = time.time()
    try:
        pois = search_nearby_pois(lat=lat, lng=lng, radius=2000)
        duration_ms = round((time.time() - t1) * 1000, 1)
        
        if pois and len(pois) > 0:
            overpass_results.append({"status": "PASS", "count": len(pois), "ms": duration_ms, "name": q})
            top_name = pois[0].get('name') if isinstance(pois[0], dict) else str(pois[0])
            print(f"  [Overpass]  SUCCESS ({duration_ms}ms) -> Found {len(pois)} POIs (Top: {top_name})")
        else:
            overpass_results.append({"status": "EMPTY", "count": 0, "ms": duration_ms, "name": q})
            print(f"  [Overpass]  WARNING: 0 POIs within 2km ({duration_ms}ms)")
    except Exception as e:
        overpass_results.append({"status": "FAIL", "error": str(e), "name": q})
        print(f"  [Overpass]  CRASHED -> {e}")

    # Respect Nominatim policy (1 request per second max)
    time.sleep(1.1)

print("\n" + "=" * 65)
print("                 TEST EXECUTION SUMMARY                          ")
print("=" * 65)

nom_passed = sum(1 for r in nominatim_results if r["status"] == "PASS")
ovp_passed = sum(1 for r in overpass_results if r["status"] == "PASS")

print(f"Nominatim Success Rate : {nom_passed}/12 Passed")
print(f"Overpass Success Rate  : {ovp_passed}/12 Passed")

# Print failures if any
failures = [r for r in nominatim_results + overpass_results if r["status"] in ["FAIL", "EMPTY"]]
if failures:
    print("\n--- Failure / Empty Breakdown ---")
    for f in failures:
        print(f"- {f['name']}: {f.get('status')} | Details: {f.get('error', 'No records found')}")
else:
    print("\nAll 12 endpoints resolved cleanly without network drops.")
print("=" * 65)
