#!/usr/bin/env bash
# Atualiza o portal na VM: git pull + deps + migrações + build + restart.
# Uso (na VM): cd ~/garra && bash deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only
cd portal
npm ci
npm run db:migrate
npm run build
sudo systemctl restart garra-portal
echo "Atualizado para $(git log --oneline -1)"
