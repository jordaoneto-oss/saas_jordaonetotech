#!/bin/bash
# Release 2026-10-12: busca sem acento (fatima encontra Fátima) no site + painéis
# Escopo: helper semAcento() em js/app.js, admin.js e saas-admin.html; filtro de
# catálogo, produtos, contatos e lojas passa a ignorar acentos nos dois sentidos.
# Só código — nenhum dado é tocado; lojas novas herdam automaticamente (clonam a base).
# Uso: ./deploy/release-20261012.sh [IP-DA-VPS]
# Cada fase pede confirmação. Nada na VPS muda sem o seu "s".
set -u
VPS_IP="${1:-191.252.159.172}"
cd "$(dirname "$0")/.." || exit 1

pausa(){ read -r -p "$1 [s/N] " r; [ "$r" = "s" ] || { echo "abortado."; exit 1; }; }

echo "=== FASE 0 — validação local (só leitura/checagem) ==="
node --check js/app.js || exit 1
node --check admin.js || exit 1
python3 -c "import ast; ast.parse(open('server.py').read()); print('server.py OK')"
grep -q 'const semAcento' js/app.js || { echo "ERRO: helper semAcento ausente no js/app.js"; exit 1; }
grep -q 'const semAcento' admin.js || { echo "ERRO: helper semAcento ausente no admin.js"; exit 1; }
grep -q 'semAcentoSaas' saas-admin.html || { echo "ERRO: helper semAcento ausente no saas-admin.html"; exit 1; }
grep -q 'semAcento(estado.busca' js/app.js || { echo "ERRO: filtro do catálogo sem normalizar"; exit 1; }
grep -q 'semAcento(FILTRO_PROD' admin.js || { echo "ERRO: filtro de produtos sem normalizar"; exit 1; }
grep -q 'semAcento(FILTRO_CONT' admin.js || { echo "ERRO: filtro de contatos sem normalizar"; exit 1; }
grep -q 'semAcentoSaas(FILTRO_SAAS' saas-admin.html || { echo "ERRO: filtro de lojas sem normalizar"; exit 1; }
if grep -q 'toLowerCase().includes' js/app.js admin.js saas-admin.html; then
  echo "ERRO: ainda há busca com toLowerCase().includes sem normalizar"; exit 1
fi
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
ssh "root@${VPS_IP}" "cd /srv/superloja && grep -l 'semAcento' js/app.js admin.js saas-admin.html && for s in lojas/*/js/app.js; do grep -q 'semAcento' \"\$s\" && echo \"OK \$s\" || echo \"FALTA \$s\"; done"
echo "Abra com Ctrl+Shift+R e teste:"
echo "  1) Vitrine: buscar 'fatima' acha 'Fátima'? 'sao jose' acha 'São José'? 'cassia' acha 'Cássia'?"
echo "  2) Vitrine: buscar COM acento ('coração') também funciona?"
echo "  3) Admin > Produtos: mesma busca sem acento funciona?"
echo "  4) Admin > Pedidos: buscar nome sem acento funciona?"
echo "  5) Super admin: buscar loja sem acento funciona?"
echo "  6) Nova loja de teste nasce com a busca sem acento?"
echo ""
echo "Rollback se necessário: backups/pre-update-*/ na VPS (tar.gz por loja)."
echo "RELEASE CONCLUÍDO."
