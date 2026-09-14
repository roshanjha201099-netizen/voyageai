import os
import sys
import uuid
from datetime import datetime

# Ensure backend root is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
import models_db
from models_db import AuthUserModel
from models_trip import TripModel
from itinerary_service import process_async_itinerary_generation

# Ensure all database tables exist
Base.metadata.create_all(bind=engine)

def test_cache_flow():
    db = SessionLocal()
    try:
        now_str = datetime.utcnow().isoformat() + "Z"

        # Create a valid test user in auth_users if not already existing
        test_user = db.query(AuthUserModel).filter(AuthUserModel.email == "cache_test_user@voyageai.local").first()
        if not test_user:
            test_user = AuthUserModel(
                id=f"usr_cache_{uuid.uuid4().hex[:8]}",
                provider="EMAIL",
                provider_user_id="cache_test_user@voyageai.local",
                email="cache_test_user@voyageai.local",
                status="ACTIVE",
                created_at=now_str,
                last_login_at=now_str
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)

        # 1. Create two test trips sharing the same core parameters
        test_dest = {"name": "Jaipur", "country": "India"}
        test_prefs = {"travelStyles": ["CULTURAL", "HISTORICAL"]}
        test_budget = {"level": "MODERATE"}

        trip_a_id = f"test_trip_{uuid.uuid4().hex[:6]}"
        trip_b_id = f"test_trip_{uuid.uuid4().hex[:6]}"

        trip_a = TripModel(
            id=trip_a_id,
            user_id=test_user.id,
            title="Trip A - Cold Cache",
            destination=test_dest,
            start_date="2026-11-01",
            end_date="2026-11-03",
            total_days=3,
            travelers=["UserA"],
            budget=test_budget,
            preferences_snapshot=test_prefs,
            itinerary_status="PENDING",
            created_at=now_str,
            updated_at=now_str
        )
        trip_b = TripModel(
            id=trip_b_id,
            user_id=test_user.id,
            title="Trip B - Warm Cache",
            destination=test_dest,
            start_date="2026-11-10",
            end_date="2026-11-12",
            total_days=3,
            travelers=["UserB"],
            budget=test_budget,
            preferences_snapshot=test_prefs,
            itinerary_status="PENDING",
            created_at=now_str,
            updated_at=now_str
        )

        db.add(trip_a)
        db.add(trip_b)
        db.commit()

        from redis_client import redis_conn
        try:
            redis_conn.delete("itinerary:jaipur:3d:cultural_historical:moderate")
        except Exception:
            pass

        print("\n=== RUNNING CALL 1 (Cold Cache / Expecting Cache Miss) ===")
        process_async_itinerary_generation(trip_a_id, SessionLocal)

        print("\n=== RUNNING CALL 2 (Warm Cache / Expecting Cache Hit) ===")
        process_async_itinerary_generation(trip_b_id, SessionLocal)

    finally:
        db.close()

if __name__ == "__main__":
    test_cache_flow()
