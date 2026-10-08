import os
from contextlib import contextmanager
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv(override=True)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASS = os.getenv("DB_PASS", "7044")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "voyageai")
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# ============================================================================
# Single Unified Engine (Thread-safe, pooled, pre-ping enabled)
# ============================================================================
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # Auto-reconnect drops
    pool_size=5,              # 5 persistent connections
    max_overflow=10,          # Up to 15 during sudden bursts
    pool_recycle=1800,        # Recycle connections after 30 mins
    pool_timeout=10           # Fail fast instead of hanging forever
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ----------------------------------------------------------------------------
# 1. ORM Dependency for standard HTTP routes
# ----------------------------------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ----------------------------------------------------------------------------
# 2. Context Manager for WebSocket frames / Background tasks
# ----------------------------------------------------------------------------
@contextmanager
def get_db_context():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

# ----------------------------------------------------------------------------
# 3. High-Speed Raw SQL Connection (Replaces psycopg2 ThreadedPool)
# ----------------------------------------------------------------------------
@contextmanager
def get_raw_connection():
    """Ultra-fast raw connection straight from SQLAlchemy's pool"""
    with engine.connect() as conn:
        yield conn
        conn.commit()

# ----------------------------------------------------------------------------
# 4. Schema Initialization
# ----------------------------------------------------------------------------
def init_db():
    """Boot-time schema sync and indexing"""
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id VARCHAR(64) PRIMARY KEY,
                    user_id VARCHAR(64) NOT NULL,
                    trip_id VARCHAR(64),
                    role VARCHAR(16) NOT NULL,
                    content TEXT NOT NULL,
                    mode VARCHAR(16) DEFAULT 'local',
                    metadata JSONB DEFAULT '{}'::jsonb,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE INDEX IF NOT EXISTS idx_chat_user_created 
                ON chat_messages (user_id, created_at ASC);

                CREATE INDEX IF NOT EXISTS idx_chat_trip 
                ON chat_messages (trip_id) WHERE trip_id IS NOT NULL;
            """))
            conn.commit()
            print("[DATABASE INIT] Unified single-engine schema verified successfully.")
    except Exception as e:
        print(f"[DATABASE INIT WARN] Schema init notice: {e}")

# ----------------------------------------------------------------------------
# 5. Connection Pool Telemetry & Diagnostics
# ----------------------------------------------------------------------------
def get_db_pool_status():
    """Returns real-time SQLAlchemy connection pool diagnostics."""
    if hasattr(engine, "pool"):
        return {
            "size": engine.pool.size(),
            "checked_in": engine.pool.checkedin(),
            "checked_out": engine.pool.checkedout(),
            "overflow": engine.pool.overflow(),
        }
    return {}
