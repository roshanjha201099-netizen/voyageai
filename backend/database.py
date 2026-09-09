import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DB_USER = "postgres"
DB_PASS = "7044"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "voyageai"

def ensure_database_exists():
    """Ensure the target PostgreSQL database 'voyageai' exists on localhost."""
    try:
        conn = psycopg2.connect(
            dbname="postgres",
            user=DB_USER,
            password=DB_PASS,
            host=DB_HOST,
            port=DB_PORT
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database 'voyageai' exists
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s;", (DB_NAME,))
        exists = cursor.fetchone()
        if not exists:
            print(f"[POSTGRES SETUP] Database '{DB_NAME}' does not exist. Creating database '{DB_NAME}'...")
            cursor.execute(f'CREATE DATABASE "{DB_NAME}";')
            print(f"[POSTGRES SETUP] Database '{DB_NAME}' created successfully!")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[POSTGRES SETUP WARNING] Could not auto-verify database creation: {e}")

# Run database verification
ensure_database_exists()

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
