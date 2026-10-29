-- ============================================================
-- SaaS Catálogos — schema D1 v2 (instalação limpa)
-- Para bancos já existentes use db/migrate-v2.sql (preserva dados).
--   wrangler d1 execute saas-pump --remote --file=db/schema-d1.sql
-- ============================================================

DROP TABLE IF EXISTS lead_items;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS tenant_config;
DROP TABLE IF EXISTS site_configs;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS platform;

-- ---------- plataforma (linha única) ----------
CREATE TABLE platform (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nome TEXT DEFAULT '',
  dominio TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  whatsapp_tela TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO platform (id, nome, dominio, whatsapp, whatsapp_tela)
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

-- ---------- usuários (admin da loja + super admin) ----------
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'dono',
  created_at TEXT DEFAULT (datetime('now'))
);
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

CREATE TABLE lead_items (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  product_id TEXT,
  nome_snapshot TEXT NOT NULL DEFAULT '',
  qtd INTEGER NOT NULL DEFAULT 1,
  preco_snapshot REAL
);
CREATE INDEX IF NOT EXISTS lead_items_lead ON lead_items(lead_id);

-- ---------- clientes (tags/notas por whatsapp) ----------
CREATE TABLE customers (
  tenant_id TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  notas TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, whatsapp)
);

-- ---------- pagamentos (financeiro do super admin) ----------
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
