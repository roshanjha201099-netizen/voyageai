import asyncio
from typing import Optional, Dict

def resolve_administrative_hierarchy(lat: float, lng: float) -> Dict[str, Optional[str]]:
    """Resolves local, district, and state levels dynamically from Google Geocoding."""
    try:
        from services.google_maps_service import reverse_geocode
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                res = executor.submit(lambda: asyncio.run(reverse_geocode(lat, lng))).result()
        else:
            res = asyncio.run(reverse_geocode(lat, lng))

        if res:
            return {
                "local": res.get("city"),
                "district": res.get("city"),
                "state": res.get("state"),
                "country": res.get("country", "India")
            }
    except Exception as e:
        print(f"[GEO RESOLVE ERROR] {e}", flush=True)

    return {"local": None, "district": None, "state": None, "country": "India"}
