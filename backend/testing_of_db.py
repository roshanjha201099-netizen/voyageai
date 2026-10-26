import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

TARGET_EMAIL = "test@gmail.com"

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL missing from .env")
    sys.exit(1)

# Ensure synchronous driver format for psycopg2
sync_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

try:
    engine = create_engine(sync_url)
except Exception as e:
    print(f"❌ Failed to connect to DB engine: {e}")
    sys.exit(1)


def inspect():
    with engine.connect() as conn:
        print("\n" + "=" * 65)
        print(f"1. CHECKING 'auth_users' FOR: {TARGET_EMAIL}")
        print("=" * 65)

        users = conn.execute(
            text("""
                SELECT id, email, provider, created_at, last_login_at 
                FROM auth_users 
                WHERE LOWER(email) = LOWER(:email)
            """),
            {"email": TARGET_EMAIL},
        ).fetchall()

        if not users:
            print(f"❌ No record found in 'auth_users' for email: {TARGET_EMAIL}")
            return

        user_ids = []
        for u in users:
            user_ids.append(str(u.id))
            print(f"  • User ID       : {u.id}")
            print(f"    Email         : {u.email}")
            print(f"    Provider      : {u.provider}")
            print(f"    Created At    : {u.created_at}")
            print(f"    Last Login At : {u.last_login_at}")

        print("\n" + "=" * 65)
        print(f"2. CHECKING TRIPS FOR USER ID(S): {user_ids}")
        print("=" * 65)

        trips = conn.execute(
            text("""
                SELECT id, user_id, title, status, itinerary_status, total_days, created_at, updated_at
                FROM trips
                WHERE user_id = ANY(:uids)
                ORDER BY created_at DESC
            """),
            {"uids": user_ids},
        ).fetchall()

        if trips:
            print(f"✅ Found {len(trips)} trip(s) for this user:")
            for t in trips:
                print(f"\n  • Trip ID          : {t.id}")
                print(f"    Title            : {t.title}")
                print(f"    Status           : {t.status}")
                print(f"    Itinerary Status : {t.itinerary_status}")
                print(f"    Total Days       : {t.total_days}")
                print(f"    Created At       : {t.created_at}")
                print(f"    Updated At       : {t.updated_at}")
        else:
            print(f"⚠️ 0 trips found in 'trips' table for user ID(s): {user_ids}")

        print("\n" + "=" * 65)
        print("3. LAST 5 TRIPS ACROSS ALL USERS IN DB")
        print("=" * 65)

        recent_trips = conn.execute(
            text("""
                SELECT id, user_id, title, status, created_at
                FROM trips
                ORDER BY created_at DESC
                LIMIT 5
            """)
        ).fetchall()

        if not recent_trips:
            print("⚠️ The 'trips' table is completely empty.")
        else:
            for rt in recent_trips:
                print(f"  • Trip ID: {rt.id} | Title: {rt.title} | Owner user_id: {rt.user_id} | Created: {rt.created_at}")
        print("=" * 65 + "\n")


if __name__ == "__main__":
    inspect()