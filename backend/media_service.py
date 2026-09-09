from typing import Dict, Any

class MediaService:
    """
    Destination Cover Media Resolver Service
    Resolves canonical cover images server-side via catalog lookup or fallback.
    """
    def resolve_cover_media(self, destination: Dict[str, Any]) -> Dict[str, Any]:
        dest_name = (destination.get("name") or "").strip().lower()
        region = (destination.get("region") or "").strip().lower()

        # 1. Primary Catalog Lookup
        if "goa" in dest_name or "goa" in region:
            return {
                "url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80",
                "alt": "Goa coastline and palm trees",
                "provider": "catalog"
            }
        elif "kolkata" in dest_name or "kolkata" in region:
            return {
                "url": "https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=800&q=80",
                "alt": "Howrah Bridge Landmark in Kolkata",
                "provider": "catalog"
            }
        elif "kathmandu" in dest_name or "kathmandu" in region:
            return {
                "url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80",
                "alt": "Kathmandu Valley & Historic Temples",
                "provider": "catalog"
            }
        elif "kerala" in dest_name or "kerala" in region:
            return {
                "url": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80",
                "alt": "Kerala Backwaters & Houseboats",
                "provider": "catalog"
            }
        elif "manali" in dest_name or "himachal" in region:
            return {
                "url": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80",
                "alt": "Manali Snow Mountains",
                "provider": "catalog"
            }
        elif "jaipur" in dest_name or "rajasthan" in region:
            return {
                "url": "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80",
                "alt": "Jaipur Hawa Mahal Palace",
                "provider": "catalog"
            }

        # 2. Fallback Media
        return {
            "url": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
            "alt": "Scenic Travel Destination",
            "provider": "fallback"
        }

media_service = MediaService()
