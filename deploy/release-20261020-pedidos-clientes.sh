#!/bin/bash
# Release 2026-10-20-PEDIDOS-CLIENTES: painel de pedidos, clientes e relatórios
# Escopo:
# - Aba Pedidos com status (novo/em produção/concluído/cancelado), motivo,
#   pagamento, entrega, busca, período e atalho de WhatsApp.
# - Aba Clientes com deduplicação por WhatsApp, origem (inclui popup), tags,
#   notas e histórico unificado.
# - Relatórios com KPIs, vendas por mês, mais vendidos, status e origem.
#   Receita e ranking ignoram pedidos cancelados.
# - Gestão dentro do editor visual: item "Gestão" na barra lateral, cartão em
#   Páginas e atalhos em Ajustes > Mais opções. Abre as três aba sem sair do
#   editor, em tela cheia (iframe com modo embed do painel completo).
# - Compatível com dados antigos: "atendido" vira "concluído" na leitura.
# Só código: config.json, catálogo, data/, img/, tenants/ e lojas/ são preservados.
# Uso: ./deploy/release-20261020-pedidos-clientes.sh [IP-DA-VPS]
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

echo "-- painel completo com as três abas"
grep -q 'id="aba-pedidos"' admin-completo.html || { echo "aba-pedidos ausente"; exit 1; }
grep -q 'id="aba-clientes"' admin-completo.html || { echo "aba-clientes ausente"; exit 1; }
grep -q 'id="aba-vendidos"' admin-completo.html || { echo "aba-vendidos ausente"; exit 1; }
grep -q 'admin.js?v=20261020-producao7' admin-completo.html || { echo "cache do admin.js não foi atualizado"; exit 1; }
grep -q 'admin.css?v=20261020-producao7' admin-completo.html || { echo "cache do admin.css não foi atualizado"; exit 1; }
grep -q 'document.body.classList.add("embed")' admin-completo.html || { echo "modo embed sem aplicação antecipada"; exit 1; }

echo "-- backend dos pedidos, clientes e indicadores"
grep -q 'rota == "/api/admin/clientes"' server.py || { echo "rota de clientes ausente"; exit 1; }
grep -q 'rota == "/api/admin/indicadores"' server.py || { echo "rota de indicadores ausente"; exit 1; }
grep -q 'def indicadores_loja' server.py || { echo "indicadores_loja ausente"; exit 1; }
grep -q 'def lista_clientes' server.py || { echo "lista_clientes ausente"; exit 1; }
grep -q 'def status_pedido' server.py || { echo "normalização de status ausente"; exit 1; }
grep -q 'bruto not in STATUS_PEDIDO' server.py || { echo "validação de status inválido ausente"; exit 1; }
grep -q 'lead.pop("concluido_ts", None)' server.py || { echo "limpeza de datas de status ausente"; exit 1; }
grep -q 'STATUS_LEGADO = {"atendido": "concluido"' server.py || { echo "legado atendido não mapeado"; exit 1; }

echo "-- frontend das três abas e abertura por ?aba="
grep -q 'async function carregarPedidos' admin.js || { echo "carregarPedidos ausente"; exit 1; }
grep -q 'async function carregarClientes' admin.js || { echo "carregarClientes ausente"; exit 1; }
grep -q 'async function carregarRelatorios' admin.js || { echo "carregarRelatorios ausente"; exit 1; }
grep -q 'const ABA_INICIAL' admin.js || { echo "abertura por ?aba= ausente"; exit 1; }
grep -q 'irPara(ABA_INICIAL || "painel")' admin.js || { echo "?aba= não é aplicado no login"; exit 1; }

