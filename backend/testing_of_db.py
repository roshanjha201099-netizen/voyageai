import os
import sys
from dotenv import load_dotenv

load_dotenv()

TARGET_EMAIL = "test@gmail.com"

# Check database connection URL
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL environment variable is missing in .env")
    sys.exit(1)

# Ensure URL uses standard postgresql driver for psycopg2 if asyncpg prefix is present
sync_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

try:
    from sqlalchemy import create_engine, text

    engine = create_engine(sync_url)
except Exception as e:
    print(f"❌ Failed to initialize SQLAlchemy engine: {e}")
    sys.exit(1)


def inspect():
    with engine.connect() as conn:
        print("\n" + "=" * 65)
        print(f"1. CHECKING USERS MATCHING: {TARGET_EMAIL}")
        print("=" * 65)

        users = conn.execute(
            text(
                "SELECT id, email, created_at FROM users WHERE LOWER(email) = LOWER(:email)"
            ),
            {"email": TARGET_EMAIL},
        ).fetchall()

        if not users:
            print(f"❌ No records found in 'users' table for '{TARGET_EMAIL}'.")
        else:
            print(f"Found {len(users)} user record(s):")
            user_ids = []
            for u in users:
                user_ids.append(str(u.id))
                print(
                    f"  - User ID: {u.id} | Email: {u.email} | Created At: {u.created_at}"
                )

            print("\n" + "=" * 65)
            print("2. TRIPS ASSOCIATED WITH THIS EMAIL'S USER ID(S)")
            print("=" * 65)

            # Query trips linked to any of these user IDs
            trips = conn.execute(
                text("""
                    SELECT id, title, user_id, created_at 
                    FROM trips 
                    WHERE user_id::text = ANY(:uids)
                    ORDER BY created_at DESC
                """),
                {"uids": user_ids},
            ).fetchall()

            if trips:
                print(f"✅ Found {len(trips)} trip(s) tied to {TARGET_EMAIL}:")
                for t in trips:
                    print(
                        f"  - Trip ID: {t.id} | Title: {t.title} | User ID: {t.user_id} | Created: {t.created_at}"
                    )
            else:
                print(
                    f"⚠️ 0 trips found in 'trips' table linked to user ID(s): {user_ids}"
                )

        print("\n" + "=" * 65)
        print("3. LAST 5 TRIPS RECORDED IN THE ENTIRE DATABASE")
        print("=" * 65)
        recent_trips = conn.execute(
            text("""
                SELECT id, title, user_id, created_at 
                FROM trips 
                ORDER BY created_at DESC 
                LIMIT 5
            """)
        ).fetchall()

        if not recent_trips:
            print("⚠️ The 'trips' table is completely empty!")
        else:
            for rt in recent_trips:
                print(
                    f"  - Trip ID: {rt.id} | Title: {rt.title} | Owner user_id: {rt.user_id} | Created: {rt.created_at}"
                )
        print("=" * 65 + "\n")


if __name__ == "__main__":
    inspect()