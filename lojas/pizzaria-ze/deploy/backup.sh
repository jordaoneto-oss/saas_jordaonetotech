#!/bin/bash
# Backup Super Loja — roda via cron. Guarda 14 dias locais + tenta espelho offsite.
# Configure RCLONE_REMOTE (ex.: "drive:superloja") após `rclone config`.
set -u
APP_DIR="/srv/superloja"
DEST_BASE="/var/backups/superloja"
RCLONE_REMOTE=""   # ex.: "drive:superloja" (vazio = só local)
RETENCAO=14

TS=$(date +%Y-%m-%d-%H%M%S)
DEST="$DEST_BASE/$TS"
mkdir -p "$DEST"

tar -czf "$DEST/saas.tar.gz" -C "$APP_DIR" saas/ Caddyfile 2>/dev/null
tar -czf "$DEST/principal.tar.gz" -C "$APP_DIR" config.json js/catalog.json data/ manifest.webmanifest 2>/dev/null
for d in "$APP_DIR"/lojas/*/; do
  slug=$(basename "$d")
  tar -czf "$DEST/loja-$slug.tar.gz" -C "$APP_DIR/lojas/$slug" config.json js/catalog.json data/ manifest.webmanifest img/ 2>/dev/null
done

find "$DEST_BASE" -maxdepth 1 -type d -mtime +$RETENCAO -exec rm -rf {} + 2>/dev/null

if [ -n "$RCLONE_REMOTE" ]; then
  rclone copy "$DEST" "$RCLONE_REMOTE/$TS" --quiet || echo "AVISO: espelho offsite falhou"
fi

echo "backup OK: $DEST ($(du -sh "$DEST" | cut -f1))"
