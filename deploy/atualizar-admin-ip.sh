#!/bin/bash
# Atualiza o IP liberado no admin.* em 1 comando (rode no Mac).
# Uso: ./deploy/atualizar-admin-ip.sh [IP-DA-VPS]
# Pega seu IP atual via ifconfig.me, regen Caddy na VPS e dá reload.
set -u
VPS_IP="${1:-191.252.159.172}"
MEU_IP=$(curl -4 -s --max-time 10 ifconfig.me)
if [ -z "$MEU_IP" ]; then
  echo "ERRO: não consegui descobrir seu IP (ifconfig.me)." >&2
  exit 1
fi
echo "Seu IP: $MEU_IP -> liberando admin na VPS $VPS_IP ..."
ssh "root@${VPS_IP}" "cd /srv/superloja && python3 scripts/gerar_caddy.py --base plataforma.jordaonetotech.com.br --email jordao@jordaonetotech.com.br --admin-ip $MEU_IP --principal-dominio plataforma.jordaonetotech.com.br && sudo cp Caddyfile /etc/caddy/Caddyfile && sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy && grep remote_ip /etc/caddy/Caddyfile"
echo "Confira: curl -s -o /dev/null -w \"%{http_code}\n\" https://plataforma.jordaonetotech.com.br/saas-admin.html  (esperado 200)"
