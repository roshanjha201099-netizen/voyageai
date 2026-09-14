import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class DistributedConnectionManager:
    def __init__(self):
        # Maps trip_id -> Set of active local WebSockets on THIS specific FastAPI instance
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, trip_id: str, websocket: WebSocket):
        await websocket.accept()
        if trip_id not in self.active_connections:
            self.active_connections[trip_id] = set()
        self.active_connections[trip_id].add(websocket)
        logger.info(f"[WS CONNECTED] Client connected to trip {trip_id} on this instance.")
        print(f"[WS CONNECTED] Client connected to trip {trip_id} on this instance.", flush=True)

    def disconnect(self, trip_id: str, websocket: WebSocket):
        if trip_id in self.active_connections:
            self.active_connections[trip_id].discard(websocket)
            if not self.active_connections[trip_id]:
                del self.active_connections[trip_id]
        logger.info(f"[WS DISCONNECTED] Client disconnected from trip {trip_id}.")
        print(f"[WS DISCONNECTED] Client disconnected from trip {trip_id}.", flush=True)

    async def broadcast_to_local_subscribers(self, trip_id: str, message: dict):
        """
        Called when a Redis Pub/Sub event arrives.
        Broadcasts only if this specific instance holds an active socket for the trip.
        """
        connections = self.active_connections.get(trip_id, set())
        if not connections:
            # Client is connected to another FastAPI instance; ignore cleanly
            return

        dead_connections = set()
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"[WS SEND ERROR] Failed to send to socket: {e}")
                dead_connections.add(ws)

        # Clean up stale sockets
        for dead in dead_connections:
            self.disconnect(trip_id, dead)

ws_manager = DistributedConnectionManager()
