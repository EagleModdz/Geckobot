FROM node:22-slim AS builder

WORKDIR /app
# Copy root workspace files for deterministic install via package-lock.json
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci --workspace=backend

COPY backend/ ./backend/
WORKDIR /app/backend
RUN npm run build

FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    yt-dlp ffmpeg wget python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci --workspace=backend --omit=dev

COPY --from=builder /app/backend/dist ./dist
COPY backend/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3001

CMD ["/app/entrypoint.sh"]
