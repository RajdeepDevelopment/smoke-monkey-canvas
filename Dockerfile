# ──────────────────────────────────────────────────────────────────────────────
# 🐒 Smoke Monkey Canvas — Production Multi-Stage Dockerfile
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build Frontend Web Application ──────────────────────────────────
FROM node:22-alpine AS web-builder

WORKDIR /build/web

# Install web dependencies
COPY web/package.json web/package-lock.json* web/pnpm-lock.yaml* ./
RUN npm install --ignore-scripts

# Copy frontend source and build static bundle
COPY web/ ./
RUN npm run build

# ── Stage 2: Production Runtime ──────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Install curl for container healthcheck
RUN apk add --no-cache curl

# Set production environment
ENV NODE_ENV=production \
    PORT=3333 \
    SMOKE_CANVAS_DB=/app/data/canvas.db

# Install server production dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts

# Copy server and CLI executable
COPY bin/ ./bin/
COPY server/ ./server/

# Copy compiled frontend from builder
COPY --from=web-builder /build/web/dist ./web/dist
COPY web/public ./web/public

# Make CLI executable and prepare data directory
RUN chmod +x ./bin/cli.js && \
    mkdir -p /app/data && \
    chown -R node:node /app

# Non-root user for security
USER node

# Expose the Canvas web UI and API port
EXPOSE 3333

# Volume for SQLite persistence
VOLUME ["/app/data"]

# Healthcheck monitoring the canvas API
HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3333/api/space || exit 1

# Start server (skipping browser open inside container)
CMD ["node", "bin/cli.js", "--no-open"]
