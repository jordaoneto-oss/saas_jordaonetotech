#!/bin/bash
# Release 2026-10-10: sequência de produtos + coleções + popup promocional + WhatsApp no pedido + rótulos do admin
# Base: release 2026-10-09 já aplicado (submenu, menu, no-cache, botões).
# Uso: ./deploy/release-20261010.sh [IP-DA-VPS]
# Cada fase pede confirmação. Nada na VPS muda sem o seu "s".
set -u
VPS_IP="${1:-191.252.159.172}"
cd "$(dirname "$0")/.." || exit 1

pausa(){ read -r -p "$1 [s/N] " r; [ "$r" = "s" ] || { echo "abortado."; exit 1; }; }

echo "=== FASE 0 — validação local (só leitura/checagem) ==="
node --check js/app.js || exit 1
node --check admin.js || exit 1
python3 -c "import ast; ast.parse(open('server.py').read()); print('server.py OK')"
python3 -c "import json; d=json.load(open('config.json')); assert d.get('popup',{}).get('ativo')==False, 'popup deve ir DESLIGADO'; print('popup desligado por padrão OK')"
for t in saas/templates/religioso/config.json saas/templates/doces/config.json saas/templates/generico/config.json saas/template/config.json; do
  python3 -c "import json; d=json.load(open('$t')); assert d.get('popup',{}).get('ativo')==False, '$t com popup ligado'; print('$t OK')"
done
grep -q 'moverProduto' admin.js || { echo "ERRO: sequência ausente"; exit 1; }
grep -q 'renderColecoes' js/app.js || { echo "ERRO: coleções ausentes"; exit 1; }
grep -q 'iniciarPopup' js/app.js || { echo "ERRO: popup ausente"; exit 1; }
grep -q 'mascaraFone' js/app.js || { echo "ERRO: máscara de WhatsApp ausente"; exit 1; }
grep -q 'Conteúdo do site' admin.js || { echo "ERRO: rótulos novos ausentes"; exit 1; }
grep -q '"colecao"' server.py || { echo "ERRO: colecao fora da whitelist"; exit 1; }
grep -q '"ordem"' server.py || { echo "ERRO: ordem fora da whitelist"; exit 1; }
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
echo "Abra com Ctrl+Shift+R e teste:"
echo "  1) Admin > Produtos: coluna Pos. + setas + campo Coleção?"
echo "  2) Admin > Conteúdo: Coleções (add/remover/↑↓) + Popup (presets)?"
echo "  3) Vitrine: sequência em Destaques? coleção filtra sem sobrepor e rola até a peça?"
echo "  4) Pedido mobile sem número bloqueia e foca? ?previa-popup=1 exibe o popup?"
echo "  5) Nova loja de teste nasce com popup desligado?"
echo ""
echo "Rollback se necessário: backups/pre-update-*/ na VPS (tar.gz por loja)."
echo "RELEASE CONCLUÍDO."
