FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

# Copy modified TS3AudioBot source (from submodule)
COPY ts3audiobot-src/ .

# Build and publish
RUN dotnet publish TS3AudioBot -c Release -r linux-x64 --self-contained -o /app/publish

# --- Runtime image ---
FROM mcr.microsoft.com/dotnet/runtime:8.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget ffmpeg libopus-dev libopus0 libssl-dev ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/publish .

RUN chmod +x /app/TS3AudioBot

# Create data directory and copy config
RUN mkdir -p /app/bots/default

COPY config/ts3audiobot.toml /app/ts3audiobot.toml

EXPOSE 58913

CMD ["/app/TS3AudioBot", "--non-interactive"]
