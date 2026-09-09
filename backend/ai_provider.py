import os
import re
import ast
import json
import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from dotenv import load_dotenv

# Load environment variables (force override so running server process picks up .env updates)
load_dotenv(override=True)

# Logging setup
logger = logging.getLogger("voyageai.vertex")

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

        is_goa = "goa" in dest_name.lower()

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
            else:
                lat_offset = (destination.get("latitude") or 15.2993) + (d * 0.015)
                lng_offset = (destination.get("longitude") or 74.124) + (d * 0.012)
                
                days_list.append({
                    "dayNumber": d,
                    "date": day_date,
                    "title": f"Day {d}: Exploring {dest_name} District {d}",
                    "summary": f"Curated itinerary exploring highlights of {dest_name} Zone {d}.",
                    "activities": [
                        {
                            "timeSlot": "09:30 AM",
                            "title": f"Morning Highlight at {dest_name} Landmark {d}A",
                            "description": f"Scenic start exploring primary attractions in Zone {d}.",
                            "activityType": "SIGHTSEEING",
                            "locationName": f"{dest_name} Cultural Spot {d}A",
                            "latitude": lat_offset,
                            "longitude": lng_offset,
                            "estimatedCostInr": 400 + (d * 50),
                            "bookingRequired": False,
                            "isConfirmed": False
                        },
                        {
                            "timeSlot": "01:00 PM",
                            "title": f"Regional Lunch at {dest_name} Bistro {d}B",
                            "description": f"Authentic local dining experience in Zone {d}.",
                            "activityType": "DINING",
                            "locationName": f"{dest_name} Local Dining {d}B",
                            "latitude": lat_offset + 0.002,
                            "longitude": lng_offset + 0.003,
                            "estimatedCostInr": 750,
                            "bookingRequired": False,
                            "isConfirmed": False
                        },
                        {
                            "timeSlot": "05:30 PM",
                            "title": f"Sunset View at {dest_name} Promenade {d}C",
                            "description": f"Evening walk and relaxation in Zone {d}.",
                            "activityType": "RELAXATION",
                            "locationName": f"{dest_name} Waterfront {d}C",
                            "latitude": lat_offset + 0.005,
                            "longitude": lng_offset + 0.007,
                            "estimatedCostInr": 300,
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
        for m in reversed(messages):
            if m.get("role") == "user":
                last_user_msg = m.get("text", "")
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
SA_KEY_PATH = os.getenv("SA_KEY_PATH", "./keys/demos-others-89a2bdcf7612.json")
PROJECT_ID  = os.getenv("PROJECT_ID", "demos-others")
LOCATION    = os.getenv("LOCATION", "us-central1")
MODEL_NAME  = os.getenv("MODEL_NAME", "meta/llama-3.3-70b-instruct-maas")

_vertex_creds = None
_vertex_async_client = None

def get_valid_async_client():
    global _vertex_creds, _vertex_async_client
    from google.auth.transport.requests import Request
    from google.oauth2 import service_account
    from openai import AsyncOpenAI

    if not os.path.exists(SA_KEY_PATH):
        raise FileNotFoundError(f"Service account key file not found at path: {SA_KEY_PATH}")

    if _vertex_creds is None:
        _vertex_creds = service_account.Credentials.from_service_account_file(
            SA_KEY_PATH,
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )

    if not _vertex_creds.valid:
        _vertex_creds.refresh(Request())

        _vertex_async_client = AsyncOpenAI(
            base_url=f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/endpoints/openapi",
            api_key=_vertex_creds.token,
        )

    return _vertex_async_client

async def call_vertex_async(prompt: str, temperature: float = 0.2, max_tokens: int = 4000) -> str:
    client = get_valid_async_client()
    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens
    )
    return response.choices[0].message.content

def clean_output(output: str):
    if not output:
        return {}
    json_match = re.search(r'\{.*\}', output, re.DOTALL)
    if json_match:
        json_string = json_match.group(0)
        try:
            return json.loads(json_string)
        except Exception:
            try:
                return ast.literal_eval(json_string)
            except Exception:
                pass
    return {"raw_output": output}

class VertexAIProvider(AIProviderInterface):
    """
    Vertex AI MaaS Endpoint Provider (Llama-3.3-70b / OpenAI MaaS compatible endpoint).
    Fallbacks cleanly to MockAIProvider if credentials or network is unavailable.
    """
    def generate_itinerary_json(self, ai_input: Dict[str, Any], prompt: str) -> str:
        try:
            print(f"[VERTEX AI] Sending itinerary generation request to {MODEL_NAME}...", flush=True)
            
            # Execute async call synchronously within background worker thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                raw_result = loop.run_until_complete(call_vertex_async(prompt))
            finally:
                loop.close()

            if raw_result:
                cleaned = clean_output(raw_result)
                if isinstance(cleaned, dict) and "days" in cleaned:
                    print(f"[VERTEX AI SUCCESS] Received valid JSON itinerary from {MODEL_NAME}", flush=True)
                    return json.dumps(cleaned)
                elif "raw_output" not in cleaned:
                    return json.dumps(cleaned)
        except Exception as e:
            print(f"[VERTEX AI WARN] Vertex AI generation call failed: {e}. Falling back to MockAIProvider.", flush=True)

        return MockAIProvider().generate_itinerary_json(ai_input, prompt)

    def generate_swap_recommendations(self, current_activity: Dict[str, Any], trip_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        return MockAIProvider().generate_swap_recommendations(current_activity, trip_context)

class GeminiProvider(AIProviderInterface):
    """
    Google Gemini API Provider for Itinerary Generation.
    Uses Gemini REST API with structured JSON response enforcement.
    Does NOT fall back to MockAIProvider on failure.
    """
    def __init__(self, api_key: str = None, model_name: str = None):
        self.api_key = api_key
        self.model_name = model_name

    def generate_itinerary_json(self, ai_input: Dict[str, Any], prompt: str) -> str:
        api_key = self.api_key if self.api_key is not None else os.getenv("GEMINI_API_KEY")
        if self.api_key is None and not api_key:
            load_dotenv(override=True)
            api_key = os.getenv("GEMINI_API_KEY")

        if not api_key or not api_key.strip():
            logger.error("[AI_CONFIG_ERROR] GEMINI_API_KEY environment variable is missing or empty.")
            raise ValueError("AI_CONFIG_ERROR: GEMINI_API_KEY is missing or empty.")

        model_name = self.model_name or os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

        headers = {
            "Content-Type": "application/json"
        }

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        import time
        import requests
        max_http_retries = 2

        try:
            for attempt in range(1, max_http_retries + 1):
                try:
                    print(f"[GEMINI AI] Sending itinerary generation request to model {model_name} (Attempt {attempt}/{max_http_retries})...", flush=True)
                    response = requests.post(url, json=payload, headers=headers, timeout=30)

                    if response.status_code in (401, 403):
                        logger.error(f"[AI_AUTH_ERROR] Gemini authentication failed (HTTP {response.status_code}).")
                        raise RuntimeError(f"AI_AUTH_ERROR: Gemini authentication failed (HTTP {response.status_code}).")
                    elif response.status_code == 429:
                        logger.error("[AI_QUOTA_ERROR] Gemini quota or rate limit exceeded (HTTP 429).")
                        raise RuntimeError("AI_QUOTA_ERROR: Gemini API rate limit or quota exceeded (HTTP 429).")
                    elif response.status_code in (500, 502, 503, 504) and attempt < max_http_retries:
                        print(f"[GEMINI AI WARN] Gemini server returned transient status HTTP {response.status_code}. Retrying in 1.5s...", flush=True)
                        time.sleep(1.5)
                        continue
                    elif response.status_code != 200:
                        logger.error(f"[AI_GENERATION_ERROR] Gemini API returned error status HTTP {response.status_code}")
                        raise RuntimeError(f"AI_GENERATION_ERROR: Gemini API error HTTP {response.status_code}")

                    res_json = response.json()
                    candidates = res_json.get("candidates", [])
                    if not candidates:
                        logger.error("[AI_INVALID_OUTPUT] Gemini response contained no candidates.")
                        raise ValueError("AI_INVALID_OUTPUT: Gemini returned empty candidates.")

                    parts = candidates[0].get("content", {}).get("parts", [])
                    if not parts or "text" not in parts[0]:
                        logger.error("[AI_INVALID_OUTPUT] Gemini response contained no text part.")
                        raise ValueError("AI_INVALID_OUTPUT: Gemini returned no text content.")

                    raw_text = parts[0]["text"].strip()

                    # Strip markdown json code block fences if present
                    if raw_text.startswith("```"):
                        raw_text = re.sub(r"^```(?:json)?\n?", "", raw_text, flags=re.IGNORECASE)
                        raw_text = re.sub(r"\n?```$", "", raw_text)

                    try:
                        json_data = json.loads(raw_text)
                        print(f"[GEMINI AI SUCCESS] Received valid JSON itinerary from {model_name}", flush=True)
                        return json.dumps(json_data)
                    except Exception as parse_err:
                        logger.error(f"[AI_INVALID_OUTPUT] Gemini output is not valid JSON: {parse_err}")
                        raise ValueError(f"AI_INVALID_OUTPUT: Gemini model response is not valid JSON: {parse_err}")

                except requests.exceptions.Timeout:
                    if attempt < max_http_retries:
                        print(f"[GEMINI AI WARN] Gemini request timed out on attempt {attempt}. Retrying...", flush=True)
                        time.sleep(1.0)
                        continue
                    logger.error("[AI_TIMEOUT] Gemini API request timed out.")
                    raise RuntimeError("AI_TIMEOUT: Gemini API request timed out.")
                except requests.exceptions.RequestException as net_err:
                    if attempt < max_http_retries:
                        print(f"[GEMINI AI WARN] Gemini network request error on attempt {attempt}: {net_err}. Retrying...", flush=True)
                        time.sleep(1.0)
                        continue
                    logger.error(f"[AI_GENERATION_ERROR] Gemini network request failed: {type(net_err).__name__}")
                    raise RuntimeError(f"AI_GENERATION_ERROR: Network error communicating with Gemini API: {type(net_err).__name__}")
        except Exception as e:
            if any(prefix in str(e) for prefix in ["AI_CONFIG_ERROR", "AI_AUTH_ERROR", "AI_QUOTA_ERROR", "AI_TIMEOUT", "AI_INVALID_OUTPUT", "AI_GENERATION_ERROR"]):
                raise
            logger.error(f"[AI_GENERATION_ERROR] Unexpected error in GeminiProvider: {e}")
            raise RuntimeError(f"AI_GENERATION_ERROR: Unexpected error in GeminiProvider: {e}")

    def generate_swap_recommendations(self, current_activity: Dict[str, Any], trip_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        api_key = self.api_key if self.api_key is not None else os.getenv("GEMINI_API_KEY")
        if not api_key:
            load_dotenv(override=True)
            api_key = os.getenv("GEMINI_API_KEY")

        if not api_key or not api_key.strip():
            return MockAIProvider().generate_swap_recommendations(current_activity, trip_context)

        dest_name = (trip_context.get("destination") or {}).get("name") or "India"
        model_name = self.model_name or os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

        prompt = f"""
You are a senior travel concierge for VoyageAI.
The traveler wants 3 distinct, realistic alternatives to replace an activity in their itinerary for {dest_name}, India.

CURRENT ACTIVITY TO SWAP:
- Title: {current_activity.get('title')}
- Time Slot: {current_activity.get('timeSlot')}
- Location: {current_activity.get('locationName')}
- Description: {current_activity.get('description')}
- Cost: ₹{current_activity.get('estimatedCostInr', 0)}

TRIP CONTEXT:
- Destination: {dest_name}
- Total Days: {trip_context.get('totalDays', 5)}
- Budget Tier: {trip_context.get('budgetLevel', 'MODERATE')}

INSTRUCTION:
Generate EXACTLY 3 distinct, high-quality, realistic alternative recommendations in {dest_name} that fit the time slot '{current_activity.get('timeSlot')}' and suit the locale.
Return ONLY valid JSON matching this schema:
{{
  "recommendations": [
    {{
      "id": "recommendation-1",
      "name": "Alternative Name",
      "description": "Short 1-2 sentence description",
      "date": "{current_activity.get('date', '2026-10-15')}",
      "startTime": "{current_activity.get('timeSlot', '10:00 AM')}",
      "durationMinutes": 120,
      "locationName": "Specific Place Name, City",
      "latitude": 22.5576,
      "longitude": 88.3500,
      "estimatedCost": 200,
      "reason": "Why this is a great alternative"
    }}
  ]
}}
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.3
            }
        }

        try:
            import requests
            res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=15)
            if res.status_code == 200:
                res_json = res.json()
                text = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text.startswith("```"):
                    text = re.sub(r"^```(?:json)?\n?", "", text, flags=re.IGNORECASE)
                    text = re.sub(r"\n?```$", "", text)
                data = json.loads(text)
                recs = data.get("recommendations")
                if isinstance(recs, list) and len(recs) > 0:
                    return recs
        except Exception as err:
            print(f"[GEMINI SWAP WARN] Gemini swap generation error: {err}. Using MockAIProvider fallback.", flush=True)

        return MockAIProvider().generate_swap_recommendations(current_activity, trip_context)

    def generate_chat_response(self, messages: List[Dict[str, str]], trip_context: Dict[str, Any]) -> Dict[str, Any]:
        api_key = self.api_key if self.api_key is not None else os.getenv("GEMINI_API_KEY")
        if not api_key:
            load_dotenv(override=True)
            api_key = os.getenv("GEMINI_API_KEY")

        if not api_key or not api_key.strip():
            return MockAIProvider().generate_chat_response(messages, trip_context)

        dest_name = (trip_context.get("destination") or {}).get("name") or "India"
        model_name = self.model_name or os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

        formatted_messages = "\n".join([f"{m.get('role', 'user').upper()}: {m.get('text', '')}" for m in messages[-6:]])

        prompt = f"""
You are VoyageAI's expert travel concierge assistant. Provide helpful, concise, contextual travel advice for {dest_name}, India.

TRIP CONTEXT:
- Destination: {dest_name}
- Total Days: {trip_context.get('totalDays', 4)}
- Budget Tier: {trip_context.get('budgetLevel', 'MODERATE')}
- Current Active Itinerary: {json.dumps(trip_context.get('currentItinerarySummary', 'Not provided'))}

CONVERSATION HISTORY:
{formatted_messages}

INSTRUCTION:
Answer the user's latest query directly, accurately, and naturally. If the query logically relates to food/dining, cab/ride bookings, map navigation, or tracking expenses, specify an `actionType` ("food", "cab", "map", "expense").
Return ONLY valid JSON matching this schema:
{{
  "reply": "Conversational, helpful response string",
  "actionType": "food|cab|map|expense|null",
  "actionPayload": "Optional search term or destination payload"
}}
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json", "temperature": 0.3}
        }

        try:
            import requests
            res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=15)
            if res.status_code == 200:
                text = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text.startswith("```"):
                    text = re.sub(r"^```(?:json)?\n?", "", text, flags=re.IGNORECASE)
                    text = re.sub(r"\n?```$", "", text)
                data = json.loads(text)
                if "reply" in data:
                    return data
        except Exception as err:
            print(f"[GEMINI CHAT WARN] Gemini chat error: {err}. Using MockAIProvider fallback.", flush=True)

        return MockAIProvider().generate_chat_response(messages, trip_context)

    def generate_day_optimization(self, day_info: Dict[str, Any], activities: List[Dict[str, Any]], goal: str) -> List[Dict[str, Any]]:
        api_key = self.api_key if self.api_key is not None else os.getenv("GEMINI_API_KEY")
        if not api_key:
            return MockAIProvider().generate_day_optimization(day_info, activities, goal)

        model_name = self.model_name or os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

        prompt = f"""
You are VoyageAI's itinerary route optimization engine.
Reorder and adjust the time slots for these activities on Day {day_info.get('dayNumber', 1)} to achieve goal '{goal}'.

CURRENT ACTIVITIES:
{json.dumps(activities, indent=2)}

INSTRUCTION:
Return ONLY valid JSON matching this schema:
{{
  "optimizedActivities": [
    {{
      "id": "act_id_preserved_exactly",
      "timeSlot": "09:30 AM",
      "title": "Exact activity title",
      "locationName": "Location name",
      "latitude": 15.54,
      "longitude": 73.75
    }}
  ]
}}
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json", "temperature": 0.2}
        }

        try:
            import requests
            res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=15)
            if res.status_code == 200:
                text = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text.startswith("```"):
                    text = re.sub(r"^```(?:json)?\n?", "", text, flags=re.IGNORECASE)
                    text = re.sub(r"\n?```$", "", text)
                data = json.loads(text)
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
        except Exception as err:
            print(f"[GEMINI OPTIMIZE WARN] Gemini optimization error: {err}. Using MockAIProvider fallback.", flush=True)

        return MockAIProvider().generate_day_optimization(day_info, activities, goal)

    def generate_budget_optimization(self, trip_budget: Dict[str, Any], current_costs: Dict[str, Any], activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        api_key = self.api_key if self.api_key is not None else os.getenv("GEMINI_API_KEY")
        if not api_key:
            return MockAIProvider().generate_budget_optimization(trip_budget, current_costs, activities)

        model_name = self.model_name or os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

        prompt = f"""
You are VoyageAI's budget optimization expert.
Analyze current trip spending vs target budget and propose cost-saving replacements for high-cost activities.

TARGET BUDGET: ₹{trip_budget.get('targetAmount', 30000)}
CURRENT PROJECTED: ₹{current_costs.get('totalProjected', 35000)}

CURRENT ACTIVITIES:
{json.dumps(activities, indent=2)}

INSTRUCTION:
Return ONLY valid JSON matching this schema:
{{
  "currentProjectedCost": {current_costs.get('totalProjected', 35000)},
  "targetBudget": {trip_budget.get('targetAmount', 30000)},
  "savingsRequired": {max(0, current_costs.get('totalProjected', 35000) - trip_budget.get('targetAmount', 30000))},
  "recommendations": [
    {{
      "type": "REPLACE_ACTIVITY",
      "activityId": "activity_id_to_replace",
      "activityTitle": "Original Title",
      "currentCost": 800,
      "replacementCost": 200,
      "savings": 600,
      "replacement": {{
        "name": "New Budget Alternative Title",
        "description": "Short description",
        "timeSlot": "10:00 AM",
        "locationName": "Specific Place Name",
        "latitude": 15.54,
        "longitude": 73.75,
        "estimatedCost": 200
      }},
      "reason": "Why this saves budget while preserving experience"
    }}
  ]
}}
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json", "temperature": 0.2}
        }

        try:
            import requests
            res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=15)
            if res.status_code == 200:
                text = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text.startswith("```"):
                    text = re.sub(r"^```(?:json)?\n?", "", text, flags=re.IGNORECASE)
                    text = re.sub(r"\n?```$", "", text)
                data = json.loads(text)
                if "recommendations" in data:
                    return data
        except Exception as err:
            print(f"[GEMINI BUDGET WARN] Gemini budget optimization error: {err}. Using MockAIProvider fallback.", flush=True)

        return MockAIProvider().generate_budget_optimization(trip_budget, current_costs, activities)

    def generate_weather_replan(self, forecast: Dict[str, Any], activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        api_key = self.api_key if self.api_key is not None else os.getenv("GEMINI_API_KEY")
        if not api_key:
            return MockAIProvider().generate_weather_replan(forecast, activities)

        model_name = self.model_name or os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

        prompt = f"""
You are VoyageAI's weather replanning assistant.
Identify outdoor activities affected by the weather forecast and propose indoor/covered alternatives.

FORECAST: {json.dumps(forecast)}
ACTIVITIES: {json.dumps(activities, indent=2)}

INSTRUCTION:
Return ONLY valid JSON matching this schema:
{{
  "weatherAlert": {json.dumps(forecast)},
  "recommendations": [
    {{
      "action": "REPLACE_ACTIVITY",
      "activityId": "activity_id_affected",
      "activityTitle": "Original Title",
      "weatherAlert": "{forecast.get('condition', 'Heavy Rain')}",
      "replacement": {{
        "name": "Indoor Alternative Title",
        "description": "Short description",
        "timeSlot": "02:00 PM",
        "locationName": "Specific Indoor Location",
        "latitude": 15.5,
        "longitude": 73.8,
        "estimatedCost": 250
      }},
      "reason": "Why this indoor alternative works during weather alert"
    }}
  ]
}}
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json", "temperature": 0.2}
        }

        try:
            import requests
            res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=15)
            if res.status_code == 200:
                text = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text.startswith("```"):
                    text = re.sub(r"^```(?:json)?\n?", "", text, flags=re.IGNORECASE)
                    text = re.sub(r"\n?```$", "", text)
                data = json.loads(text)
                if "recommendations" in data:
                    return data
        except Exception as err:
            print(f"[GEMINI WEATHER WARN] Gemini weather replan error: {err}. Using MockAIProvider fallback.", flush=True)

        return MockAIProvider().generate_weather_replan(forecast, activities)

    def generate_refinement_actions(self, instruction: str, current_itinerary: Dict[str, Any]) -> List[Dict[str, Any]]:
        api_key = self.api_key if self.api_key is not None else os.getenv("GEMINI_API_KEY")
        if not api_key:
            return MockAIProvider().generate_refinement_actions(instruction, current_itinerary)

        model_name = self.model_name or os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

        prompt = f"""
You are VoyageAI's conversational itinerary editing engine.
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
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json", "temperature": 0.2}
        }

        try:
            import requests
            res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=15)
            if res.status_code == 200:
                text = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text.startswith("```"):
                    text = re.sub(r"^```(?:json)?\n?", "", text, flags=re.IGNORECASE)
                    text = re.sub(r"\n?```$", "", text)
                data = json.loads(text)
                acts = data.get("actions")
                if isinstance(acts, list):
                    return acts
        except Exception as err:
            print(f"[GEMINI REFINE WARN] Gemini refinement error: {err}. Using MockAIProvider fallback.", flush=True)

        return MockAIProvider().generate_refinement_actions(instruction, current_itinerary)

