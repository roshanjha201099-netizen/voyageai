import os
import re
import ast
import json
import time
import asyncio
import logging
import requests
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Load environment variables (force override so running server process picks up .env updates)
load_dotenv(override=True)

# Logging setup
logger = logging.getLogger("voyageai.vertex")

def _extract_msg_attr(m: Any, attr: str, default: str = "") -> str:
    if isinstance(m, dict):
        return str(m.get(attr, default) or default)
    if hasattr(m, attr):
        val = getattr(m, attr)
        return str(val if val is not None else default)
    return default

def _resolve_model_name(requested_model: Optional[str] = None) -> str:
    """
    Resolves the Gemini model name.
    Defaults to the active production alias 'gemini-flash-latest'.
    Strips leading 'models/' prefix if present.
    """
    model = requested_model or os.getenv("GEMINI_MODEL", "gemini-flash-latest")
    model = model.strip()
    if model.startswith("models/"):
        model = model[7:]
    if not model or model in ("gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash"):
        return "gemini-flash-latest"
    return model





class AIProviderInterface(ABC):
    @abstractmethod
    def generate_itinerary_json(self, ai_input: Dict[str, Any], prompt: str) -> str:
        """
        Executes AI generation call and returns raw JSON string.
        """
        pass

    @abstractmethod
    def generate_swap_recommendations(self, current_activity: Dict[str, Any], trip_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generates 3 structured alternative recommendation cards to replace an activity.
        """
        pass

    @abstractmethod
    def generate_chat_response(self, messages: List[Dict[str, str]], trip_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates contextual AI Concierge response using trip context and bounded message history.
        """
        pass

    @abstractmethod
    def generate_day_optimization(self, day_info: Dict[str, Any], activities: List[Dict[str, Any]], goal: str) -> List[Dict[str, Any]]:
        """
        Optimizes activity order and time slots for a day.
        """
        pass

    @abstractmethod
    def generate_budget_optimization(self, trip_budget: Dict[str, Any], current_costs: Dict[str, Any], activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generates budget optimization recommendations.
        """
        pass

    @abstractmethod
    def generate_weather_replan(self, forecast: Dict[str, Any], activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Identifies weather-affected activities and suggests indoor replacements.
        """
        pass

    @abstractmethod
    def generate_refinement_actions(self, instruction: str, current_itinerary: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Converts natural language refinement instructions into structured itinerary mutation actions.
        """
        pass

class MockAIProvider(AIProviderInterface):
    """
    Development & Fallback Provider.
    Generates structured, destination-tailored activities adhering to AI prompt rules.
    Guarantees deterministic dates, chronological activity ordering, unique titles, and specific locations.
    """
    def generate_itinerary_json(self, ai_input: Dict[str, Any], prompt: str) -> str:
        from datetime import datetime, timedelta
        destination = ai_input.get("destination", {})
        dest_name = destination.get("name") or "Goa"
        total_days = ai_input.get("totalDays", 6)
        start_date_str = ai_input.get("startDate", "2026-10-15")

        try:
            clean_date = start_date_str.split('T')[0]
            base_date = datetime.strptime(clean_date, "%Y-%m-%d")
        except Exception:
            base_date = datetime(2026, 10, 15)

        dest_lower = dest_name.lower()
        is_goa = "goa" in dest_lower
        is_bihar = "bihar" in dest_lower or "patna" in dest_lower

        # Rich Goa Landmark Clusters
        goa_clusters = [
            {
                "title": "Day 1: North Goa Coastal & Fort Exploration",
                "summary": "Scenic coastal drive, beach promenade walk, and historic fort sunset views.",
                "activities": [
                    {
                        "timeSlot": "09:30 AM",
                        "title": "Calangute Beach Promenade Walk",
                        "description": "Morning coastal stroll along the famous golden sands of North Goa.",
                        "activityType": "SIGHTSEEING",
                        "locationName": "Calangute Beach, North Goa",
                        "latitude": 15.5438,
                        "longitude": 73.7554,
                        "estimatedCostInr": 200,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "01:00 PM",
                        "title": "Goan Seafood Lunch at Souza Lobo",
                        "description": "Authentic fish curry rice and beachfront dining experience.",
                        "activityType": "DINING",
                        "locationName": "Souza Lobo, Calangute",
                        "latitude": 15.5420,
                        "longitude": 73.7560,
                        "estimatedCostInr": 800,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "04:30 PM",
                        "title": "Fort Aguada & 17th Century Lighthouse Tour",
                        "description": "Explore the historic Portuguese fortress overviewing the Arabian Sea.",
                        "activityType": "SIGHTSEEING",
                        "locationName": "Fort Aguada, Candolim",
                        "latitude": 15.4920,
                        "longitude": 73.7737,
                        "estimatedCostInr": 300,
                        "bookingRequired": False,
                        "isConfirmed": False
                    }
                ]
            },
            {
                "title": "Day 2: Old Goa UNESCO World Heritage Walk",
                "summary": "Explore historic 16th-century Portuguese cathedrals and colonial architecture.",
                "activities": [
                    {
                        "timeSlot": "09:00 AM",
                        "title": "Basilica of Bom Jesus Guided Heritage Tour",
                        "description": "Visit the UNESCO World Heritage church housing Saint Francis Xavier relics.",
                        "activityType": "CULTURE",
                        "locationName": "Basilica of Bom Jesus, Old Goa",
                        "latitude": 15.5009,
                        "longitude": 73.9116,
                        "estimatedCostInr": 250,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "01:00 PM",
                        "title": "Traditional Goan Catholic Lunch at Venite",
                        "description": "Savory vindaloo and xacuti in a charming colonial house.",
                        "activityType": "DINING",
                        "locationName": "Venite Restaurant, Panaji",
                        "latitude": 15.4989,
                        "longitude": 73.8278,
                        "estimatedCostInr": 750,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "04:00 PM",
                        "title": "Se Cathedral & Archaeological Museum Visit",
                        "description": "Discover Asia's largest cathedral and colonial historical artifacts.",
                        "activityType": "CULTURE",
                        "locationName": "Se Cathedral, Old Goa",
                        "latitude": 15.5030,
                        "longitude": 73.9125,
                        "estimatedCostInr": 150,
                        "bookingRequired": False,
                        "isConfirmed": False
                    }
                ]
            },
            {
                "title": "Day 3: Panaji Capital & Latin Quarter Charm",
                "summary": "Wander through colorful Portuguese streets and waterfront promenades.",
                "activities": [
                    {
                        "timeSlot": "10:00 AM",
                        "title": "Fontainhas Latin Quarter Walking Photography Tour",
                        "description": "Stroll past vibrant Portuguese villas, art galleries, and narrow alleys.",
                        "activityType": "SIGHTSEEING",
                        "locationName": "Fontainhas Latin Quarter, Panaji",
                        "latitude": 15.4960,
                        "longitude": 73.8300,
                        "estimatedCostInr": 300,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "01:30 PM",
                        "title": "Bakery Break at Confeitaria 31 de Janeiro",
                        "description": "Sample historic Goan bebinca and fresh artisanal pastries.",
                        "activityType": "DINING",
                        "locationName": "Confeitaria 31 de Janeiro, Panaji",
                        "latitude": 15.4955,
                        "longitude": 73.8290,
                        "estimatedCostInr": 450,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "05:30 PM",
                        "title": "Miramar Beach Sunset Promenade",
                        "description": "Relaxing evening walk where the Mandovi River meets the Arabian Sea.",
                        "activityType": "RELAXATION",
                        "locationName": "Miramar Beach Promenade, Panaji",
                        "latitude": 15.4806,
                        "longitude": 73.8083,
                        "estimatedCostInr": 100,
                        "bookingRequired": False,
                        "isConfirmed": False
                    }
                ]
            },
            {
                "title": "Day 4: Spice Plantations & Ponda Temples",
                "summary": "Immerse in lush organic spice gardens and serene ancient temples.",
                "activities": [
                    {
                        "timeSlot": "09:30 AM",
                        "title": "Sahakari Spice Plantation Guided Tour",
                        "description": "Guided walk amidst nutmeg, cardamom, and cinnamon plantations.",
                        "activityType": "NATURE",
                        "locationName": "Sahakari Spice Farm, Ponda",
                        "latitude": 15.4024,
                        "longitude": 74.0152,
                        "estimatedCostInr": 600,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "01:00 PM",
                        "title": "Organic Banana Leaf Buffet Lunch",
                        "description": "Farm-to-table traditional lunch included with spice garden visit.",
                        "activityType": "DINING",
                        "locationName": "Ponda Spice Farm Dining, Ponda",
                        "latitude": 15.4030,
                        "longitude": 74.0160,
                        "estimatedCostInr": 500,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "04:00 PM",
                        "title": "Shri Mangueshi Temple Spiritual Visit",
                        "description": "Visit Goa's iconic 18th-century Hindu temple complex.",
                        "activityType": "CULTURE",
                        "locationName": "Shri Mangueshi Temple, Priol",
                        "latitude": 15.4385,
                        "longitude": 73.9682,
                        "estimatedCostInr": 100,
                        "bookingRequired": False,
                        "isConfirmed": False
                    }
                ]
            },
            {
                "title": "Day 5: South Goa Serenity & Cliffside Views",
                "summary": "Discover pristine southern beaches and panoramic cliff forts.",
                "activities": [
                    {
                        "timeSlot": "09:30 AM",
                        "title": "Palolem Crescent Beach Exploration",
                        "description": "Relax on one of South Goa's quietest coconut-lined beaches.",
                        "activityType": "BEACH",
                        "locationName": "Palolem Beach, Canacona",
                        "latitude": 15.0100,
                        "longitude": 74.0231,
                        "estimatedCostInr": 350,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "01:00 PM",
                        "title": "Fresh Catch Lunch at Dropadi Shack",
                        "description": "Enjoy grilled prawns and fresh coconut water by the waves.",
                        "activityType": "DINING",
                        "locationName": "Dropadi Beach Shack, Palolem",
                        "latitude": 15.0095,
                        "longitude": 74.0225,
                        "estimatedCostInr": 900,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "04:30 PM",
                        "title": "Cabo de Rama Fort Sunset Lookout",
                        "description": "Breathtaking sunset views from ancient cliffside fort ruins.",
                        "activityType": "SIGHTSEEING",
                        "locationName": "Cabo de Rama Fort, Canacona",
                        "latitude": 15.0886,
                        "longitude": 73.9192,
                        "estimatedCostInr": 200,
                        "bookingRequired": False,
                        "isConfirmed": False
                    }
                ]
            },
            {
                "title": "Day 6: Flea Markets & Mandovi Sunset Cruise",
                "summary": "Shop vibrant local markets and celebrate with a sunset river cruise.",
                "activities": [
                    {
                        "timeSlot": "10:00 AM",
                        "title": "Anjuna Flea Market Souvenir Shopping",
                        "description": "Browse bohemian handicrafts, spices, and handmade jewelry.",
                        "activityType": "SHOPPING",
                        "locationName": "Anjuna Flea Market, Anjuna",
                        "latitude": 15.5786,
                        "longitude": 73.7436,
                        "estimatedCostInr": 500,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "01:30 PM",
                        "title": "Cliffside Lunch at Curlies Beach Shack",
                        "description": "Classic beachfront spot with panoramic views of Anjuna coast.",
                        "activityType": "DINING",
                        "locationName": "Curlies Beach Shack, Anjuna",
                        "latitude": 15.5720,
                        "longitude": 73.7410,
                        "estimatedCostInr": 850,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "05:30 PM",
                        "title": "Mandovi River Sunset Cruise & Folk Dance",
                        "description": "Scenic evening cruise featuring traditional Goan folk performances.",
                        "activityType": "RELAXATION",
                        "locationName": "Mandovi River Boat Jetty, Panaji",
                        "latitude": 15.4980,
                        "longitude": 73.8320,
                        "estimatedCostInr": 650,
                        "bookingRequired": False,
                        "isConfirmed": False
                    }
                ]
            }
        ]

        # Rich Bihar / Patna Heritage Clusters
        bihar_clusters = [
            {
                "title": "Day 1: Patna Heritage & Ganges Riverfront",
                "summary": "Discover historic monuments, sacred temples, and scenic riverfront vistas.",
                "activities": [
                    {
                        "timeSlot": "09:30 AM",
                        "title": "Golghar Granary Heritage Walk & Panoramic View",
                        "description": "Climb the iconic 1786 beehive granary overlooking the Ganges River.",
                        "activityType": "SIGHTSEEING",
                        "locationName": "Golghar, Patna",
                        "latitude": 25.6190,
                        "longitude": 85.1444,
                        "estimatedCostInr": 50,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "01:00 PM",
                        "title": "Authentic Litti Chokha Lunch at Maurya Lok",
                        "description": "Traditional roasted sattu litti served with spicy eggplant chokha and desi ghee.",
                        "activityType": "DINING",
                        "locationName": "Maurya Lok Complex, Patna",
                        "latitude": 25.6112,
                        "longitude": 85.1378,
                        "estimatedCostInr": 250,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "05:30 PM",
                        "title": "Takht Sri Harmandir Sahib & Marine Drive Sunset Walk",
                        "description": "Visit sacred historic gurdwara followed by evening breeze on Ganga Path.",
                        "activityType": "CULTURE",
                        "locationName": "Patna Sahib & Ganga Path, Patna",
                        "latitude": 25.6025,
                        "longitude": 85.2280,
                        "estimatedCostInr": 100,
                        "bookingRequired": False,
                        "isConfirmed": False
                    }
                ]
            },
            {
                "title": "Day 2: Nalanda World Heritage Ruins & Rajgir Peace Pagoda",
                "summary": "Explore ancient 5th-century university ruins and serene aerial ropeway vistas.",
                "activities": [
                    {
                        "timeSlot": "09:00 AM",
                        "title": "Nalanda University Archaeological Site Tour",
                        "description": "Guided walk through ancient monastic cells, stupas, and brick temple ruins.",
                        "activityType": "CULTURE",
                        "locationName": "Nalanda Mahavihara, Nalanda",
                        "latitude": 25.1357,
                        "longitude": 85.4452,
                        "estimatedCostInr": 300,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "01:30 PM",
                        "title": "Regional Bihari Thali Lunch at Rajgir",
                        "description": "Hearty traditional meal with sattu parathas, khaja, and local curries.",
                        "activityType": "DINING",
                        "locationName": "Rajgir Heritage Dining, Rajgir",
                        "latitude": 25.0270,
                        "longitude": 85.4200,
                        "estimatedCostInr": 400,
                        "bookingRequired": False,
                        "isConfirmed": False
                    },
                    {
                        "timeSlot": "04:30 PM",
                        "title": "Vishwa Shanti Stupa & Ropeway Ride",
                        "description": "Ropeway ride to the Japanese Peace Pagoda atop Ratnagiri Hill.",
                        "activityType": "SIGHTSEEING",
                        "locationName": "Vishwa Shanti Stupa, Rajgir",
                        "latitude": 25.0068,
                        "longitude": 85.4389,
                        "estimatedCostInr": 200,
                        "bookingRequired": False,
                        "isConfirmed": False
                    }
                ]
            }
        ]

        days_list = []
        for d in range(1, total_days + 1):
            day_date = (base_date + timedelta(days=d - 1)).strftime("%Y-%m-%d")
            
            if is_goa and d <= len(goa_clusters):
                cluster = goa_clusters[d - 1]
                days_list.append({
                    "dayNumber": d,
                    "date": day_date,
                    "title": cluster["title"],
                    "summary": cluster["summary"],
                    "activities": cluster["activities"]
                })
            elif is_bihar and d <= len(bihar_clusters):
                cluster = bihar_clusters[d - 1]
                days_list.append({
                    "dayNumber": d,
                    "date": day_date,
                    "title": cluster["title"],
                    "summary": cluster["summary"],
                    "activities": cluster["activities"]
                })
            else:
                lat_offset = (destination.get("latitude") or 25.5941) + (d * 0.015)
                lng_offset = (destination.get("longitude") or 85.1376) + (d * 0.012)
                
                days_list.append({
                    "dayNumber": d,
                    "date": day_date,
                    "title": f"Day {d}: Historic Sights & Local Culture in {dest_name}",
                    "summary": f"Full day exploring primary landmarks, heritage spots, and regional food in {dest_name}.",
                    "activities": [
                        {
                            "timeSlot": "09:30 AM",
                            "title": f"Day {d} {dest_name} Landmark & Heritage Tour",
                            "description": f"Morning guided exploration of prominent cultural and historical highlights in {dest_name} (Zone {d}).",
                            "activityType": "SIGHTSEEING",
                            "locationName": f"{dest_name} Zone {d} Heritage Square",
                            "latitude": lat_offset,
                            "longitude": lng_offset,
                            "estimatedCostInr": 350 + (d * 50),
                            "bookingRequired": False,
                            "isConfirmed": False
                        },
                        {
                            "timeSlot": "01:00 PM",
                            "title": f"Day {d} Regional Lunch Experience in {dest_name}",
                            "description": f"Sample authentic culinary specialties and local dining delicacies in {dest_name}.",
                            "activityType": "DINING",
                            "locationName": f"{dest_name} Zone {d} Bistro",
                            "latitude": lat_offset + 0.002,
                            "longitude": lng_offset + 0.003,
                            "estimatedCostInr": 550,
                            "bookingRequired": False,
                            "isConfirmed": False
                        },
                        {
                            "timeSlot": "05:30 PM",
                            "title": f"Day {d} Evening Promenade & Sunset View in {dest_name}",
                            "description": f"Relaxing evening walk and scenic views at {dest_name}'s popular gathering spot.",
                            "activityType": "RELAXATION",
                            "locationName": f"{dest_name} Zone {d} Riverfront Promenade",
                            "latitude": lat_offset + 0.005,
                            "longitude": lng_offset + 0.007,
                            "estimatedCostInr": 200,
                            "bookingRequired": False,
                            "isConfirmed": False
                        }
                    ]
                })

        return json.dumps({
            "title": f"{dest_name} Custom Tour Package",
            "days": days_list
        })

    def generate_swap_recommendations(self, current_activity: Dict[str, Any], trip_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        dest_name = (trip_context.get("destination") or {}).get("name") or "Kolkata"
        is_kolkata = "kolkata" in dest_name.lower() or "calcutta" in dest_name.lower()
        is_goa = "goa" in dest_name.lower()

        if is_kolkata:
            return [
                {
                    "id": "swap_rec_1",
                    "name": "Indian Museum",
                    "description": "Explore India's oldest and largest museum featuring rare antiques and artifacts.",
                    "date": current_activity.get("date", "2026-10-15"),
                    "startTime": "10:00 AM",
                    "durationMinutes": 120,
                    "locationName": "Indian Museum, Park Street, Kolkata",
                    "latitude": 22.5576,
                    "longitude": 88.3500,
                    "estimatedCost": 200,
                    "reason": "Indoor cultural alternative"
                },
                {
                    "id": "swap_rec_2",
                    "name": "St. Paul's Cathedral",
                    "description": "Pristine Gothic cathedral with serene gardens and historic colonial stained glass.",
                    "date": current_activity.get("date", "2026-10-15"),
                    "startTime": "10:30 AM",
                    "durationMinutes": 90,
                    "locationName": "St. Paul's Cathedral, Cathedral Road, Kolkata",
                    "latitude": 22.5447,
                    "longitude": 88.3470,
                    "estimatedCost": 0,
                    "reason": "Heritage architecture"
                },
                {
                    "id": "swap_rec_3",
                    "name": "Birla Planetarium",
                    "description": "Iconic single-story dome planetarium offering immersive astronomy shows.",
                    "date": current_activity.get("date", "2026-10-15"),
                    "startTime": "11:00 AM",
                    "durationMinutes": 90,
                    "locationName": "Birla Planetarium, Jawaharlal Nehru Rd, Kolkata",
                    "latitude": 22.5458,
                    "longitude": 88.3473,
                    "estimatedCost": 150,
                    "reason": "Science & astronomy"
                }
            ]
        elif is_goa:
            return [
                {
                    "id": "swap_rec_1",
                    "name": "Fort Aguada & 17th Century Lighthouse",
                    "description": "Historic Portuguese fortress with expansive views of the Arabian Sea.",
                    "date": current_activity.get("date", "2026-10-15"),
                    "startTime": "10:00 AM",
                    "durationMinutes": 120,
                    "locationName": "Fort Aguada, Candolim, Goa",
                    "latitude": 15.4920,
                    "longitude": 73.7737,
                    "estimatedCost": 300,
                    "reason": "Coastal fortress view"
                },
                {
                    "id": "swap_rec_2",
                    "name": "Fontainhas Latin Quarter Walk",
                    "description": "Stroll past vibrant colorful Portuguese villas, art cafes, and narrow heritage lanes.",
                    "date": current_activity.get("date", "2026-10-15"),
                    "startTime": "10:30 AM",
                    "durationMinutes": 90,
                    "locationName": "Fontainhas Latin Quarter, Panaji, Goa",
                    "latitude": 15.4960,
                    "longitude": 73.8300,
                    "estimatedCost": 200,
                    "reason": "Heritage walking tour"
                },
                {
                    "id": "swap_rec_3",
                    "name": "Chapora Fort Sunset Promenade",
                    "description": "Scenic hilltop fort ruins offering panoramic coastline and river mouth views.",
                    "date": current_activity.get("date", "2026-10-15"),
                    "startTime": "04:30 PM",
                    "durationMinutes": 90,
                    "locationName": "Chapora Fort, Vagator, Goa",
                    "latitude": 15.6056,
                    "longitude": 73.7371,
                    "estimatedCost": 0,
                    "reason": "Scenic hilltop sunset"
                }
            ]
        else:
            return [
                {
                    "id": "swap_rec_1",
                    "name": f"{dest_name} Central Cultural Museum",
                    "description": f"Heritage exhibition showcasing regional history, art, and cultural artifacts in {dest_name}.",
                    "date": current_activity.get("date", "2026-10-15"),
                    "startTime": "10:00 AM",
                    "durationMinutes": 120,
                    "locationName": f"Central Museum, {dest_name}",
                    "latitude": current_activity.get("latitude") or 22.5726,
                    "longitude": current_activity.get("longitude") or 88.3639,
                    "estimatedCost": 200,
                    "reason": "Indoor cultural alternative"
                },
                {
                    "id": "swap_rec_2",
                    "name": f"{dest_name} Royal Botanical Promenade",
                    "description": f"Pristine green gardens with heritage flora, fountains, and peaceful shaded walking trails.",
                    "date": current_activity.get("date", "2026-10-15"),
                    "startTime": "10:30 AM",
                    "durationMinutes": 90,
                    "locationName": f"Botanical Promenade, {dest_name}",
                    "latitude": (current_activity.get("latitude") or 22.5726) + 0.005,
                    "longitude": (current_activity.get("longitude") or 88.3639) + 0.005,
                    "estimatedCost": 100,
                    "reason": "Nature & relaxation"
                },
                {
                    "id": "swap_rec_3",
                    "name": f"{dest_name} Artisanal Heritage Market",
                    "description": f"Vibrant traditional craft quarter featuring handmade art, local spices, and street tea stalls.",
                    "date": current_activity.get("date", "2026-10-15"),
                    "startTime": "11:00 AM",
                    "durationMinutes": 90,
                    "locationName": f"Artisanal Quarter, {dest_name}",
                    "latitude": (current_activity.get("latitude") or 22.5726) - 0.004,
                    "longitude": (current_activity.get("longitude") or 88.3639) - 0.004,
                    "estimatedCost": 0,
                    "reason": "Local heritage shopping"
                }
            ]

    def generate_chat_response(self, messages: List[Dict[str, str]], trip_context: Dict[str, Any]) -> Dict[str, Any]:
        dest_name = (trip_context.get("destination") or {}).get("name") or "your destination"
        last_user_msg = ""
        for m in reversed(messages or []):
            if _extract_msg_attr(m, "role") == "user":
                last_user_msg = _extract_msg_attr(m, "text")
                break

        q = last_user_msg.lower()
        if "food" in q or "eat" in q or "restaurant" in q or "dine" in q:
            return {
                "reply": f"Here are the top-rated local dining spots in {dest_name}: try regional thalis, seafood shacks, or historic colonial cafes near your stay.",
                "actionType": "food",
                "actionPayload": f"Top Dining in {dest_name}"
            }
        elif "cab" in q or "ride" in q or "transport" in q or "drive" in q:
            return {
                "reply": f"Chauffeur cabs and local rides are readily available in {dest_name}. You can pre-book transfers directly in VoyageAI.",
                "actionType": "cab",
                "actionPayload": dest_name
            }
        elif "map" in q or "nearby" in q or "place" in q:
            return {
                "reply": f"I've highlighted your location and scheduled itinerary spots on the VoyageAI map for {dest_name}.",
                "actionType": "map",
                "actionPayload": dest_name
            }
        elif "spent" in q or "budget" in q or "cost" in q:
            return {
                "reply": f"Your current trip budget for {dest_name} is managed in the Expense Ledger. Tap below to review real-time spending.",
                "actionType": "expense",
                "actionPayload": "Ledger"
            }
        else:
            return {
                "reply": f"I'm your VoyageAI Copilot for {dest_name}. Based on your scheduled itinerary, how would you like to refine your trip today?",
                "actionType": None,
                "actionPayload": None
            }

    def generate_day_optimization(self, day_info: Dict[str, Any], activities: List[Dict[str, Any]], goal: str) -> List[Dict[str, Any]]:
        # Sort activities chronologically by time slot and assign clean standard time slots
        slots = ["09:30 AM", "01:00 PM", "04:30 PM", "07:30 PM"]
        sorted_acts = sorted(activities, key=lambda a: (a.get("latitude") or 0) + (a.get("longitude") or 0))
        optimized = []
        for idx, act in enumerate(sorted_acts):
            updated = dict(act)
            updated["timeSlot"] = slots[idx % len(slots)]
            optimized.append(updated)
        return optimized

    def generate_budget_optimization(self, trip_budget: Dict[str, Any], current_costs: Dict[str, Any], activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        target_budget = trip_budget.get("targetAmount", 30000)
        current_projected = current_costs.get("totalProjected", 35000)
        savings_needed = max(0, current_projected - target_budget)

        recs = []
        for act in activities:
            if act.get("estimatedCostInr", 0) > 600:
                recs.append({
                    "type": "REPLACE_ACTIVITY",
                    "activityId": act.get("id"),
                    "activityTitle": act.get("title"),
                    "currentCost": act.get("estimatedCostInr"),
                    "replacementCost": 200,
                    "savings": act.get("estimatedCostInr", 0) - 200,
                    "replacement": {
                        "name": f"Free Heritage Walk & Local Exploration near {act.get('locationName', 'City Center')}",
                        "description": "Guided walking tour exploring local markets and historic architecture.",
                        "timeSlot": act.get("timeSlot", "10:00 AM"),
                        "locationName": act.get("locationName", "City Center"),
                        "latitude": act.get("latitude", 15.54),
                        "longitude": act.get("longitude", 73.75),
                        "estimatedCost": 200
                    },
                    "reason": "Reduces activity cost while preserving cultural experience"
                })
                if len(recs) >= 2:
                    break

        return {
            "currentProjectedCost": current_projected,
            "targetBudget": target_budget,
            "savingsRequired": savings_needed,
            "recommendations": recs
        }

    def generate_weather_replan(self, forecast: Dict[str, Any], activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        recs = []
        for act in activities:
            title_lower = (act.get("title") or "").lower()
            if any(kw in title_lower for kw in ["beach", "fort", "promenade", "outdoor", "cruise", "market"]):
                recs.append({
                    "action": "REPLACE_ACTIVITY",
                    "activityId": act.get("id"),
                    "activityTitle": act.get("title"),
                    "weatherAlert": forecast.get("condition", "Heavy Monsoon Rain"),
                    "replacement": {
                        "name": f"Indoor Cultural Museum & Art Gallery Visit",
                        "description": "Explore covered historical galleries, art exhibits, and indoor artisan cafes.",
                        "timeSlot": act.get("timeSlot", "02:00 PM"),
                        "locationName": f"Central Cultural Museum, {act.get('locationName', 'City')}",
                        "latitude": act.get("latitude", 15.5),
                        "longitude": act.get("longitude", 73.8),
                        "estimatedCost": 250
                    },
                    "reason": "Avoids heavy rain during outdoor period"
                })
                if len(recs) >= 2:
                    break

        return {
            "weatherAlert": forecast,
            "recommendations": recs
        }

    def generate_refinement_actions(self, instruction: str, current_itinerary: Dict[str, Any]) -> List[Dict[str, Any]]:
        actions = []
        days = current_itinerary.get("days", [])
        for day in days:
            for act in day.get("activities", []):
                if act.get("estimatedCostInr", 0) > 700:
                    actions.append({
                        "type": "REPLACE_ACTIVITY",
                        "dayId": day.get("id"),
                        "activityId": act.get("id"),
                        "activityTitle": act.get("title"),
                        "replacement": {
                            "name": f"Relaxed Local Promenade & Artisanal Tea Stalls",
                            "description": "Scenery stroll and traditional tea tasting experience.",
                            "timeSlot": act.get("timeSlot", "04:00 PM"),
                            "locationName": act.get("locationName", "City Promenade"),
                            "latitude": act.get("latitude", 15.5),
                            "longitude": act.get("longitude", 73.8),
                            "estimatedCost": 150
                        },
                        "reason": f"Refined based on user instruction: '{instruction}'"
                    })
                    return actions
        return actions

# ---------------------------------------------------------
# Vertex AI Integration Setup (matching template)
# ---------------------------------------------------------
class GeminiProvider(AIProviderInterface):
    """
    Google Gemini API Provider for Itinerary Generation & Assistant tools.
    Uses centralized HTTP execution with automatic JSON fence stripping.
    """
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key
        self.model_name = model_name

    def _get_api_key(self) -> str:
        key = self.api_key or os.getenv("GEMINI_API_KEY")
        if not key or not key.strip():
            logger.error("[AI_CONFIG_ERROR] GEMINI_API_KEY is missing or empty.")
            raise ValueError("AI_CONFIG_ERROR: GEMINI_API_KEY is missing or empty.")
        return key.strip()

    def _execute_gemini_request(self, prompt: str, temperature: float = 0.2, timeout: int = 25) -> str:
        """Centralized executor handling network calls, status logging, and JSON extraction."""
        api_key = self._get_api_key()
        model_name = _resolve_model_name(self.model_name)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": temperature
            }
        }

        max_retries = 2
        for attempt in range(1, max_retries + 1):
            try:
                response = requests.post(url, json=payload, headers=headers, timeout=timeout)

                if response.status_code == 200:
                    res_json = response.json()
                    candidates = res_json.get("candidates", [])
                    if not candidates:
                        raise ValueError("AI_INVALID_OUTPUT: Gemini returned empty candidates.")

                    parts = candidates[0].get("content", {}).get("parts", [])
                    if not parts or "text" not in parts[0]:
                        raise ValueError("AI_INVALID_OUTPUT: Gemini returned no text content.")

                    raw_text = parts[0]["text"].strip()
                    if raw_text.startswith("```"):
                        raw_text = re.sub(r"^```(?:json)?\n?", "", raw_text, flags=re.IGNORECASE)
                        raw_text = re.sub(r"\n?```$", "", raw_text)
                    return raw_text

                logger.error(f"[GEMINI HTTP {response.status_code}] Details: {response.text}")

                if response.status_code in (401, 403):
                    raise RuntimeError(f"AI_AUTH_ERROR: Invalid API Key (HTTP {response.status_code})")
                elif response.status_code == 404:
                    raise RuntimeError(f"AI_GENERATION_ERROR: Model '{model_name}' not found (HTTP 404). Check GEMINI_MODEL.")
                elif response.status_code == 429:
                    raise RuntimeError("AI_QUOTA_ERROR: Gemini rate limit exceeded (HTTP 429)")
                elif response.status_code in (500, 502, 503, 504) and attempt < max_retries:
                    time.sleep(1.5)
                    continue
                else:
                    raise RuntimeError(f"AI_GENERATION_ERROR: Gemini API error HTTP {response.status_code}")

            except requests.exceptions.Timeout:
                if attempt < max_retries:
                    time.sleep(1.0)
                    continue
                raise RuntimeError("AI_TIMEOUT: Gemini API request timed out.")
            except requests.exceptions.RequestException as net_err:
                if attempt < max_retries:
                    time.sleep(1.0)
                    continue
                raise RuntimeError(f"AI_GENERATION_ERROR: Network error: {net_err}")

    def generate_itinerary_json(self, ai_input: Dict[str, Any], prompt: str) -> str:
        raw_text = self._execute_gemini_request(prompt, temperature=0.2, timeout=30)
        json_data = json.loads(raw_text)
        return json.dumps(json_data)

    def generate_swap_recommendations(self, current_activity: Dict[str, Any], trip_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        dest_name = (trip_context.get("destination") or {}).get("name") or "India"
        prompt = f"""You are an expert travel concierge for VoyageAI. Provide 3 high-quality, realistic alternative activities to replace a specific item in a traveler's itinerary.

LOCATION & TRIP CONTEXT:
- Destination: {dest_name}
- Current Trip Budget: {trip_context.get('budgetLevel', 'MODERATE')}

ACTIVITY TO REPLACE:
- Name: {current_activity.get('title')}
- Slot: {current_activity.get('timeSlot')} (Date: {current_activity.get('date', 'N/A')})
- Location: {current_activity.get('locationName')}
- Est. Cost: ₹{current_activity.get('estimatedCostInr', 0)}
- Description: {current_activity.get('description')}

REQUIREMENTS:
1. Provide EXACTLY 3 distinct alternatives that fit the time slot "{current_activity.get('timeSlot')}".
2. Diversify options:
   - Option 1: Similar vibe/category in the same district.
   - Option 2: Lower-cost or culturally distinct alternative.
   - Option 3: Relaxed or experiential alternative.
3. Do NOT recommend the venue being replaced.
4. Keep durations realistic (60 to 180 minutes).

Output ONLY a valid JSON object matching this schema:
{{
  "recommendations": [
    {{
      "id": "swap-1",
      "name": "Distinct Alternative Name",
      "description": "Concise summary of what makes this experience worthwhile.",
      "date": "{current_activity.get('date', '2026-10-15')}",
      "startTime": "{current_activity.get('timeSlot', '10:00 AM')}",
      "durationMinutes": 90,
      "locationName": "Precise Establishment Name, Neighborhood",
      "latitude": 22.5726,
      "longitude": 88.3639,
      "estimatedCost": 300,
      "reason": "Direct explanation of why this replaces the original activity effectively."
    }}
  ]
}}
"""
        try:
            raw_text = self._execute_gemini_request(prompt, temperature=0.3, timeout=12)
            data = json.loads(raw_text)
            recs = data.get("recommendations")
            if isinstance(recs, list) and len(recs) > 0:
                return recs
        except Exception as e:
            logger.warning(f"[SWAP RECS WARN] Live Gemini call failed: {e}. Falling back to mock.")
        return MockAIProvider().generate_swap_recommendations(current_activity, trip_context)

    def generate_chat_response(self, messages: List[Dict[str, str]], trip_context: Dict[str, Any]) -> Dict[str, Any]:
        dest_name = (trip_context.get("destination") or {}).get("name") or "India"
        formatted_messages = "\n".join([f"{_extract_msg_attr(m, 'role', 'user').upper()}: {_extract_msg_attr(m, 'text', '')}" for m in (messages or [])[-6:]])

        nearby_str = ""
        if trip_context.get("nearbyPlaces"):
            nearby_str = f"\n- User Physical Location & Real Nearby Spots: {json.dumps(trip_context.get('nearbyPlaces'))}"

        prompt = f"""You are VoyageAI's in-trip AI Concierge. Deliver direct, contextual, and accurate travel assistance for {dest_name}, India.

TRIP PROFILE:
- Target Destination: {dest_name}
- Duration: {trip_context.get('totalDays', 4)} Days | Budget: {trip_context.get('budgetLevel', 'MODERATE')}
- Current Itinerary Context: {json.dumps(trip_context.get('currentItinerarySummary', 'Not provided'))}{nearby_str}

CONVERSATION HISTORY:
{formatted_messages}

OPERATING GUIDELINES:
1. Be warm, hyper-local, and practical. Keep responses under 3-4 sentences unless detailed recommendations are explicitly requested.
2. If suggesting dining or locations, prioritize places physically near the active itinerary stops or current POIs.
3. ACTION ROUTING:
   - Set `actionType: "food"` if user asks for dining, cafes, bars, or food spots.
   - Set `actionType: "cab"` if user asks to travel, hail a cab, or navigate between locations.
   - Set `actionType: "map"` if user asks where a place is or asks for directions.
   - Set `actionType: "expense"` if user mentions spending, logging costs, or budgets.
   - Otherwise, set `actionType: null`.
4. Set `actionPayload` to the specific search query or destination string for the UI to consume (or null if none).

Output ONLY valid JSON:
{{
  "reply": "Conversational, accurate response directly answering the traveler.",
  "actionType": "food|cab|map|expense|null",
  "actionPayload": "string or null"
}}
"""
        try:
            raw_text = self._execute_gemini_request(prompt, temperature=0.3, timeout=12)
            data = json.loads(raw_text)
            if isinstance(data, dict) and "reply" in data:
                raw_reply = data["reply"]
                if isinstance(raw_reply, dict):
                    data["reply"] = raw_reply.get("reply") or raw_reply.get("text") or str(raw_reply)
                elif isinstance(raw_reply, str) and raw_reply.strip().startswith("{") and raw_reply.strip().endswith("}"):
                    try:
                        sub_json = json.loads(raw_reply.strip())
                        if isinstance(sub_json, dict) and "reply" in sub_json:
                            data["reply"] = sub_json["reply"]
                    except Exception:
                        pass
                return data
        except Exception as e:
            logger.warning(f"[CHAT WARN] Live Gemini call failed: {e}. Falling back to mock.")
        return MockAIProvider().generate_chat_response(messages, trip_context)

    def generate_day_optimization(self, day_info: Dict[str, Any], activities: List[Dict[str, Any]], goal: str) -> List[Dict[str, Any]]:
        prompt = f"""You are VoyageAI's Route Optimization Engine. Reorder and balance activities for Day {day_info.get('dayNumber', 1)} to achieve: "{goal}".

CURRENT ACTIVITIES ON SCHEDULE:
{json.dumps(activities, indent=2)}

RULES:
1. PRESERVE IDs: Every input `id` must be returned in `optimizedActivities` with its original value unchanged. Do NOT invent new IDs or drop existing ones.
2. GEOGRAPHIC SEQUENCING: Reorder stops to minimize transit distance and eliminate geographic backtracking.
3. TIME ALLOCATION: Reassign `timeSlot` sequentially (format: "hh:mm AM/PM"), allowing reasonable transit and dwell buffers between stops.

Output ONLY valid JSON:
{{
  "optimizedActivities": [
    {{
      "id": "original_id_preserved",
      "timeSlot": "09:30 AM",
      "title": "Activity Name",
      "locationName": "Location Name",
      "latitude": 15.54,
      "longitude": 73.75
    }}
  ]
}}
"""
        try:
            raw_text = self._execute_gemini_request(prompt, temperature=0.2, timeout=15)
            data = json.loads(raw_text)
            opt = data.get("optimizedActivities")
            if isinstance(opt, list) and len(opt) > 0:
                act_map = {a["id"]: a for a in activities if "id" in a}
                result = []
                for item in opt:
                    orig = act_map.get(item.get("id"))
                    if orig:
                        merged = dict(orig)
                        if item.get("timeSlot"):
                            merged["timeSlot"] = item["timeSlot"]
                        result.append(merged)
                if len(result) == len(activities):
                    return result
        except Exception as e:
            logger.warning(f"[DAY OPTIMIZATION WARN] Live Gemini call failed: {e}. Falling back to mock.")
        return MockAIProvider().generate_day_optimization(day_info, activities, goal)

    def generate_budget_optimization(self, trip_budget: Dict[str, Any], current_costs: Dict[str, Any], activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        prompt = f"""You are VoyageAI's Budget Optimization Specialist. Identify disproportionately expensive activities in the itinerary and propose lower-cost, high-value alternatives to meet the target budget.

FINANCIAL SNAPSHOT:
- Target Budget: ₹{trip_budget.get('targetAmount', 30000)}
- Current Total Projected: ₹{current_costs.get('totalProjected', 35000)}
- Deficit to Cut: ₹{max(0, current_costs.get('totalProjected', 35000) - trip_budget.get('targetAmount', 30000))}

SCHEDULED ACTIVITIES:
{json.dumps(activities, indent=2)}

INSTRUCTIONS:
1. Target activities where premium costs can be reduced without ruining the travel experience.
2. Math check: Ensure `currentCost - replacementCost = savings` exactly.
3. Match the replacement's `timeSlot` and geographical vicinity to the original activity.

Output ONLY valid JSON:
{{
  "currentProjectedCost": {current_costs.get('totalProjected', 35000)},
  "targetBudget": {trip_budget.get('targetAmount', 30000)},
  "savingsRequired": {max(0, current_costs.get('totalProjected', 35000) - trip_budget.get('targetAmount', 30000))},
  "recommendations": [
    {{
      "type": "REPLACE_ACTIVITY",
      "activityId": "original_activity_id",
      "activityTitle": "Original Activity Title",
      "currentCost": 1200,
      "replacementCost": 300,
      "savings": 900,
      "replacement": {{
        "name": "High-Value Alternative Title",
        "description": "Why this is an authentic, budget-friendly replacement.",
        "timeSlot": "Original or adjusted timeSlot",
        "locationName": "Specific Place Name",
        "latitude": 15.54,
        "longitude": 73.75,
        "estimatedCost": 300
      }},
      "reason": "Clear financial and experiential justification."
    }}
  ]
}}
"""
        try:
            raw_text = self._execute_gemini_request(prompt, temperature=0.2, timeout=15)
            data = json.loads(raw_text)
            if "recommendations" in data:
                return data
        except Exception as e:
            logger.warning(f"[BUDGET OPTIMIZATION WARN] Live Gemini call failed: {e}. Falling back to mock.")
        return MockAIProvider().generate_budget_optimization(trip_budget, current_costs, activities)

    def generate_weather_replan(self, forecast: Dict[str, Any], activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        prompt = f"""You are VoyageAI's Dynamic Weather Re-planning Assistant.
Audit the scheduled activities against the weather forecast. Identify exposed outdoor activities at risk from severe weather and propose verified indoor or sheltered alternatives.

WEATHER ADVISORY:
{json.dumps(forecast)}

CURRENT ACTIVITIES:
{json.dumps(activities, indent=2)}

INSTRUCTIONS:
1. Flag ONLY activities genuinely compromised by the forecast condition.
2. Provide an indoor alternative in the same general neighborhood matching the original time slot.
3. Retain exact `activityId` from the input for tracking.

Output ONLY valid JSON:
{{
  "weatherAlert": {json.dumps(forecast)},
  "recommendations": [
    {{
      "action": "REPLACE_ACTIVITY",
      "activityId": "original_activity_id",
      "activityTitle": "Original Outdoor Activity Title",
      "weatherAlert": "{forecast.get('condition', 'Adverse Weather')}",
      "replacement": {{
        "name": "Indoor Alternative Title",
        "description": "Short explanation of the indoor experience.",
        "timeSlot": "Preserved timeSlot",
        "locationName": "Specific Indoor Location, City",
        "latitude": 15.5,
        "longitude": 73.8,
        "estimatedCost": 250
      }},
      "reason": "Why this indoor alternative is safe and enjoyable under current conditions."
    }}
  ]
}}
"""
        try:
            raw_text = self._execute_gemini_request(prompt, temperature=0.2, timeout=15)
            data = json.loads(raw_text)
            if "recommendations" in data:
                return data
        except Exception as e:
            logger.warning(f"[WEATHER REPLAN WARN] Live Gemini call failed: {e}. Falling back to mock.")
        return MockAIProvider().generate_weather_replan(forecast, activities)

    def generate_refinement_actions(self, instruction: str, current_itinerary: Dict[str, Any]) -> List[Dict[str, Any]]:
        prompt = f"""You are VoyageAI's conversational itinerary editing engine.
Translate the user's natural language instruction into precise structured modification actions.

USER INSTRUCTION: "{instruction}"
CURRENT ITINERARY SUMMARY:
{json.dumps(current_itinerary, indent=2)}

INSTRUCTION:
Generate structured actions to execute. Return ONLY valid JSON matching this schema:
{{
  "actions": [
    {{
      "type": "REPLACE_ACTIVITY",
      "dayId": "day_id_if_known",
      "activityId": "activity_id_to_modify",
      "activityTitle": "Original Activity Title",
      "replacement": {{
        "name": "New Replacement Activity Title",
        "description": "Short description",
        "timeSlot": "10:00 AM",
        "locationName": "Specific Place Name",
        "latitude": 15.54,
        "longitude": 73.75,
        "estimatedCost": 200
      }},
      "reason": "Why this action fulfills user instruction"
    }}
  ]
}}
"""
        try:
            raw_text = self._execute_gemini_request(prompt, temperature=0.2, timeout=15)
            data = json.loads(raw_text)
            acts = data.get("actions")
            if isinstance(acts, list):
                return acts
        except Exception as e:
            logger.warning(f"[REFINEMENT WARN] Live Gemini call failed: {e}. Falling back to mock.")
        return MockAIProvider().generate_refinement_actions(instruction, current_itinerary)


def get_ai_provider() -> AIProviderInterface:
    provider_type = os.getenv("AI_PROVIDER", "gemini").lower().strip()
    if provider_type == "mock":
        return MockAIProvider()
    else:
        return GeminiProvider()


class DynamicAIProviderProxy(AIProviderInterface):
    """
    Proxy that dynamically routes to the currently configured AIProvider based on AI_PROVIDER env var.
    If the active provider (e.g. Gemini) encounters an error (503, 429, timeout, network error),
    it automatically falls back to MockAIProvider so that trip itinerary generation and AI concierge never hang.
    """
    def generate_itinerary_json(self, ai_input: Dict[str, Any], prompt: str) -> str:
        provider = get_ai_provider()
        try:
            return provider.generate_itinerary_json(ai_input, prompt)
        except Exception as err:
            if not isinstance(provider, MockAIProvider):
                print(f"\n[AI_FALLBACK] Primary AI Provider ({provider.__class__.__name__}) error: {err}", flush=True)
                print(f"[AI_FALLBACK] Automatically falling back to MockAIProvider to complete generation cleanly...\n", flush=True)
                return MockAIProvider().generate_itinerary_json(ai_input, prompt)
            raise

    def generate_swap_recommendations(self, current_activity: Dict[str, Any], trip_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        provider = get_ai_provider()
        try:
            return provider.generate_swap_recommendations(current_activity, trip_context)
        except Exception as err:
            if not isinstance(provider, MockAIProvider):
                print(f"\n[AI_FALLBACK] Swap recommendations error ({err}). Falling back to MockAIProvider...", flush=True)
                return MockAIProvider().generate_swap_recommendations(current_activity, trip_context)
            raise

    def generate_chat_response(self, messages: List[Dict[str, str]], trip_context: Dict[str, Any]) -> Dict[str, Any]:
        provider = get_ai_provider()
        try:
            return provider.generate_chat_response(messages, trip_context)
        except Exception as err:
            if not isinstance(provider, MockAIProvider):
                print(f"\n[AI_FALLBACK] Chat response error ({err}). Falling back to MockAIProvider...", flush=True)
                return MockAIProvider().generate_chat_response(messages, trip_context)
            raise

    def generate_day_optimization(self, day_info: Dict[str, Any], activities: List[Dict[str, Any]], goal: str) -> List[Dict[str, Any]]:
        provider = get_ai_provider()
        try:
            return provider.generate_day_optimization(day_info, activities, goal)
        except Exception as err:
            if not isinstance(provider, MockAIProvider):
                print(f"\n[AI_FALLBACK] Day optimization error ({err}). Falling back to MockAIProvider...", flush=True)
                return MockAIProvider().generate_day_optimization(day_info, activities, goal)
            raise

    def generate_budget_optimization(self, trip_budget: Dict[str, Any], current_costs: Dict[str, Any], activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        provider = get_ai_provider()
        try:
            return provider.generate_budget_optimization(trip_budget, current_costs, activities)
        except Exception as err:
            if not isinstance(provider, MockAIProvider):
                print(f"\n[AI_FALLBACK] Budget optimization error ({err}). Falling back to MockAIProvider...", flush=True)
                return MockAIProvider().generate_budget_optimization(trip_budget, current_costs, activities)
            raise

    def generate_weather_replan(self, forecast: Dict[str, Any], activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        provider = get_ai_provider()
        try:
            return provider.generate_weather_replan(forecast, activities)
        except Exception as err:
            if not isinstance(provider, MockAIProvider):
                print(f"\n[AI_FALLBACK] Weather replan error ({err}). Falling back to MockAIProvider...", flush=True)
                return MockAIProvider().generate_weather_replan(forecast, activities)
            raise

    def generate_refinement_actions(self, instruction: str, current_itinerary: Dict[str, Any]) -> List[Dict[str, Any]]:
        provider = get_ai_provider()
        try:
            return provider.generate_refinement_actions(instruction, current_itinerary)
        except Exception as err:
            if not isinstance(provider, MockAIProvider):
                print(f"\n[AI_FALLBACK] Refinement error ({err}). Falling back to MockAIProvider...", flush=True)
                return MockAIProvider().generate_refinement_actions(instruction, current_itinerary)
            raise

# Active Provider Service Instance
ai_provider_service = DynamicAIProviderProxy()



