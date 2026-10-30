#!/bin/bash
# Comandos para rodar a plataforma Cloudflare (Pages + Worker + D1 + R2 + KV)
# Rode na ordem: 1 -> 2 -> 3 -> 4

echo "=== 1. Criar recursos (execute uma vez) ==="
echo "wrangler d1 create saas-pump"
echo "wrangler r2 bucket create lojas-images"
echo "wrangler kv:namespace create SESSION_KV"
echo ""
echo "=== 2. Copiar IDs gerados para wrangler.toml ==="
echo "- database_id no [[d1_databases]]"
echo "- bucket_name no [[r2_buckets]]"
echo "- id no [[kv_namespaces]]"
echo ""
echo "=== 3. Aplicar schema SQLite no D1 ==="
echo "wrangler d1 execute saas-pump --file=db/schema-d1.sql"
echo ""
echo "=== 4. Publicar ==="
echo "wrangler deploy"
echo ""
echo "=== 5. Verificar ==="
echo "wrangler d1 execute saas-pump --command 'SELECT * FROM tenants LIMIT 5'"
