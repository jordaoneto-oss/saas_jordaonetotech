#!/bin/bash
# Release: submenu Páginas + menu editável + sem-cache + botões + sequência de produtos + coleções
# Escopo: submenu, menu, no-cache, botoes(padrão), ordem/sequência, colecao (+add/remover linhas e fix de salvamento no admin). Barra e toast originais restaurados.
# Uso: ./deploy/release-20261009.sh [IP-DA-VPS]
# Cada fase pede confirmação. Nada na VPS muda sem o seu "s".
set -u
VPS_IP="${1:-191.252.159.172}"
cd "$(dirname "$0")/.." || exit 1

pausa(){ read -r -p "$1 [s/N] " r; [ "$r" = "s" ] || { echo "abortado."; exit 1; }; }

echo "=== FASE 0 — validação local (só leitura/checagem) ==="
node --check js/app.js || exit 1
node --check admin.js || exit 1
python3 -c "import ast; ast.parse(open('server.py').read()); print('server.py OK')"
python3 -c "import json; d=json.load(open('config.json')); assert len(d.get('menu',[]))>=1; assert d.get('botoes',{}).get('formato')=='padrao'; print('config OK: menu',len(d['menu']),'| botoes',d['botoes'])"
for t in saas/templates/religioso/config.json saas/templates/doces/config.json saas/templates/generico/config.json saas/template/config.json; do
  python3 -c "import json,sys; d=json.load(open('$t')); assert d.get('menu') and d.get('botoes'), '$t incompleto'; print('$t OK')"
done
grep -q 'id="barra"' index.html || { echo "ERRO: barra original ausente no index.html"; exit 1; }
grep -q 'Menu do site' admin.js || { echo "ERRO: seção Menu ausente no admin.js"; exit 1; }
grep -q 'Coleções da vitrine' admin.js || { echo "ERRO: seção Coleções ausente no admin.js"; exit 1; }
grep -q 'Botões do site' admin.js || { echo "ERRO: seção Botões ausente no admin.js"; exit 1; }
grep -q 'data-add-linha' admin.js || { echo "ERRO: adicionar/remover linhas ausente no admin.js"; exit 1; }
grep -q 'moverProduto' admin.js || { echo "ERRO: sequência de produtos ausente no admin.js"; exit 1; }
grep -q 'pColecao' admin.html || { echo "ERRO: campo Coleção ausente no admin.html"; exit 1; }
grep -q 'renderColecoes' js/app.js || { echo "ERRO: coleções ausentes no js/app.js"; exit 1; }
grep -q 'url.pathname === "/admin.js"' sw.js || { echo "ERRO: no-cache do admin.js ausente no sw.js"; exit 1; }
echo "Fase 0 OK."
pausa "Ir para FASE 1 (dry-run na VPS, sem alterar nada)?"

echo "=== FASE 1 — dry-run na VPS (somente leitura) ==="
ssh "root@${VPS_IP}" "cd /srv/superloja && python3 scripts/atualizar_todas.py --dry-run" || exit 1
echo "Dry-run OK. Confira acima se só os arquivos de código serão tocados."
pausa "Ir para FASE 2 (backfill menu+botoes nas lojas existentes da VPS)?"

echo "=== FASE 2 — backfill menu+botoes (só adiciona onde falta, nunca sobrescreve) ==="
ssh "root@${VPS_IP}" 'cd /srv/superloja && python3 - <<PY
import json
MENU=[{"t":"O ateliê","href":"#oficio"},{"t":"Catálogo","href":"#catalogo"},{"t":"Personalizar","href":"#encomenda"},{"t":"Ocasiões","href":"#ocasioes"},{"t":"Como rezar","href":"#terco"},{"t":"História","href":"#sobre"}]
BOTOES={"formato":"padrao","caixa":"alta"}
reg=json.load(open("saas/lojas.json",encoding="utf-8"))
for l in reg.get("lojas",[]):
    p="lojas/"+l["slug"]+"/config.json"
    try:
        d=json.load(open(p,encoding="utf-8"))
    except FileNotFoundError:
        print(l["slug"],"SEM config, pulando"); continue
    add=[]
    if not d.get("menu"): d["menu"]=MENU; add.append("menu")
    if not d.get("botoes"): d["botoes"]=BOTOES; add.append("botoes")
    if add:
        json.dump(d,open(p,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
        print(l["slug"],"adicionado:",",".join(add))
    else:
        print(l["slug"],"já tinha tudo, intacto")
PY' || exit 1
pausa "Ir para FASE 3 (publicar código + restart — CAUSA segundos de indisponibilidade)?"

echo "=== FASE 3 — publicar ==="
./deploy/publicar.sh "${VPS_IP}" || exit 1

echo "=== FASE 4 — verificação ==="
ssh "root@${VPS_IP}" "systemctl is-active superloja caddy"
echo "Abra com Ctrl+Shift+R e teste:"
echo "  1) Loja mobile: barra original? compra teste no WhatsApp?"
echo "  2) Admin > Páginas: atalhos + Menu + Botões + Coleções (adicionar/remover/↑↓)?"
echo "  3) Admin > Produtos: coluna Pos. + setas + campo Coleção (select)?"
echo "  4) Vitrine: sequência no modo Destaques? botões de coleção filtram e rolam até a peça?"
echo "  5) Nova loja de teste no super admin nasce com menu+botoes?"
echo ""
echo "Rollback se necessário: backups/pre-update-*/ na VPS (tar.gz por loja)."
echo "RELEASE CONCLUÍDO."
