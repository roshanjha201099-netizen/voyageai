import requests
from typing import Optional, Dict

def resolve_administrative_hierarchy(lat: float, lng: float) -> Dict[str, Optional[str]]:
    """Resolves local, district, and state levels dynamically from OSM Nominatim."""
    url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lng}&zoom=10&addressdetails=1"
    headers = {"User-Agent": "VoyageAI-GeoEngine/1.0 (contact@voyageai.local)"}
    try:
        res = requests.get(url, headers=headers, timeout=5)
        if res.ok:
            addr = res.json().get("address", {})
            return {
                "local": addr.get("city") or addr.get("town") or addr.get("village") or addr.get("suburb"),
                "district": addr.get("district") or addr.get("state_district") or addr.get("county"),
                "state": addr.get("state"),
                "country": addr.get("country", "India")
            }
    except Exception as e:
        print(f"[GEO RESOLVE ERROR] {e}", flush=True)
    return {"local": None, "district": None, "state": None, "country": "India"}
