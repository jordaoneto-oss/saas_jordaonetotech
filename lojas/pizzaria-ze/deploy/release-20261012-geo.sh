#!/bin/bash
# Release 2026-10-12-GEO: otimização para assistentes de IA (ChatGPT, Claude, Gemini)
# Escopo: /llms.txt dinâmico por loja (catálogo em texto puro), robots.txt liberando
# crawlers de IA, JSON-LD com WebSite + SearchAction no index.html.
# Só código — nenhum dado é tocado; lojas novas herdam automaticamente (clonam a base).
# ATENÇÃO: ./deploy/publicar.sh envia o código INTEIRO da pasta. Se outra release
# pendente (busca sem acento, medição) ainda não foi aplicada, ela irá junto.
# Uso: ./deploy/release-20261012-geo.sh [IP-DA-VPS]
# Cada fase pede confirmação. Nada na VPS muda sem o seu "s".
set -u
VPS_IP="${1:-191.252.159.172}"
cd "$(dirname "$0")/.." || exit 1

pausa(){ read -r -p "$1 [s/N] " r; [ "$r" = "s" ] || { echo "abortado."; exit 1; }; }

echo "=== FASE 0 — validação local (só leitura/checagem + smoke) ==="
python3 -c "import ast; ast.parse(open('server.py').read()); print('server.py OK')"
grep -q 'def llms_txt' server.py || { echo "ERRO: helper llms_txt ausente no server.py"; exit 1; }
grep -q 'rel == "llms.txt"' server.py || { echo "ERRO: rota /llms.txt ausente no server.py"; exit 1; }
grep -q 'GPTBot' robots.txt || { echo "ERRO: crawlers de IA ausentes no robots.txt"; exit 1; }
grep -q 'ClaudeBot' robots.txt || { echo "ERRO: ClaudeBot ausente no robots.txt"; exit 1; }
grep -q 'SearchAction' index.html || { echo "ERRO: SearchAction ausente no index.html"; exit 1; }
python3 -c "
import re, json
h = open('index.html', encoding='utf-8').read()
m = re.search(r'<script type=\"application/ld\+json\">(.*?)</script>', h, re.S)
d = json.loads(re.sub(r'\{\{[A-Z_]+\}\}', 'x', m.group(1)))
tipos = sorted(x.get('@type','?') for x in d['@graph'])
assert tipos == ['OnlineStore', 'WebSite'], tipos
print('JSON-LD OK:', tipos)
"
echo "--- smoke: sobe servidor local e testa /llms.txt + /robots.txt ---"
HOST=127.0.0.1 PORT=8398 DEFAULT_TENANT=default-tenant SEED_ADMIN_PASS=t123 SAAS_ADMIN_TOKEN=t123 BASE_DOMAIN=localhost \
  nohup python3 server.py --host 127.0.0.1 --port 8398 >/tmp/geo-release-smoke.log 2>&1 &
SRV=$!
sleep 3
code_llms=$(curl -s -o /tmp/llms-smoke.txt -w "%{http_code}" "http://127.0.0.1:8398/llms.txt")
code_robots=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8398/robots.txt")
kill $SRV 2>/dev/null
[ "$code_llms" = "200" ] || { echo "ERRO: /llms.txt retornou $code_llms"; exit 1; }
[ "$code_robots" = "200" ] || { echo "ERRO: /robots.txt retornou $code_robots"; exit 1; }
grep -q 'Catálogo completo' /tmp/llms-smoke.txt || { echo "ERRO: catálogo ausente no llms.txt"; exit 1; }
grep -q 'wa.me' /tmp/llms-smoke.txt || { echo "ERRO: WhatsApp ausente no llms.txt"; exit 1; }
echo "smoke OK: /llms.txt 200 com $(grep -c '^- .*R\$' /tmp/llms-smoke.txt) peças + /robots.txt 200"
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
ssh "root@${VPS_IP}" "cd /srv/superloja && grep -l 'def llms_txt' server.py lojas/*/server.py && grep -l 'GPTBot' robots.txt lojas/*/robots.txt"
echo "Na VPS (ou no navegador):"
echo "  curl -s https://ateliesantoterco.com.br/llms.txt | head -30"
echo "Abra com Ctrl+Shift+R e confira:"
echo "  1) /llms.txt lista a loja + catálogo com preços?"
echo "  2) /robots.txt cita GPTBot/ClaudeBot?"
echo "  3) Próximos passos fora do código: Search Console + Bing Webmaster (sitemap), Perfil da Empresa no Google, avaliações reais."
echo ""
echo "Rollback se necessário: backups/pre-update-*/ na VPS (tar.gz por loja)."
echo "RELEASE CONCLUÍDO."
