#!/bin/bash
set -e

mkdir -p /app/data/bots/default /app/data/plugins

# On first run: copy bot.toml template if no config exists yet.
# Replace /app/data/bots/default/bot.toml with your actual config to connect to TS3.
if [ ! -f /app/data/bots/default/bot.toml ]; then
    cp /app/defaults/bot.toml.example /app/data/bots/default/bot.toml
    echo ""
    echo "================================================================"
    echo " First run: example bot.toml copied to data/bots/default/"
    echo " Edit it with your TS3 server address and identity key."
    echo " Then restart the container."
    echo "================================================================"
    echo ""
fi

exec /app/TS3AudioBot --non-interactive
