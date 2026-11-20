# SiteLens AI Server — Production Dockerfile
# Default: Lightweight Node 20 Alpine for $0/mo Cloud Security API (Render / Koyeb / Fly.io)
# For full headless Chromium Lighthouse on an Oracle Cloud Always Free VM, switch base image to
# node:20-slim and install chromium (see README / STORE_LISTING.md).

FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy server source
COPY . .

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=9876
ENV PUBLIC_CLOUD_MODE=true
ENV DISABLE_LOCAL_LIGHTHOUSE=true

EXPOSE 9876

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["node", "server.js"]
