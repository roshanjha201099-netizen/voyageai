# Backend Docker Deployment Guide

This guide explains how to build and deploy the FastAPI backend service (with Redis and the async worker) on a server using Docker.

---

## 1. Quick Start with Docker Compose (Recommended)

Docker Compose automatically runs:
- **FastAPI API Server** on port `8000`
- **Redis 7** (with appendonly persistence) on port `6379`
- **Background Worker** (`worker.py`) for asynchronous itinerary generation

### Option A: From inside `backend/` directory
```bash
cd backend

# 1. Ensure .env exists with required credentials (DATABASE_URL, GEMINI_API_KEY, etc.)
cp .env.example .env   # (or upload your existing .env)

# 2. Build and start containers in the background
docker compose up -d --build

# 3. View live logs
docker compose logs -f

# 4. Stop all services
docker compose down
```

### Option B: From project root directory
```bash
docker compose up -d --build
```

---

## 2. Standalone Docker Build & Run (Single Container)

If you only want to build and run the FastAPI backend container without Compose:

### Build Image
```bash
cd backend
docker build -t cruiser-backend .
```

### Run Container
```bash
docker run -d \
  --name cruiser-backend \
  -p 8000:8000 \
  --env-file .env \
  --restart unless-stopped \
  cruiser-backend
```

---

## 3. Health Check & Verification

Once started, test that the API is healthy:

```bash
# Check root status
curl http://localhost:8000/

# Expected response:
# {"app": "VoyageAI OS PostgreSQL API", "status": "online"}
```

---

## 4. Key Environment Variables Needed in `.env`

Make sure the server's `.env` file includes:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (e.g., Neon or local Postgres) |
| `REDIS_HOST` | Hostname of Redis (set to `redis` in docker-compose, or `localhost` if external) |
| `REDIS_PORT` | `6379` |
| `GEMINI_API_KEY` | Google Gemini API key for AI generation |
| `GOOGLE_MAPS_API_KEY` | Google Maps Platform API key for POI search & geocoding |
| `PORT` | `8000` |

