#!/usr/bin/env python3
"""Gera db/seed-default.sql a partir de config.json e js/catalog.json."""
import json
import hashlib
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SENHA = "atelie123"
HASH = hashlib.sha256(SENHA.encode()).hexdigest()


def sqlstr(value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


with open(os.path.join(ROOT, "config.json"), encoding="utf-8") as f:
    cfg = json.load(f)
with open(os.path.join(ROOT, "js", "catalog.json"), encoding="utf-8") as f:
    catalogo = json.load(f)

geral = cfg.get("geral", {})
nome = geral.get("nome") or "Ateliê Santo Terço"
zap = "".join(ch for ch in str(geral.get("zap") or "") if ch.isdigit())
zap_tela = geral.get("zap_tel") or ""
instagram = geral.get("instagram") or ""
cfg_json = json.dumps(cfg, ensure_ascii=False)

linhas = []
linhas.append("-- ============================================================")
linhas.append("-- Seed da loja padrão (gerado por db/gen-seed.py)")
linhas.append("--   wrangler d1 execute saas-pump --remote --file=db/seed-default.sql")
linhas.append("-- ============================================================")
linhas.append("")
linhas.append("-- plataforma")
linhas.append(
    "UPDATE platform SET nome='Super Loja', whatsapp=%s, whatsapp_tela=%s WHERE id=1;"
    % (sqlstr(zap), sqlstr(zap_tela))
)
linhas.append("")
linhas.append("-- loja padrão")
linhas.append(
    """INSERT INTO tenants
  (id, slug, nome, nome_fantasia, email, zap, zap_tela, instagram, dominio, doc, porta, plano, status, no_ar, mensalidade, vencimento, created_at)
VALUES (%s, 'default-tenant', %s, %s, 'admin@plataforma.local', %s, %s, %s, '', '', 3001, 'pro', 'ativa', 1, 49.90, date('now','+10 days'), COALESCE((SELECT created_at FROM tenants WHERE slug='default-tenant'), datetime('now')))
ON CONFLICT(slug) DO UPDATE SET
  nome=excluded.nome, nome_fantasia=excluded.nome_fantasia, email=excluded.email,
  zap=excluded.zap, zap_tela=excluded.zap_tela, instagram=excluded.instagram,
  plano='pro', status='ativa', no_ar=1, mensalidade=49.90,
  vencimento=date('now','+10 days');"""
    % (sqlstr("default-tenant"), sqlstr(nome), sqlstr(nome), sqlstr(zap), sqlstr(zap_tela), sqlstr(instagram))
)
linhas.append("")
linhas.append("-- usuário admin da loja (senha: atelie123)")
linhas.append("DELETE FROM users WHERE tenant_id='default-tenant';")
linhas.append(
    "INSERT INTO users (id, tenant_id, email, senha_hash, papel) VALUES ('admin-001','default-tenant','admin@plataforma.local',%s,'dono');"
    % sqlstr(HASH)
)
linhas.append("")
linhas.append("-- super admin (senha: atelie123)")
linhas.append(
    "INSERT OR REPLACE INTO users (id, tenant_id, email, senha_hash, papel) VALUES ('super-001','','super@plataforma.local',%s,'super');"
    % sqlstr(HASH)
)
linhas.append("")
linhas.append("-- config completa da loja")
linhas.append(
    "INSERT INTO tenant_config (tenant_id, json, updated_at) VALUES ('default-tenant', %s, datetime('now')) "
    "ON CONFLICT(tenant_id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at;"
    % sqlstr(cfg_json)
)
linhas.append("")
linhas.append("-- catálogo")
linhas.append("DELETE FROM products WHERE tenant_id='default-tenant';")
for p in catalogo:
    preco = p.get("preco")
    preco_sql = "NULL" if preco is None else ("%s" % preco)
    ordem = p.get("ordem") or 0
    linhas.append(
        "INSERT INTO products (id, tenant_id, nome, cat, colecao, preco, ordem, tag, selo, desc, foto, video, ativo) "
        "VALUES (%s, 'default-tenant', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1);"
        % (
            sqlstr(p.get("id")),
            sqlstr(p.get("nome")),
            sqlstr(p.get("cat") or "geral"),
            sqlstr(p.get("colecao") or ""),
            preco_sql,
            sqlstr(ordem) if isinstance(ordem, (int, float)) else "0",
            sqlstr(p.get("tag") or ""),
            sqlstr(p.get("selo") or ""),
            sqlstr(p.get("desc") or ""),
            sqlstr(p.get("foto") or ""),
            sqlstr(p.get("video") or ""),
        )
    )
linhas.append("")

out = os.path.join(ROOT, "db", "seed-default.sql")
with open(out, "w", encoding="utf-8") as f:
    f.write("\n".join(linhas))

print("gerado:", out)
print("produtos:", len(catalogo))
print("loja:", nome, "zap:", zap)
