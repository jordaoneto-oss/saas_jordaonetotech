#!/bin/bash
# Publicar código na VPS KingHost sem tocar nos DADOS de produção.
# Uso: ./deploy/publicar.sh [IP-DA-VPS] [--slug default-tenant]
# - Sobe só CÓDIGO (html/js/css/scripts/deploy); nunca .env.prod, saas/*.json,
#   config.json, catalog.json, data/, lojas/, tenants/, backups/.
# - Na VPS: propaga p/ as lojas (atualizar_todas.py --sem-restart) + restart
#   superloja e lojas via systemd.
set -u
VPS_IP="${1:-191.252.159.172}"
SLUG_ARG=""
if [ "${2:-}" = "--slug" ] && [ -n "${3:-}" ]; then
  SLUG_ARG="--slug $3"
fi
cd "$(dirname "$0")/.." || exit 1

echo "== enviando código p/ root@${VPS_IP}:/srv/superloja/ =="
rsync -avz --exclude 'backups/' --exclude '.DS_Store' \
  --exclude '.env.prod' --exclude '.env' \
  --exclude 'saas/lojas.json' --exclude 'saas/financeiro.json' \
  --exclude 'saas/interesses.json' --exclude 'saas/plataforma.json' \
  --exclude 'saas/tenants.json' \
  --exclude 'config.json' --exclude 'js/catalog.json' --exclude 'manifest.webmanifest' \
  --exclude 'data/' --exclude 'lojas/' --exclude 'tenants/' --exclude 'db/' \
  --exclude '__pycache__/' \
  ./ "root@${VPS_IP}:/srv/superloja/"
echo "== propagando p/ lojas + restart systemd =="
ssh "root@${VPS_IP}" "cd /srv/superloja && chown -R www-data:www-data /srv/superloja && python3 scripts/atualizar_todas.py ${SLUG_ARG} --sem-restart && systemctl restart superloja && systemctl restart 'loja-*' 2>/dev/null; systemctl is-active superloja caddy"
echo "OK: publique e confira no navegador (Ctrl+Shift+R)."
