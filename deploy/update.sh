#!/usr/bin/env bash
# Atualiza o portal na VM: git pull + deps (se mudaram) + migrações + build + restart.
# Uso (na VM): cd ~/garra && bash deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only
cd portal

# npm ci é lento na VM: só reinstala quando o lockfile muda.
lock_hash=$(sha256sum package-lock.json | cut -d' ' -f1)
if [ ! -d node_modules ] || [ "$(cat node_modules/.lock-hash 2>/dev/null)" != "$lock_hash" ]; then
  npm ci
  echo "$lock_hash" > node_modules/.lock-hash
fi

npm run db:migrate
npm run build
sudo systemctl restart garra-portal
echo "Atualizado para $(git log --oneline -1)"
