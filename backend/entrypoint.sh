#!/bin/bash
set -e

mkdir -p /app/data

SECRETS_FILE=/app/data/.secrets.env

# Generate missing secrets on first run and persist them
if [ ! -f "$SECRETS_FILE" ]; then
    JWT_GEN=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")
    PW_GEN=$(node -e "process.stdout.write(require('crypto').randomBytes(16).toString('base64').replace(/[+/=]/g,'').substring(0,20))")

    cat > "$SECRETS_FILE" <<ENDSECRETS
JWT_SECRET=$JWT_GEN
DEFAULT_ADMIN_PASSWORD=$PW_GEN
ENDSECRETS

    echo ""
    echo "╔══════════════════════════════════════════════╗"
    echo "║          GeckoBot — First Run Setup          ║"
    echo "╠══════════════════════════════════════════════╣"
    echo "║  Admin user:     admin                       ║"
    echo "║  Admin password: $PW_GEN"
    echo "║                                              ║"
    echo "║  Credentials saved to data/.secrets.env      ║"
    echo "╚══════════════════════════════════════════════╝"
    echo ""
fi

# Load persisted secrets — explicit env vars take precedence
while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    if [ -z "${!key}" ]; then
        export "$key=$value"
    fi
done < "$SECRETS_FILE"

exec node dist/index.js
