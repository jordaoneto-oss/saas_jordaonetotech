-- SaaS Catálogos — schema Postgres v1 (Fase 2)
-- Mapeado de: config.json, js/catalog.json, data/leads.json
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nome_fantasia TEXT NOT NULL,
  email_dono TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  whatsapp_display TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  dominio_custom TEXT UNIQUE,
  plano TEXT NOT NULL DEFAULT 'basico' CHECK (plano IN ('basico','pro')),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','suspenso','cancelado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'dono' CHECK (papel IN ('dono','equipe')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'geral',
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  preco NUMERIC(10,2),
  etiqueta TEXT,
  foto_url TEXT NOT NULL DEFAULT '',
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, slug)
);
CREATE INDEX ON products (tenant_id, categoria) WHERE ativo;

CREATE TABLE site_configs (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  identidade JSONB NOT NULL DEFAULT '{}',
  tema JSONB NOT NULL DEFAULT '{}',
  secoes JSONB NOT NULL DEFAULT '{}',
  carrinho JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('pedido','contato')),
  origem TEXT DEFAULT '',
  nome TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  total NUMERIC(10,2),
  cep_cidade TEXT DEFAULT '',
  obs TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','atendido')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON leads (tenant_id, created_at DESC);

CREATE TABLE lead_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  nome_snapshot TEXT NOT NULL,
  qtd INT NOT NULL DEFAULT 1,
  preco_snapshot NUMERIC(10,2),
  personalizacao JSONB DEFAULT '{}'
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provedor TEXT NOT NULL,
  provedor_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_configs ENABLE ROW LEVEL SECURITY;
