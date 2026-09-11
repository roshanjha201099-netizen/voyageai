from fastapi import FastAPI, HTTPException, Header, Depends, Response, Request, BackgroundTasks, status, WebSocket, WebSocketDisconnect, Query
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import json
import uuid
from datetime import datetime

from database import get_db, SessionLocal, engine, Base
from models import LoginRequest, OnboardingRequest, SessionResponse
from models_trip import TripModel
from models_itinerary import ItineraryModel, ItineraryDayModel, ItineraryActivityModel
from models_package import TripStayModel, TripTransportModel, TripExpenseModel
from media_service import media_service
from places import search_places, search_nearby_restaurants, validate_destination_payload
import auth

from pydantic import BaseModel
from itinerary_service import (
    process_async_itinerary_generation,
    optimize_day_flow_service,
    optimize_budget_service,
    weather_replan_service,
    execute_refinement_actions_service
)

# Ensure database tables are created
Base.metadata.create_all(bind=engine)

app = FastAPI(title="VoyageAI Auth, Preferences & Trip API", version="1.0.0")

# Enable CORS for localhost frontend with credentials (cookies) support
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os

COOKIE_NAME = "voyageai_session"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

def log_event(msg: str):
    pass

def extract_token(request: Request, authorization: Optional[str] = Header(None)) -> str:
    token = request.cookies.get(COOKIE_NAME)
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
        else:
            token = authorization
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token missing")
    return token

def extract_ws_token(websocket: WebSocket, data: Optional[dict] = None) -> Optional[str]:
    # 1. Extract from WebSocket cookie
    token = websocket.cookies.get(COOKIE_NAME)
    if not token and "cookie" in websocket.headers:
        cookie_hdr = websocket.headers.get("cookie", "")
        for part in cookie_hdr.split(";"):
            part = part.strip()
            if part.startswith(f"{COOKIE_NAME}="):
                token = part.split("=", 1)[1]
                break
    # 2. Fallback to payload data for transitional compatibility
    if not token and data and isinstance(data, dict):
        token = data.get("token")
    return token

def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    token = extract_token(request, authorization)
    try:
        user_tuple = auth.get_session_user(db, token)
        return user_tuple
    except Exception as err:
        log_event(f"❌ Session user lookup failed: {str(err)}")
        raise HTTPException(status_code=401, detail=str(err))

