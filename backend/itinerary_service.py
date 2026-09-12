import json
import uuid
import re
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, List
from sqlalchemy.orm import Session

from models_trip import TripModel
from models_itinerary import ItineraryModel, ItineraryDayModel, ItineraryActivityModel
from schemas_itinerary import GeneratedItinerarySchema
from ai_provider import ai_provider_service

def calculate_day_date(start_date_str: str, day_number: int) -> str:
    """
    Deterministically derives itinerary day date from trip start_date.
    Example: start_date="2026-10-15", day_number=3 -> "2026-10-17"
    """
    try:
        clean_date_str = start_date_str.split('T')[0]
        base_date = datetime.strptime(clean_date_str, "%Y-%m-%d")
        target_date = base_date + timedelta(days=day_number - 1)
        return target_date.strftime("%Y-%m-%d")
    except Exception:
        return start_date_str

def parse_time_to_minutes(time_str: str) -> int:
    """
    Converts time slots ("09:30 AM", "01:00 PM", "18:00") into minutes from midnight for chronological sorting.
    """
    if not time_str:
        return 0
    
    clean_str = time_str.strip().upper()
    
    match_12 = re.search(r'(\d{1,2}):(\d{2})\s*(AM|PM)', clean_str)
    if match_12:
        hours = int(match_12.group(1))
        minutes = int(match_12.group(2))
        period = match_12.group(3)
        if period == "PM" and hours < 12:
            hours += 12
        elif period == "AM" and hours == 12:
            hours = 0
        return hours * 60 + minutes
    
    match_24 = re.search(r'(\d{1,2}):(\d{2})', clean_str)
    if match_24:
        hours = int(match_24.group(1))
        minutes = int(match_24.group(2))
        return hours * 60 + minutes

    if "MORNING" in clean_str or "BREAKFAST" in clean_str:
        return 9 * 60
    if "LUNCH" in clean_str or "AFTERNOON" in clean_str:
        return 13 * 60
    if "SUNSET" in clean_str or "EVENING" in clean_str:
        return 17 * 60 + 30
    if "NIGHT" in clean_str or "DINNER" in clean_str:
        return 20 * 60

    return 12 * 60

GENERIC_PLACEHOLDERS = {
    "central goa", "old quarter goa", "waterfront goa",
    "central destination", "old quarter destination", "waterfront destination",
    "destination", "central location", "city center"
}

def validate_and_sanitize_itinerary(parsed_schema: GeneratedItinerarySchema, expected_days: int, start_date_str: str) -> Tuple[bool, str]:
    """
    Strict Integrity Validation & Sanitization Pipeline:
    1. Deterministically derives dates from start_date + (day_number - 1).
    2. Ensures exactly expected_days exist.
    3. Ensures dayNumbers are sequential 1..expected_days.
    4. Sorts activities chronologically within each day.
    5. Rejects generic placeholder location names.
    6. Rejects cross-day duplicate activities (same title + location).
    7. Validates coordinate diversity across distinct venues.
    """
    if not parsed_schema.days or len(parsed_schema.days) != expected_days:
        return False, f"Day count mismatch: Expected {expected_days}, got {len(parsed_schema.days) if parsed_schema.days else 0}"

    seen_activity_keys = set()
    coord_map = {}  # (lat, lng) -> set of location names

    for idx, day in enumerate(parsed_schema.days, start=1):
        # 1. Sequential day numbers
        if day.dayNumber != idx:
            return False, f"Non-sequential day number at index {idx}: got {day.dayNumber}"

        # 2. Deterministic Date Override
        day.date = calculate_day_date(start_date_str, day.dayNumber)

        # 3. Chronological Activity Ordering
        day.activities.sort(key=lambda act: parse_time_to_minutes(act.timeSlot))

        if not day.activities:
            return False, f"Day {day.dayNumber} contains no activities"

        for act in day.activities:
            act.isConfirmed = False  # Recommendation boundary rule

            # 4. Check for generic location placeholders
            loc_lower = (act.locationName or "").strip().lower()
            if not loc_lower or loc_lower in GENERIC_PLACEHOLDERS:
                return False, f"Generic or missing location placeholder on Day {day.dayNumber}: '{act.locationName}'"

            # 5. Check cross-day duplicate activities
            norm_key = (act.title.strip().lower(), loc_lower)
            if norm_key in seen_activity_keys:
                return False, f"Duplicate activity detected across days: '{act.title}' at '{act.locationName}'"
            seen_activity_keys.add(norm_key)

            # 6. Coordinate Reuse Detection
            if act.latitude is not None and act.longitude is not None:
                coord_key = (round(act.latitude, 4), round(act.longitude, 4))
                if coord_key not in coord_map:
                    coord_map[coord_key] = set()
                coord_map[coord_key].add(loc_lower)

    # Check if a single coordinate pair is hardcoded for > 2 distinctly named locations
    for coord_key, loc_set in coord_map.items():
        if len(loc_set) > 2:
            return False, f"Coordinate pair {coord_key} hardcoded for multiple distinct locations: {loc_set}"

    return True, "Valid"

