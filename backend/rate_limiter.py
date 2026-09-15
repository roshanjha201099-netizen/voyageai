import os
import time
import logging
from typing import Optional
from fastapi import Request, HTTPException
import redis.asyncio as aioredis

logger = logging.getLogger("voyageai.rate_limiter")

# Read Redis connection configuration from environment or fallback to localhost
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_URL = os.getenv("REDIS_URL", f"redis://{REDIS_HOST}:{REDIS_PORT}/0")

# Note: protocol=2 is required for compatibility with Redis 3.x/4.x/5.x (RESP2 protocol)
redis_client = aioredis.from_url(REDIS_URL, decode_responses=True, protocol=2)

class RateLimiter:
    """
    FastAPI Application-Layer Rate Limiter using Redis ZSET Sliding Window.
    Extracts original client IP behind proxies (NGINX/ngrok) and enforces limits.
    Fail-open design: if Redis is unreachable, logs a warning and permits requests.
    """
    def __init__(self, requests: int, window_seconds: int, key_prefix: str = "rl"):
        self.requests = requests
        self.window_seconds = window_seconds
        self.key_prefix = key_prefix

    async def __call__(self, request: Request):
        try:
            # 1. Extract original client IP from NGINX / proxy headers or client host
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                client_ip = forwarded_for.split(",")[0].strip()
            elif request.client and request.client.host:
                client_ip = request.client.host
            else:
                client_ip = "127.0.0.1"

            redis_key = f"{self.key_prefix}:{client_ip}"
            now = time.time()
            clear_before = now - self.window_seconds

            # 2. Redis Pipeline for atomic ZSET sliding window check & update
            pipe = redis_client.pipeline()
            # Remove outdated timestamps outside the window
            pipe.zremrangebyscore(redis_key, 0, clear_before)
            # Count active requests in current window
            pipe.zcard(redis_key)
            # Add current request timestamp
            pipe.zadd(redis_key, {str(now): now})
            # Set TTL to ensure key cleanup in Redis
            pipe.expire(redis_key, self.window_seconds + 1)

            results = await pipe.execute()
            current_count = results[1]

            # 3. If limit is exceeded, raise HTTP 429 Too Many Requests
            if current_count >= self.requests:
                retry_after = int(self.window_seconds)
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded ({self.requests} requests per {self.window_seconds}s). Please slow down.",
                    headers={"Retry-After": str(retry_after)}
                )

            return True

        except HTTPException:
            raise
        except Exception as e:
            # Fail-open: Log warning and permit request if Redis is temporarily unavailable
            logger.warning(f"[RATE LIMITER WARN] Redis check failed ({e}), allowing request.")
            return True
