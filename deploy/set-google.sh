#!/usr/bin/env bash
# Grava GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET no .env.local do portal e reinicia.
# Uso (na VM):
#   bash deploy/set-google.sh                      # pede ID e secret (secret oculto)
#   bash deploy/set-google.sh /tmp/client.json     # lê o JSON baixado do Google Cloud e apaga o arquivo
set -euo pipefail
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/portal/.env.local"

if [ $# -ge 1 ]; then
  JSON="$1"
  CID=$(jq -r '(.web // .installed).client_id // empty' "$JSON")
  CSECRET=$(jq -r '(.web // .installed).client_secret // empty' "$JSON")
  shred -u "$JSON" 2>/dev/null || rm -f "$JSON"
else
  read -rp "Google Client ID: " CID
  read -rsp "Google Client secret (oculto): " CSECRET
  echo
fi
[ -n "$CID" ] && [ -n "$CSECRET" ] || { echo "Client ID ou secret não encontrados."; exit 1; }

tmp=$(mktemp)
grep -vE '^GOOGLE_CLIENT_(ID|SECRET)=' "$ENV_FILE" > "$tmp" || true
printf 'GOOGLE_CLIENT_ID=%s\nGOOGLE_CLIENT_SECRET=%s\n' "$CID" "$CSECRET" >> "$tmp"
install -m 600 "$tmp" "$ENV_FILE"
rm -f "$tmp"
unset CSECRET

echo "Credenciais do Google gravadas (client ${CID%%-*}…). Reiniciando o portal…"
sudo systemctl restart garra-portal
echo "Pronto."
