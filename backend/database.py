import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Read DATABASE_URL from environment variable (e.g. Render PostgreSQL / Neon / Supabase)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASS = os.getenv("DB_PASS", "7044")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "voyageai")

    # If running on Render or cloud host without DATABASE_URL env, fallback to SQLite
    if os.getenv("RENDER") or os.getenv("IS_CLOUD"):
        print("[DATABASE NOTICE] Running on cloud environment without DATABASE_URL. Using SQLite database.")
        DATABASE_URL = "sqlite:///./voyageai.db"
    else:
        # Try local PostgreSQL connection with short 2s timeout
        try:
            conn = psycopg2.connect(
                dbname="postgres",
                user=DB_USER,
                password=DB_PASS,
                host=DB_HOST,
                port=DB_PORT,
                connect_timeout=2
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s;", (DB_NAME,))
            exists = cursor.fetchone()
            if not exists:
                print(f"[POSTGRES SETUP] Database '{DB_NAME}' does not exist. Creating database '{DB_NAME}'...")
                cursor.execute(f'CREATE DATABASE "{DB_NAME}";')
                print(f"[POSTGRES SETUP] Database '{DB_NAME}' created successfully!")
            cursor.close()
            conn.close()
            DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        except Exception as e:
            print(f"[DATABASE NOTICE] PostgreSQL unavailable ({e}). Falling back to SQLite database.")
            DATABASE_URL = "sqlite:///./voyageai.db"

# Support postgres:// URL format compatibility
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