def construct_ai_prompt(ai_input: Dict[str, Any]) -> str:
    dest = ai_input.get('destination', {})
    dest_name = dest.get('name', 'Goa')
    total_days = ai_input.get('totalDays', 6)
    start_date = ai_input.get('startDate', '2026-10-15')
    prefs = ai_input.get('preferencesSnapshot', {})
    styles = prefs.get('travelStyles', ['RELAXED'])
    budget = ai_input.get('budget', {}).get('level', 'MODERATE')

    return f"""You are VoyageAI's expert travel planner. Generate a detailed, highly specific {total_days}-day itinerary for {dest_name}.

--- TRIP PARAMETERS ---
Destination: {dest_name} ({dest.get('country', 'India')})
Start Date: {start_date} (Format YYYY-MM-DD)
Total Days: {total_days}
Travelers: {ai_input.get('travelersCount', 2)}
Style/Vibe: {', '.join(styles)}
Budget Tier: {budget}

--- CRITICAL INTEGRITY RULES ---
1. DETERMINISTIC DATES: Compute dates sequentially for each day starting from {start_date}:
   Day 1 = {start_date}
   Day 2 = next day, Day 3 = day after, etc.
2. GEOGRAPHIC & ACTIVITY VARIETY:
   - Every day MUST focus on a distinct area/cluster of {dest_name} and feature 100% UNIQUE activities.
   - For Goa, organize by distinct regions:
     * Day 1: North Goa Beaches & Forts (Calangute, Baga, Fort Aguada)
     * Day 2: Old Goa UNESCO Heritage (Basilica of Bom Jesus, Se Cathedral, Museums)
     * Day 3: Panaji Capital & Fontainhas Latin Quarter Promenade
     * Day 4: Ponda Tropical Spice Plantations & Heritage Temples
     * Day 5: South Goa Scenic Coastline (Palolem Beach, Cabo de Rama Fort)
     * Day 6: Mandovi Sunset Cruise & Local Flea Markets
3. CHRONOLOGICAL SORTING: Order activities within each day strictly by time (e.g. 09:00 AM -> 01:00 PM -> 05:00 PM).
4. SPECIFIC LOCATIONS: Every activity MUST have a real, specific `locationName` (e.g. "Basilica of Bom Jesus, Old Goa", "Calangute Beach, North Goa"). NEVER use generic placeholders like "Central Goa", "Old Quarter Goa", or "Waterfront Goa".
5. REALISTIC COORDINATES: Provide accurate latitude and longitude for each unique location. Do NOT repeat identical coordinates for different venues.
6. EXACT DAY COUNT: The `days` array MUST contain exactly {total_days} day objects.
7. RECOMMENDATION ONLY: Set `isConfirmed = false` and `bookingRequired = false`.

Return ONLY valid JSON matching this schema:
{{
  "title": "{dest_name} Tour Package",
  "days": [
    {{
      "dayNumber": 1,
      "date": "{start_date}",
      "title": "Day 1: North Goa Coastal & Fort Exploration",
      "summary": "Scenic coastal drive, beach exploration, and historic fort views.",
      "activities": [
        {{
          "timeSlot": "09:30 AM",
          "title": "Calangute Beach Promenade Walk",
          "description": "Morning coastal walk along golden sands.",
          "activityType": "SIGHTSEEING",
          "locationName": "Calangute Beach, North Goa",
          "latitude": 15.5438,
          "longitude": 73.7554,
          "estimatedCostInr": 200,
          "bookingRequired": false,
          "isConfirmed": false
        }},
        {{
          "timeSlot": "01:00 PM",
          "title": "Goan Seafood Lunch at Souza Lobo",
          "description": "Authentic fish curry rice and beachfront dining.",
          "activityType": "DINING",
          "locationName": "Souza Lobo, Calangute",
          "latitude": 15.5420,
          "longitude": 73.7560,
          "estimatedCostInr": 800,
          "bookingRequired": false,
          "isConfirmed": false
        }},
        {{
          "timeSlot": "04:30 PM",
          "title": "Fort Aguada & 17th Century Lighthouse Tour",
          "description": "Historic Portuguese fort overviewing Arabian Sea.",
          "activityType": "SIGHTSEEING",
          "locationName": "Fort Aguada, Candolim",
          "latitude": 15.4920,
          "longitude": 73.7737,
          "estimatedCostInr": 300,
          "bookingRequired": false,
          "isConfirmed": false
        }}
      ]
    }}
  ]
}}
"""

