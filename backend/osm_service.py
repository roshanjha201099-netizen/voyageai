"""
Redirect legacy osm_service to google_maps_service (Zero Overpass).
"""
import asyncio
from typing import List, Dict, Any

def get_nearby_pois(lat: float, lon: float, radius: int = 5000) -> List[Dict[str, Any]]:
    from services.google_maps_service import search_nearby_places
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            return executor.submit(lambda: asyncio.run(search_nearby_places(lat, lon, radius))).result()
    else:
        return asyncio.run(search_nearby_places(lat, lon, radius))
