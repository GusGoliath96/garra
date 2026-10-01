#!/usr/bin/env bash
# Instala o cloudflared na VM e registra o túnel criado no painel da Cloudflare.
# Uso (na VM): cd ~/garra && bash deploy/cloudflare-tunnel.sh
# O token é pedido de forma oculta (não fica no histórico do shell).
set -euo pipefail

if ! command -v cloudflared >/dev/null; then
  echo "==> Instalando cloudflared (repositório oficial da Cloudflare)"
  sudo mkdir -p --mode=0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-public-v2.gpg | sudo tee /usr/share/keyrings/cloudflare-public-v2.gpg >/dev/null
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-public-v2.gpg] https://pkg.cloudflare.com/cloudflared any main" \
    | sudo tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
  sudo apt-get update -y && sudo apt-get install -y cloudflared
fi

read -rsp "Cole o token do túnel (painel Cloudflare → Zero Trust → Networks → Tunnels): " TOKEN
echo
[ -n "$TOKEN" ] || { echo "Token vazio."; exit 1; }
sudo cloudflared service install "$TOKEN"
unset TOKEN
sudo systemctl enable --now cloudflared
sleep 3
systemctl --no-pager --lines=5 status cloudflared | sed -n 1,8p
echo
echo "Túnel instalado. Configure o Public Hostname no painel apontando para http://localhost:3000"
