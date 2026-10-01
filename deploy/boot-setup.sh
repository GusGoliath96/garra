#!/usr/bin/env bash
# Garante que tudo sobe sozinho quando a VM liga (ex.: queda de luz + autostart no Proxmox).
# Uso (na VM): cd ~/garra && bash deploy/boot-setup.sh
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_USER="${SUDO_USER:-$USER}"

echo "==> Agente QEMU (Proxmox enxerga memória/IP real e desliga a VM de forma limpa)"
sudo apt-get install -y qemu-guest-agent
sudo systemctl enable qemu-guest-agent
sudo systemctl start qemu-guest-agent 2>/dev/null || echo "   (vai iniciar após ligar o Guest Agent no Proxmox e dar Shutdown/Start na VM)"

echo "==> Portal (unit atualizada)"
sed -e "s#__USER__#$RUN_USER#g" -e "s#__DIR__#$APP_DIR/portal#g" \
  "$APP_DIR/deploy/garra-portal.service" | sudo tee /etc/systemd/system/garra-portal.service >/dev/null
sudo systemctl daemon-reload

echo "==> Serviços no boot"
sudo systemctl enable docker containerd garra-portal systemd-networkd-wait-online.service 2>/dev/null || true
systemctl is-enabled cloudflared >/dev/null 2>&1 && sudo systemctl enable cloudflared

echo "==> Containers voltam com o Docker (Postgres e cells)"
for c in $(docker ps -aq --filter name=clawhost_pg --filter name=openclaw-cell-); do
  docker update --restart unless-stopped "$c" >/dev/null
done

sudo systemctl restart garra-portal
echo
for s in docker garra-portal cloudflared qemu-guest-agent; do
  printf "  %-17s %s / %s\n" "$s" "$(systemctl is-enabled $s 2>&1)" "$(systemctl is-active $s 2>&1)"
done
echo "Pronto."
