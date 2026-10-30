# Cruiser — Docker Deployment Guide

Full-stack 3-tier containerized deployment:
- **2 Dockerfiles**:
  - `Dockerfile` (Frontend: React + Vite + Nginx)
  - `backend/Dockerfile` (Backend: FastAPI + Python 3.11)
- **1 Docker Compose (`docker-compose.yml`)** with **3 services**:
  - `frontend` (Port `80`)
  - `backend` (Port `8000`)
  - `db` (PostgreSQL 16 on Port `5432`)

---

## Architecture Overview

```
               [ User Browser ]
                      │
               ( Port 80 / HTTP )
                      ▼
        ┌───────────────────────────┐
        │     cruiser-frontend      │
        │       (Nginx SPA)         │
        └───────┬───────────┬───────┘
                │           │
     /api/proxy │           │ /ws/proxy
                ▼           ▼
        ┌───────────────────────────┐
        │      cruiser-backend      │
        │    (FastAPI on :8000)     │
        └─────────────┬─────────────┘
                      │
                      │ SQL Connection
                      ▼
        ┌───────────────────────────┐
        │        cruiser-db         │
        │     (PostgreSQL :5432)    │
        └───────────────────────────┘
```

---

## 1. Quick Start: Launch All 3 Services

From the project root:

```bash
# 1. Build and start frontend, backend, and postgres database:
docker compose up -d --build

# 2. View live logs:
docker compose logs -f

# 3. View status of all 3 services:
docker compose ps

# 4. Stop all services:
docker compose down
```

### URLs once running:
- **Frontend App**: `http://<server-ip>/` (Port `80`)
- **Backend API**: `http://<server-ip>:8000/` (Port `8000`)
- **PostgreSQL Database**: `localhost:5432` (`user=postgres`, `password=postgres`, `db=cruiser`)

---

## 2. Standalone Docker Builds (2 Dockerfiles)

### Frontend (`Dockerfile`)
```bash
docker build -t cruiser-frontend .
docker run -d --name cruiser-frontend -p 80:80 cruiser-frontend
```

### Backend (`backend/Dockerfile`)
```bash
cd backend
docker build -t cruiser-backend .
docker run -d --name cruiser-backend -p 8000:8000 --env-file .env cruiser-backend
```

---

## 3. Database & Environment Configuration

In `docker-compose.yml`, the backend automatically connects to the PostgreSQL container using:
```
DATABASE_URL=postgresql://postgres:postgres@db:5432/cruiser
```
All tables are automatically created on first boot by the backend ORM sync.

To add your Gemini API Key or other credentials, create/update `backend/.env`:
```env
GEMINI_API_KEY=your_key_here
GOOGLE_MAPS_API_KEY=your_key_here
```
