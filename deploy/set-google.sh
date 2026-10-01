#!/usr/bin/env bash
# Grava GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET no .env.local do portal e reinicia.
# Uso (na VM): cd ~/garra && bash deploy/set-google.sh
set -euo pipefail
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/portal/.env.local"

read -rp "Google Client ID: " CID
read -rsp "Google Client secret (oculto): " CSECRET
echo
[ -n "$CID" ] && [ -n "$CSECRET" ] || { echo "Valores vazios."; exit 1; }

tmp=$(mktemp)
grep -vE '^GOOGLE_CLIENT_(ID|SECRET)=' "$ENV_FILE" > "$tmp" || true
printf 'GOOGLE_CLIENT_ID=%s\nGOOGLE_CLIENT_SECRET=%s\n' "$CID" "$CSECRET" >> "$tmp"
install -m 600 "$tmp" "$ENV_FILE"
rm -f "$tmp"
unset CSECRET

sudo systemctl restart garra-portal
echo "Credenciais do Google gravadas e portal reiniciado."
