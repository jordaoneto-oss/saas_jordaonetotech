#!/bin/bash
# Release 2026-10-21-EDITOR-MOLDURA: login do editor sem demonstração + tamanho das
# imagens da capa e da seção Sob encomenda.
# Escopo:
# - A tela de login do editor não oferece mais "Explorar em modo demonstração":
#   saem o botão, o divisor "ou" e a nota; o atalho ?demo=1 também deixa de abrir
#   o editor. A trava de leitura (state.demo) continua no código como proteção.
# - A nota de ajuda do editor deixa de indicar o modo demonstração.
# - Correção do tamanho das mídias: em .moldura (capa e Sob encomenda) o <img hidden>
#   herdava display:block da regra .moldura>img e ocupava uma caixa 3/4 inteira,
#   dobrando a altura do quadro (1020px em vez de 524px) e empilhando imagem e vídeo.
#   Agora [hidden] vence a regra do autor; o mesmo vale para .pop-count no popup.
# - Versão do CSS do site e do editor.js atualizadas (cache de navegador).
# Só código: config.json, catálogo, data/, img/, video/, tenants/ e lojas/ são preservados.
# Uso: ./deploy/release-20261021-editor-moldura.sh [IP-DA-VPS]
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

echo "-- editor: tela de login sem o modo demonstração"
grep -q 'id="btnDemo"' editor.html && { echo "editor.html ainda tem o botão de demonstração"; exit 1; }
grep -qi 'modo demonstração' editor.html && { echo "editor.html ainda fala em modo demonstração"; exit 1; }
grep -q 'login-divider' editor.html && { echo "editor.html ainda tem o divisor do login"; exit 1; }
grep -q 'id="formLogin"' editor.html || { echo "login do editor ausente"; exit 1; }
grep -q 'id="btnEntrar"' editor.html || { echo "botão Entrar ausente"; exit 1; }
grep -q 'id="verSenha"' editor.html || { echo "botão de mostrar senha ausente"; exit 1; }
grep -q 'id="btnDemo"' editor.js && { echo "editor.js ainda liga o botão de demonstração"; exit 1; }
grep -q 'entrarDemo' editor.js && { echo "editor.js ainda tem entrarDemo"; exit 1; }
grep -q 'autoDemo' editor.js && { echo "editor.js ainda abre demonstração por ?demo=1"; exit 1; }
grep -q 'state.demo' editor.js || { echo "trava de leitura (state.demo) removida por engano"; exit 1; }
grep -q 'editor.js?v=20261021-editor1' editor.html || { echo "versão do editor.js não foi atualizada"; exit 1; }

echo "-- site: tamanho das mídias corrigido"
grep -q '.moldura video\[hidden\],.moldura>img\[hidden\]{display:none!important}' css/style.css || { echo "regra [hidden] da .moldura ausente"; exit 1; }
grep -q '.pop-count\[hidden\]{display:none!important}' css/style.css || { echo "regra [hidden] do .pop-count ausente"; exit 1; }
grep -q 'css/style.css?v=20261021-moldura1' index.html || { echo "versão do CSS do site não foi atualizada"; exit 1; }
grep -q 'data-midia-img alt="" hidden' index.html || { echo "moldura sem <img hidden> (revisar a estrutura)"; exit 1; }
python3 - <<'PY' || exit 1
import re
css = open('css/style.css', encoding='utf-8').read()
# o quadro da capa e o da Sob encomenda devem ter imagem e vídeo com o mesmo tamanho
assert '.moldura video,.moldura>img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block' in css, "regra de tamanho da moldura mudou"
assert re.search(r'\.moldura video\[hidden\]\s*,\s*\.moldura>img\[hidden\]\{display:none!important\}', css), "regra [hidden] ausente"
html = open('index.html', encoding='utf-8').read()
for chave in ('hero.midia', 'encomenda.midia'):
    bloco = re.search(r'data-midia-box="%s".*?</div>' % chave, html, re.S)
    assert bloco, "caixa de mídia %s ausente" % chave
    b = bloco.group(0)
    assert '<video' in b and 'data-midia-img' in b and 'hidden' in b, "estrutura da mídia %s mudou" % chave
PY

echo "-- releases anteriores preservadas"
grep -q 'location.replace(destino + location.search + location.hash)' admin.html || { echo "admin.html sem redirecionamento"; exit 1; }
grep -q 'admin-completo.html' editor.js || { echo "editor não aponta para o painel completo"; exit 1; }
grep -q 'carregarPedidos' admin.js || { echo "aba de pedidos ausente"; exit 1; }
grep -q '/editor.html' server.py || { echo "server.py não anuncia o editor"; exit 1; }

echo "-- nenhuma marcação de homologação no código de produção"
if grep -qiE 'homologação|homologacao|homolog1|badge-hml|hml-flag' admin.js admin.css admin-completo.html editor.js editor.html css/style.css; then
  echo "código de produção contém marcação de homologação; limpe antes do deploy"; exit 1
fi