def process_async_itinerary_generation(trip_id: str, db_session_factory):
    """
    Background worker function for asynchronous itinerary generation.
    Enforces strict integrity validation and deterministic date calculations.
    """
    db: Session = db_session_factory()
    try:
        trip = db.query(TripModel).filter(TripModel.id == trip_id).first()
        if not trip:
            return

        now = datetime.utcnow().isoformat() + "Z"
        ai_input = {
            "destination": trip.destination,
            "startDate": trip.start_date,
            "endDate": trip.end_date,
            "totalDays": trip.total_days,
            "travelersCount": len(trip.travelers),
            "budget": trip.budget,
            "preferencesSnapshot": trip.preferences_snapshot
        }

        print(f"\n[TRIP CREATION STEP 1/3] Generating AI itinerary for '{trip.title}' (Destination: {trip.destination.get('name')}, {trip.total_days} Days)", flush=True)

        prompt = construct_ai_prompt(ai_input)

        # 1. Invoke AI Provider
        print(f"[TRIP CREATION STEP 2/3] Invoking AI Provider ({ai_provider_service.__class__.__name__})...", flush=True)
        raw_json = ai_provider_service.generate_itinerary_json(ai_input, prompt)

        # 2. Pydantic Schema Validation & Integrity Check
        parsed_schema = None
        is_valid = False
        validation_msg = ""

        try:
            parsed_schema = GeneratedItinerarySchema.model_validate_json(raw_json)
            is_valid, validation_msg = validate_and_sanitize_itinerary(parsed_schema, trip.total_days, trip.start_date)
        except Exception as pyd_err:
            validation_msg = f"Schema parsing failed: {pyd_err}"

        # 3. Maximum 1 retry attempt with active AI Provider if initial generation was invalid (and provider is not mock)
        import os
        current_provider = os.getenv("AI_PROVIDER", "gemini").lower().strip()
        if not is_valid and current_provider != "mock":
            print(f"[TRIP CREATION WARN] Validation retry triggered: {validation_msg}", flush=True)
            retry_prompt = prompt + f"\n\nIMPORTANT CORRECTION: Your previous JSON response failed validation: {validation_msg}. Please fix this and return a valid JSON itinerary."
            try:
                raw_json_retry = ai_provider_service.generate_itinerary_json(ai_input, retry_prompt)
                parsed_schema = GeneratedItinerarySchema.model_validate_json(raw_json_retry)
                is_valid, validation_msg = validate_and_sanitize_itinerary(parsed_schema, trip.total_days, trip.start_date)
            except Exception as retry_err:
                validation_msg = f"Retry failed: {retry_err}"

        if not is_valid:
            print(f"❌ [TRIP CREATION FAILED] Integrity check failed: {validation_msg}", flush=True)
            raise ValueError(f"AI_GENERATION_ERROR: {validation_msg}")

        # 4. Save to Database
        from ai_provider import get_ai_provider
        active_provider_instance = get_ai_provider()
        provider_name = active_provider_instance.__class__.__name__

        print(f"💾 [TRIP CREATION STEP 3/3] Saving itinerary ({len(parsed_schema.days)} Days) to PostgreSQL database...", flush=True)
        itinerary_id = f"itin_{uuid.uuid4().hex[:12]}"
        
        existing_itin = db.query(ItineraryModel).filter(ItineraryModel.trip_id == trip_id).first()
        version = (existing_itin.version + 1) if existing_itin else 1

        if existing_itin:
            db.delete(existing_itin)
            db.commit()

        itin_record = ItineraryModel(
            id=itinerary_id,
            trip_id=trip_id,
            version=version,
            status="READY",
            provider_name=provider_name,
            created_at=now,
            updated_at=now
        )
        db.add(itin_record)
        db.flush()

        total_activities = 0
        for day_data in parsed_schema.days:
            day_id = f"day_{uuid.uuid4().hex[:10]}"
            day_record = ItineraryDayModel(
                id=day_id,
                itinerary_id=itinerary_id,
                day_number=day_data.dayNumber,
                date=day_data.date,
                title=day_data.title,
                summary=day_data.summary
            )
            db.add(day_record)
            db.flush()

            for act_data in day_data.activities:
                total_activities += 1
                act_record = ItineraryActivityModel(
                    id=f"act_{uuid.uuid4().hex[:10]}",
                    day_id=day_id,
                    time_slot=act_data.timeSlot,
                    title=act_data.title,
                    description=act_data.description,
                    activity_type=act_data.activityType,
                    location_name=act_data.locationName,
                    latitude=act_data.latitude,
                    longitude=act_data.longitude,
                    estimated_cost_inr=act_data.estimatedCostInr,
                    booking_required=act_data.bookingRequired,
                    is_confirmed=False
                )
                db.add(act_record)

        trip.itinerary_status = "READY"
        trip.updated_at = now
        db.commit()
        print(f"✨ [TRIP CREATION SUCCESS] Trip '{trip.title}' ready with {len(parsed_schema.days)} Days and {total_activities} Activities!\n", flush=True)

        try:
            from main import log_pipeline_5_steps
            user_sends = {
                "destination": trip.destination,
                "startDate": trip.start_date,
                "endDate": trip.end_date,
                "travelersCount": len(trip.travelers),
                "tripStyle": (trip.preferences_snapshot or {}).get("travelStyles", []),
                "budgetLevel": (trip.budget or {}).get("level", "MODERATE")
            }
            backend_received = {
                "tripId": trip.id,
                "userId": trip.user_id,
                "destinationName": trip.destination.get("name") if isinstance(trip.destination, dict) else "Destination",
                "calculatedTotalDays": trip.total_days,
                "startDate": trip.start_date,
                "endDate": trip.end_date,
                "travelersCount": len(trip.travelers)
            }
            given_to_ai = {
                "input_data": ai_input,
                "prompt": prompt
            }
            ai_returned = parsed_schema.model_dump()
            send_to_frontend = {
                "id": trip.id,
                "title": trip.title,
                "status": trip.status,
                "itineraryStatus": "READY",
                "destination": trip.destination,
                "startDate": trip.start_date,
                "endDate": trip.end_date,
                "totalDays": trip.total_days,
                "daysCount": len(parsed_schema.days),
                "activitiesCount": total_activities,
                "days": [d.model_dump() for d in parsed_schema.days]
            }
            log_pipeline_5_steps(
                flow_name="Trip Creation & AI Itinerary Generation",
                user_sends=user_sends,
                backend_received=backend_received,
                given_to_ai=given_to_ai,
                ai_returned=ai_returned,
                send_to_frontend=send_to_frontend
            )
        except Exception as log_err:
            print(f"[PIPELINE LOG WARN] Failed to print pipeline log: {log_err}", flush=True)

    except Exception as e:
        db.rollback()
        import traceback
        print(f"[ITINERARY ASYNC WARN] Generation error for trip {trip_id}: {e}", flush=True)
        print(traceback.format_exc(), flush=True)
        try:
            trip = db.query(TripModel).filter(TripModel.id == trip_id).first()
            if trip:
                trip.itinerary_status = "FAILED"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()