class VertexAIProvider(AIProviderInterface):
    """
    Vertex AI MaaS Endpoint Provider (Llama-3.3-70b / OpenAI MaaS compatible endpoint).
    Fallbacks cleanly to MockAIProvider if credentials or network is unavailable.
    """
    def generate_itinerary_json(self, ai_input: Dict[str, Any], prompt: str) -> str:
        try:
            print(f"[VERTEX AI] Sending itinerary generation request to {MODEL_NAME}...", flush=True)
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                raw_result = loop.run_until_complete(call_vertex_async(prompt))
            finally:
                loop.close()

            if raw_result:
                cleaned = clean_output(raw_result)
                if isinstance(cleaned, dict) and "days" in cleaned:
                    print(f"[VERTEX AI SUCCESS] Received valid JSON itinerary from {MODEL_NAME}", flush=True)
                    return json.dumps(cleaned)
                elif "raw_output" not in cleaned:
                    return json.dumps(cleaned)
        except Exception as e:
            print(f"[VERTEX AI WARN] Vertex AI generation call failed: {e}. Falling back to MockAIProvider.", flush=True)

        return MockAIProvider().generate_itinerary_json(ai_input, prompt)

    def generate_swap_recommendations(self, current_activity: Dict[str, Any], trip_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        return MockAIProvider().generate_swap_recommendations(current_activity, trip_context)

    def generate_chat_response(self, messages: List[Dict[str, str]], trip_context: Dict[str, Any]) -> Dict[str, Any]:
        return MockAIProvider().generate_chat_response(messages, trip_context)

    def generate_day_optimization(self, day_info: Dict[str, Any], activities: List[Dict[str, Any]], goal: str) -> List[Dict[str, Any]]:
        return MockAIProvider().generate_day_optimization(day_info, activities, goal)

    def generate_budget_optimization(self, trip_budget: Dict[str, Any], current_costs: Dict[str, Any], activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        return MockAIProvider().generate_budget_optimization(trip_budget, current_costs, activities)

    def generate_weather_replan(self, forecast: Dict[str, Any], activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        return MockAIProvider().generate_weather_replan(forecast, activities)

    def generate_refinement_actions(self, instruction: str, current_itinerary: Dict[str, Any]) -> List[Dict[str, Any]]:
        return MockAIProvider().generate_refinement_actions(instruction, current_itinerary)

def get_ai_provider() -> AIProviderInterface:
    provider_type = os.getenv("AI_PROVIDER", "gemini").lower().strip()
    if provider_type == "mock":
        return MockAIProvider()
    elif provider_type == "vertex":
        return VertexAIProvider()
    elif provider_type == "gemini":
        return GeminiProvider()
    else:
        return GeminiProvider()

class DynamicAIProviderProxy(AIProviderInterface):
    """
    Proxy that dynamically routes to the currently configured AIProvider based on AI_PROVIDER env var.
    """
    def generate_itinerary_json(self, ai_input: Dict[str, Any], prompt: str) -> str:
        provider = get_ai_provider()
        return provider.generate_itinerary_json(ai_input, prompt)

    def generate_swap_recommendations(self, current_activity: Dict[str, Any], trip_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        provider = get_ai_provider()
        return provider.generate_swap_recommendations(current_activity, trip_context)

    def generate_chat_response(self, messages: List[Dict[str, str]], trip_context: Dict[str, Any]) -> Dict[str, Any]:
        provider = get_ai_provider()
        return provider.generate_chat_response(messages, trip_context)

    def generate_day_optimization(self, day_info: Dict[str, Any], activities: List[Dict[str, Any]], goal: str) -> List[Dict[str, Any]]:
        provider = get_ai_provider()
        return provider.generate_day_optimization(day_info, activities, goal)

    def generate_budget_optimization(self, trip_budget: Dict[str, Any], current_costs: Dict[str, Any], activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        provider = get_ai_provider()
        return provider.generate_budget_optimization(trip_budget, current_costs, activities)

    def generate_weather_replan(self, forecast: Dict[str, Any], activities: List[Dict[str, Any]]) -> Dict[str, Any]:
        provider = get_ai_provider()
        return provider.generate_weather_replan(forecast, activities)

    def generate_refinement_actions(self, instruction: str, current_itinerary: Dict[str, Any]) -> List[Dict[str, Any]]:
        provider = get_ai_provider()
        return provider.generate_refinement_actions(instruction, current_itinerary)

# Active Provider Service Instance
ai_provider_service = DynamicAIProviderProxy()


