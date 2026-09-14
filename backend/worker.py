import os
import sys
import json
import time
import signal
import logging

# Ensure backend root is in module search path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import models_db
import models_trip
from redis_client import redis_conn
from database import SessionLocal
from itinerary_service import process_async_itinerary_generation
from task_queue import TASK_QUEUE_KEY, publish_trip_event

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("voyageai.worker")

running = True

def handle_shutdown(signum, frame):
    global running
    logger.info("Gracefully shutting down worker process...")
    running = False

try:
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)
except Exception:
    pass

def start_worker():
    logger.info(f"VoyageAI Background Task Worker listening on queue: {TASK_QUEUE_KEY}")
    print(f"[WORKER READY] Listening for jobs on '{TASK_QUEUE_KEY}' (Press Ctrl+C to stop)...", flush=True)

    while running:
        try:
            # BRPOP blocks for up to 5 seconds waiting for a new job
            item = redis_conn.brpop(TASK_QUEUE_KEY, timeout=5)
            if not item:
                continue

            # item is a tuple: (queue_name, popped_value_string)
            _, raw_payload = item
            job = json.loads(raw_payload)
            trip_id = job.get("trip_id")

            if not trip_id:
                logger.warning(f"Malformed job payload received: {raw_payload}")
                continue

            logger.info(f"Picked up job for trip_id: {trip_id}")
            print(f"\n[WORKER RUNNING] Processing AI Itinerary for trip: {trip_id}", flush=True)

            # Execute the cache lookup / AI generation / PostgreSQL copy pipeline
            process_async_itinerary_generation(trip_id, SessionLocal)

            # Publish completion event
            publish_trip_event(trip_id=trip_id, status="READY", event_type="ITINERARY_READY")
            print(f"[WORKER COMPLETED] Trip {trip_id} generated and published.\n", flush=True)

        except Exception as e:
            logger.error(f"[WORKER ERROR] Job failed: {e}")
            time.sleep(1)

if __name__ == "__main__":
    start_worker()
