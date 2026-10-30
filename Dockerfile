# ==============================================================================
# Cruiser / VoyageAI - React + Vite Frontend Dockerfile
# Multi-stage build: Node.js (build) -> Nginx Alpine (production server & proxy)
# ==============================================================================

# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json ./

# Install dependencies cleanly
RUN npm ci

# Copy frontend source code
COPY . .

# Optional Build-time environment variables for Vite
ARG VITE_API_URL=""
ARG VITE_WS_URL=""
ARG VITE_CARTO_BASEMAP_KEY=""
ARG VITE_GOOGLE_MAP_DEMO_KEY=""

ENV VITE_API_URL=$VITE_API_URL \
    VITE_WS_URL=$VITE_WS_URL \
    VITE_CARTO_BASEMAP_KEY=$VITE_CARTO_BASEMAP_KEY \
    VITE_GOOGLE_MAP_DEMO_KEY=$VITE_GOOGLE_MAP_DEMO_KEY

# Build production bundle
RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine AS runner

# Remove default static files
RUN rm -rf /usr/share/nginx/html/*

# Copy built production assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