def optimize_day_flow_service(db: Session, trip_id: str, day_id: str, goal: str = "MINIMIZE_TRAVEL_TIME") -> Dict[str, Any]:
    day = db.query(ItineraryDayModel).filter(ItineraryDayModel.id == day_id).first()
    if not day:
        raise ValueError("Target itinerary day not found")

    activities = db.query(ItineraryActivityModel).filter(ItineraryActivityModel.day_id == day_id).all()
    if not activities:
        return {"status": "SUCCESS", "message": "No activities to optimize", "dayId": day_id, "activities": []}

    act_dicts = []
    for a in activities:
        act_dicts.append({
            "id": a.id,
            "timeSlot": a.time_slot,
            "title": a.title,
            "description": a.description,
            "locationName": a.location_name,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "estimatedCostInr": a.estimated_cost_inr
        })

    day_info = {"dayNumber": day.day_number, "date": day.date, "title": day.title}
    optimized_list = ai_provider_service.generate_day_optimization(day_info, act_dicts, goal)

    for item in optimized_list:
        act_rec = db.query(ItineraryActivityModel).filter(ItineraryActivityModel.id == item["id"]).first()
        if act_rec:
            if item.get("timeSlot"):
                act_rec.time_slot = item["timeSlot"]
            if item.get("title"):
                act_rec.title = item["title"]

    db.commit()

    updated_acts = db.query(ItineraryActivityModel).filter(ItineraryActivityModel.day_id == day_id).all()
    result_activities = [
        {
            "id": a.id,
            "timeSlot": a.time_slot,
            "title": a.title,
            "description": a.description,
            "locationName": a.location_name,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "estimatedCostInr": a.estimated_cost_inr
        }
        for a in updated_acts
    ]

    return {
        "status": "SUCCESS",
        "message": f"Day {day.day_number} itinerary optimized for {goal}",
        "dayId": day_id,
        "activities": result_activities
    }

