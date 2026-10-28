#!/bin/bash
# Release 2026-10-20-EDITOR-ADMIN: editor visual como admin padrão de TODAS as lojas
# Escopo:
# - /admin.html passa a redirecionar para o editor visual (/editor.html),
#   preservando ?loja= (multi-lojas) e enviando ?reset= para o painel completo.
# - O painel antigo vira /admin-completo.html (pedidos, relatórios, senha).
# - Editor e painel apontam um para o outro; links de "painel" (SaaS, CLI e
#   início do servidor) passam a abrir o editor.
# - Service worker deixa admin/editor fora do cache; cache PWA é versionado.
# - Vale para lojas existentes (default + tenants + clones em lojas/) e novas
#   lojas (tenants compartilham o código; clones copiam a base atualizada).
# Só código: config.json, catálogo, data/, img/ e tenants/ são preservados.
# Uso: ./deploy/release-20261020-editor-admin.sh [IP-DA-VPS]
# Cada fase pede confirmação. Nada na VPS muda sem o seu "s".
set -u
VPS_IP="${1:-191.252.159.172}"
cd "$(dirname "$0")/.." || exit 1

pausa(){ read -r -p "$1 [s/N] " r; [ "$r" = "s" ] || { echo "abortado."; exit 1; }; }

echo "=== FASE 0 — validação local (só leitura/checagem) ==="
node --check js/app.js || exit 1
node --check admin.js || exit 1
node --check editor.js || exit 1
python3 -m py_compile server.py scripts/atualizar_todas.py scripts/nova_loja.py scripts/clonar_loja.py || exit 1
python3 -m json.tool config.json >/dev/null || exit 1
for t in generico religioso doces generico-hml; do
  python3 -m json.tool "saas/templates/$t/config.json" >/dev/null || exit 1
  python3 -m json.tool "saas/templates/$t/catalog.json" >/dev/null || exit 1
done

echo "-- admin.html redireciona para o editor e preserva ?loja= / ?reset="
grep -q 'location.replace(destino + location.search + location.hash)' admin.html || { echo "admin.html sem redirecionamento"; exit 1; }
grep -q '"admin-completo.html"' admin.html || { echo "admin.html não envia reset para admin-completo"; exit 1; }
grep -q '"editor.html"' admin.html || { echo "admin.html não envia para o editor"; exit 1; }

echo "-- painel completo separado"
[ -f admin-completo.html ] || { echo "admin-completo.html ausente"; exit 1; }
grep -q 'admin.js?v=' admin-completo.html || { echo "admin-completo.html sem admin.js"; exit 1; }
grep -q 'id="formLogin"' admin-completo.html || { echo "admin-completo.html sem login"; exit 1; }
grep -q 'id="formReset"' admin-completo.html || { echo "admin-completo.html sem redefinição de senha"; exit 1; }

echo "-- editor aponta para o painel completo e usa versão nova"
grep -q 'admin-completo.html' editor.html || { echo "editor.html não aponta para admin-completo.html"; exit 1; }
grep -q '20261020-admin1' editor.html || { echo "versão do editor.js não foi atualizada"; exit 1; }
grep -q 'admin-completo.html' editor.js || { echo "editor.js não aponta para admin-completo.html"; exit 1; }

echo "-- service worker não cacheia admin/editor"
grep -q '/editor.html' sw.js || { echo "sw.js cacheia editor.html"; exit 1; }
grep -q '/editor.js' sw.js || { echo "sw.js cacheia editor.js"; exit 1; }
grep -q '/admin-completo.html' sw.js || { echo "sw.js cacheia admin-completo.html"; exit 1; }
grep -q '/admin.html' sw.js || { echo "sw.js cacheia admin.html"; exit 1; }

echo "-- links de painel apontam para o editor (lojas existentes e novas)"
grep -q 'editor.html' scripts/nova_loja.py || { echo "nova_loja.py não imprime o editor"; exit 1; }
grep -q 'editor.html' scripts/clonar_loja.py || { echo "clonar_loja.py não imprime o editor"; exit 1; }
grep -q '/editor.html' server.py || { echo "server.py não anuncia o editor"; exit 1; }
grep -q 'editor.html' saas-admin.html || { echo "saas-admin.html não abre o editor"; exit 1; }

echo "-- propagação das lojas isoladas inclui o painel completo"
grep -q '"admin-completo.html"' scripts/atualizar_todas.py || { echo "atualizar_todas.py não propaga admin-completo.html"; exit 1; }
grep -q '"editor.html", "editor.js", "editor.css"' scripts/atualizar_todas.py || { echo "atualizar_todas.py não propaga o editor"; exit 1; }
grep -q "saas/lojas.json" deploy/publicar.sh || { echo "publicar.sh não protege os dados do SaaS"; exit 1; }
grep -q "config.json" deploy/publicar.sh || { echo "publicar.sh não protege o config.json"; exit 1; }
grep -q "tenants/" deploy/publicar.sh || { echo "publicar.sh não protege tenants/"; exit 1; }

