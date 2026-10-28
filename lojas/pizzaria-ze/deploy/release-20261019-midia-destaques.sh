#!/bin/bash
# Release 2026-10-19-MIDIA-DESTAQUES: mídia editável, logo e cartões editáveis
# Escopo: upload de imagem/vídeo (Capa, O ateliê, Encomenda, Ocasiões, Sobre e
# Destaques), troca de logo em Design > Logo e edição completa de Diferenciais
# (ícone + textos) e Destaques (produto opcional, mídia, título, texto, preço,
# selo, botão e link). Só código: config.json e catálogo de cada loja são
# preservados; o editor migra configurações antigas ao abrir.
# Uso: ./deploy/release-20261019-midia-destaques.sh [IP-DA-VPS]
# Cada fase pede confirmação. Nada na VPS muda sem o seu "s".
set -u
VPS_IP="${1:-191.252.159.172}"
cd "$(dirname "$0")/.." || exit 1

pausa(){ read -r -p "$1 [s/N] " r; [ "$r" = "s" ] || { echo "abortado."; exit 1; }; }

echo "=== FASE 0 — validação local (só leitura/checagem) ==="
node --check js/app.js || exit 1
node --check admin.js || exit 1
node --check editor.js || exit 1
python3 -m py_compile server.py || exit 1
python3 -m json.tool config.json >/dev/null || exit 1
for t in generico religioso doces generico-hml; do
  python3 -m json.tool "saas/templates/$t/config.json" >/dev/null || exit 1
done

grep -q '"/api/admin/midias"' server.py || { echo "falta GET /api/admin/midias"; exit 1; }
grep -q '"/api/admin/upload-midia"' server.py || { echo "falta POST /api/admin/upload-midia"; exit 1; }
grep -q 'CORPO_MAX_BYTES = 32' server.py || { echo "limite de upload antigo em server.py"; exit 1; }
grep -q 'webm' server.py || { echo "server.py sem suporte a WebM"; exit 1; }
grep -q 'data-upload-logo' editor.js || { echo "editor sem upload de logo"; exit 1; }
grep -q 'function enviarLogo' editor.js || { echo "editor sem enviarLogo"; exit 1; }
grep -q 'function sincronizarDestaques' editor.js || { echo "editor sem sincronização de Destaques"; exit 1; }
grep -q 'array:"itens"' editor.js || { echo "Destaques do editor não usam itens editáveis"; exit 1; }
grep -q 'array:"itens"' admin.js || { echo "Destaques do admin não usam itens editáveis"; exit 1; }
grep -q 'destaques.itens' admin.js || { echo "admin sem campos de Destaques"; exit 1; }
grep -q 'iconeSeloSrc' js/app.js || { echo "app sem ícones editáveis nos Diferenciais"; exit 1; }
grep -q 'Array.isArray(d.itens)' js/app.js || { echo "app sem render dos cartões editáveis"; exit 1; }
grep -q 'data-upload-midia' editor.js || { echo "editor sem upload de mídia nas seções"; exit 1; }
grep -q '20261019-destaques2' index.html || { echo "versão do app.js não foi atualizada"; exit 1; }
grep -q '20261019-producao1' editor.html || { echo "versão do editor não foi atualizada"; exit 1; }
if grep -qiE 'homologação|homologacao|badge-hml|hml-flag' editor.html editor.css editor.js; then
  echo "editor ainda contém marcação de homologação; remova antes do deploy"; exit 1
fi
grep -q '20261019-destaques2' admin.html || { echo "versão do admin não foi atualizada"; exit 1; }

for d in lojas/*/; do
  [ -f "$d/editor.js" ] && [ -f "$d/admin.js" ] && [ -f "$d/server.py" ] || { echo "loja $d incompleta"; exit 1; }
  cmp -s index.html "$d/index.html" || { echo "loja $d com index.html antigo"; exit 1; }
  cmp -s js/app.js "$d/js/app.js" || { echo "loja $d com app.js antigo"; exit 1; }
  cmp -s editor.js "$d/editor.js" || { echo "loja $d com editor.js antigo"; exit 1; }
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
ssh "root@${VPS_IP}" "cd /srv/superloja && grep -l 'upload-midia' server.py lojas/*/server.py; grep -l 'destaques2' index.html lojas/*/index.html; grep -l 'producao1' editor.html lojas/*/editor.html; ! grep -qiE 'homologação|homologacao|badge-hml|hml-flag' editor.html lojas/*/editor.html && echo 'editor sem marcação de homologação'; ls lojas/*/editor.html"
echo ""
echo "Conferência rápida no navegador (Ctrl+Shift+R):"
echo "  1) Editor > Design > Logo: trocar pelo seletor, enviar um PNG/WebP e usar 'Usar padrão'."
echo "  2) Editor > Diferenciais: trocar ícone, título e detalhe dos 4 selos."
echo "  3) Editor > Destaques: editar mídia, título, texto, preço, selo, botão e link;"
echo "     adicionar/remover/reordenar cartões e salvar. Conferir no site."
echo "  4) Editor > Capa / O ateliê / Sob encomenda / Ocasiões / A história:"
echo "     enviar imagem e vídeo (MP4/WebM) e conferir a prévia e o site."
echo "  5) Painel admin > Páginas > Destaques: os campos dos cartões devem abrir sem erro."
echo "  6) Testar no celular e confirmar que o PWA carregou a versão nova."
echo ""
echo "Rollback: backups/pre-update-*/ na VPS (tar.gz por loja); o código anterior"
echo "também permanece no backup local do deploy."
echo "RELEASE CONCLUÍDO."
