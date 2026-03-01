#!/bin/bash
# Usage: ./scripts/server-update.sh [version]
# Example: ./scripts/server-update.sh v1.2.0
# Without version: pulls latest

set -e

VERSION=${1:-latest}
COMPOSE="docker compose -f docker-compose.prod.yml"

echo "Updating musicbot to version: $VERSION"

# Pull new images
VERSION=$VERSION $COMPOSE pull

# Restart containers with zero downtime (backend + ts3audiobot keep running during frontend swap)
VERSION=$VERSION $COMPOSE up -d

echo ""
echo "Update complete. Status:"
$COMPOSE ps
