import json
import requests
from redis_client import redis_conn

# 24 Hours in seconds = 86,400 seconds
OSM_CACHE_TTL = 24 * 60 * 60 

def get_nearby_pois(lat: float, lon: float, radius: int = 5000):
    # 1. Bucket GPS to 2 decimals (~1.1 km area) so nearby users share the same cache
    grid_lat = round(lat, 2)
    grid_lon = round(lon, 2)
    cache_key = f"osm:poi:{grid_lat}:{grid_lon}:{radius}"

    # 2. Check Redis (O(1) memory lookup)
    try:
        cached_result = redis_conn.get(cache_key)
        if cached_result:
            print(f">>> [REDIS CACHE HIT] Key: {cache_key} (~2ms)")
            return json.loads(cached_result)
    except Exception as e:
        # Fallback safeguard: If Redis ever goes down, don't crash the entire app!
        print(f"[REDIS WARNING] Failed to read cache: {e}")

    # 3. Cache Miss: Execute the slow Overpass HTTP API call (~2000ms)
    print(f">>> [REDIS CACHE MISS] Fetching fresh data from Overpass API for {cache_key}...")
    overpass_url = "https://overpass-api.de/api/interpreter"
    query = f"""
    [out:json][timeout:25];
    (
      node["tourism"](around:{radius},{lat},{lon});
      node["amenity"="cafe"](around:{radius},{lat},{lon});
    );
    out body;
    """
    elements = []
    try:
        response = requests.post(overpass_url, data={"data": query}, timeout=10)
        if response.status_code == 200:
            elements = response.json().get("elements", [])
    except Exception as e:
        print(f"[OVERPASS WARNING] API request failed: {e}")

    # 4. Save to Redis with 24-Hour Expiration
    try:
        redis_conn.setex(cache_key, OSM_CACHE_TTL, json.dumps(elements))
    except Exception as e:
        print(f"[REDIS WARNING] Failed to write cache: {e}")

    return elements

