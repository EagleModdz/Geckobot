FROM mcr.microsoft.com/dotnet/runtime:8.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget unzip ffmpeg libopus-dev libopus0 libssl-dev ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Download TS3AudioBot (develop branch for TS6 server support)
RUN wget -q "https://splamy.de/api/nightly/projects/ts3ab/develop_linux_x64/download" -O ts3audiobot.zip \
    && unzip ts3audiobot.zip -d /app \
    && rm ts3audiobot.zip \
    && chmod +x /app/TS3AudioBot

# Create data directory and copy config
RUN mkdir -p /app/bots/default

COPY config/ts3audiobot.toml /app/ts3audiobot.toml

EXPOSE 58913

CMD ["/app/TS3AudioBot", "--non-interactive"]
