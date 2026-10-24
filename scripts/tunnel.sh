#!/usr/bin/env bash
# Espone il frontend Angular (che fa proxy di /api verso il backend :3000) via Cloudflare Quick Tunnel.
# Prerequisiti: backend (npm start in Primola_Backend) e frontend (npm start in primola_frontend) avviati.
set -euo pipefail

PORT="${1:-4200}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared non trovato. Installa con: brew install cloudflared" >&2
  exit 1
fi

echo "Avvio tunnel verso http://localhost:${PORT} ..."
exec cloudflared tunnel --url "http://localhost:${PORT}"
