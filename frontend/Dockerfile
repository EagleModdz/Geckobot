FROM node:22-slim AS builder

WORKDIR /app
# Copy root workspace files for deterministic install via package-lock.json
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
RUN npm ci --workspace=frontend

COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