echo "-- atalhos no editor para Pedidos, Clientes e Relatórios"
grep -q 'const painelLink = aba' editor.js || { echo "painelLink ausente no editor"; exit 1; }
grep -q 'painelLink("pedidos")' editor.js || { echo "atalho de pedidos ausente"; exit 1; }
grep -q 'admin-card' editor.js || { echo "cartão de pedidos no editor ausente"; exit 1; }
grep -q 'data-gestao="pedidos"' editor.js || { echo "cartão não abre a gestão no editor"; exit 1; }
grep -q 'painelLink("clientes")' editor.js || { echo "atalho de clientes ausente"; exit 1; }
grep -q 'painelLink("vendidos")' editor.js || { echo "atalho de relatórios ausente"; exit 1; }
grep -q 'editor.js?v=20261020-admin8' editor.html || { echo "cache do editor.js não foi atualizado"; exit 1; }
grep -q 'id="gestao" role="dialog"' editor.html || { echo "overlay de gestão sem papel de diálogo"; exit 1; }
grep -q 'function fecharGestao' editor.js || { echo "fechamento da gestão ausente"; exit 1; }
grep -q 'doc.querySelectorAll("#modPedido, #modCliente")' editor.js || { echo "limpeza de modais da gestão ausente"; exit 1; }
grep -q 'body.embed .tabela tbody{grid-template-columns:1fr}' admin.css || { echo "correção de grid mobile ausente"; exit 1; }

echo "-- release anterior (editor como admin padrão) preservada"
grep -q 'location.replace(destino + location.search + location.hash)' admin.html || { echo "admin.html sem redirecionamento"; exit 1; }
grep -q '"admin-completo.html"' admin.html || { echo "admin.html não envia reset ao painel"; exit 1; }
grep -q 'admin-completo.html' editor.js || { echo "editor não aponta para o painel completo"; exit 1; }
grep -q '/editor.html' server.py || { echo "server.py não anuncia o editor"; exit 1; }

echo "-- nenhuma marcação de homologação no código de produção"
if grep -qiE 'homologação|homologacao|homolog1|badge-hml|hml-flag' admin.js admin.css admin-completo.html editor.js editor.html; then
  echo "código de produção contém marcação de homologação; limpe antes do deploy"; exit 1
fi

echo "-- dados antigos continuam compatíveis"
python3 - <<'PY' || exit 1
import server
assert server.status_pedido("atendido") == "concluido"
assert server.status_pedido("em produção") == "em_producao"
assert server.normaliza_zap("(55) 99999-9999") == "5555999999999"
leads = [
 {"tipo":"pedido","status":"concluido","ts":"2026-10-01T10:00:00","total":50.0,
  "itens":[{"id":"a","nome":"A","q":1,"preco":50.0}]},
 {"tipo":"pedido","status":"cancelado","ts":"2026-10-02T10:00:00","total":99.0,
  "itens":[{"id":"b","nome":"B","q":1,"preco":99.0}]},
 {"tipo":"pedido","status":"atendido","ts":"2026-09-01T10:00:00",
  "concluido_ts":"2026-09-02T10:00:00","total":30.0,
  "itens":[{"id":"c","nome":"C","q":1,"preco":30.0}]},
]
v = server.agregar_vendas(leads)
assert v["total_receita"] == 80.0, v
assert {p["id"] for p in v["ranking"]} == {"a", "c"}, v
ind = server.indicadores_loja(leads, "tudo")
assert ind["kpis"]["receita"] == 80.0, ind
assert ind["kpis"]["cancelados"] == 1, ind
clientes = server.lista_clientes([
 {"tipo":"contato","whatsapp":"(21) 98888-1111","ts":"2026-10-01T10:00:00"},
 {"tipo":"pedido","whatsapp":"21988881111","ts":"2026-10-02T10:00:00","status":"concluido","total":10.0,"itens":[]},
])
assert len(clientes) == 1 and clientes[0]["whatsapp"] == "5521988881111", clientes
PY

