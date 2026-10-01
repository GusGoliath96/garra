#!/usr/bin/env bash
# Prepara uma VM Ubuntu 24.04 (Proxmox) para rodar o portal Garra + cells OpenClaw.
# Uso (na VM, como o seu usuário com sudo — de preferência o primeiro usuário, UID 1000):
#   git clone/rsync do projeto para ~/garra && cd ~/garra && bash deploy/setup-vm.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_USER="${SUDO_USER:-$USER}"
STATE_DIR=/var/lib/garra/openclaw
OPENCLAW_VERSION="${OPENCLAW_VERSION:-2026.9.7}"

if [ "$(id -u "$RUN_USER")" != "1000" ]; then
  echo "Aviso: as cells rodam como UID 1000 (node). Rode como o usuário UID 1000 para evitar problemas de permissão." >&2
fi

echo "==> Pacotes base"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg git jq postgresql-client qemu-guest-agent

echo "==> Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$RUN_USER"

echo "==> Node.js 24"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 24 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> OpenClaw CLI $OPENCLAW_VERSION (para o fleet)"
sudo npm install -g "openclaw@$OPENCLAW_VERSION"
sudo docker pull ghcr.io/openclaw/openclaw:latest

echo "==> Diretório de estado das cells"
sudo mkdir -p "$STATE_DIR"
sudo chown -R "$RUN_USER:$RUN_USER" /var/lib/garra
sudo chmod 700 /var/lib/garra

echo "==> Postgres (docker compose)"
sudo docker compose -f "$APP_DIR/docker-compose.yml" up -d

echo "==> Portal"
cd "$APP_DIR/portal"
if [ ! -f .env.local ]; then
  umask 077
  sed -e "s#^BETTER_AUTH_SECRET=.*#BETTER_AUTH_SECRET=$(openssl rand -base64 32)#" \
      -e "s#^APP_SECRET_KEY=.*#APP_SECRET_KEY=$(openssl rand -base64 32)#" \
      -e "s#^OPENCLAW_BIN=.*#OPENCLAW_BIN=$(command -v openclaw)#" \
      -e "s#^OPENCLAW_STATE_DIR=.*#OPENCLAW_STATE_DIR=$STATE_DIR#" \
      -e "s#^BETTER_AUTH_URL=.*#BETTER_AUTH_URL=http://$(hostname -I | awk '{print $1}'):3000#" \
      .env.example > .env.local
  echo "   .env.local criado (ajuste BETTER_AUTH_URL quando tiver domínio)"
fi
npm ci
npm run db:migrate
npm run build

echo "==> Serviço systemd"
sed -e "s#__USER__#$RUN_USER#g" -e "s#__DIR__#$APP_DIR/portal#g" \
  "$APP_DIR/deploy/garra-portal.service" | sudo tee /etc/systemd/system/garra-portal.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable --now garra-portal

echo
echo "Pronto. Portal em http://$(hostname -I | awk '{print $1}'):3000"
echo "Logs: journalctl -u garra-portal -f"
echo "Saia e entre de novo na sessão para o grupo docker valer no seu usuário."
