import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL missing from .env")
    sys.exit(1)

sync_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
engine = create_engine(sync_url)

TRIP_ID = "trip_6cddb9082ff5"

def check_trip_activities():
    with engine.connect() as conn:
        print("\n" + "=" * 65)
        print(f"CHECKING ACTIVITIES IN DB FOR TRIP: {TRIP_ID}")
        print("=" * 65)

        # 1. Fetch Itinerary
        itin = conn.execute(
            text("SELECT id, trip_id, version, status FROM itineraries WHERE trip_id = :trip_id"),
            {"trip_id": TRIP_ID}
        ).fetchall()

        if not itin:
            print("❌ No itinerary found for this trip!")
            return

        for i in itin:
            print(f"Itinerary ID: {i.id} | Status: {i.status} | Version: {i.version}")

            # 2. Fetch Days
            days = conn.execute(
                text("SELECT id, day_number, title, date FROM itinerary_days WHERE itinerary_id = :itin_id ORDER BY day_number"),
                {"itin_id": i.id}
            ).fetchall()

            for d in days:
                print(f"\n  📅 Day {d.day_number}: {d.title} (ID: {d.id})")
                
                # 3. Fetch Activities
                activities = conn.execute(
                    text("""
                        SELECT id, time_slot, title, activity_type, location_name, estimated_cost_inr, is_confirmed
                        FROM itinerary_activities
                        WHERE day_id = :day_id
                        ORDER BY id
                    """),
                    {"day_id": d.id}
                ).fetchall()

                if not activities:
                    print("     (No activities recorded for this day)")
                for act in activities:
                    print(f"     • [{act.time_slot}] {act.title} | Cost: ₹{act.estimated_cost_inr} | Confirmed: {act.is_confirmed} | ID: {act.id}")

        # 4. Global search for "Sunburn" across all itinerary_activities just in case
        print("\n" + "-" * 65)
        print("SEARCHING SPECIFICALLY FOR 'Sunburn Festival' IN DB:")
        print("-" * 65)
        sunburn = conn.execute(
            text("SELECT id, day_id, title, estimated_cost_inr FROM itinerary_activities WHERE LOWER(title) LIKE '%sunburn%'")
        ).fetchall()

        if sunburn:
            for s in sunburn:
                print(f"  ✅ Found Activity: ID={s.id} | Day_ID={s.day_id} | Title={s.title} | Cost=₹{s.estimated_cost_inr}")
        else:
            print("  ❌ 'Sunburn Festival' NOT found in `itinerary_activities` table (Frontend-only state!).")

        print("=" * 65 + "\n")

if __name__ == "__main__":
    check_trip_activities()