if grep -qiE 'homologação|homologacao|badge-hml|hml-flag' editor.html editor.css editor.js; then
  echo "editor ainda contém marcação de homologação; remova antes do deploy"; exit 1
fi

for d in lojas/*/; do
  [ -f "$d/editor.html" ] && [ -f "$d/editor.js" ] && [ -f "$d/admin.html" ] && [ -f "$d/server.py" ] || { echo "loja $d incompleta"; exit 1; }
  cmp -s index.html "$d/index.html" || { echo "loja $d com index.html antigo"; exit 1; }
  cmp -s js/app.js "$d/js/app.js" || { echo "loja $d com app.js antigo"; exit 1; }
  cmp -s editor.js "$d/editor.js" || { echo "loja $d com editor.js antigo (rode a propagação)"; exit 1; }
  cmp -s admin.js "$d/admin.js" || { echo "loja $d com admin.js antigo"; exit 1; }
  cmp -s server.py "$d/server.py" || { echo "loja $d com server.py antigo"; exit 1; }
  cmp -s editor.css "$d/editor.css" || { echo "loja $d com editor.css antigo"; exit 1; }
done

if find img video -maxdepth 1 -name 'teste-*' -print -quit | grep -q .; then
  echo "há arquivos de teste em img/ ou video/; limpe antes do deploy"; exit 1
fi
grep -q 'editor.css?v=' editor.html || { echo "cache do editor.css ausente"; exit 1; }
python3 scripts/atualizar_todas.py --dry-run || exit 1
echo "Fase 0 OK."
pausa "Ir para FASE 1 (dry-run na VPS, sem alterar nada)?"

echo "=== FASE 1 — dry-run na VPS (somente leitura) ==="
ssh "root@${VPS_IP}" "cd /srv/superloja && python3 scripts/atualizar_todas.py --dry-run" || exit 1
echo "Dry-run OK. Confira acima se só os arquivos de código serão tocados."
pausa "Ir para FASE 2 (publicar código + restart — CAUSA segundos de indisponibilidade)?"

echo "=== FASE 2 — publicar ==="
./deploy/publicar.sh "${VPS_IP}" || exit 1

echo "=== FASE 3 — verificação ==="
ssh "root@${VPS_IP}" "systemctl is-active superloja caddy"
ssh "root@${VPS_IP}" "cd /srv/superloja && \
  grep -q 'location.replace(destino + location.search + location.hash)' admin.html && echo 'admin.html -> editor OK'; \
  test -f admin-completo.html && echo 'admin-completo.html presente'; \
  grep -q '20261020-admin1' editor.html && echo 'editor.js versão nova OK'; \
  grep -q 'admin-completo.html' editor.js && echo 'editor -> painel completo OK'; \
  grep -q '/editor.html' server.py && echo 'server.py anuncia editor OK'; \
  grep -q '/editor.html' saas-admin.html && echo 'saas-admin abre editor OK'"
ssh "root@${VPS_IP}" "cd /srv/superloja && for d in lojas/*/; do \
  slug=\$(basename \$d); \
  grep -q 'location.replace' \$d/admin.html && test -f \$d/admin-completo.html && grep -q 'admin-completo.html' \$d/editor.js && echo \"loja \$slug: admin -> editor OK\" || echo \"loja \$slug: FALHOU\"; \
  done"
ssh "root@${VPS_IP}" "cd /srv/superloja && for t in tenants/*/; do \
  slug=\$(basename \$t); \
  code=\$(curl -s -o /dev/null -w '%{http_code}' \"http://127.0.0.1:8324/editor.html?loja=\$slug\"); \
  admin=\$(curl -s \"http://127.0.0.1:8324/admin.html?loja=\$slug\" | grep -c 'location.replace'); \
  echo \"tenant \$slug: editor \$code / admin redirect \$admin\"; \
  done"
echo ""
echo "Conferência rápida no navegador (Ctrl+Shift+R):"
echo "  1) Abra /admin.html?loja=<slug>: deve cair no editor visual com a loja correta."
echo "  2) No editor, use 'Mais opções > Abrir painel completo': abre /admin-completo.html?loja=<slug>."
echo "  3) No painel completo, o link 'Ver o site' e as abas de pedidos/relatórios funcionam."
echo "  4) Link de reset (?reset=): deve abrir /admin-completo.html?reset=... e permitir nova senha."
echo "  5) Repita em uma loja existente (default-tenant, homem-essencia, teste-homolog)"
echo "     e em uma loja nova criada depois do deploy: o editor deve ser o admin padrão."
echo "  6) PWA: feche e reabra a aba; o cache novo deve carregar o editor atualizado."
echo ""
echo "Rollback: backups/pre-update-*/ na VPS (tar.gz por loja) + backup local do deploy."
echo "RELEASE CONCLUÍDO."
