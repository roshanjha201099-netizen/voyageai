import os
import json
import asyncio
import logging
import redis.asyncio as aioredis
from task_queue import TRIP_EVENTS_CHANNEL

logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")
REDIS_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"

async def start_redis_events_listener(broadcast_callback):
    """
    Subscribes to Redis Pub/Sub events published by worker.py.
    When an event arrives, it triggers broadcast_callback (WebSocket sender).
    """
    # Connect asynchronously to Redis with RESP2 protocol for local Redis server compatibility
    r = aioredis.from_url(REDIS_URL, decode_responses=True, protocol=2)
    pubsub = r.pubsub()
    await pubsub.subscribe(TRIP_EVENTS_CHANNEL)
    
    print(f"[REDIS PUBSUB] Subscribed to channel '{TRIP_EVENTS_CHANNEL}'", flush=True)

    try:
        async for message in pubsub.listen():
            if message and message.get("type") == "message":
                raw_data = message.get("data")
                try:
                    event_payload = json.loads(raw_data)
                    trip_id = event_payload.get("trip_id")
                    status = event_payload.get("status")
                    event_type = event_payload.get("event", "ITINERARY_READY")
                    
                    print(f"[PUBSUB EVENT RECEIVED] Trip: {trip_id} -> {status}", flush=True)

                    # Forward payload to the WebSocket broadcast function
                    await broadcast_callback(trip_id, {
                        "type": event_type,
                        "tripId": trip_id,
                        "status": status
                    })
                except Exception as parse_err:
                    logger.error(f"[PUBSUB ERROR] Failed to process incoming event: {parse_err}")

    except asyncio.CancelledError:
        print("[REDIS PUBSUB] Unsubscribing and shutting down listener cleanly...", flush=True)
        await pubsub.unsubscribe(TRIP_EVENTS_CHANNEL)
        await r.aclose()
