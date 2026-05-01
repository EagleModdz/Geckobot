#!/bin/bash
set -e

mkdir -p /app/data/bots/default /app/data/plugins

# On first run: copy bot.toml template if no config exists yet
if [ ! -f /app/data/bots/default/bot.toml ]; then
    cp /app/defaults/bot.toml.example /app/data/bots/default/bot.toml

    # Inject TS3_SERVER env var into address field if provided
    if [ -n "$TS3_SERVER" ]; then
        sed -i "s|YOUR_TS3_SERVER:9987|${TS3_SERVER}|" /app/data/bots/default/bot.toml
        echo "[entrypoint] TS3 server set to: $TS3_SERVER"
    else
        echo ""
        echo "╔══════════════════════════════════════════════════════════╗"
        echo "║  Set TS3_SERVER=your-server.com:9987 and restart         ║"
        echo "║  OR edit data/ts3audiobot/bots/default/bot.toml manually ║"
        echo "╚══════════════════════════════════════════════════════════╝"
        echo ""
    fi
fi

# On first run: copy rights.toml template if none exists
if [ ! -f /app/data/rights.toml ]; then
    cp /app/defaults/rights.toml /app/data/rights.toml
    echo "[entrypoint] rights.toml initialized"
fi

exec /app/TS3AudioBot --non-interactive
