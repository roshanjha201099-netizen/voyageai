# Re-export from services.google_maps_service for backwards compatibility
from services.google_maps_service import (
    GOOGLE_MAPS_API_KEY,
    reverse_geocode,
    search_nearby_places,
    autocomplete_places,
    get_place_details,
    haversine_meters,
)