echo "-- propagação para as lojas isoladas locais"
python3 scripts/atualizar_todas.py --sem-restart || exit 1
for d in lojas/*/; do
  for f in admin.js admin.css admin-completo.html server.py editor.js editor.html editor.css; do
    cmp -s "$f" "$d/$f" || { echo "loja $d com $f antigo"; exit 1; }
  done
  grep -q 'carregarPedidos' "$d/admin.js" || { echo "loja $d sem a aba de pedidos"; exit 1; }
  grep -q 'Release 2026-10-20' "$d/admin.css" || { echo "loja $d com css antigo"; exit 1; }
done

echo "-- backup local do código que será publicado"
BKP="backups/pre-release-20261020-pedidos-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BKP" || exit 1
cp server.py admin.js admin.css admin-completo.html editor.js editor.html editor.css "$BKP"/ || exit 1
echo "backup: $BKP"

echo "Fase 0 OK."
pausa "Ir para FASE 1 (dry-run na VPS, sem alterar nada)?"

echo "=== FASE 1 — dry-run na VPS (somente leitura) ==="
ssh "root@${VPS_IP}" "cd /srv/superloja && systemctl is-active superloja caddy && python3 scripts/atualizar_todas.py --dry-run" || exit 1
echo "Dry-run OK. Confira acima se só os arquivos de código serão tocados."
pausa "Ir para FASE 2 (publicar código + restart — CAUSA segundos de indisponibilidade)?"

echo "=== FASE 2 — publicar ==="
./deploy/publicar.sh "${VPS_IP}" || exit 1

echo "=== FASE 3 — verificação ==="
ssh "root@${VPS_IP}" "systemctl is-active superloja caddy" || exit 1
ssh "root@${VPS_IP}" "cd /srv/superloja && \
  grep -q 'carregarPedidos' admin.js && echo 'admin.js: pedidos OK'; \
  grep -q 'carregarClientes' admin.js && echo 'admin.js: clientes OK'; \
  grep -q 'carregarRelatorios' admin.js && echo 'admin.js: relatórios OK'; \
  grep -q 'ABA_INICIAL' admin.js && echo 'admin.js: ?aba= OK'; \
  grep -q 'id=\"aba-pedidos\"' admin-completo.html && echo 'admin-completo: abas OK'; \
  grep -q '20261020-producao7' admin-completo.html && echo 'cache do painel OK'; \
  grep -q 'rota == \"/api/admin/indicadores\"' server.py && echo 'API indicadores OK'; \
  grep -q 'rota == \"/api/admin/clientes\"' server.py && echo 'API clientes OK'; \
  grep -q 'painelLink' editor.js && echo 'editor: atalhos OK'; \
  grep -q 'function abrirGestao' editor.js && grep -q 'id=\"gestao\"' editor.html && echo 'editor: gestão embutida OK'; \
  grep -q 'window.__adminIrPara' admin.js && echo 'painel: modo embed OK'; \
  grep -q '20261020-admin8' editor.html && echo 'cache do editor OK'" || exit 1

ssh "root@${VPS_IP}" "cd /srv/superloja && for d in lojas/*/; do \
  slug=\$(basename \$d); \
  grep -q 'carregarPedidos' \$d/admin.js && grep -q 'Release 2026-10-20' \$d/admin.css && test -f \$d/admin-completo.html && grep -q 'function abrirGestao' \$d/editor.js && echo \"loja \$slug: painel atualizado\" || echo \"loja \$slug: FALHOU\"; \
  done"

echo "-- rotas novas respondem (401 sem login = rota existe; 404 = deploy falhou)"
for slug in default-tenant santo-terco loja-teste zeca-teste-1; do
  porta=$(python3 -c "import json,sys;r=json.load(open('saas/lojas.json'));print(next((l['porta'] for l in r['lojas'] if l['slug']=='$slug'),''))" 2>/dev/null)
  [ -n "$porta" ] || continue
  for rota in indicadores clientes; do
    code=$(ssh "root@${VPS_IP}" "curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:${porta}/api/admin/${rota}'")
    [ "$code" = "401" ] && echo "$slug ${rota}: 401 OK" || { echo "$slug ${rota}: HTTP $code (esperado 401)"; exit 1; }
  done
done

echo ""
echo "Conferência rápida no navegador (Ctrl+Shift+R):"
echo "  1) Abra /admin.html?loja=<slug> e entre no editor."
echo "  2) Clique em Gestão na barra lateral (ou no cartão Pedidos e clientes em Páginas)."
echo "  3) Alterne Pedidos / Clientes / Relatórios pelas abas do topo, sem sair do editor."
echo "  4) Marque um pedido como concluído e confira a receita/ranking em Relatórios."
echo "  5) Cancele um pedido com motivo e confirme que ele sai da receita."
echo "  6) Repita em uma loja existente (default-tenant, homem-essencia, teste-homolog)"
echo "     e em uma loja nova criada depois do deploy."
echo ""
echo "Rollback do código: $BKP (local) + backups/pre-update-*/ na VPS (dados por loja)."
echo "RELEASE CONCLUÍDO."
