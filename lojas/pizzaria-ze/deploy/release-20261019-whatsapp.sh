#!/bin/bash
# Release 2026-10-19-WHATSAPP: mensagem do pedido personalizável + instruções
# Escopo: editor visual e painel admin ganham o campo "Mensagem enviada no pedido"
# (carrinho.msg_modelo) com marcadores {loja}, {itens}, {total}, {combinar},
# {observacao}, {cliente}, {entrega}, {nome}, {whatsapp} e {cep}; vazio = texto
# padrão. Também expõe as mensagens dos botões de WhatsApp (zap.msg_ola e
# zap.msg_encomenda) com instruções. Só código; config.json não é enviado pelo
# publicar.sh, então cada loja mantém os dados e usa o texto padrão até editar.
# Uso: ./deploy/release-20261019-whatsapp.sh [IP-DA-VPS]
# Cada fase pede confirmação. Nada na VPS muda sem o seu "s".
set -u
VPS_IP="${1:-191.252.159.172}"
cd "$(dirname "$0")/.." || exit 1

pausa(){ read -r -p "$1 [s/N] " r; [ "$r" = "s" ] || { echo "abortado."; exit 1; }; }

echo "=== FASE 0 — validação local (só leitura/checagem) ==="
node --check js/app.js || exit 1
node --check admin.js || exit 1
node --check editor.js || exit 1
python3 -m json.tool config.json >/dev/null || exit 1
for t in generico religioso doces generico-hml; do
  python3 -m json.tool "saas/templates/$t/config.json" >/dev/null || exit 1
  grep -q '"msg_modelo"' "saas/templates/$t/config.json" || { echo "template $t sem msg_modelo"; exit 1; }
  grep -q '"zap"' "saas/templates/$t/config.json" || { echo "template $t sem mensagens de WhatsApp"; exit 1; }
done
grep -q "montarMensagemPedido" js/app.js || { echo "falta montarMensagemPedido em js/app.js"; exit 1; }
grep -q "msg_modelo" editor.js admin.js || { echo "falta msg_modelo no editor/admin"; exit 1; }
grep -q "editor.js" scripts/atualizar_todas.py || { echo "editor não será propagado às lojas"; exit 1; }
! grep -qi "wix" editor.html || { echo "termo Wix ainda aparece no login do editor"; exit 1; }
grep -q "Jordao Neto Tech" editor.html admin.html || { echo "marca Jordao Neto Tech ausente no login"; exit 1; }
grep -q "carregarIdentidadeLogin" admin.js || { echo "login do admin sem identidade da loja"; exit 1; }
for d in lojas/*/; do
  [ -f "$d/editor.html" ] && [ -f "$d/editor.js" ] || { echo "loja $d sem editor"; exit 1; }
  grep -q "msg_modelo" "$d/admin.js" || { echo "loja $d com admin antigo"; exit 1; }
done
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
ssh "root@${VPS_IP}" "cd /srv/superloja && grep -l 'montarMensagemPedido' js/app.js lojas/*/js/app.js; grep -l 'msg_modelo' editor.js admin.js lojas/*/editor.js lojas/*/admin.js 2>/dev/null; ls lojas/*/editor.html"
echo ""
echo "Conferência rápida no navegador (Ctrl+Shift+R):"
echo "  1) Editor visual > Páginas > Minha Lista > Mensagem no WhatsApp:"
echo "     editar o texto, fechar um pedido de teste e conferir a mensagem no WhatsApp."
echo "  2) Deixar o campo em branco e repetir: deve sair o texto padrão."
echo "  3) Painel admin > Finalizar compra e > Contato da loja: campos novos visíveis."
echo "  4) Site: botões de WhatsApp ainda abrem com a mensagem da loja."
echo "  5) Novas lojas: o superadmin clona o código atual e os templates já trazem"
echo "     msg_modelo e as mensagens de WhatsApp."
echo ""
echo "Rollback se necessário: backups/pre-update-*/ na VPS (tar.gz por loja)."
echo "RELEASE CONCLUÍDO."
