FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

# Copy modified TS3AudioBot source
COPY ts3audiobot-src/ .

# Build and publish for linux-x64
RUN dotnet publish TS3AudioBot -c Release -r linux-x64 --self-contained -o /app/publish

# --- Runtime image ---
FROM mcr.microsoft.com/dotnet/runtime:8.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl ffmpeg libopus-dev libopus0 libssl-dev ca-certificates python3 \
    && rm -rf /var/lib/apt/lists/* \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app

COPY --from=build /app/publish .

RUN chmod +x /app/TS3AudioBot

# Global config
COPY ts3audiobot/config/ts3audiobot.toml /app/ts3audiobot.toml

# Bundle bot.toml template — entrypoint copies it to the data volume on first run
# The real bot.toml (with identity key) is gitignored and provided via volume at runtime.
RUN mkdir -p /app/defaults
COPY ts3audiobot/config/bot.toml.example /app/defaults/bot.toml.example
COPY ts3audiobot/config/rights.toml /app/defaults/rights.toml

# Entrypoint script initializes the data volume on first start
COPY ts3audiobot/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 58913

CMD ["/app/entrypoint.sh"]
