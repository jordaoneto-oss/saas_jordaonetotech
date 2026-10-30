#!/bin/bash
set -euo pipefail

echo "=== Setup Cloudflare (wrangler 4.86) ==="

# 1. D1
echo "Criando D1..."
D1_ID=$(wrangler d1 create saas-pump --use-remote --update-config 2>/dev/null || true)
# Se não capturar, tenta info
if [ -z "$D1_ID" ]; then
  D1_ID=$(wrangler d1 info saas-pump --format=json 2>/dev/null | grep -oE '"database_id":"[a-f0-9-]+"' | cut -d'"' -f4 || echo "")
fi

# 2. R2
echo "Criando R2..."
wrangler r2 bucket create lojas-images || true

# 3. KV (sintaxe 4.x)
echo "Criando KV..."
KV_ID=$(wrangler kv namespace create SESSION_KV 2>/dev/null || true)
if [ -z "$KV_ID" ]; then
  KV_ID=$(wrangler kv namespace info SESSION_KV --format=json 2>/dev/null | grep -oE '"id":"[a-f0-9]{32}"' | cut -d'"' -f4 || echo "")
fi

# Atualiza wrangler.toml
if [ -n "${D1_ID:-}" ]; then
  sed -i.bak "s/database_id = \".*\"/database_id = \"$D1_ID\"/" wrangler.toml || true
  echo "D1: $D1_ID"
fi
if [ -n "${KV_ID:-}" ]; then
  sed -i.bak "s/id = \".*\"/id = \"$KV_ID\"/" wrangler.toml || true
  echo "KV: $KV_ID"
fi

echo "Aplicando schema (remoto)..."
wrangler d1 execute saas-pump --file=db/schema-d1.sql --remote || wrangler d1 execute saas-pump --file=db/schema-d1.sql

echo "=== Finalizado. Verifique IDs no wrangler.toml e rode: wrangler deploy ==="