echo "-- propagação para as lojas isoladas locais"
for d in lojas/*/; do
  for f in editor.html editor.js index.html css/style.css js/app.js; do
    cmp -s "$f" "$d/$f" || { echo "loja $d com $f antigo (rode: python3 scripts/atualizar_todas.py --sem-restart)"; exit 1; }
  done
  grep -q 'id="btnDemo"' "$d/editor.html" && { echo "loja $d ainda com o botão de demonstração"; exit 1; }
  grep -q 'moldura>img\[hidden\]{display:none!important}' "$d/css/style.css" || { echo "loja $d sem a correção da moldura"; exit 1; }
done
python3 scripts/atualizar_todas.py --dry-run || exit 1

echo "-- teste de regressão no navegador (Chrome headless)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ -x "$CHROME" ]; then
  PORTA=8477
  MEDIR="_release_medir_$$.html"
  python3 - "$MEDIR" <<'PY' || exit 1
import sys
src = open('index.html', encoding='utf-8').read()
medir = '''
<script>
window.addEventListener("load", () => setTimeout(() => {
  const out = [...document.querySelectorAll(".moldura")].map(m => {
    const i = m.querySelector("img"), v = m.querySelector("video");
    return {k: m.getAttribute("data-midia-box"),
            h: Math.round(m.getBoundingClientRect().height),
            img: i ? getComputedStyle(i).display : null,
            vid: v ? getComputedStyle(v).display : null};
  });
  const p = document.createElement("pre"); p.id = "MEDIDA";
  p.textContent = JSON.stringify(out);
  document.body.appendChild(p);
}, 2500));
</script>
'''
open(sys.argv[1], 'w', encoding='utf-8').write(src.replace('</body>', medir + '</body>'))
PY
  python3 -m http.server "$PORTA" --bind 127.0.0.1 >/dev/null 2>&1 &
  SRV=$!
  sleep 1.5
  "$CHROME" --headless --disable-gpu --no-sandbox --virtual-time-budget=8000 \
    --dump-dom "http://127.0.0.1:${PORTA}/${MEDIR}" 2>/dev/null >/tmp/_moldura_dom.html
  kill $SRV 2>/dev/null
  wait $SRV 2>/dev/null || true
  python3 - /tmp/_moldura_dom.html <<'PY' || exit 1
import json, re, sys
html = open(sys.argv[1], encoding='utf-8').read()
m = re.search(r'<pre id="MEDIDA">(.*?)</pre>', html, re.S)
if not m:
    print("AVISO: não foi possível medir a página no headless; valide no navegador")
    sys.exit(0)
dados = json.loads(m.group(1))
for d in dados:
    print("  %-16s altura=%s img=%s video=%s" % (d["k"], d["h"], d["img"], d["vid"]))
hero = next((d for d in dados if d["k"] == "hero.midia"), None)
enc = next((d for d in dados if d["k"] == "encomenda.midia"), None)
assert hero and enc, "quadros da capa/Sob encomenda não medidos"
for d in (hero, enc):
    assert d["img"] == "none", "imagem oculta ainda visível em %s" % d["k"]
    assert d["h"] < 700, "quadro %s alto demais (%spx): imagem oculta ocupando espaco" % (d["k"], d["h"])
print("  molduras OK: um quadro 3/4 em video e em imagem, sem caixa extra")
PY
  rm -f "$MEDIR" /tmp/_moldura_dom.html
else
  echo "Chrome não encontrado; teste visual fica para o pós-deploy"
fi

echo "-- backup local do código que será publicado"
BKP="backups/pre-release-20261021-editor-moldura-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BKP" || exit 1
cp editor.html editor.js index.html css/style.css sw.js "$BKP"/ || exit 1
mkdir -p "$BKP/css" && cp css/style.css "$BKP/css/" || exit 1
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
  grep -q 'id=\"btnDemo\"' editor.html && echo 'FALHOU: botão de demonstração no editor' || echo 'editor sem botão de demonstração OK'; \
  grep -q 'entrarDemo' editor.js && echo 'FALHOU: entrarDemo no editor' || echo 'editor sem entrarDemo OK'; \
  grep -q 'editor.js?v=20261021-editor1' editor.html && echo 'cache do editor.js OK'; \
  grep -q 'moldura>img\[hidden\]{display:none!important}' css/style.css && echo 'CSS da moldura OK'; \
  grep -q 'pop-count\[hidden\]' css/style.css && echo 'CSS do pop-count OK'; \
  grep -q 'css/style.css?v=20261021-moldura1' index.html && echo 'cache do CSS do site OK'" || exit 1

ssh "root@${VPS_IP}" "cd /srv/superloja && for d in lojas/*/; do \
  slug=\$(basename \$d); \
  grep -q 'id=\"btnDemo\"' \$d/editor.html && grep -q 'moldura>img\[hidden\]' \$d/css/style.css && echo \"loja \$slug: FALHOU\" || echo \"loja \$slug: atualizado\"; \
  done"

echo "-- páginas respondem (200 = OK)"
for rota in "/" "/editor.html" "/css/style.css?v=20261021-moldura1"; do
  code=$(ssh "root@${VPS_IP}" "curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8324${rota}'")
  [ "$code" = "200" ] && echo "${rota}: 200 OK" || { echo "${rota}: HTTP $code"; exit 1; }
done

echo ""
echo "Conferência rápida no navegador (Ctrl+Shift+R):"
echo "  1) Abra /editor.html?loja=<slug>: o login mostra só a senha, sem 'Explorar em modo demonstração'."
echo "  2) Entre no editor e abra a seção Capa inicial: a mídia ocupa UM quadro 3/4."
echo "  3) Na seção Sob encomenda: idem, um único quadro, com a mesma altura da capa."
echo "  4) Troque a capa para uma imagem: o quadro deve manter o mesmo tamanho (não dobra)."
echo "  5) Repita em uma loja existente e em uma loja nova criada depois do deploy."
echo "  6) PWA: feche e reabra a aba para o cache novo carregar o CSS atualizado."
echo ""
echo "Rollback: backups/pre-release-20261021-editor-moldura-* (local) + backups/pre-update-*/ na VPS."
echo "RELEASE CONCLUÍDO."
