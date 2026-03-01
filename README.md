<div align="center">

<img src="https://raw.githubusercontent.com/EagleModdz/geckobot/main/frontend/public/geckobot.png" alt="GeckoBot Logo" width="120" />

# GeckoBot

**A full-featured TeamSpeak music bot with a modern web interface**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Features](#-features) · [Screenshots](#-screenshots) · [Quick Start](#-quick-start) · [Configuration](#-configuration) · [Deployment](#-deployment)

</div>

---

## Overview

GeckoBot is a self-hosted music bot for TeamSpeak 3 & 6 servers, powered by [TS3AudioBot](https://github.com/Splamy/TS3AudioBot) and controlled through a sleek browser-based dashboard. Search YouTube and Spotify, manage queues, control multiple bot instances, and configure granular permissions — all from one place.

---

## ✨ Features

### 🎵 Playback
- Play, pause, skip, seek and adjust volume from the browser
- Repeat modes (off / one / all) and queue shuffle
- Live stream detection with a pulsing LIVE indicator
- Real-time position tracking via Socket.IO

### 📋 Queue Management
- Add tracks from search results or direct URLs
- Drag-and-drop reorder
- Shuffle (Fisher-Yates), clear, and per-track removal
- Autoplay — next track starts automatically when one finishes

### 🔍 Search
- **YouTube** search via yt-dlp with pagination (20 results per page)
- **Spotify** search and full playlist import
- Instant play or silent queue-add per result
- Thumbnails, duration, and LIVE badges shown inline

### 🤖 Multi-Bot Management
- Connect and control multiple TS3AudioBot instances simultaneously
- Rename, duplicate, connect, and disconnect bots
- Per-bot avatar upload with a canvas-based circle-crop editor
- Default avatar auto-applied on connect

### 🔐 Permissions & Commands
- Create permission groups with custom colors and TS3 member assignments
- Grant specific commands per group — synced to `rights.toml` without restart
- Browse all available bot commands, searchable and grouped by category

### 🎨 Themes
8 built-in color themes: **Gecko · Ocean · Purple · Sunset · Rose · Cyan · Crimson · Mint**

### ⚙️ Settings
Configure TS3 server, TS3AudioBot API, Spotify credentials, and yt-dlp — all from the UI, persisted in SQLite.

---

## 📸 Screenshots

> Coming soon — feel free to open a PR with screenshots!

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- A running TeamSpeak 3 or 6 server

### 1. Clone the repository

```bash
git clone https://github.com/EagleModdz/geckobot.git
cd geckobot
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set the required values:

| Variable | Description |
|---|---|
| `JWT_SECRET` | Random secret — generate with `openssl rand -hex 32` |
| `DEFAULT_ADMIN_PASSWORD` | Password for the web UI admin account |
| `TS3AUDIOBOT_API_KEY` | API key from TS3AudioBot (see step 4) |

### 3. Start the stack

```bash
docker compose up -d --build
```

The first build takes a few minutes (compiles TS3AudioBot from source).

### 4. Configure the bot

On first start, the bot has no TS3 server configured. Edit the generated config:

```bash
nano data/ts3audiobot/bots/default/bot.toml
```

Set your TS3 server address and identity key, then restart:

```bash
docker compose restart ts3audiobot
```

To get the TS3AudioBot API key (needed in `.env`):

```bash
docker compose logs ts3audiobot | grep -i "token\|api"
```

### 5. Open the web UI

```
http://localhost:3000
```

Default login: `admin` / *(your `DEFAULT_ADMIN_PASSWORD`)*

---

## ⚙️ Configuration

### Environment Variables

```env
# Required
JWT_SECRET=                   # Random secret (openssl rand -hex 32)
DEFAULT_ADMIN_PASSWORD=       # Web UI admin password

# TS3AudioBot
TS3AUDIOBOT_URL=http://ts3audiobot:58913
TS3AUDIOBOT_API_KEY=          # From ts3audiobot logs on first run

# Optional — Spotify integration
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=https://your-domain.com/api/spotify/callback
```

### Bot Config (`data/ts3audiobot/bots/default/bot.toml`)

```toml
run = true

[connect]
address = "your-ts3-server.com:9987"
channel = "/1"   # Default channel (path or "/<id>")

[connect.identity]
key = ""         # Paste your TS3 identity key here
offset = 0
```

---

## 🐳 Deployment

### Docker (recommended)

**Development** — builds from source, hot reload:
```bash
docker compose up -d
```

**Production** — uses pre-built images from GitHub Container Registry:
```bash
# Add to .env:
# GHCR_IMAGE_PREFIX=ghcr.io/eaglemoddz/geckobot
# VERSION=v1.0.0

docker compose -f docker-compose.prod.yml up -d
```

**Update to a new version:**
```bash
./scripts/server-update.sh v1.1.0
```

### Ports

| Port | Service |
|------|---------|
| `3000` | Web UI (Nginx) |
| `3001` | Backend API |
| `58913` | TS3AudioBot REST API |

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
    }

    location /api {
        proxy_pass http://localhost:3001;
    }

    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Then run `certbot --nginx` for HTTPS.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│  Browser                                     │
│  React 19 · Tailwind · Socket.IO Client      │
└────────────────────┬────────────────────────┘
                     │ HTTP / WebSocket
┌────────────────────▼────────────────────────┐
│  Backend  :3001                              │
│  Express · Socket.IO · SQLite · JWT          │
│  yt-dlp · Spotify API                        │
└─────────┬───────────────────────────────────┘
          │ REST API
┌─────────▼───────────────────────────────────┐
│  TS3AudioBot  :58913                         │
│  .NET 8 · FFmpeg · Opus                      │
└─────────┬───────────────────────────────────┘
          │ TeamSpeak Protocol
┌─────────▼───────────────────────────────────┐
│  TeamSpeak 3 / 6 Server                      │
└─────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 6, Tailwind CSS 3, Radix UI, Lucide Icons |
| **Backend** | Node.js, Express 4, Socket.IO 4, SQLite (better-sqlite3) |
| **Auth** | JWT + bcrypt |
| **Bot Engine** | TS3AudioBot v0.14+ (.NET 8) |
| **Audio** | FFmpeg, Opus codec |
| **Music Sources** | yt-dlp (YouTube), Spotify Web API |
| **Infrastructure** | Docker, Nginx, GitHub Actions, GHCR |

---

## 📦 Releases

New releases are built and pushed automatically to GitHub Container Registry via GitHub Actions when a tag is pushed:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Images: `ghcr.io/eaglemoddz/geckobot-frontend`, `-backend`, `-ts3audiobot`

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
Made with ❤️ for the TeamSpeak community
</div>
