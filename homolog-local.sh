#!/bin/bash
# Homologação local: super admin + admin da loja + loja
# Uso: ./homolog-local.sh
# Abertura: http://localhost:8324/ (loja) | /admin.html (lojista) | /saas-admin.html (super admin)
set -u
cd "$(dirname "$0")" || exit 1
export HOST="127.0.0.1"
export PORT="8324"
export DEFAULT_TENANT="default-tenant"
export SEED_ADMIN_PASS="${SEED_ADMIN_PASS:-homolog123}"
export SAAS_ADMIN_TOKEN="${SAAS_ADMIN_TOKEN:-homolog-token-123}"
export SHOW_DEFAULT_PASS="1"
export BASE_DOMAIN="localhost"
echo "== HOMOLOG LOCAL =="
echo "Loja:        http://localhost:8324/"
echo "Admin loja:  http://localhost:8324/admin.html (senha: atelie123 p/ loja padrão, ou $SEED_ADMIN_PASS p/ novas)"
echo "Super admin: http://localhost:8324/saas-admin.html (token: $SAAS_ADMIN_TOKEN)"
echo ""
echo "Para criar loja teste: super admin > Nova loja > slug 'teste-homolog' > Criar > Ligar."
echo "Ctrl+C para parar."
exec python3 server.py --host 127.0.0.1 --port 8324
