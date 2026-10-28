#!/bin/bash
# Auto-heal Super Loja — roda na VPS via cron a cada 2min (root).
# Se o backend local não responder, faz reset-failed + restart (sem precisar de você).
# Instalar: sudo crontab -e  ->  */2 * * * * /srv/superloja/deploy/superloja-healthcheck.sh >> /var/log/superloja-healthcheck.log 2>&1
set -u
CODE=$(curl -s -m 8 -o /dev/null -w "%{http_code}" http://127.0.0.1:8324/api/tenant || echo 000)
if [ "$CODE" = "200" ]; then
  exit 0
fi
logger -t superloja-healthcheck "backend $CODE, reiniciando superloja"
systemctl reset-failed superloja 2>/dev/null
systemctl restart superloja
sleep 5
CODE2=$(curl -s -m 8 -o /dev/null -w "%{http_code}" http://127.0.0.1:8324/api/tenant || echo 000)
logger -t superloja-healthcheck "após restart: $CODE2"
# garante que o Caddy também está de pé (admin 000 com local 200 = caddy travado)
if [ "$CODE2" = "200" ]; then
  systemctl reset-failed caddy 2>/dev/null
  systemctl reload caddy 2>/dev/null || systemctl restart caddy
fi
exit 0
