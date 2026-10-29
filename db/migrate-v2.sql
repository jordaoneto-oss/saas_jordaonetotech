-- ============================================================
-- Migração v1 -> v2 (preserva todos os dados existentes)
-- Execute UMA vez no banco remoto:
--   wrangler d1 execute saas-pump --remote --file=db/migrate-v2.sql
-- ============================================================

DROP TABLE IF EXISTS _old_lead_items;
DROP TABLE IF EXISTS _old_products;
DROP TABLE IF EXISTS _old_leads;
DROP TABLE IF EXISTS _old_site_configs;
DROP TABLE IF EXISTS _old_users;
DROP TABLE IF EXISTS _old_subscriptions;
DROP TABLE IF EXISTS _old_tenants;

ALTER TABLE lead_items      RENAME TO _old_lead_items;
ALTER TABLE products        RENAME TO _old_products;
ALTER TABLE leads           RENAME TO _old_leads;
ALTER TABLE site_configs    RENAME TO _old_site_configs;
ALTER TABLE users           RENAME TO _old_users;
ALTER TABLE subscriptions   RENAME TO _old_subscriptions;
ALTER TABLE tenants         RENAME TO _old_tenants;

-- ---------- plataforma (linha única) ----------
CREATE TABLE platform (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nome TEXT DEFAULT '',
  dominio TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  whatsapp_tela TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT OR REPLACE INTO platform (id, nome, dominio, whatsapp, whatsapp_tela)
VALUES (1, 'Super Loja', 'plataforma.jordaonetotech.com.br', '', '');

-- ---------- tenants ----------
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  nome_fantasia TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  zap TEXT DEFAULT '',
  zap_tela TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  dominio TEXT DEFAULT '',
  doc TEXT DEFAULT '',
  porta INTEGER DEFAULT 0,
  plano TEXT NOT NULL DEFAULT 'basico',
  status TEXT NOT NULL DEFAULT 'ativa',
  no_ar INTEGER NOT NULL DEFAULT 1,
  logo TEXT DEFAULT '',
  cores_botao TEXT DEFAULT '',
  cores_bg TEXT DEFAULT '',
  mensalidade REAL,
  vencimento TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO tenants
  (id, slug, nome, nome_fantasia, email, zap, zap_tela, instagram, dominio, doc, porta, plano, status, no_ar, mensalidade, vencimento, created_at)
SELECT
  id, slug,
  COALESCE(NULLIF(nome_fantasia,''), slug),
  COALESCE(NULLIF(nome_fantasia,''), slug),
  COALESCE(email_dono,''),
  COALESCE(whatsapp,''),
  COALESCE(whatsapp_display,''),
  COALESCE(instagram,''),
  COALESCE(dominio_custom,''),
  '', 3001,
  CASE WHEN plano IN ('pro','enterprise') THEN plano ELSE 'basico' END,
  CASE WHEN status = 'ativo' THEN 'ativa' ELSE 'suspensa' END,
  1, NULL, NULL,
  created_at
FROM _old_tenants;

-- ---------- usuários ----------
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'dono',
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO users (id, tenant_id, email, senha_hash, papel, created_at)
SELECT id, tenant_id, COALESCE(email,''), senha_hash,
       CASE WHEN papel = 'equipe' THEN 'equipe' ELSE 'dono' END,
       created_at
FROM _old_users;

-- super admin (senha: atelie123)
INSERT OR REPLACE INTO users (id, tenant_id, email, senha_hash, papel)
VALUES ('super-001', '', 'super@plataforma.local',
        'c6ccdbbf080f31684a102cf3c79ba4ab8f81573af611b0d5d603a43807d5c92b', 'super');

CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_email ON users(tenant_id, email);

-- ---------- config completa por tenant ----------
CREATE TABLE tenant_config (
  tenant_id TEXT PRIMARY KEY,
  json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ---------- produtos (shape do catalog.json) ----------
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  cat TEXT NOT NULL DEFAULT 'geral',
  colecao TEXT DEFAULT '',
  preco REAL,
  ordem INTEGER NOT NULL DEFAULT 0,
  tag TEXT DEFAULT '',
  selo TEXT DEFAULT '',
  desc TEXT DEFAULT '',
  foto TEXT DEFAULT '',
  video TEXT DEFAULT '',
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS products_tenant ON products(tenant_id, ativo, ordem);

INSERT INTO products (id, tenant_id, nome, cat, colecao, preco, ordem, tag, selo, desc, foto, video, ativo, created_at)
SELECT id, tenant_id, nome, COALESCE(categoria,'geral'), '',
       preco, COALESCE(ordem,0), COALESCE(etiqueta,''), '',
       COALESCE(descricao,''), COALESCE(foto_url,''), '', COALESCE(ativo,1), created_at
FROM _old_products;

-- ---------- leads / pedidos / interessados ----------
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  tenant_id TEXT DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'contato',
  origem TEXT DEFAULT '',
  nome TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  segmento TEXT DEFAULT '',
  plano TEXT DEFAULT '',
  total REAL,
  cep TEXT DEFAULT '',
  obs TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'novo',
  pagamento TEXT DEFAULT '',
  entrega TEXT DEFAULT '',
  motivo_cancelamento TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  notas TEXT DEFAULT '',
  ts TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS leads_tenant_ts ON leads(tenant_id, ts DESC);
CREATE INDEX IF NOT EXISTS leads_tipo ON leads(tipo, origem);

INSERT INTO leads
  (id, tenant_id, tipo, origem, nome, whatsapp, segmento, plano, total, cep, obs, status, ts, created_at)
SELECT
  id,
  CASE WHEN lower(COALESCE(origem,'')) = 'landing' THEN '' ELSE tenant_id END,
  CASE
    WHEN lower(COALESCE(origem,'')) = 'landing' THEN 'interesse'
    WHEN tipo = 'pedido' THEN 'pedido'
    ELSE 'contato'
  END,
  COALESCE(origem,''),
  COALESCE(nome,''),
  COALESCE(whatsapp,''),
  '', '',
  total,
  COALESCE(cep_cidade,''),
  COALESCE(obs,''),
  CASE WHEN status = 'atendido' THEN 'concluido' ELSE 'novo' END,
  COALESCE(created_at, datetime('now')),
  COALESCE(created_at, datetime('now'))
FROM _old_leads;

CREATE TABLE lead_items (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  product_id TEXT,
  nome_snapshot TEXT NOT NULL DEFAULT '',
  qtd INTEGER NOT NULL DEFAULT 1,
  preco_snapshot REAL
);
CREATE INDEX IF NOT EXISTS lead_items_lead ON lead_items(lead_id);

INSERT INTO lead_items (id, lead_id, product_id, nome_snapshot, qtd, preco_snapshot)
SELECT id, lead_id, product_id, nome_snapshot, COALESCE(qtd,1), preco_snapshot
FROM _old_lead_items
WHERE lead_id IN (SELECT id FROM leads);

-- ---------- clientes (tags/notas por whatsapp) ----------
CREATE TABLE customers (
  tenant_id TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  notas TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, whatsapp)
);

-- ---------- pagamentos ----------
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  valor REAL NOT NULL DEFAULT 0,
  competencia TEXT DEFAULT '',
  data TEXT DEFAULT '',
  meio TEXT DEFAULT '',
  status TEXT DEFAULT 'pago',
  obs TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS payments_tenant ON payments(tenant_id, data DESC);

-- ---------- assinaturas (compat) ----------
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provedor TEXT NOT NULL DEFAULT '',
  provedor_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  current_period_end TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO subscriptions (id, tenant_id, provedor, provedor_id, status, current_period_end, created_at)
SELECT id, tenant_id, COALESCE(provedor,''), COALESCE(provedor_id,''), COALESCE(status,''), current_period_end, created_at
FROM _old_subscriptions;

-- ---------- limpeza ----------
DROP TABLE IF EXISTS _old_lead_items;
DROP TABLE IF EXISTS _old_products;
DROP TABLE IF EXISTS _old_leads;
DROP TABLE IF EXISTS _old_site_configs;
DROP TABLE IF EXISTS _old_users;
DROP TABLE IF EXISTS _old_subscriptions;
DROP TABLE IF EXISTS _old_tenants;
