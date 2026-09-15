import asyncio
import time
from collections import Counter
import httpx

# Target NGINX entrypoint directly
BASE_URL = "http://localhost:80"

# Endpoints to test:
# 1. Health / Root (General limit: 100 req/min)
# 2. Places search (OSM limit: 20 req/min)
TEST_ENDPOINT = f"{BASE_URL}/api/places/search?q=Jaipur"

CONCURRENCY = 15          # Simultaneous worker coroutines
TOTAL_REQUESTS = 60       # Total requests to fire across the cluster

async def send_request(client: httpx.AsyncClient, req_id: int) -> dict:
    start = time.perf_counter()
    try:
        response = await client.get(TEST_ENDPOINT, timeout=10.0)
        latency = (time.perf_counter() - start) * 1000
        
        # Check if node identity is passed via custom header, or inspect body
        server_node = response.headers.get("X-Backend-Node", "Unknown")
        retry_after = response.headers.get("Retry-After")
        
        return {
            "req_id": req_id,
            "status": response.status_code,
            "latency_ms": latency,
            "node": server_node,
            "retry_after": retry_after,
        }
    except Exception as e:
        latency = (time.perf_counter() - start) * 1000
        return {
            "req_id": req_id,
            "status": "ERROR",
            "latency_ms": latency,
            "error": str(e),
        }

async def run_benchmark():
    print("=" * 65)
    print(f"[*] Starting Cluster Stress Test via NGINX (Port 80)")
    print(f"[*] Endpoint: {TEST_ENDPOINT}")
    print(f"[*] Total Requests: {TOTAL_REQUESTS} | Concurrency: {CONCURRENCY}")
    print("=" * 65)

    # Use connection pooling to simulate rapid concurrent client connections
    limits = httpx.Limits(max_keepalive_connections=CONCURRENCY, max_connections=CONCURRENCY * 2)
    
    async with httpx.AsyncClient(limits=limits) as client:
        tasks = [send_request(client, i + 1) for i in range(TOTAL_REQUESTS)]
        
        start_time = time.perf_counter()
        results = await asyncio.gather(*tasks)
        total_time = time.perf_counter() - start_time

    # Metric aggregations
    status_counts = Counter(r["status"] for r in results)
    node_counts = Counter(r.get("node") for r in results if "node" in r)
    latencies = [r["latency_ms"] for r in results if isinstance(r["latency_ms"], (int, float))]
    
    latencies.sort()
    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    p50 = latencies[int(len(latencies) * 0.50)] if latencies else 0
    p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0
    p99 = latencies[int(len(latencies) * 0.99)] if latencies else 0

    print("\n--- RESULTS BREAKDOWN ---")
    print(f"Total Test Duration : {total_time:.2f} seconds")
    print(f"Throughput           : {TOTAL_REQUESTS / total_time:.2f} req/sec")
    print(f"Average Latency      : {avg_latency:.2f} ms")
    print(f"p50 Latency          : {p50:.2f} ms")
    print(f"p95 Latency          : {p95:.2f} ms")
    print(f"p99 Latency          : {p99:.2f} ms")

    print("\n--- HTTP STATUS CODES ---")
    for status, count in status_counts.items():
        print(f"Status {status} : {count} requests ({count / TOTAL_REQUESTS * 100:.1f}%)")

    # If backend instances emit identifying headers
    if any(k != "Unknown" for k in node_counts.keys()):
        print("\n--- UPSTREAM NODE DISTRIBUTION ---")
        for node, count in node_counts.items():
            print(f"Node {node} : {count} requests handled")

    # Rate Limiter Verification Summary
    print("\n--- VERIFICATION VERDICT ---")
    if 429 in status_counts:
        print("[SUCCESS] Distributed rate limiting detected:")
        print(f"  - Allowed Requests : {status_counts.get(200, 0)}")
        print(f"  - Blocked by 429   : {status_counts.get(429, 0)}")
    else:
        print("[NOTICE] Zero 429s returned. Verify that TOTAL_REQUESTS exceeds the rate limiter limit.")

if __name__ == "__main__":
    asyncio.run(run_benchmark())
