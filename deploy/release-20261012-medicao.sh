#!/bin/bash
# Release 2026-10-12-MEDICAO: Pixel da Meta + GA4 com eventos de conversão
# Escopo: js/app.js carrega Pixel/GA4 só com IDs preenchidos (geral.pixel_meta,
# geral.ga4_id); eventos AddToCart, InitiateCheckout e Contact; campos no painel
# admin (Nome, logo e contato). Sem IDs = zero scripts, site intacto.
# Só código — nenhum dado é tocado; lojas novas herdam desligadas.
# ATENÇÃO: ./deploy/publicar.sh envia o código INTEIRO da pasta. Se outra release
# pendente (busca sem acento, GEO) ainda não foi aplicada, ela irá junto.
# Uso: ./deploy/release-20261012-medicao.sh [IP-DA-VPS]
# Cada fase pede confirmação. Nada na VPS muda sem o seu "s".
set -u
VPS_IP="${1:-191.252.159.172}"
cd "$(dirname "$0")/.." || exit 1

pausa(){ read -r -p "$1 [s/N] " r; [ "$r" = "s" ] || { echo "abortado."; exit 1; }; }

echo "=== FASE 0 — validação local (só leitura/checagem + testes) ==="
node --check js/app.js || exit 1
node --check admin.js || exit 1
node scripts/test_medicao.js || exit 1
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
ssh "root@${VPS_IP}" "cd /srv/superloja && grep -l 'iniciarMedicao' js/app.js lojas/*/js/app.js && grep -l 'pixel_meta' admin.js lojas/*/admin.js"
echo "Ativação (por loja, no painel admin > Nome, logo e contato):"
echo "  1) Criar o Pixel em Gerenciador de Anúncios > Fontes de dados; criar a propriedade GA4."
echo "  2) Colar os IDs nos campos 'Pixel da Meta' e 'GA4' e salvar."
echo "  3) Com Ctrl+Shift+R, fazer um pedido de teste e conferir:"
echo "     - Extensão Meta Pixel Helper: PageView, AddToCart, InitiateCheckout, Contact"
echo "     - GA4 > Relatórios > Tempo real (DebugView): page_view, add_to_cart, begin_checkout, contact"
echo "  4) Só então ligar os anúncios click-to-WhatsApp."
echo ""
echo "Rollback se necessário: backups/pre-update-*/ na VPS (tar.gz por loja)."
echo "RELEASE CONCLUÍDO."