def verify_trip_ownership(trip_id: str, user_id: str, db: Session) -> TripModel:
    trip = db.query(TripModel).filter(TripModel.id == trip_id, TripModel.user_id == user_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or unauthorized access")
    return trip


class ConciergeMessageItem(BaseModel):
    role: str
    text: str

class ConciergeRequest(BaseModel):
    message: str
    intent: Optional[str] = "CHAT"
    tripId: Optional[str] = None
    itineraryId: Optional[str] = None
    dayId: Optional[str] = None
    activityId: Optional[str] = None
    messages: Optional[List[ConciergeMessageItem]] = None
    tripContext: Optional[dict] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ActivityReplacementPayload(BaseModel):
    name: str
    description: Optional[str] = None
    timeSlot: Optional[str] = None
    locationName: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    estimatedCost: Optional[int] = 0
    activityType: Optional[str] = "SIGHTSEEING"

class ActivitySwapRequest(BaseModel):
    itineraryId: Optional[str] = None
    dayId: Optional[str] = None
    replacement: ActivityReplacementPayload

class OptimizeDayRequest(BaseModel):
    goal: Optional[str] = "MINIMIZE_TRAVEL_TIME"

class RefinementExecutionRequest(BaseModel):
    actions: List[dict]

@app.get("/")
def root():
    return {"app": "VoyageAI OS PostgreSQL API", "status": "online"}

@app.post("/api/auth/login")
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    log_event(f"🔑 POST /api/auth/login | Provider: {req.provider} | Email: {req.email}")
    try:
        token, auth_user, user_profile, user_prefs = auth.authenticate_or_create_user(db, req)
        response.set_cookie(
            key=COOKIE_NAME,
            value=token,
            httponly=True,
            max_age=86400 * 7,
            samesite="lax",
            secure=COOKIE_SECURE,
            path="/"
        )
        return {
            "authUser": auth_user,
            "userProfile": user_profile,
            "userPreferences": user_prefs
        }
    except Exception as e:
        log_event(f"❌ Login Execution Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/auth/session")
def get_session(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    try:
        token = extract_token(request, authorization)
        user_tuple = auth.get_session_user(db, token)
        auth_user, user_profile, user_prefs = user_tuple
        return {
            "authUser": auth_user,
            "userProfile": user_profile,
            "userPreferences": user_prefs
        }
    except HTTPException:
        raise
    except Exception as err:
        log_event(f"[SESSION ERROR] Session retrieval failed: {str(err)}")
        raise HTTPException(status_code=401, detail=str(err))

@app.post("/api/auth/logout")
def logout(
    request: Request,
    response: Response,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    try:
        token = extract_token(request, authorization)
        auth.revoke_session(db, token)
    except Exception:
        pass

    response.delete_cookie(key=COOKIE_NAME, path="/", httponly=True, samesite="lax")
    log_event("🚪 POST /api/auth/logout | Cookie Deleted & Session Revoked")
    return {"message": "Logged out successfully"}


@app.post("/api/user/onboarding")
def update_onboarding(
    req: OnboardingRequest,
    user_data = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_user, user_profile, user_prefs = user_data
    log_event(f"📝 POST /api/user/onboarding | User: {user_profile.firstName}")
    try:
        updated_profile, updated_prefs = auth.update_user_onboarding(db, auth_user.id, req)
        return {
            "userProfile": updated_profile,
            "userPreferences": updated_prefs
        }
    except Exception as e:
        log_event(f"❌ Onboarding Update Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

class LocationPayload(BaseModel):
    latitude: float
    longitude: float
    accuracy_meters: Optional[float] = None
    address_name: Optional[str] = None
    source: Optional[str] = "gps"

@app.post("/api/user/location")
def update_user_location(
    payload: LocationPayload,
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    import math
    user_id = None
    try:
        token = extract_token(request, authorization)
        user_tuple = auth.get_session_user(db, token)
        if user_tuple:
            user_id = user_tuple[0].id
    except Exception:
        pass

    acc = payload.accuracy_meters
    is_accurate = True
    if payload.source == "gps" and acc is not None and acc > 1000:
        is_accurate = False

    # Haversine distance from last known position (meters)
    distance_delta_m = None
    uid_key = user_id or "guest"
    if uid_key in _user_location_history and len(_user_location_history[uid_key]) > 0:
        last = _user_location_history[uid_key][-1]
        lat1, lon1 = math.radians(last["latitude"]), math.radians(last["longitude"])
        lat2, lon2 = math.radians(payload.latitude), math.radians(payload.longitude)
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        distance_delta_m = round(6371000 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 1)

    # Store timestamped location entry
    from datetime import datetime, timezone
    entry = {
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "accuracy_meters": acc,
        "address_name": payload.address_name or "User Location",
        "source": payload.source,
        "is_accurate": is_accurate,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "distance_delta_m": distance_delta_m
    }
    if uid_key not in _user_location_history:
        _user_location_history[uid_key] = []
    _user_location_history[uid_key].append(entry)
    # Keep only last 100 entries per user
    if len(_user_location_history[uid_key]) > 100:
        _user_location_history[uid_key] = _user_location_history[uid_key][-100:]

    delta_str = f" | Delta: {distance_delta_m}m" if distance_delta_m is not None else ""
    log_event(
        f"📍 USER LOCATION RECORDED | User: {user_id or 'Guest'} | "
        f"Coords: ({payload.latitude:.5f}, {payload.longitude:.5f}) | "
        f"Accuracy: {acc if acc is not None else 'N/A'}m | Accurate: {is_accurate} | "
        f"Source: {payload.source} | Address: '{payload.address_name or 'N/A'}'{delta_str}"
    )

    return {
        "status": "success" if is_accurate else "low_accuracy",
        "is_accurate": is_accurate,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "accuracy_meters": acc,
        "address_name": payload.address_name or "Captured Location",
        "source": payload.source,
        "distance_delta_m": distance_delta_m,
        "timestamp": entry["timestamp"],
        "message": "Exact location updated successfully" if is_accurate else "GPS accuracy > 1000m (1km). Manual location recommended."
    }

# In-memory location history store (per user)
_user_location_history: dict = {}

# ── WEBSOCKET REALTIME LOCATION INFRASTRUCTURE ──

class LocationConnectionManager:
    """Manages active WebSockets by user_id and trip_id for live streaming and broadcasting."""
    def __init__(self):
        self.active_user_connections: Dict[str, set] = {}
        self.active_trip_connections: Dict[str, set] = {}

    async def connect(self, websocket: WebSocket, user_id: str, trip_id: Optional[str]):
        await websocket.accept()
        if user_id not in self.active_user_connections:
            self.active_user_connections[user_id] = set()
        self.active_user_connections[user_id].add(websocket)

        if trip_id:
            if trip_id not in self.active_trip_connections:
                self.active_trip_connections[trip_id] = set()
            self.active_trip_connections[trip_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str, trip_id: Optional[str]):
        if user_id in self.active_user_connections:
            self.active_user_connections[user_id].discard(websocket)
            if not self.active_user_connections[user_id]:
                del self.active_user_connections[user_id]

        if trip_id and trip_id in self.active_trip_connections:
            self.active_trip_connections[trip_id].discard(websocket)
            if not self.active_trip_connections[trip_id]:
                del self.active_trip_connections[trip_id]

    async def broadcast_to_trip(self, trip_id: str, message: dict, sender_ws: WebSocket):
        if trip_id in self.active_trip_connections:
            for connection in list(self.active_trip_connections[trip_id]):
                if connection != sender_ws:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass

location_manager = LocationConnectionManager()

@app.websocket("/ws/location")
async def websocket_location_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    trip_id: Optional[str] = Query(None)
):
    """
    Real-time WebSocket endpoint for continuous GPS streaming & subscriber broadcast.
    Validates user authentication and trip ownership.
    """
    import math
    from datetime import datetime, timezone

    db = SessionLocal()
    user_id = "guest"
    try:
        if token:
            user_tuple = auth.get_session_user(db, token)
            if user_tuple:
                user_id = user_tuple[0].id
    except Exception:
        pass
    finally:
        db.close()

    # Validate trip ownership if trip_id is provided
    if trip_id and user_id != "guest":
        db = SessionLocal()
        try:
            trip = db.query(TripModel).filter(TripModel.id == trip_id).first()
            if trip and trip.user_id != user_id:
                log_event(f"⚠️ [WS LOCATION REJECTED] User {user_id} unauthorized for trip {trip_id}")
                await websocket.close(code=4003)
                return
        except Exception:
            pass
        finally:
            db.close()

    await location_manager.connect(websocket, user_id, trip_id)
    log_event(f"🔌 [WS LOCATION CONNECTED] User: {user_id} | Trip: {trip_id or 'Global'}")

    try:
        while True:
            data = await websocket.receive_json()
            lat = data.get("latitude")
            lng = data.get("longitude")
            acc = data.get("accuracy_meters") or data.get("accuracy")
            source = data.get("source", "gps")
            address_name = data.get("address_name") or "Live Position"
            req_trip_id = data.get("trip_id") or trip_id

            if lat is not None and lng is not None:
                uid_key = user_id
                distance_delta_m = None
                if uid_key in _user_location_history and len(_user_location_history[uid_key]) > 0:
                    last = _user_location_history[uid_key][-1]
                    lat1, lon1 = math.radians(last["latitude"]), math.radians(last["longitude"])
                    lat2, lon2 = math.radians(lat), math.radians(lng)
                    dlat = lat2 - lat1
                    dlon = lon2 - lon1
                    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
                    distance_delta_m = round(6371000 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 1)

                is_accurate = True if (source != "gps" or acc is None or acc <= 1000) else False

                entry = {
                    "latitude": lat,
                    "longitude": lng,
                    "accuracy_meters": acc,
                    "heading": data.get("heading"),
                    "speed": data.get("speed"),
                    "address_name": address_name,
                    "source": source,
                    "is_accurate": is_accurate,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "distance_delta_m": distance_delta_m,
                    "trip_id": req_trip_id
                }

                if uid_key not in _user_location_history:
                    _user_location_history[uid_key] = []
                _user_location_history[uid_key].append(entry)
                if len(_user_location_history[uid_key]) > 100:
                    _user_location_history[uid_key] = _user_location_history[uid_key][-100:]

                # Send ACK back to client
                await websocket.send_json({
                    "type": "location_ack",
                    "status": "success",
                    "timestamp": entry["timestamp"],
                    "distance_delta_m": distance_delta_m
                })

                # Broadcast to trip subscribers if active
                if req_trip_id:
                    await location_manager.broadcast_to_trip(
                        req_trip_id,
                        {
                            "type": "location_broadcast",
                            "user_id": user_id,
                            "trip_id": req_trip_id,
                            "location": entry
                        },
                        websocket
                    )

    except WebSocketDisconnect:
        location_manager.disconnect(websocket, user_id, trip_id)
        log_event(f"🔌 [WS LOCATION DISCONNECTED] User: {user_id} | Trip: {trip_id or 'Global'}")
    except Exception as e:
        location_manager.disconnect(websocket, user_id, trip_id)
        log_event(f"⚠️ [WS LOCATION ERROR] User: {user_id} | Error: {e}")

# ── UNIFIED WEBSOCKET ACTION DISPATCHER ──

async def process_ws_action(reqname: str, data: dict, db: Session, websocket: WebSocket) -> Any:
    from datetime import datetime, timezone

    # 1. Auth Actions
    if reqname == "auth:login":
        req = LoginRequest(**data)
        token, auth_user, user_profile, user_prefs = auth.authenticate_or_create_user(db, req)
        return {
            "authUser": auth_user,
            "userProfile": user_profile,
            "userPreferences": user_prefs
        }

    elif reqname == "auth:session":
        token = extract_ws_token(websocket, data)
        if not token or str(token).startswith("token_mock"):
            return {
                "authUser": None,
                "userProfile": None,
                "userPreferences": None
            }
        try:
            user_tuple = auth.get_session_user(db, token)
            auth_user, user_profile, user_prefs = user_tuple
            return {
                "authUser": auth_user,
                "userProfile": user_profile,
                "userPreferences": user_prefs
            }
        except Exception:
            return {
                "authUser": None,
                "userProfile": None,
                "userPreferences": None
            }

    elif reqname == "auth:logout":
        token = extract_ws_token(websocket, data)
        if token and not str(token).startswith("token_mock"):
            auth.logout_user(db, token)
        return {"message": "Logged out successfully"}

    elif reqname == "auth:onboarding":
        token = extract_ws_token(websocket, data)
        user_tuple = None
        if token:
            try:
                user_tuple = auth.get_session_user(db, token)
            except Exception:
                pass
        if not user_tuple:
            clean_req = LoginRequest(provider="GUEST", email="guest@example.com")
            _, auth_user, user_profile, user_prefs = auth.authenticate_or_create_user(db, clean_req)
        else:
            auth_user = user_tuple[0]

        onb_req = OnboardingRequest(**data)
        profile, prefs = auth.update_user_onboarding(db, auth_user.id, onb_req)
        return {
            "authUser": auth_user,
            "userProfile": profile,
            "userPreferences": prefs
        }


    # 2. Location & Places Actions
    elif reqname == "location:update":
        lat = data.get("latitude")
        lng = data.get("longitude")
        acc = data.get("accuracy_meters") or data.get("accuracy")
        source = data.get("source", "gps")
        address_name = data.get("address_name") or "Live Position"
        token = extract_ws_token(websocket, data)
        
        user_id = "guest"
        if token:
            try:
                u_tuple = auth.get_session_user(db, token)
                if u_tuple:
                    user_id = u_tuple[0].id
            except Exception:
                pass

        entry = {
            "latitude": lat,
            "longitude": lng,
            "accuracy_meters": acc,
            "address_name": address_name,
            "source": source,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        if user_id not in _user_location_history:
            _user_location_history[user_id] = []
        _user_location_history[user_id].append(entry)
        return {"status": "success", "location": entry}

    elif reqname == "location:latest":
        token = extract_ws_token(websocket, data)
        user_id = "guest"
        if token:
            try:
                u_tuple = auth.get_session_user(db, token)
                if u_tuple:
                    user_id = u_tuple[0].id
            except Exception:
                pass
        history = _user_location_history.get(user_id, [])
        return {"status": "success", "location": history[-1] if history else None}

    elif reqname in ["location:search", "places:search"]:
        q = data.get("query") or data.get("q") or ""
        return search_places(q)

    elif reqname == "places:nearby":
        q = data.get("query") or data.get("q") or ""
        lat = data.get("lat") or data.get("latitude")
        lon = data.get("lon") or data.get("lng") or data.get("longitude")
        return search_nearby_restaurants(q, lat, lon)

    # 3. Tour Guide Actions
    elif reqname == "tour_guide:get_nearby":
        from tour_guide_service import (
            search_nearby_pois, rank_places, get_or_create_session, check_proactive_alert
        )
        lat = float(data.get("lat") or data.get("latitude") or 15.2993)
        lng = float(data.get("lng") or data.get("longitude") or 74.1240)
        radius = min(int(data.get("radius") or data.get("radius_m") or 5000), 5000)

        token = extract_ws_token(websocket, data)
        user_id = "guest"
        user_prefs = None
        if token:
            try:
                u_tuple = auth.get_session_user(db, token)
                if u_tuple:
                    user_id = u_tuple[0].id
                    if u_tuple[2]:
                        user_prefs = {
                            "activityInterests": u_tuple[2].activity_interests or [],
                            "travelStyles": u_tuple[2].travel_styles or [],
                        }
            except Exception:
                pass

        raw_places = search_nearby_pois(lat, lng, radius)
        ranked = rank_places(raw_places, user_prefs, limit=10)

        session = get_or_create_session(user_id)
        session["nearby_places"] = ranked
        session["last_nearby_lat"] = lat
        session["last_nearby_lng"] = lng
        session["last_nearby_refresh"] = __import__("time").time()

        alert_place = check_proactive_alert(session, lat, lng, ranked)

        return {
            "places": ranked,
            "center": {"latitude": lat, "longitude": lng},
            "radius_m": radius,
            "count": len(ranked),
            "total_raw": len(raw_places),
            "proactive_alert": alert_place
        }

    elif reqname == "tour_guide:chat":
        from tour_guide_service import (
            search_nearby_pois, rank_places, get_or_create_session, should_refresh_nearby,
            resolve_active_place, add_message_to_session, generate_tour_guide_response, haversine_meters
        )
        token = extract_ws_token(websocket, data)
        user_id = "guest"
        user_prefs = None
        if token:
            try:
                u_tuple = auth.get_session_user(db, token)
                if u_tuple:
                    user_id = u_tuple[0].id
                    if u_tuple[2]:
                        user_prefs = {
                            "activityInterests": u_tuple[2].activity_interests or [],
                            "travelStyles": u_tuple[2].travel_styles or [],
                        }
            except Exception:
                pass

        target_mode = data.get("mode") or "local"
        target_trip_id = data.get("trip_id")
        user_msg = data.get("message") or data.get("user_message") or ""
        place_id = data.get("place_id")
        lat = data.get("latitude") or data.get("lat")
        lng = data.get("longitude") or data.get("lng")

        trip_context = None
        if target_trip_id or target_mode == "trip":
            try:
                trip_model = None
                if target_trip_id:
                    trip_model = db.query(TripModel).filter(TripModel.id == target_trip_id).first()
                else:
                    trip_model = db.query(TripModel).filter(TripModel.user_id == user_id).first()

                if trip_model:
                    target_trip_id = trip_model.id
                    dest = {
                        "name": getattr(trip_model, 'destination', 'Goa'),
                        "latitude": getattr(trip_model, 'destination_lat', 15.2993),
                        "longitude": getattr(trip_model, 'destination_lng', 74.1240),
                    }
                    trip_context = {
                        "id": trip_model.id,
                        "title": trip_model.title,
                        "destination": dest,
                        "startDate": str(trip_model.start_date),
                        "endDate": str(trip_model.end_date),
                        "status": trip_model.status,
                    }
            except Exception as e:
                log_event(f"⚠️ [TOUR GUIDE WS WARN] Trip lookup error: {e}")

        session = get_or_create_session(user_id)
        session["mode"] = target_mode
        if target_trip_id:
            session["trip_id"] = target_trip_id

        user_location = None
        if lat is not None and lng is not None:
            user_location = {"latitude": lat, "longitude": lng}
            if should_refresh_nearby(session, lat, lng) or not session.get("nearby_places"):
                raw = search_nearby_pois(lat, lng, 5000)
                ranked = rank_places(raw, user_prefs, limit=10)
                session["nearby_places"] = ranked
                session["last_nearby_lat"] = lat
                session["last_nearby_lng"] = lng
                session["last_nearby_refresh"] = __import__("time").time()

        place_context = resolve_active_place(place_id, user_msg, session, session.get("nearby_places", []))
        active_place_id = place_context["id"] if place_context else place_id

        if place_context and user_location and place_context.get("latitude") and place_context.get("longitude"):
            place_context["distanceMeters"] = round(
                haversine_meters(lat, lng, place_context["latitude"], place_context["longitude"])
            )

        add_message_to_session(session, "user", user_msg, active_place_id)

        result = generate_tour_guide_response(
            messages=session["messages"],
            place_context=place_context,
            nearby_places=session.get("nearby_places", []),
            user_location=user_location,
            trip_context=trip_context,
            user_prefs=user_prefs,
            mode=target_mode
        )

        add_message_to_session(session, "guide", result.get("reply", ""), active_place_id)

        return {
            "reply": result.get("reply", "I'm here to help!"),
            "suggestedActions": result.get("suggestedActions", []),
            "place": place_context,
            "mode": target_mode,
            "trip_id": target_trip_id,
            "source": result.get("source", "websocket")
        }

    elif reqname == "tour_guide:visit":
        from tour_guide_service import get_or_create_session
        token = extract_ws_token(websocket, data)
        user_id = "guest"
        if token:
            try:
                u_tuple = auth.get_session_user(db, token)
                if u_tuple:
                    user_id = u_tuple[0].id
            except Exception:
                pass

        place_id = data.get("place_id")
        session = get_or_create_session(user_id)
        session["current_place_id"] = place_id

        return {
            "status": "success",
            "current_place_id": place_id
        }

    # 4. Trip Domain Actions
    elif reqname == "trips:list":
        token = extract_ws_token(websocket, data)
        user_tuple = None
        if token:
            try:
                user_tuple = auth.get_session_user(db, token)
            except Exception:
                pass
        if not user_tuple:
            return []
        auth_user = user_tuple[0]
        db_trips = db.query(TripModel).filter(TripModel.user_id == auth_user.id).all()
        return [
            {
                "id": t.id,
                "userId": t.user_id,
                "title": t.title,
                "status": t.status,
                "itineraryStatus": t.itinerary_status,
                "startDate": t.start_date,
                "endDate": t.end_date,
                "totalDays": t.total_days,
                "destination": t.destination,
                "coverMedia": t.cover_media,
                "travelers": t.travelers,
                "preferencesSnapshot": t.preferences_snapshot,
                "budget": t.budget,
                "progress": t.progress,
                "createdAt": t.created_at,
                "updatedAt": t.updated_at
            }
            for t in db_trips
        ]

    elif reqname == "trips:create":
        import threading
        token = extract_ws_token(websocket, data)
        user_tuple = None
        if token:
            try:
                user_tuple = auth.get_session_user(db, token)
            except Exception:
                pass
        if not user_tuple:
            clean_req = LoginRequest(provider="GUEST", email="guest@example.com")
            t_new, auth_user, profile, prefs = auth.authenticate_or_create_user(db, clean_req)
            user_tuple = (auth_user, profile, prefs)

        auth_user, user_profile, user_prefs = user_tuple

        
        trip_data = data
        client_req_id = trip_data.get("clientRequestId")
        if client_req_id:
            existing_trip = db.query(TripModel).filter(
                TripModel.user_id == auth_user.id,
                TripModel.client_request_id == client_req_id
            ).first()
            if existing_trip:
                return {
                    "id": existing_trip.id,
                    "userId": existing_trip.user_id,
                    "title": existing_trip.title,
                    "status": existing_trip.status,
                    "itineraryStatus": existing_trip.itinerary_status,
                    "startDate": existing_trip.start_date,
                    "endDate": existing_trip.end_date,
                    "totalDays": existing_trip.total_days,
                    "destination": existing_trip.destination,
                    "coverMedia": existing_trip.cover_media,
                    "travelers": existing_trip.travelers,
                    "preferencesSnapshot": existing_trip.preferences_snapshot,
                    "budget": existing_trip.budget,
                    "progress": existing_trip.progress,
                    "createdAt": existing_trip.created_at,
                    "updatedAt": existing_trip.updated_at
                }

        trip_id = f"trip-{uuid.uuid4().hex[:8]}"
        destination = trip_data.get("destination") or "Goa"
        v_dest, v_lat, v_lng = validate_destination_payload(destination)

        db_trip = TripModel(
            id=trip_id,
            user_id=auth_user.id,
            client_request_id=client_req_id,
            title=f"Trip to {v_dest}",
            destination=v_dest,
            status="UPCOMING",
            itinerary_status="GENERATING",
            start_date=trip_data.get("startDate", "2026-10-15"),
            end_date=trip_data.get("endDate", "2026-10-18"),
            total_days=trip_data.get("totalDays", 4),
            travelers=json.dumps(trip_data.get("travelers", {"count": 1, "type": "Solo"})),
            preferences_snapshot=json.dumps(trip_data.get("preferences", {})),
            budget_json=json.dumps(trip_data.get("budget", {})),
            cover_media_json=json.dumps(media_service.get_destination_cover(v_dest))
        )
        db.add(db_trip)
        db.commit()
        db.refresh(db_trip)

        # Trigger async itinerary generation
        threading.Thread(
            target=process_async_itinerary_generation,
            args=(db_trip.id, auth_user.id, v_dest, db_trip.total_days, db_trip.start_date, trip_data.get("preferences", {}), v_lat, v_lng),
            daemon=True
        ).start()

        return {
            "id": db_trip.id,
            "userId": db_trip.user_id,
            "title": db_trip.title,
            "status": db_trip.status,
            "itineraryStatus": db_trip.itinerary_status,
            "startDate": db_trip.start_date,
            "endDate": db_trip.end_date,
            "totalDays": db_trip.total_days,
            "destination": db_trip.destination,
            "coverMedia": db_trip.cover_media,
            "travelers": db_trip.travelers,
            "preferencesSnapshot": db_trip.preferences_snapshot,
            "budget": db_trip.budget,
            "progress": db_trip.progress,
            "createdAt": db_trip.created_at,
            "updatedAt": db_trip.updated_at
        }

    elif reqname == "trips:get_itinerary":
        trip_id = data.get("trip_id")
        itinerary = db.query(ItineraryModel).filter(ItineraryModel.trip_id == trip_id).first()
        if not itinerary:
            return None
        days = db.query(ItineraryDayModel).filter(ItineraryDayModel.itinerary_id == itinerary.id).order_by(ItineraryDayModel.day_number).all()
        day_list = []
        for d in days:
            acts = db.query(ItineraryActivityModel).filter(ItineraryActivityModel.day_id == d.id).order_by(ItineraryActivityModel.sequence_order).all()
            day_list.append({
                "id": d.id,
                "dayNumber": d.day_number,
                "date": d.date,
                "title": d.title,
                "summary": d.summary,
                "theme": d.theme,
                "activities": [
                    {
                        "id": a.id,
                        "timeSlot": a.time_slot,
                        "name": a.name,
                        "description": a.description,
                        "locationName": a.location_name,
                        "latitude": a.latitude,
                        "longitude": a.longitude,
                        "estimatedCost": a.estimated_cost,
                        "activityType": a.activity_type,
                        "media": json.loads(a.media_json) if a.media_json else {}
                    }
                    for a in acts
                ]
            })
        return {
            "id": itinerary.id,
            "tripId": itinerary.trip_id,
            "status": itinerary.status,
            "summary": itinerary.summary,
            "totalEstimatedCost": itinerary.total_estimated_cost,
            "days": day_list
        }

    elif reqname == "trips:get_stays":
        trip_id = data.get("trip_id")
        stays = db.query(TripStayModel).filter(TripStayModel.trip_id == trip_id).all()
        return [{"id": s.id, "name": s.name, "checkIn": s.check_in, "checkOut": s.check_out, "cost": s.cost, "address": s.address} for s in stays]

    elif reqname == "trips:add_stay":
        trip_id = data.get("trip_id")
        stay = TripStayModel(
            id=f"stay-{uuid.uuid4().hex[:8]}",
            trip_id=trip_id,
            name=data.get("name", "Hotel Stay"),
            check_in=data.get("checkIn"),
            check_out=data.get("checkOut"),
            cost=data.get("cost", 0),
            address=data.get("address", "")
        )
        db.add(stay)
        db.commit()
        return {"id": stay.id, "name": stay.name, "checkIn": stay.check_in, "checkOut": stay.check_out, "cost": stay.cost, "address": stay.address}

    elif reqname == "trips:get_transports":
        trip_id = data.get("trip_id")
        transports = db.query(TripTransportModel).filter(TripTransportModel.trip_id == trip_id).all()
        return [{"id": t.id, "mode": t.mode, "details": t.details, "departureTime": t.departure_time, "cost": t.cost} for t in transports]

    elif reqname == "trips:add_transport":
        trip_id = data.get("trip_id")
        transport = TripTransportModel(
            id=f"trans-{uuid.uuid4().hex[:8]}",
            trip_id=trip_id,
            mode=data.get("mode", "Cab"),
            details=data.get("details", ""),
            departure_time=data.get("departureTime"),
            cost=data.get("cost", 0)
        )
        db.add(transport)
        db.commit()
        return {"id": transport.id, "mode": transport.mode, "details": transport.details, "departureTime": transport.departure_time, "cost": transport.cost}

    elif reqname == "trips:get_expenses":
        trip_id = data.get("trip_id")
        expenses = db.query(TripExpenseModel).filter(TripExpenseModel.trip_id == trip_id).all()
        return [{"id": e.id, "category": e.category, "amount": e.amount, "description": e.description, "date": e.date} for e in expenses]

    elif reqname == "trips:add_expense":
        trip_id = data.get("trip_id")
        expense = TripExpenseModel(
            id=f"exp-{uuid.uuid4().hex[:8]}",
            trip_id=trip_id,
            category=data.get("category", "General"),
            amount=data.get("amount", 0),
            description=data.get("description", ""),
            date=data.get("date", datetime.utcnow().isoformat())
        )
        db.add(expense)
        db.commit()
        return {"id": expense.id, "category": expense.category, "amount": expense.amount, "description": expense.description, "date": expense.date}

    # 5. AI Concierge
    elif reqname == "ai:concierge":
        from ai_provider import ai_provider_service
        concierge_req = ConciergeRequest(**data)

        # Build context if tripId is present
        trip_context = concierge_req.tripContext or {}
        itinerary_summary = []
        if concierge_req.tripId:
            trip = db.query(TripModel).filter(TripModel.id == concierge_req.tripId).first()
            if trip:
                destination_info = trip.destination if isinstance(trip.destination, dict) else {"name": str(trip.destination or "India")}
                if not trip_context:
                    trip_context = {
                        "destination": destination_info,
                        "totalDays": trip.total_days,
                        "budgetLevel": (trip.budget or {}).get("level", "MODERATE") if isinstance(trip.budget, dict) else "MODERATE",
                        "startDate": trip.start_date,
                        "endDate": trip.end_date
                    }

                itin = db.query(ItineraryModel).filter(ItineraryModel.trip_id == trip.id).first()
                if itin:
                    days = db.query(ItineraryDayModel).filter(ItineraryDayModel.itinerary_id == itin.id).all()
                    for d in days:
                        acts = db.query(ItineraryActivityModel).filter(ItineraryActivityModel.day_id == d.id).all()
                        itinerary_summary.append({
                            "dayNumber": d.day_number,
                            "date": d.date,
                            "activities": [
                                {
                                    "id": a.id,
                                    "timeSlot": a.time_slot,
                                    "title": a.title,
                                    "estimatedCostInr": a.estimated_cost_inr,
                                    "locationName": a.location_name
                                } for a in acts
                            ]
                        })

        # Add physical user location POI context if latitude and longitude are supplied
        lat = concierge_req.latitude if concierge_req.latitude is not None else (data.get("latitude") or data.get("lat"))
        lng = concierge_req.longitude if concierge_req.longitude is not None else (data.get("longitude") or data.get("lng"))
        if lat is not None and lng is not None:
            try:
                from tour_guide_service import search_nearby_pois
                nearby = search_nearby_pois(float(lat), float(lng), 5000)
                if nearby:
                    trip_context["nearbyPlaces"] = [
                        f"{p['name']} ({p['category']}, {p['distanceMeters']}m away)"
                        for p in nearby[:8]
                    ]
                    trip_context["userLocation"] = {"latitude": float(lat), "longitude": float(lng)}
            except Exception:
                pass

        if concierge_req.intent == "SWAP_ACTIVITY" and concierge_req.activityId:
            activity = db.query(ItineraryActivityModel).filter(ItineraryActivityModel.id == concierge_req.activityId).first()
            if activity:
                day = db.query(ItineraryDayModel).filter(ItineraryDayModel.id == activity.day_id).first()
                current_activity_dict = {
                    "id": activity.id,
                    "title": activity.title,
                    "description": activity.description,
                    "timeSlot": activity.time_slot,
                    "locationName": activity.location_name,
                    "latitude": activity.latitude,
                    "longitude": activity.longitude,
                    "estimatedCostInr": activity.estimated_cost_inr,
                    "date": day.date if day else ""
                }
                recommendations = ai_provider_service.generate_swap_recommendations(current_activity_dict, trip_context)
                return {
                    "type": "activity_swap_recommendations",
                    "tripId": concierge_req.tripId,
                    "itineraryId": concierge_req.itineraryId,
                    "dayId": concierge_req.dayId,
                    "activityId": concierge_req.activityId,
                    "currentActivity": current_activity_dict,
                    "recommendations": recommendations
                }

        elif concierge_req.intent == "REFINE_ITINERARY":
            actions = ai_provider_service.generate_refinement_actions(concierge_req.message, {"context": trip_context, "days": itinerary_summary})
            return {
                "type": "refinement_actions",
                "tripId": concierge_req.tripId,
                "actions": actions
            }

        # Default to GENERAL_CHAT / CHAT
        messages_list = []
        if concierge_req.messages:
            for m in concierge_req.messages:
                messages_list.append({"role": m.role if hasattr(m, 'role') else m.get('role', 'user'), "text": m.text if hasattr(m, 'text') else m.get('text', '')})
        else:
            messages_list = [{"role": "user", "text": concierge_req.message}]

        chat_res = ai_provider_service.generate_chat_response(
            messages=messages_list,
            trip_context=trip_context
        )
        if isinstance(chat_res, dict):
            raw_reply = chat_res.get("reply") or chat_res.get("text") or "How can I help with your journey?"
            if isinstance(raw_reply, dict):
                reply_str = raw_reply.get("reply") or raw_reply.get("text") or str(raw_reply)
            elif isinstance(raw_reply, str) and raw_reply.strip().startswith("{") and raw_reply.strip().endswith("}"):
                try:
                    parsed_sub = json.loads(raw_reply.strip())
                    if isinstance(parsed_sub, dict) and "reply" in parsed_sub:
                        reply_str = parsed_sub["reply"]
                    else:
                        reply_str = raw_reply
                except Exception:
                    reply_str = raw_reply
            else:
                reply_str = str(raw_reply)
            action_type = chat_res.get("actionType")
            action_payload = chat_res.get("actionPayload")
        else:
            reply_str = str(chat_res)
            action_type = None
            action_payload = None

        return {
            "type": "chat_response",
            "reply": reply_str,
            "actionType": action_type,
            "actionPayload": action_payload
        }

    else:
        raise ValueError(f"Unknown WebSocket request action: [{reqname}]")

@app.websocket("/ws/tour-app")
async def websocket_tour_app_endpoint(websocket: WebSocket):
    """
    Central WebSocket endpoint for entire VoyageAI frontend application.
    All requests flow over payload frames: { type, reqname, data, requestId }
    """
    await websocket.accept()
    log_event("🔌 [WS TOUR-APP CONNECTED] Client established persistent WebSocket connection")

    try:
        while True:
            frame = await websocket.receive_json()
            req_type = frame.get("type", "request")
            reqname = frame.get("reqname")
            data = frame.get("data") or {}
            request_id = frame.get("requestId")

            if not reqname:
                continue

            db = SessionLocal()
            try:
                result = await process_ws_action(reqname, data, db, websocket)
                response_frame = {
                    "type": "response",
                    "reqname": f"{reqname}:response",
                    "status": "success",
                    "data": jsonable_encoder(result),
                    "requestId": request_id
                }
            except Exception as err:
                log_event(f"❌ [WS ACTION ERROR] {reqname}: {str(err)}")
                response_frame = {
                    "type": "response",
                    "reqname": f"{reqname}:response",
                    "status": "error",
                    "error": str(err),
                    "requestId": request_id
                }
            finally:
                db.close()

            await websocket.send_json(response_frame)

    except WebSocketDisconnect:
        log_event("🔌 [WS TOUR-APP DISCONNECTED] Client connection closed")
    except Exception as e:
        log_event(f"⚠️ [WS TOUR-APP ERROR] {e}")

@app.get("/api/user/location/latest")
def get_latest_user_location(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Get the most recent location for the authenticated user."""
    user_id = None
    try:
        token = extract_token(request, authorization)
        user_tuple = auth.get_session_user(db, token)
        if user_tuple:
            user_id = user_tuple[0].id
    except Exception:
        pass

    uid_key = user_id or "guest"
    history = _user_location_history.get(uid_key, [])
    if not history:
        return {"status": "no_location", "message": "No location recorded yet."}

    latest = history[-1]
    return {
        "status": "success",
        "location": latest,
        "total_updates": len(history)
    }

@app.get("/api/user/location/search")
def search_user_location(query: str = ""):
    if not query or len(query.strip()) < 2:
        return []
    log_event(f"🔍 GET /api/user/location/search?query={query}")
    return search_places(query)

# ── PLACES & GEOCODING ENDPOINTS ──

@app.get("/api/places/search")
def search_destinations(q: str = ""):
    if not q or len(q.strip()) < 2:
        return []
    log_event(f"🔍 GET /api/places/search?q={q}")
    return search_places(q)

@app.get("/api/places/nearby")
def get_nearby_places(
    q: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None
):
    log_event(f"🔍 GET /api/places/nearby?q={q}&lat={lat}&lon={lon}")
    return search_nearby_restaurants(q or "", lat, lon)

# ── TRIP DOMAIN ENDPOINTS ──

@app.get("/api/trips")
def get_trips(user_data = Depends(get_current_user), db: Session = Depends(get_db)):
    auth_user, _, _ = user_data
    db_trips = db.query(TripModel).filter(TripModel.user_id == auth_user.id).all()
    result = []
    for t in db_trips:
        result.append({
            "id": t.id,
            "userId": t.user_id,
            "title": t.title,
            "status": t.status,
            "itineraryStatus": t.itinerary_status,
            "startDate": t.start_date,
            "endDate": t.end_date,
            "totalDays": t.total_days,
            "destination": t.destination,
            "coverMedia": t.cover_media,
            "travelers": t.travelers,
            "preferencesSnapshot": t.preferences_snapshot,
            "budget": t.budget,
            "progress": t.progress,
            "createdAt": t.created_at,
            "updatedAt": t.updated_at
        })
    return result

import threading

@app.post("/api/trips", status_code=status.HTTP_201_CREATED)
def create_trip(
    trip_data: dict,
    user_data = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_user, user_profile, user_prefs = user_data
    destination = trip_data.get("destination") or {}
    dest_name = destination.get("name") if isinstance(destination, dict) else "Destination"
    
    # 1. Idempotency Guard Check
    client_req_id = trip_data.get("clientRequestId")
    if client_req_id:
        existing_trip = db.query(TripModel).filter(
            TripModel.user_id == auth_user.id,
            TripModel.client_request_id == client_req_id
        ).first()
        if existing_trip:
            return {
                "id": existing_trip.id,
                "userId": existing_trip.user_id,
                "title": existing_trip.title,
                "status": existing_trip.status,
                "itineraryStatus": existing_trip.itinerary_status,
                "startDate": existing_trip.start_date,
                "endDate": existing_trip.end_date,
                "totalDays": existing_trip.total_days,
                "destination": existing_trip.destination,
                "coverMedia": existing_trip.cover_media,
                "travelers": existing_trip.travelers,
                "preferencesSnapshot": existing_trip.preferences_snapshot,
                "budget": existing_trip.budget,
                "progress": existing_trip.progress,
                "createdAt": existing_trip.created_at,
                "updatedAt": existing_trip.updated_at
            }

    # 2. Validate Destination Payload
    is_valid, err_msg = validate_destination_payload(destination)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid trip destination payload: {err_msg}")

    # 3. Calculate Days Duration
    start_date_str = trip_data.get("startDate", "2026-10-15")
    end_date_str = trip_data.get("endDate", "2026-10-19")
    try:
        d1 = datetime.strptime(start_date_str, "%Y-%m-%d")
        d2 = datetime.strptime(end_date_str, "%Y-%m-%d")
        total_days = max(1, (d2 - d1).days + 1)
    except Exception:
        total_days = 4

    print(f"\n==================================================", flush=True)
    print(f"🚀 [TRIP CREATION STARTED] Destination: '{dest_name}' ({total_days} Days) | User: {auth_user.email}", flush=True)

    # 4. Resolve Cover Media
    cover_media = media_service.resolve_cover_media(destination)

    # 5. Snapshot Preferences
    pref_snapshot = {
        "snapshotVersion": 1,
        "travelStyles": user_prefs.travelStyles,
        "transportPreferences": user_prefs.transportPreferences,
        "dietaryPreferences": user_prefs.dietaryPreferences,
        "foodInterests": user_prefs.foodInterests,
        "activityInterests": user_prefs.activityInterests,
        "budgetLevel": user_prefs.budgetLevel
    }

    # 6. Construct Travelers Array
    travelers_count = trip_data.get("travelersCount", 2)
    travelers_list = []
    for idx in range(travelers_count):
        travelers_list.append({
            "id": f"tr_{idx + 1}",
            "name": user_profile.firstName if idx == 0 else f"Companion {idx + 1}",
            "type": "ADULT",
            "avatarUrl": user_profile.avatarUrl if idx == 0 else None
        })

    budget_obj = {
        "level": trip_data.get("budgetLevel", user_prefs.budgetLevel or "MODERATE"),
        "targetAmount": 30000,
        "currency": "INR"
    }

    now = datetime.utcnow().isoformat() + "Z"
    trip_id = f"trip_{uuid.uuid4().hex[:12]}"

    new_trip = TripModel(
        id=trip_id,
        user_id=auth_user.id,
        client_request_id=client_req_id,
        title=f"{dest_name} Tour Package",
        status="PLANNING",
        itinerary_status="GENERATING",
        start_date=start_date_str,
        end_date=end_date_str,
        total_days=total_days,
        destination_json=json.dumps(destination),
        cover_media_json=json.dumps(cover_media),
        travelers_json=json.dumps(travelers_list),
        preferences_snapshot_json=json.dumps(pref_snapshot),
        budget_json=json.dumps(budget_obj),
        progress_json=json.dumps({"totalDays": total_days, "currentDay": 1, "completedActivitiesCount": 0, "totalActivitiesCount": total_days * 2}),
        created_at=now,
        updated_at=now
    )
    db.add(new_trip)
    db.commit()
    print(f"💾 [TRIP CREATION] Trip saved to PostgreSQL (ID: {trip_id}, Title: '{new_trip.title}')", flush=True)

    # 7. Spawn Async Thread for AI Itinerary Generation
    threading.Thread(target=process_async_itinerary_generation, args=(trip_id, SessionLocal), daemon=True).start()

    return {
        "id": new_trip.id,
        "userId": new_trip.user_id,
        "title": new_trip.title,
        "status": new_trip.status,
        "itineraryStatus": new_trip.itinerary_status,
        "startDate": new_trip.start_date,
        "endDate": new_trip.end_date,
        "totalDays": new_trip.total_days,
        "destination": new_trip.destination,
        "coverMedia": new_trip.cover_media,
        "travelers": new_trip.travelers,
        "preferencesSnapshot": new_trip.preferences_snapshot,
        "budget": new_trip.budget,
        "progress": new_trip.progress,
        "createdAt": new_trip.created_at,
        "updatedAt": new_trip.updated_at
    }

@app.get("/api/trips/{trip_id}/itinerary")
def get_itinerary(trip_id: str, user_data = Depends(get_current_user), db: Session = Depends(get_db)):
    auth_user, _, _ = user_data
    trip = db.query(TripModel).filter(TripModel.id == trip_id, TripModel.user_id == auth_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    itin = db.query(ItineraryModel).filter(ItineraryModel.trip_id == trip_id).first()
    if not itin:
        return {
            "status": trip.itinerary_status,
            "days": []
        }

    days_records = db.query(ItineraryDayModel).filter(ItineraryDayModel.itinerary_id == itin.id).order_by(ItineraryDayModel.day_number).all()
    days_data = []

    for d in days_records:
        activities_records = db.query(ItineraryActivityModel).filter(ItineraryActivityModel.day_id == d.id).all()
        activities_data = []
        for a in activities_records:
            activities_data.append({
                "id": a.id,
                "timeSlot": a.time_slot,
                "title": a.title,
                "description": a.description,
                "activityType": a.activity_type,
                "locationName": a.location_name,
                "latitude": a.latitude,
                "longitude": a.longitude,
                "estimatedCostInr": a.estimated_cost_inr,
                "bookingRequired": a.booking_required,
                "isConfirmed": a.is_confirmed
            })

        days_data.append({
            "id": d.id,
            "dayNumber": d.day_number,
            "date": d.date,
            "title": d.title,
            "summary": d.summary,
            "activities": activities_data
        })

    return {
        "id": itin.id,
        "tripId": itin.trip_id,
        "version": itin.version,
        "status": itin.status,
        "providerName": itin.provider_name,
        "days": days_data,
        "createdAt": itin.created_at
    }

@app.post("/api/trips/{trip_id}/itinerary/regenerate", status_code=status.HTTP_202_ACCEPTED)
def regenerate_itinerary(
    trip_id: str,
    user_data = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_user, _, _ = user_data
    trip = db.query(TripModel).filter(TripModel.id == trip_id, TripModel.user_id == auth_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip.itinerary_status = "GENERATING"
    db.commit()

    threading.Thread(target=process_async_itinerary_generation, args=(trip_id, SessionLocal), daemon=True).start()
    return {"status": "GENERATING", "tripId": trip_id}

@app.delete("/api/trips/{trip_id}")
def delete_trip(trip_id: str, user_data = Depends(get_current_user), db: Session = Depends(get_db)):
    auth_user, _, _ = user_data
    db.query(TripStayModel).filter(TripStayModel.trip_id == trip_id).delete()
    db.query(TripTransportModel).filter(TripTransportModel.trip_id == trip_id).delete()
    db.query(TripExpenseModel).filter(TripExpenseModel.trip_id == trip_id).delete()
    db.query(TripModel).filter(TripModel.id == trip_id, TripModel.user_id == auth_user.id).delete()
    db.commit()
    log_event(f"🗑️ Deleted trip {trip_id} from PostgreSQL")
    return {"message": "Trip deleted successfully"}

# ── HELPER FOR TRIP OWNERSHIP ──
def verify_trip_ownership(trip_id: str, user_id: str, db: Session) -> TripModel:
    trip = db.query(TripModel).filter(TripModel.id == trip_id, TripModel.user_id == user_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or unauthorized access")
    return trip

# ── AI CONCIERGE & ACTIVITY SWAP MUTATION SCHEMAS & ENDPOINTS ──

from pydantic import BaseModel

class ConciergeRequest(BaseModel):
    message: str
    intent: Optional[str] = "CHAT"
    tripId: Optional[str] = None
    itineraryId: Optional[str] = None
    dayId: Optional[str] = None
    activityId: Optional[str] = None
    messages: Optional[List[Dict[str, Any]]] = None

class ActivityReplacementPayload(BaseModel):
    name: str
    description: Optional[str] = None
    timeSlot: Optional[str] = None
    locationName: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    estimatedCost: Optional[int] = 0
    activityType: Optional[str] = "SIGHTSEEING"

class ActivitySwapRequest(BaseModel):
    itineraryId: Optional[str] = None
    dayId: Optional[str] = None
    replacement: ActivityReplacementPayload

class DayOptimizationRequest(BaseModel):
    goal: Optional[str] = "MINIMIZE_TRAVEL_TIME"

class RefinementExecutionRequest(BaseModel):
    actions: List[Dict[str, Any]]

@app.post("/api/ai/concierge")
def ai_concierge(
    req: ConciergeRequest,
    user_data = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_user, user_profile, _ = user_data

    from ai_provider import ai_provider_service

    # Build context if tripId is present
    trip_context = {}
    itinerary_summary = []
    if req.tripId:
        trip = verify_trip_ownership(req.tripId, auth_user.id, db)
        destination_info = trip.destination if isinstance(trip.destination, dict) else {"name": "India"}
        trip_context = {
            "destination": destination_info,
            "totalDays": trip.total_days,
            "budgetLevel": (trip.budget or {}).get("level", "MODERATE"),
            "startDate": trip.start_date,
            "endDate": trip.end_date
        }

        itin = db.query(ItineraryModel).filter(ItineraryModel.trip_id == trip.id).first()
        if itin:
            days = db.query(ItineraryDayModel).filter(ItineraryDayModel.itinerary_id == itin.id).all()
            for d in days:
                acts = db.query(ItineraryActivityModel).filter(ItineraryActivityModel.day_id == d.id).all()
                itinerary_summary.append({
                    "dayNumber": d.day_number,
                    "date": d.date,
                    "activities": [
                        {
                            "id": a.id,
                            "timeSlot": a.time_slot,
                            "title": a.title,
                            "estimatedCostInr": a.estimated_cost_inr,
                            "locationName": a.location_name
                        } for a in acts
                    ]
                })

    if req.intent == "SWAP_ACTIVITY":
        if not req.tripId or not req.activityId:
            raise HTTPException(status_code=400, detail="tripId and activityId are required for SWAP_ACTIVITY intent")

        trip = verify_trip_ownership(req.tripId, auth_user.id, db)
        itin = db.query(ItineraryModel).filter(ItineraryModel.trip_id == trip.id).first()
        if not itin:
            raise HTTPException(status_code=404, detail="Itinerary not found for trip")

        activity = db.query(ItineraryActivityModel).filter(ItineraryActivityModel.id == req.activityId).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Target activity not found")

        day = db.query(ItineraryDayModel).filter(ItineraryDayModel.id == activity.day_id).first()
        if not day or day.itinerary_id != itin.id:
            raise HTTPException(status_code=403, detail="Activity does not belong to user trip itinerary")

        current_activity_dict = {
            "id": activity.id,
            "title": activity.title,
            "description": activity.description,
            "timeSlot": activity.time_slot,
            "locationName": activity.location_name,
            "latitude": activity.latitude,
            "longitude": activity.longitude,
            "estimatedCostInr": activity.estimated_cost_inr,
            "date": day.date
        }

        recommendations = ai_provider_service.generate_swap_recommendations(current_activity_dict, trip_context)

        return {
            "type": "activity_swap_recommendations",
            "tripId": trip.id,
            "itineraryId": itin.id,
            "dayId": day.id,
            "activityId": activity.id,
            "currentActivity": current_activity_dict,
            "recommendations": recommendations
        }

    elif req.intent == "REFINE_ITINERARY":
        actions = ai_provider_service.generate_refinement_actions(req.message, {"context": trip_context, "days": itinerary_summary})
        return {
            "type": "refinement_actions",
            "tripId": req.tripId,
            "actions": actions
        }

    # Default to GENERAL_CHAT / CHAT
    messages_list = req.messages or [{"role": "user", "text": req.message}]
    chat_res = ai_provider_service.generate_chat_response(
        messages=messages_list,
        trip_context=trip_context
    )
    if isinstance(chat_res, dict):
        reply_str = chat_res.get("reply") or chat_res.get("text") or "How can I help with your journey?"
        action_type = chat_res.get("actionType")
        action_payload = chat_res.get("actionPayload")
    else:
        reply_str = str(chat_res)
        action_type = None
        action_payload = None

    return {
        "type": "chat_response",
        "reply": reply_str,
        "actionType": action_type,
        "actionPayload": action_payload
    }

@app.patch("/api/trips/{trip_id}/itinerary/activities/{activity_id}")
def swap_itinerary_activity(
    trip_id: str,
    activity_id: str,
    req: ActivitySwapRequest,
    user_data = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_user, _, _ = user_data

    trip = verify_trip_ownership(trip_id, auth_user.id, db)

    activity = db.query(ItineraryActivityModel).filter(ItineraryActivityModel.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    day = db.query(ItineraryDayModel).filter(ItineraryDayModel.id == activity.day_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Activity day not found")

    itin = db.query(ItineraryModel).filter(ItineraryModel.id == day.itinerary_id).first()
    if not itin or itin.trip_id != trip.id:
        raise HTTPException(status_code=403, detail="Activity does not belong to authorized trip")

    rep = req.replacement
    activity.title = rep.name
    if rep.description:
        activity.description = rep.description
    if rep.timeSlot:
        activity.time_slot = rep.timeSlot
    if rep.locationName:
        activity.location_name = rep.locationName
    if rep.latitude is not None:
        activity.latitude = rep.latitude
    if rep.longitude is not None:
        activity.longitude = rep.longitude
    if rep.estimatedCost is not None:
        activity.estimated_cost_inr = rep.estimatedCost
    if rep.activityType:
        activity.activity_type = rep.activityType

    linked_expense = db.query(TripExpenseModel).filter(
        TripExpenseModel.trip_id == trip.id,
        TripExpenseModel.activity_id == activity_id
    ).first()
    if linked_expense:
        linked_expense.title = f"Activity: {activity.title}"
        linked_expense.amount = float(activity.estimated_cost_inr)

    db.commit()
    db.refresh(activity)

    log_event(f"🔄 Swapped activity {activity_id} for trip {trip.id} -> New Title: '{activity.title}' (Cost: ₹{activity.estimated_cost_inr})")

    return {
        "status": "SUCCESS",
        "message": "Activity swapped successfully",
        "dayId": day.id,
        "updatedActivity": {
            "id": activity.id,
            "timeSlot": activity.time_slot,
            "title": activity.title,
            "description": activity.description,
            "activityType": activity.activity_type,
            "locationName": activity.location_name,
            "latitude": activity.latitude,
            "longitude": activity.longitude,
            "estimatedCostInr": activity.estimated_cost_inr,
            "isConfirmed": activity.is_confirmed
        }
    }

@app.post("/api/trips/{trip_id}/itinerary/days/{day_id}/optimize")
def optimize_day_flow_endpoint(
    trip_id: str,
    day_id: str,
    req: DayOptimizationRequest = DayOptimizationRequest(),
    user_data = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_user, _, _ = user_data
    verify_trip_ownership(trip_id, auth_user.id, db)
    try:
        res = optimize_day_flow_service(db, trip_id, day_id, req.goal or "MINIMIZE_TRAVEL_TIME")
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/trips/{trip_id}/itinerary/optimize-budget")
def optimize_budget_endpoint(
    trip_id: str,
    user_data = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_user, _, _ = user_data
    verify_trip_ownership(trip_id, auth_user.id, db)
    try:
        res = optimize_budget_service(db, trip_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/trips/{trip_id}/itinerary/weather-replan")
def weather_replan_endpoint(
    trip_id: str,
    user_data = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_user, _, _ = user_data
    verify_trip_ownership(trip_id, auth_user.id, db)
    try:
        res = weather_replan_service(db, trip_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/trips/{trip_id}/itinerary/refine")
def execute_refinements_endpoint(
    trip_id: str,
    req: RefinementExecutionRequest,
    user_data = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_user, _, _ = user_data
    verify_trip_ownership(trip_id, auth_user.id, db)
    try:
        res = execute_refinement_actions_service(db, trip_id, req.actions)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ── PACKAGE DIMENSION ENDPOINTS (STAYS, TRANSPORTS, EXPENSES) ──


@app.post("/api/trips/{trip_id}/stays", status_code=status.HTTP_201_CREATED)
def create_trip_stay(
    trip_id: str,
    stay_data: dict,
    user_data = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_user, _, _ = user_data
    verify_trip_ownership(trip_id, auth_user.id, db)

    stay_id = f"stay_{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow().isoformat() + "Z"

    status_val = stay_data.get("status", "SELECTED")
    if status_val not in ["RECOMMENDED", "SELECTED", "PENDING", "CONFIRMED", "CANCELLED"]:
        status_val = "SELECTED"

    new_stay = TripStayModel(
        id=stay_id,
        trip_id=trip_id,
        activity_id=stay_data.get("activityId"),
        hotel_name=stay_data.get("hotelName", "Hotel"),
        location_name=stay_data.get("locationName", "Central Location"),
        check_in_date=stay_data.get("checkInDate", "2026-10-15"),
        check_out_date=stay_data.get("checkOutDate", "2026-10-19"),
        nights=stay_data.get("nights", 4),
        price_per_night=stay_data.get("pricePerNight", 0),
        total_price=stay_data.get("totalPrice", 0),
        status=status_val,
        confirmation_code=stay_data.get("confirmationCode"),
        created_at=now,
        updated_at=now
    )
    db.add(new_stay)
    db.commit()
    log_event(f"🏨 Persisted stay for trip {trip_id}: {new_stay.hotel_name} (ID: {stay_id})")

    return {
        "id": new_stay.id,
        "tripId": new_stay.trip_id,
        "activityId": new_stay.activity_id,
        "hotelName": new_stay.hotel_name,
        "locationName": new_stay.location_name,
        "checkInDate": new_stay.check_in_date,
        "checkOutDate": new_stay.check_out_date,
        "nights": new_stay.nights,
        "pricePerNight": new_stay.price_per_night,
        "totalPrice": new_stay.total_price,
        "status": new_stay.status,
        "confirmationCode": new_stay.confirmation_code,
        "createdAt": new_stay.created_at,
        "updatedAt": new_stay.updated_at
    }

@app.get("/api/trips/{trip_id}/stays")
def get_trip_stays(
    trip_id: str,
    user_data = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_user, _, _ = user_data
    verify_trip_ownership(trip_id, auth_user.id, db)

    stays = db.query(TripStayModel).filter(TripStayModel.trip_id == trip_id).order_by(TripStayModel.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "tripId": s.trip_id,
            "activityId": s.activity_id,
            "hotelName": s.hotel_name,
            "locationName": s.location_name,
            "checkInDate": s.check_in_date,
            "checkOutDate": s.check_out_date,
            "nights": s.nights,
            "pricePerNight": s.price_per_night,
            "totalPrice": s.total_price,
            "status": s.status,
            "confirmationCode": s.confirmation_code,
            "createdAt": s.created_at,
            "updatedAt": s.updated_at
        }
        for s in stays
    ]

@app.post("/api/trips/{trip_id}/transports", status_code=status.HTTP_201_CREATED)
def create_trip_transport(
    trip_id: str,
    transport_data: dict,
    user_data = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_user, _, _ = user_data
    verify_trip_ownership(trip_id, auth_user.id, db)

    transport_id = f"trsp_{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow().isoformat() + "Z"

    status_val = transport_data.get("status", "SELECTED")
    if status_val not in ["RECOMMENDED", "SELECTED", "PENDING", "CONFIRMED", "CANCELLED"]:
        status_val = "SELECTED"

    new_transport = TripTransportModel(
        id=transport_id,
        trip_id=trip_id,
        activity_id=transport_data.get("activityId"),
        transport_type=transport_data.get("transportType", "CAB"),
        provider_name=transport_data.get("providerName", "VoyageAI Ride"),
        pickup_location=transport_data.get("pickupLocation", "Current Location"),
        dropoff_location=transport_data.get("dropoffLocation", "Destination"),
        pickup_time=transport_data.get("pickupTime", "Immediate"),
        estimated_fare=transport_data.get("estimatedFare", 0),
        status=status_val,
        booking_reference=transport_data.get("bookingReference"),
        created_at=now,
        updated_at=now
    )
    db.add(new_transport)
    db.commit()
    log_event(f"🚗 Persisted transport for trip {trip_id}: {new_transport.provider_name} (ID: {transport_id})")

    return {
        "id": new_transport.id,
        "tripId": new_transport.trip_id,
        "activityId": new_transport.activity_id,
        "transportType": new_transport.transport_type,
        "providerName": new_transport.provider_name,
        "pickupLocation": new_transport.pickup_location,
        "dropoffLocation": new_transport.dropoff_location,
        "pickupTime": new_transport.pickup_time,
        "estimatedFare": new_transport.estimated_fare,
        "status": new_transport.status,
        "bookingReference": new_transport.booking_reference,
        "createdAt": new_transport.created_at,
        "updatedAt": new_transport.updated_at
    }

@app.get("/api/trips/{trip_id}/transports")
def get_trip_transports(
    trip_id: str,
    user_data = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_user, _, _ = user_data
    verify_trip_ownership(trip_id, auth_user.id, db)

    transports = db.query(TripTransportModel).filter(TripTransportModel.trip_id == trip_id).order_by(TripTransportModel.created_at.desc()).all()
    return [
        {
            "id": t.id,
            "tripId": t.trip_id,
            "activityId": t.activity_id,
            "transportType": t.transport_type,
            "providerName": t.provider_name,
            "pickupLocation": t.pickup_location,
            "dropoffLocation": t.dropoff_location,
            "pickupTime": t.pickup_time,
            "estimatedFare": t.estimated_fare,
            "status": t.status,
            "bookingReference": t.booking_reference,
            "createdAt": t.created_at,
            "updatedAt": t.updated_at
        }
        for t in transports
    ]

@app.post("/api/trips/{trip_id}/expenses", status_code=status.HTTP_201_CREATED)
def create_trip_expense(
    trip_id: str,
    expense_data: dict,
    user_data = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_user, user_profile, _ = user_data
    verify_trip_ownership(trip_id, auth_user.id, db)

    expense_id = f"exp_{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow().isoformat() + "Z"

    category_val = expense_data.get("category", "Other")
    if category_val not in ["Transport", "Hotel", "Food", "Activities", "Shopping", "Other"]:
        category_val = "Other"

    new_expense = TripExpenseModel(
        id=expense_id,
        trip_id=trip_id,
        activity_id=expense_data.get("activityId"),
        title=expense_data.get("title", "Expense"),
        amount=float(expense_data.get("amount", 0.0)),
        category=category_val,
        paid_by=expense_data.get("paidBy", user_profile.firstName if user_profile else "Me"),
        is_split=bool(expense_data.get("isSplit", False)),
        created_at=now
    )
    db.add(new_expense)
    db.commit()
    log_event(f"💸 Persisted expense for trip {trip_id}: {new_expense.title} - ₹{new_expense.amount} (ID: {expense_id})")

    return {
        "id": new_expense.id,
        "tripId": new_expense.trip_id,
        "activityId": new_expense.activity_id,
        "title": new_expense.title,
        "amount": new_expense.amount,
        "category": new_expense.category,
        "paidBy": new_expense.paid_by,
        "isSplit": new_expense.is_split,
        "createdAt": new_expense.created_at
    }

@app.get("/api/trips/{trip_id}/expenses")
def get_trip_expenses(
    trip_id: str,
    user_data = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_user, _, _ = user_data
    verify_trip_ownership(trip_id, auth_user.id, db)

    expenses = db.query(TripExpenseModel).filter(TripExpenseModel.trip_id == trip_id).order_by(TripExpenseModel.created_at.desc()).all()
    return [
        {
            "id": e.id,
            "tripId": e.trip_id,
            "activityId": e.activity_id,
            "title": e.title,
            "amount": e.amount,
            "category": e.category,
            "paidBy": e.paid_by,
            "isSplit": e.is_split,
            "createdAt": e.created_at
        }
        for e in expenses
    ]

# ── TOUR GUIDE API ENDPOINTS ──

from tour_guide_service import (
    search_nearby_pois, rank_places, generate_tour_guide_response,
    get_or_create_session, add_message_to_session,
    should_refresh_nearby, check_proactive_alert, haversine_meters,
    resolve_active_place
)

class TourGuideChatRequest(BaseModel):
    message: str
    place_id: Optional[str] = None
    mode: Optional[str] = "local"  # "local" | "trip"
    trip_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class TourGuideVisitRequest(BaseModel):
    place_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@app.get("/api/tour-guide/nearby")
def tour_guide_nearby(
    lat: float,
    lng: float,
    radius: int = 5000,
    request: Request = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Discover nearby POIs within radius using Overpass API (max 5km)."""
    radius = min(radius, 5000)

    # Get user for session + preferences
    user_id = "guest"
    user_prefs = None
    try:
        token = extract_token(request, authorization)
        user_tuple = auth.get_session_user(db, token)
        if user_tuple:
            user_id = user_tuple[0].id
            if user_tuple[2]:
                user_prefs = {
                    "activityInterests": user_tuple[2].activity_interests or [],
                    "travelStyles": user_tuple[2].travel_styles or [],
                }
    except Exception:
        pass

    log_event(f"TOUR GUIDE NEARBY | User: {user_id} | Center: ({lat:.4f}, {lng:.4f}) | Radius: {radius}m")

    # Search and rank
    raw_places = search_nearby_pois(lat, lng, radius)
    ranked = rank_places(raw_places, user_prefs, limit=10)

    # Update session
    session = get_or_create_session(user_id)
    session["nearby_places"] = ranked
    session["last_nearby_lat"] = lat
    session["last_nearby_lng"] = lng
    session["last_nearby_refresh"] = __import__("time").time()

    # Check proactive alert
    alert_place = check_proactive_alert(session, lat, lng, ranked)

    return {
        "places": ranked,
        "center": {"latitude": lat, "longitude": lng},
        "radius_m": radius,
        "count": len(ranked),
        "total_raw": len(raw_places),
        "proactive_alert": alert_place
    }

@app.post("/api/tour-guide/chat")
def tour_guide_chat(
    req: TourGuideChatRequest,
    request: Request = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Conversational AI tour guide chat supporting Local Mode and Trip Mode."""
    user_id = "guest"
    user_prefs = None
    trip_context = None

    try:
        token = extract_token(request, authorization)
        user_tuple = auth.get_session_user(db, token)
        if user_tuple:
            user_id = user_tuple[0].id
            if user_tuple[2]:
                user_prefs = {
                    "activityInterests": user_tuple[2].activity_interests or [],
                    "travelStyles": user_tuple[2].travel_styles or [],
                }
    except Exception:
        pass

    target_mode = req.mode or "local"
    target_trip_id = req.trip_id

    # If in trip mode or trip_id passed, fetch trip details
    if target_trip_id or target_mode == "trip":
        try:
            trip_model = None
            if target_trip_id:
                trip_model = db.query(TripModel).filter(TripModel.id == target_trip_id).first()
            else:
                trip_model = db.query(TripModel).filter(TripModel.user_id == user_id).first()

            if trip_model:
                target_trip_id = trip_model.id
                dest = {
                    "name": trip_model.destination_name,
                    "latitude": trip_model.destination_lat,
                    "longitude": trip_model.destination_lng,
                }
                days_list = []
                try:
                    for day in trip_model.itinerary_days:
                        acts = [{"title": a.title, "category": a.category, "locationName": a.location_name} for a in day.activities]
                        days_list.append({"dayNumber": day.day_number, "theme": day.theme, "activities": acts})
                except Exception:
                    pass

                trip_context = {
                    "id": trip_model.id,
                    "title": trip_model.title,
                    "destination": dest,
                    "startDate": trip_model.start_date.isoformat() if trip_model.start_date else None,
                    "endDate": trip_model.end_date.isoformat() if trip_model.end_date else None,
                    "status": trip_model.status,
                    "days": days_list
                }
        except Exception:
            pass

    session = get_or_create_session(user_id)
    session["mode"] = target_mode
    if target_trip_id:
        session["trip_id"] = target_trip_id

    # Refresh nearby if needed first to ensure nearby_places has latest POIs
    user_location = None
    if req.latitude and req.longitude:
        user_location = {"latitude": req.latitude, "longitude": req.longitude}
        if should_refresh_nearby(session, req.latitude, req.longitude) or not session.get("nearby_places"):
            raw = search_nearby_pois(req.latitude, req.longitude, 5000)
            ranked = rank_places(raw, user_prefs, limit=10)
            session["nearby_places"] = ranked
            session["last_nearby_lat"] = req.latitude
            session["last_nearby_lng"] = req.longitude
            session["last_nearby_refresh"] = __import__("time").time()

    # Resolve active place context accurately
    place_context = resolve_active_place(req.place_id, req.message, session, session.get("nearby_places", []))
    active_place_id = place_context["id"] if place_context else req.place_id

    # Recalculate place_context distance if location is present
    if place_context and user_location and place_context.get("latitude") and place_context.get("longitude"):
        place_context["distanceMeters"] = round(
            haversine_meters(req.latitude, req.longitude, place_context["latitude"], place_context["longitude"])
        )

    # Add user message to session with active place ID
    add_message_to_session(session, "user", req.message, active_place_id)

    log_event(
        f"TOUR GUIDE CHAT | Mode: {target_mode} | User: {user_id} | ActivePlace: {place_context.get('name') if place_context else 'None'} "
        f"(id: {active_place_id}) | Msg: {req.message[:80]} | HistoryLen: {len(session['messages'])}"
    )

    # Generate AI response
    result = generate_tour_guide_response(
        messages=session["messages"],
        place_context=place_context,
        nearby_places=session.get("nearby_places", []),
        user_location=user_location,
        trip_context=trip_context,
        user_prefs=user_prefs,
        mode=target_mode
    )

    # Add AI response to session with active place ID
    add_message_to_session(session, "guide", result.get("reply", ""), active_place_id)

    return {
        "reply": result.get("reply", "I'm here to help!"),
        "suggestedActions": result.get("suggestedActions", []),
        "place": place_context,
        "mode": target_mode,
        "trip_id": target_trip_id,
        "source": result.get("source", "unknown")
    }

@app.post("/api/tour-guide/visit")
def tour_guide_visit(
    req: TourGuideVisitRequest,
    request: Request = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Set the current place focus for the tour guide session."""
    user_id = "guest"
    try:
        token = extract_token(request, authorization)
        user_tuple = auth.get_session_user(db, token)
        if user_tuple:
            user_id = user_tuple[0].id
    except Exception:
        pass

    session = get_or_create_session(user_id)
    session["current_place_id"] = req.place_id

    place_context = None
    for p in session.get("nearby_places", []):
        if p["id"] == req.place_id:
            place_context = p
            break

    log_event(f"TOUR GUIDE VISIT | User: {user_id} | Focused on: {place_context.get('name') if place_context else req.place_id}")

    return {
        "status": "focused",
        "place": place_context,
        "session_messages": len(session.get("messages", []))
    }

@app.get("/api/tour-guide/session")
def tour_guide_session(
    request: Request = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Get current tour guide session state."""
    user_id = "guest"
    try:
        token = extract_token(request, authorization)
        user_tuple = auth.get_session_user(db, token)
        if user_tuple:
            user_id = user_tuple[0].id
    except Exception:
        pass

    session = get_or_create_session(user_id)
    return {
        "currentPlaceId": session.get("current_place_id"),
        "messageCount": len(session.get("messages", [])),
        "nearbyCount": len(session.get("nearby_places", [])),
        "autoGuideEnabled": session.get("auto_guide_enabled", False),
        "lastNearbyRefresh": session.get("last_nearby_refresh", 0)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, access_log=True)