def optimize_budget_service(db: Session, trip_id: str) -> Dict[str, Any]:
    trip = db.query(TripModel).filter(TripModel.id == trip_id).first()
    if not trip:
        raise ValueError("Trip not found")

    itin = db.query(ItineraryModel).filter(ItineraryModel.trip_id == trip_id).first()
    if not itin:
        raise ValueError("Itinerary not found for trip")

    days = db.query(ItineraryDayModel).filter(ItineraryDayModel.itinerary_id == itin.id).all()
    all_activities = []
    total_act_cost = 0

    for d in days:
        acts = db.query(ItineraryActivityModel).filter(ItineraryActivityModel.day_id == d.id).all()
        for a in acts:
            total_act_cost += (a.estimated_cost_inr or 0)
            all_activities.append({
                "id": a.id,
                "dayId": d.id,
                "timeSlot": a.time_slot,
                "title": a.title,
                "locationName": a.location_name,
                "estimatedCostInr": a.estimated_cost_inr,
                "latitude": a.latitude,
                "longitude": a.longitude
            })

    trip_budget = trip.budget or {"targetAmount": 30000}
    current_costs = {"totalProjected": total_act_cost}

    return ai_provider_service.generate_budget_optimization(trip_budget, current_costs, all_activities)

def weather_replan_service(db: Session, trip_id: str, forecast_override: Dict[str, Any] = None) -> Dict[str, Any]:
    trip = db.query(TripModel).filter(TripModel.id == trip_id).first()
    if not trip:
        raise ValueError("Trip not found")

    itin = db.query(ItineraryModel).filter(ItineraryModel.trip_id == trip_id).first()
    if not itin:
        raise ValueError("Itinerary not found for trip")

    forecast = forecast_override or {
        "condition": "Monsoon Heavy Downpour & Thunderstorm",
        "temp": 28,
        "icon": "Rain"
    }

    days = db.query(ItineraryDayModel).filter(ItineraryDayModel.itinerary_id == itin.id).all()
    all_activities = []
    for d in days:
        acts = db.query(ItineraryActivityModel).filter(ItineraryActivityModel.day_id == d.id).all()
        for a in acts:
            all_activities.append({
                "id": a.id,
                "dayId": d.id,
                "timeSlot": a.time_slot,
                "title": a.title,
                "description": a.description,
                "locationName": a.location_name,
                "latitude": a.latitude,
                "longitude": a.longitude,
                "estimatedCostInr": a.estimated_cost_inr
            })

    return ai_provider_service.generate_weather_replan(forecast, all_activities)

def execute_refinement_actions_service(db: Session, trip_id: str, actions: List[Dict[str, Any]]) -> Dict[str, Any]:
    trip = db.query(TripModel).filter(TripModel.id == trip_id).first()
    if not trip:
        raise ValueError("Trip not found")

    executed_count = 0
    for act in actions:
        act_type = act.get("type") or act.get("action")
        activity_id = act.get("activityId")

        if act_type == "REPLACE_ACTIVITY" and activity_id:
            rep = act.get("replacement") or {}
            target_act = db.query(ItineraryActivityModel).filter(ItineraryActivityModel.id == activity_id).first()
            if target_act:
                if rep.get("name"):
                    target_act.title = rep["name"]
                if rep.get("description"):
                    target_act.description = rep["description"]
                if rep.get("timeSlot"):
                    target_act.time_slot = rep["timeSlot"]
                if rep.get("locationName"):
                    target_act.location_name = rep["locationName"]
                if rep.get("latitude") is not None:
                    target_act.latitude = rep["latitude"]
                if rep.get("longitude") is not None:
                    target_act.longitude = rep["longitude"]
                if rep.get("estimatedCost") is not None:
                    target_act.estimated_cost_inr = rep["estimatedCost"]
                executed_count += 1

        elif act_type == "REMOVE_ACTIVITY" and activity_id:
            db.query(ItineraryActivityModel).filter(ItineraryActivityModel.id == activity_id).delete()
            executed_count += 1

    db.commit()
    print(f"[REFINEMENT EXECUTED] Applied {executed_count} database mutations for trip {trip_id}", flush=True)
    return {
        "status": "SUCCESS",
        "message": f"Successfully applied {executed_count} itinerary refinements to PostgreSQL",
        "executedCount": executed_count
    }

