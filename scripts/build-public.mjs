#!/usr/bin/env node
/**
 * Sincroniza os assets do site para public/ antes do deploy.
 * O wrangler publica apenas o diretório public/.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, copyFileSync, statSync, rmSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC = join(ROOT, "public");

mkdirSync(PUBLIC, { recursive: true });

/* diretórios de assets */
for (const dir of ["css", "js", "img", "video"]) {
  const src = join(ROOT, dir);
  if (existsSync(src)) {
    cpSync(src, join(PUBLIC, dir), {
      recursive: true,
      force: true,
      filter: (origem) => !basename(origem).startsWith("."),
    });
    console.log(`✓ ${dir}/`);
  }
}

/* arquivos soltos usados pelo front */
const files = [
  "admin.js",
  "editor.js",
  "admin.css",
  "editor.css",
  "admin-editor.css",
  "config.json",
  "manifest.webmanifest",
  "robots.txt",
  "sw.js",
];

for (const f of files) {
  const src = join(ROOT, f);
  if (existsSync(src)) {
    copyFileSync(src, join(PUBLIC, f));
    console.log(`✓ ${f}`);
  }
}

/* todas as páginas HTML da raiz (mantém public/ em sincronia) */
for (const f of readdirSync(ROOT)) {
  if (!f.endsWith(".html")) continue;
  const src = join(ROOT, f);
  if (!statSync(src).isFile()) continue;
  copyFileSync(src, join(PUBLIC, basename(f)));
}
console.log("✓ páginas HTML");

/* remove lixo do macOS que já tenha sido copiado antes */
for (const dir of [PUBLIC, join(PUBLIC, "img"), join(PUBLIC, "css"), join(PUBLIC, "js")]) {
  const lixo = join(dir, ".DS_Store");
  if (existsSync(lixo)) rmSync(lixo, { force: true });
}

console.log("public/ pronto.");
