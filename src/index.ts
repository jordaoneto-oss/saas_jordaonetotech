/**
 * SaaS Catálogos — Worker único (API + assets + R2)
 * Stack: Cloudflare Workers + D1 + R2 + KV
 *
 * Contratos implementados conforme os fronts:
 *  - public/saas-admin.html  (super admin)
 *  - editor.html / editor.js  (editor visual)
 *  - admin-completo.html / admin.js (admin da loja)
 *  - landing.html             (página de vendas)
 *  - index.html / js/app.js   (site público)
 */

export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  SESSION_KV: KVNamespace;
  ASSETS: { fetch: (input: Request | string, init?: RequestInit) => Promise<Response> };
}

const MASTER = "atelie123";
const DEFAULT_TENANT = "default-tenant";
const MENSALIDADE: Record<string, number> = { basico: 29.9, pro: 49.9, enterprise: 99.9 };
const PLANOS = ["basico", "pro", "enterprise"];

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "Content-Type,Authorization,X-Loja",
};

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...CORS,
      ...extra,
    },
  });
}

function fail(msg: string, status = 400): Response {
  return json({ erro: msg, ok: false }, status);
}

function nowISO(): string {
  return new Date().toISOString();
}
function todayISO(): string {
  return nowISO().slice(0, 10);
}
function monthISO(): string {
  return nowISO().slice(0, 7);
}
function addMonth(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + 1);
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}
function diffDays(a: string, b: string): number | null {
  const da = Date.parse(`${a}T00:00:00Z`);
  const db = Date.parse(`${b}T00:00:00Z`);
  if (isNaN(da) || isNaN(db)) return null;
  return Math.round((da - db) / 86400000);
}
function digits(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "");
}
function clean(v: unknown, max = 500): string {
  return String(v ?? "").slice(0, max);
}
function slugify(v: unknown, fallback = "produto"): string {
  const s = String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || fallback;
}
function normStatus(v: unknown): string {
  const s = String(v ?? "novo").toLowerCase();
  if (s === "atendido") return "concluido";
  if (["novo", "em_producao", "concluido", "cancelado"].includes(s)) return s;
  return "novo";
}
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function senhaConfere(hash: unknown, senha: unknown): Promise<boolean> {
  const h = String(hash ?? "");
  const s = String(senha ?? "");
  if (!h || !s) return false;
  if (h === s) return true;
  return h === (await sha256(s));
}
async function readBody(request: Request): Promise<any> {
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) return await request.json();
    const text = await request.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  } catch {
    return {};
  }
}
function safeFileName(name: unknown, fallbackExt = "bin"): string {
  const raw = String(name ?? "").split(/[\\/]/).pop() || "";
  const m = /^(.*?)(\.[a-z0-9]{1,8})?$/i.exec(raw);
  const base = slugify(m?.[1] || "arquivo", "arquivo").slice(0, 80);
  const ext = (m?.[2] || `.${fallbackExt}`).toLowerCase().replace(/[^a-z0-9.]/g, "");
  return base + ext;
}
function dataUrl(dados: unknown): { mime: string; bytes: Uint8Array } | null {
  const s = String(dados ?? "");
  const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(s);
  if (!m) return null;
  const mime = m[1] || "application/octet-stream";
  if (m[2]) {
    try {
      const bin = atob(m[3].replace(/\s/g, ""));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return { mime, bytes };
    } catch {
      return null;
    }
  }
  try {
    return { mime, bytes: new TextEncoder().encode(decodeURIComponent(m[3])) };
  } catch {
    return null;
  }
}
function isVideo(name: string, mime = ""): boolean {
  return /^video\//i.test(mime) || /\.(mp4|webm|ogv|ogg|mov|m4v)$/i.test(name);
}

/* ------------------------------------------------------------------ */
/* platform / tenant                                                  */
/* ------------------------------------------------------------------ */

const PLATFORM_DEFAULT = {
  nome: "Super Loja",
  dominio: "",
  whatsapp: "",
  whatsapp_tela: "",
};

async function getPlatform(env: Env): Promise<any> {
  try {
    const row: any = await env.DB.prepare("SELECT * FROM platform WHERE id = 1").first();
    return row || { ...PLATFORM_DEFAULT };
  } catch {
    return { ...PLATFORM_DEFAULT };
  }
}

async function resolveSlug(env: Env, request: Request, url: URL): Promise<string> {
  const q = String(
    url.searchParams.get("loja") || url.searchParams.get("slug") || url.searchParams.get("tenant") || "",
  )
    .trim()
    .toLowerCase();
  if (q) return q;
  const h = String(request.headers.get("x-loja") || request.headers.get("x-tenant") || "").trim().toLowerCase();
  if (h) return h;

  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.endsWith(".workers.dev")) {
    return DEFAULT_TENANT;
  }
  const p = await getPlatform(env);
  const base = String(p.dominio || "").replace(/^www\./i, "").toLowerCase().replace(/\/$/, "");
  if (base && host !== base && host.endsWith(`.${base}`)) {
    const sub = host.slice(0, -(base.length + 1));
    if (sub && sub !== "www" && !sub.includes(".")) return sub;
  }
  /* domínio próprio cadastrado na loja */
  try {
    const byDomain: any = await env.DB.prepare(
      "SELECT slug FROM tenants WHERE lower(dominio) = ? OR lower(dominio) = ? LIMIT 1",
    )
      .bind(host, `www.${host}`)
      .first();
    if (byDomain?.slug) return String(byDomain.slug);
  } catch {}
  return DEFAULT_TENANT;
}

/* domínio base da plataforma (ou o host do Worker quando não há wildcard) */
async function baseDomain(env: Env, url: URL): Promise<string> {
  const p = await getPlatform(env);
  const base = String(p.dominio || "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./i, "")
    .toLowerCase();
  return base || url.hostname.toLowerCase();
}

/* consulta DNS via DNS-over-HTTPS (Cloudflare) */
async function doh(name: string): Promise<string[]> {
  try {
    const r = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=A`,
      { headers: { accept: "application/dns-json" } },
    );
    if (!r.ok) return [];
    const j: any = await r.json();
    const out = (j?.Answer || [])
      .map((a: any) => String(a?.data || "").replace(/\.$/, ""))
      .filter((v: string) => v && v.length > 0);
    return [...new Set<string>(out)];
  } catch {
    return [];
  }
}

async function getTenant(env: Env, slug: string): Promise<any | null> {
  try {
    return await env.DB.prepare("SELECT * FROM tenants WHERE slug = ?").bind(slug).first();
  } catch {
    return null;
  }
}

async function assetJson(env: Env, path: string): Promise<any | null> {
  try {
    const res = await env.ASSETS.fetch(new Request(`https://assets.local${path}`));
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getConfig(env: Env, slug: string): Promise<any> {
  try {
    const row: any = await env.DB.prepare("SELECT json FROM tenant_config WHERE tenant_id = ?").bind(slug).first();
    if (row?.json) {
      const parsed = JSON.parse(row.json);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {}
  if (slug === DEFAULT_TENANT) {
    const fallback = await assetJson(env, "/config.json");
    if (fallback) return fallback;
  }
  return {};
}

async function saveConfig(env: Env, slug: string, cfg: any): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO tenant_config (tenant_id, json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(tenant_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`,
  )
    .bind(slug, JSON.stringify(cfg || {}), nowISO())
    .run();
  const geral = (cfg && cfg.geral) || {};
  if (geral.nome) {
    await env.DB.prepare(
      `UPDATE tenants SET nome = ?, nome_fantasia = ?, zap = COALESCE(NULLIF(?, ''), zap) WHERE slug = ?`,
    )
      .bind(clean(geral.nome, 90), clean(geral.nome, 90), clean(geral.zap, 30), slug)
      .run();
  }
}

async function ensureTenant(env: Env, slug: string): Promise<any> {
  const t = await getTenant(env, slug);
  if (t) return t;
  return { slug, nome: slug, nome_fantasia: slug, status: "ativa", no_ar: 1, plano: "basico" };
}

/* ------------------------------------------------------------------ */
/* auth                                                               */
/* ------------------------------------------------------------------ */

type Session = { role: "super" | "tenant"; tenant?: string; email?: string; uid?: string; token?: string };

async function auth(request: Request, env: Env): Promise<Session | null> {
  const header = request.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  if (token === MASTER) return { role: "super", token };
  try {
    const raw = await env.SESSION_KV.get(`session:${token}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.role) return null;
    return { ...data, token };
  } catch {
    return null;
  }
}

async function requireSuper(request: Request, env: Env): Promise<Session | null> {
  const s = await auth(request, env);
  return s && s.role === "super" ? s : null;
}

async function requireTenant(request: Request, env: Env, slug: string): Promise<Session | null> {
  const s = await auth(request, env);
  if (!s) return null;
  if (s.role === "super") return s;
  if (s.role === "tenant" && s.tenant === slug) return s;
  return null;
}

async function newSession(env: Env, data: Session): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, "");
  await env.SESSION_KV.put(`session:${token}`, JSON.stringify({ ...data, token }), {
    expirationTtl: 60 * 60 * 24 * 7,
  });
  return token;
}

/* ------------------------------------------------------------------ */
/* R2 / assets                                                        */
/* ------------------------------------------------------------------ */

async function serveObject(env: Env, request: Request, key: string): Promise<Response | null> {
  if (!key || key.includes("..")) return null;
  try {
    const obj = await env.IMAGES.get(key);
    if (!obj) return null;
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    headers.set("access-control-allow-origin", "*");
    return new Response(obj.body as any, { headers });
  } catch {
    return null;
  }
}

async function listR2(env: Env, prefix: string): Promise<string[]> {
  try {
    const out: string[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 10; i++) {
      const page: any = await env.IMAGES.list({ prefix, limit: 1000, cursor });
      for (const o of page.objects || []) out.push(String(o.key));
      if (!page.truncated) break;
      cursor = page.cursor;
    }
    return out;
  } catch {
    return [];
  }
}

const STATIC_ICONS = [
  "base-chat.svg",
  "base-check.svg",
  "base-coracao.svg",
  "base-cruz.svg",
  "base-entrega.svg",
  "base-estrela.svg",
  "base-flor.svg",
  "base-folha.svg",
  "base-presente.svg",
  "base-sacola.svg",
  "base-sino.svg",
  "base-sol.svg",
];

const STATIC_IMAGES = ["logo.webp", "logo-retangular.webp", "placeholder.png", "produto-generico.webp"];

/* ------------------------------------------------------------------ */
/* SEO html                                                           */
/* ------------------------------------------------------------------ */

function escHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escJson(v: unknown): string {
  return JSON.stringify(String(v ?? "")).slice(1, -1);
}

async function serveSite(env: Env, request: Request, url: URL): Promise<Response> {
  const slug = await resolveSlug(env, request, url);
  const t = await getTenant(env, slug);
  if (t && (String(t.status || "ativa") !== "ativa" || Number(t.no_ar) === 0)) {
    const nome = escHtml(t.nome || t.nome_fantasia || slug);
    const p = await getPlatform(env);
    const zap = digits(p.whatsapp);
    return new Response(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${nome} — loja temporariamente indisponível</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fbf5ee;color:#33291f;
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center;padding:24px}
main{max-width:460px}h1{font-size:22px;margin:0 0 10px}p{color:#6f6050;line-height:1.55;margin:0 0 16px}
a{display:inline-block;background:#1f8c5a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600}</style>
</head><body><main><h1>${nome}</h1>
<p>Esta loja está temporariamente fora do ar. Se você é o responsável, entre em contato com o suporte da plataforma.</p>
${zap ? `<a href="https://wa.me/${zap}" target="_blank" rel="noopener">Falar no WhatsApp</a>` : ""}
</main></body></html>`,
      { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
    );
  }
  let res: Response;
  try {
    res = await env.ASSETS.fetch(new Request(new URL("/index.html", url).toString(), { method: "GET", headers: request.headers }));
  } catch {
    return new Response("Site indisponível", { status: 500 });
  }
  if (!res.ok) return res;
  try {
    const cfg = await getConfig(env, slug);
    const g = (cfg && cfg.geral) || {};
    const v = (cfg && cfg.visual) || {};
    const origin = url.origin;
    const nome = g.nome || "Loja";
    const titulo = g.title || `${nome} — ${g.tagline || "Catálogo online"}`;
    const desc = g.descricao || "";
    const logo = String(v.logo || "").replace(/^\/+/, "").replace(/^img\//, "") || "logo.webp";
    const image = `${origin}/img/${logo}`;
    let html = await res.text();
    const rep: Record<string, string> = {
      "{{SEO_TITLE}}": escHtml(titulo),
      "{{SEO_DESC}}": escHtml(desc),
      "{{SEO_URL}}": escHtml(origin),
      "{{SEO_NAME}}": escHtml(nome),
      "{{SEO_IMAGE}}": escHtml(image),
      "{{SEO_PHONE}}": escHtml(g.zap || ""),
      "{{SEO_INSTAGRAM}}": escJson(g.instagram || ""),
      "{{SEO_PRODUTO}}": escHtml(g.produto || ""),
      "{{SEO_CATEGORIA}}": escHtml(g.categoria || ""),
    };
    for (const [k, val] of Object.entries(rep)) html = html.split(k).join(val);
    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  } catch {
    return res;
  }
}

/* ------------------------------------------------------------------ */
/* main                                                               */
/* ------------------------------------------------------------------ */

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    try {
      /* ---------- arquivos de imagem/vídeo/ícone ---------- */
      if (path.startsWith("/img/icons/")) {
        const key = path.slice("/img/icons/".length);
        const obj = await serveObject(env, request, `icons/${key}`);
        if (obj) return obj;
        return env.ASSETS.fetch(request);
      }
      if (path.startsWith("/icons/")) {
        const key = path.slice("/icons/".length);
        const obj = await serveObject(env, request, `icons/${key}`);
        if (obj) return obj;
        return env.ASSETS.fetch(new Request(new URL(`/img/icons/${key}`, url).toString(), { method: "GET", headers: request.headers }));
      }
      if (path.startsWith("/img/")) {
        const key = path.slice(1);
        const obj = await serveObject(env, request, key);
        if (obj) return obj;
        return env.ASSETS.fetch(request);
      }
      if (path.startsWith("/video/")) {
        const key = path.slice(1);
        const obj = await serveObject(env, request, key);
        if (obj) return obj;
        return env.ASSETS.fetch(request);
      }

      /* ---------- config.json / js/catalog.json por tenant ---------- */
      if (path === "/config.json") {
        const slug = await resolveSlug(env, request, url);
        try {
          const cfg = await getConfig(env, slug);
          if (cfg && Object.keys(cfg).length) {
            return json(cfg, 200, { "cache-control": "no-store" });
          }
        } catch {}
        return env.ASSETS.fetch(request);
      }
      if (path === "/js/catalog.json") {
        const slug = await resolveSlug(env, request, url);
        try {
          const prods = await listProducts(env, slug);
          if (prods.length) return json(prods, 200, { "cache-control": "no-store" });
        } catch {}
        return env.ASSETS.fetch(request);
      }

      /* ---------- home (SEO dinâmico) ---------- */
      if (path === "/" || path === "/index.html") {
        return await serveSite(env, request, url);
      }

      /* ---------- API ---------- */
      if (path.startsWith("/api/")) {
        return await handleApi(request, env, url, path);
      }

      return env.ASSETS.fetch(request);
    } catch (e: any) {
      console.error("worker error", e && e.stack ? e.stack : e);
      return fail(String(e?.message || e || "erro interno"), 500);
    }
  },
};

/* ------------------------------------------------------------------ */
/* produtos                                                           */
/* ------------------------------------------------------------------ */

async function listProducts(env: Env, slug: string): Promise<any[]> {
  let rows: any[] = [];
  try {
    const r = await env.DB.prepare(
      `SELECT id, nome, cat, colecao, preco, ordem, tag, selo, desc, foto, video
       FROM products WHERE tenant_id = ? AND ativo = 1 ORDER BY ordem ASC, nome ASC`,
    )
      .bind(slug)
      .all();
    rows = (r.results || []) as any[];
  } catch {
    rows = [];
  }
  if (!rows.length && slug === DEFAULT_TENANT) {
    const fallback = await assetJson(env, "/js/catalog.json");
    if (Array.isArray(fallback)) return fallback;
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* API router                                                         */
/* ------------------------------------------------------------------ */

async function handleApi(request: Request, env: Env, url: URL, path: string): Promise<Response> {
  const method = request.method.toUpperCase();
  const slug = await resolveSlug(env, request, url);
  const tenant = await ensureTenant(env, slug);
  const body = method === "GET" || method === "DELETE" ? {} : await readBody(request);

  /* ================================================================ */
  /* público                                                          */
  /* ================================================================ */

  if (path === "/api/catalogo" && method === "GET") {
    const alvo = String(url.searchParams.get("loja") || slug);
    const produtos = await listProducts(env, alvo);
    return json({ loja: alvo, produtos });
  }

  /* pedido / contato / popup vindo do site */
  if (path === "/api/pedido" && method === "POST") {
    try {
      const tipoRaw = String(body.tipo || "pedido").toLowerCase();
      const tipo = ["pedido", "contato", "interesse"].includes(tipoRaw) ? tipoRaw : "pedido";
      const id = crypto.randomUUID();
      const ts = nowISO();
      const whats = clean(body.whatsapp || body.zap || body.telefone, 40);
      const total = typeof body.total === "number" && isFinite(body.total) ? body.total : null;
      await env.DB.prepare(
        `INSERT INTO leads
          (id, tenant_id, tipo, origem, nome, whatsapp, total, cep, obs, status, ts, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'novo', ?, ?)`,
      )
        .bind(
          id,
          slug,
          tipo,
          clean(body.origem || "site", 120),
          clean(body.nome || body.cliente, 120),
          whats,
          total,
          clean(body.cep || body.cep_cidade, 120),
          clean(body.obs || body.mensagem, 2000),
          ts,
          ts,
        )
        .run();

      if (Array.isArray(body.itens) && body.itens.length) {
        const stmts = body.itens.slice(0, 80).map((it: any) => {
          const preco =
            typeof it?.preco === "number" && isFinite(it.preco) ? it.preco : it?.preco == null ? null : Number(it.preco);
          return env.DB.prepare(
            `INSERT INTO lead_items (id, lead_id, product_id, nome_snapshot, qtd, preco_snapshot)
             VALUES (?, ?, ?, ?, ?, ?)`,
          ).bind(
            crypto.randomUUID(),
            id,
            it?.id ? String(it.id) : null,
            clean(it?.nome || it?.name || "Peça", 160),
            Math.max(1, Number(it?.q || it?.qtd || 1) || 1),
            preco != null && isFinite(preco) ? preco : null,
          );
        });
        await env.DB.batch(stmts);
      }
      return json({ ok: true, pedido_id: id }, 201);
    } catch (e: any) {
      return fail(`não foi possível registrar: ${e?.message || e}`, 500);
    }
  }

  /* interesse da landing (formulário de vendas) */
  if (path === "/api/saas/interesse" && method === "POST") {
    try {
      const id = crypto.randomUUID();
      const ts = nowISO();
      await env.DB.prepare(
        `INSERT INTO leads
          (id, tenant_id, tipo, origem, nome, whatsapp, segmento, plano, total, status, ts, created_at)
         VALUES (?, '', 'interesse', 'landing', ?, ?, ?, ?, NULL, 'novo', ?, ?)`,
      )
        .bind(
          id,
          clean(body.nome || body.cliente, 120),
          clean(body.whatsapp || body.telefone || body.zap, 40),
          clean(body.segmento, 80),
          clean(body.plano, 40),
          ts,
          ts,
        )
        .run();
      return json({ ok: true, id }, 201);
    } catch (e: any) {
      return fail(`não foi possível salvar o contato: ${e?.message || e}`, 500);
    }
  }

  /* login da loja (editor + admin) */
  if ((path === "/api/login" || path === "/api/admin/login") && method === "POST") {
    const senha = body.senha || body.password || "";
    if (senha === MASTER) {
      const token = await newSession(env, { role: "tenant", tenant: slug, email: "master" });
      return json({ ok: true, token, tenant: slug });
    }
    try {
      const u: any = body.email
        ? await env.DB.prepare("SELECT * FROM users WHERE tenant_id = ? AND lower(email) = lower(?)")
            .bind(slug, String(body.email))
            .first()
        : await env.DB.prepare("SELECT * FROM users WHERE tenant_id = ? ORDER BY CASE papel WHEN 'dono' THEN 0 ELSE 1 END LIMIT 1")
            .bind(slug)
            .first();
      if (!u || !(await senhaConfere(u.senha_hash, senha))) return fail("senha incorreta", 401);
      const token = await newSession(env, {
        role: "tenant",
        tenant: slug,
        email: u.email || "",
        uid: u.id,
      });
      return json({ ok: true, token, tenant: slug });
    } catch (e: any) {
      return fail(`erro ao entrar: ${e?.message || e}`, 500);
    }
  }

  /* login super admin */
  if (path === "/api/saas/login" && method === "POST") {
    const senha = String(body.senha || body.password || "").trim();
    const tokenInformado = String(body.token || "").trim();

    /* aceita um token de sessão já válido (o front guarda em sessionStorage) */
    if (tokenInformado && tokenInformado !== MASTER) {
      try {
        const raw = await env.SESSION_KV.get(`session:${tokenInformado}`);
        if (raw) {
          const s = JSON.parse(raw);
          if (s?.role === "super") return json({ ok: true, token: tokenInformado });
        }
      } catch {}
    }
    if (tokenInformado === MASTER || senha === MASTER) {
      const token = await newSession(env, { role: "super", email: "super" });
      return json({ ok: true, token });
    }
    try {
      const u: any = body.email
        ? await env.DB.prepare("SELECT * FROM users WHERE papel = 'super' AND lower(email) = lower(?)")
            .bind(String(body.email))
            .first()
        : await env.DB.prepare("SELECT * FROM users WHERE papel = 'super' LIMIT 1").first();
      if (!u || !(await senhaConfere(u.senha_hash, senha))) return fail("credenciais inválidas", 401);
      const token = await newSession(env, { role: "super", email: u.email || "super", uid: u.id });
      return json({ ok: true, token });
    } catch (e: any) {
      return fail(`erro ao entrar: ${e?.message || e}`, 500);
    }
  }

  /* logout */
  if (path === "/api/logout" && method === "POST") {
    const s = await auth(request, env);
    if (s?.token && s.token !== MASTER) {
      try {
        await env.SESSION_KV.delete(`session:${s.token}`);
      } catch {}
    }
    return json({ ok: true });
  }

  /* trocar senha (admin da loja) */
  if (path === "/api/trocar-senha" && method === "POST") {
    const s = await requireTenant(request, env, slug);
    if (!s) return fail("não autorizado", 401);
    const nova = String(body.nova || "");
    if (nova.length < 6) return fail("a nova senha precisa ter ao menos 6 caracteres");
    try {
      let u: any = null;
      if (s.uid) u = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(s.uid).first();
      if (!u) u = await env.DB.prepare("SELECT * FROM users WHERE tenant_id = ? ORDER BY created_at LIMIT 1").bind(slug).first();
      if (!u) return fail("usuário não encontrado", 404);
      if (!(await senhaConfere(u.senha_hash, body.atual))) return fail("senha atual incorreta", 401);
      await env.DB.prepare("UPDATE users SET senha_hash = ? WHERE id = ?").bind(await sha256(nova), u.id).run();
      return json({ ok: true });
    } catch (e: any) {
      return fail(`erro ao trocar senha: ${e?.message || e}`, 500);
    }
  }

  /* redefinir senha via link gerado pelo super admin */
  if (path === "/api/redefinir-senha" && method === "POST") {
    const token = String(body.token || url.searchParams.get("token") || "");
    const nova = String(body.nova || "");
    if (!token || nova.length < 6) return fail("token ou senha inválida");
    try {
      const alvo = await env.SESSION_KV.get(`reset:${token}`);
      if (!alvo) return fail("link expirado ou já usado", 400);
      const u: any = await env.DB.prepare(
        "SELECT * FROM users WHERE tenant_id = ? ORDER BY CASE papel WHEN 'dono' THEN 0 ELSE 1 END LIMIT 1",
      )
        .bind(alvo)
        .first();
      if (!u) return fail("loja sem usuário", 404);
      await env.DB.prepare("UPDATE users SET senha_hash = ? WHERE id = ?").bind(await sha256(nova), u.id).run();
      await env.SESSION_KV.delete(`reset:${token}`);
      return json({ ok: true });
    } catch (e: any) {
      return fail(`erro ao redefinir: ${e?.message || e}`, 500);
    }
  }

  /* dados da loja para o editor */
  if (path === "/api/tenant" && method === "GET") {
    const t: any = await getTenant(env, slug);
    if (!t) return json({ slug, nome: slug, status: "ativa" });
    return json({
      slug: t.slug,
      nome: t.nome || t.nome_fantasia || t.slug,
      zap: t.zap || "",
      zap_tela: t.zap_tela || "",
      dominio: t.dominio || "",
      plano: t.plano || "",
      status: t.status || "ativa",
      no_ar: !!t.no_ar,
    });
  }

  /* temas do editor */
  if (path === "/api/temas" && method === "GET") {
    const base = {
      marfim: "#fbf5ee",
      menu: "#fbf5ee",
      areia: "#f3e9dc",
      papel: "#fffcf7",
      linha: "#e7d9c4",
      tinta: "#33291f",
      "tinta-suave": "#6f6050",
      ouro: "#c9a227",
      "ouro-claro": "#e0c46a",
      "ouro-fraco": "#f2e7d2",
      rosa: "#d39c9c",
      "rosa-claro": "#f3ddd9",
      salvia: "#93a68c",
      zap: "#1f8c5a",
    };
    const fonteTema = (nome: string, gf: string, familia: string) => ({
      nome,
      link: `https://fonts.googleapis.com/css2?family=${gf}&display=swap`,
      familia,
    });
    return json({
      temas: [
        { id: "artesanal", nome: "Artesanal", cores: { ...base, ouro: "#d39c9c" } },
        {
          id: "luxo",
          nome: "Luxo",
          cores: { ...base, marfim: "#0f0f0f", menu: "#0f0f0f", areia: "#171717", papel: "#111111", linha: "#2c2c2c", tinta: "#f5f0e6", "tinta-suave": "#bdb3a2", ouro: "#c9a227" },
        },
        {
          id: "clinica",
          nome: "Clean",
          cores: { ...base, marfim: "#f7fafc", menu: "#f7fafc", areia: "#eef4f8", papel: "#ffffff", linha: "#dbe7ef", tinta: "#16303f", "tinta-suave": "#5b7382", ouro: "#2f80ed" },
        },
        {
          id: "vitrine",
          nome: "Vitrine",
          cores: {
            ...base,
            marfim: "#ffffff",
            menu: "#ffffff",
            areia: "#f4f6fb",
            papel: "#ffffff",
            linha: "#e3e8f2",
            tinta: "#0f172a",
            "tinta-suave": "#5b6577",
            ouro: "#4f46e5",
            "ouro-claro": "#818cf8",
            "ouro-fraco": "#eef2ff",
            rosa: "#f59e0b",
            "rosa-claro": "#fef3c7",
            salvia: "#10b981",
            zap: "#16a34a",
          },
          fontes: {
            titulos: fonteTema("Manrope", "Manrope:wght@500;600;700;800", '"Manrope",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'),
            texto: fonteTema("Inter", "Inter:wght@300;400;500;600;700", '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'),
          },
        },
        {
          id: "editorial",
          nome: "Editorial",
          cores: {
            ...base,
            marfim: "#f6f1e7",
            menu: "#f6f1e7",
            areia: "#ece3d3",
            papel: "#fffdf8",
            linha: "#ddd0bb",
            tinta: "#211d17",
            "tinta-suave": "#6b6153",
            ouro: "#b4552d",
            "ouro-claro": "#d98a63",
            "ouro-fraco": "#f6e4d8",
            rosa: "#8a9a7b",
            "rosa-claro": "#e6ece1",
            salvia: "#6f7d5c",
            zap: "#1f7a4d",
          },
          fontes: {
            titulos: fonteTema("Fraunces", "Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400", '"Fraunces",Georgia,serif'),
            texto: fonteTema("DM Sans", "DM+Sans:wght@400;500;700", '"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'),
          },
        },
        {
          id: "boutique",
          nome: "Boutique",
          cores: {
            ...base,
            marfim: "#0d0c0a",
            menu: "#0d0c0a",
            areia: "#151310",
            papel: "#1b1814",
            linha: "#332d24",
            tinta: "#f4ecdd",
            "tinta-suave": "#b7a98f",
            ouro: "#c8a96a",
            "ouro-claro": "#e2c995",
            "ouro-fraco": "#2a2318",
            rosa: "#a8735b",
            "rosa-claro": "#2e211b",
            salvia: "#7f8b72",
            zap: "#2f9e68",
          },
          fontes: {
            titulos: fonteTema("Cormorant Garamond", "Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400", '"Cormorant Garamond",Georgia,serif'),
            texto: fonteTema("Inter", "Inter:wght@300;400;500;600", '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'),
          },
        },
      ],
    });
  }

  /* ================================================================ */
  /* admin da loja                                                    */
  /* ================================================================ */

  if (path.startsWith("/api/admin/") || path === "/api/admin/products") {
    const s = await requireTenant(request, env, slug);
    if (!s) return fail("não autorizado", 401);
  }

  if ((path === "/api/admin/config" || path === "/api/admin/site-config") && method === "GET") {
    return json(await getConfig(env, slug));
  }

  if ((path === "/api/admin/config" || path === "/api/admin/site-config") && (method === "PUT" || method === "POST")) {
    try {
      await saveConfig(env, slug, body);
      return json({ ok: true });
    } catch (e: any) {
      return fail(`erro ao salvar configuração: ${e?.message || e}`, 500);
    }
  }

  if ((path === "/api/admin/produtos" || path === "/api/admin/products") && method === "GET") {
    /* o painel precisa ver também os produtos desativados (para poder reativá-los) */
    try {
      const { results } = await env.DB.prepare(
        `SELECT id, nome, cat, colecao, preco, ordem, tag, selo, desc, foto, video, ativo
         FROM products WHERE tenant_id = ? ORDER BY ordem ASC, nome ASC`,
      )
        .bind(slug)
        .all<any>();
      return json(results || []);
    } catch {
      return json(await listProducts(env, slug));
    }
  }

  if ((path === "/api/admin/produtos" || path === "/api/admin/products") && method === "POST") {
    try {
      const nome = clean(body.nome, 160);
      if (!nome) return fail("informe o nome do produto");
      let id = slugify(body.id || nome);
      const existe: any = await env.DB.prepare("SELECT id FROM products WHERE id = ?").bind(id).first();
      if (existe) id = `${id}-${Date.now().toString(36)}`;
      const prod = {
        id,
        nome,
        cat: clean(body.cat || "geral", 60),
        colecao: clean(body.colecao, 120),
        preco: typeof body.preco === "number" && isFinite(body.preco) ? body.preco : null,
        ordem: Number.isFinite(Number(body.ordem)) ? Number(body.ordem) : 0,
        tag: clean(body.tag, 80),
        selo: clean(body.selo, 120),
        desc: clean(body.desc || body.descricao, 4000),
        foto: clean(body.foto || body.foto_url, 300),
        video: clean(body.video, 300),
        ativo: body.ativo === false || body.ativo === 0 ? 0 : 1,
      };
      await env.DB.prepare(
        `INSERT INTO products (id, tenant_id, nome, cat, colecao, preco, ordem, tag, selo, desc, foto, video, ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          prod.id,
          slug,
          prod.nome,
          prod.cat,
          prod.colecao,
          prod.preco,
          prod.ordem,
          prod.tag,
          prod.selo,
          prod.desc,
          prod.foto,
          prod.video,
          prod.ativo,
        )
        .run();
      return json(prod, 201);
    } catch (e: any) {
      return fail(`erro ao criar produto: ${e?.message || e}`, 500);
    }
  }

  if ((path.startsWith("/api/admin/produtos/") || path.startsWith("/api/admin/products/")) && method === "PUT") {
    const id = decodeURIComponent(path.split("/").pop() || "");
    try {
      const atual: any = await env.DB.prepare("SELECT * FROM products WHERE id = ? AND tenant_id = ?")
        .bind(id, slug)
        .first();
      if (!atual) return fail("produto não encontrado", 404);
      const prod = {
        id,
        nome: body.nome !== undefined ? clean(body.nome, 160) : atual.nome,
        cat: body.cat !== undefined ? clean(body.cat, 60) : atual.cat,
        colecao: body.colecao !== undefined ? clean(body.colecao, 120) : atual.colecao,
        preco:
          body.preco !== undefined
            ? typeof body.preco === "number" && isFinite(body.preco)
              ? body.preco
              : null
            : atual.preco,
        ordem: body.ordem !== undefined ? (Number.isFinite(Number(body.ordem)) ? Number(body.ordem) : 0) : atual.ordem,
        tag: body.tag !== undefined ? clean(body.tag, 80) : atual.tag,
        selo: body.selo !== undefined ? clean(body.selo, 120) : atual.selo,
        desc: body.desc !== undefined ? clean(body.desc, 4000) : atual.desc,
        foto: body.foto !== undefined ? clean(body.foto, 300) : atual.foto,
        video: body.video !== undefined ? clean(body.video, 300) : atual.video,
        ativo: body.ativo !== undefined ? (body.ativo === false || body.ativo === 0 ? 0 : 1) : atual.ativo,
      };
      await env.DB.prepare(
        `UPDATE products SET nome=?, cat=?, colecao=?, preco=?, ordem=?, tag=?, selo=?, desc=?, foto=?, video=?, ativo=?
         WHERE id = ? AND tenant_id = ?`,
      )
        .bind(
          prod.nome,
          prod.cat,
          prod.colecao,
          prod.preco,
          prod.ordem,
          prod.tag,
          prod.selo,
          prod.desc,
          prod.foto,
          prod.video,
          prod.ativo,
          id,
          slug,
        )
        .run();
      return json(prod);
    } catch (e: any) {
      return fail(`erro ao salvar produto: ${e?.message || e}`, 500);
    }
  }

  if ((path.startsWith("/api/admin/produtos/") || path.startsWith("/api/admin/products/")) && method === "DELETE") {
    const id = decodeURIComponent(path.split("/").pop() || "");
    await env.DB.prepare("DELETE FROM products WHERE id = ? AND tenant_id = ?").bind(id, slug).run();
    return json({ ok: true, id });
  }

  /* uploads */
  if ((path === "/api/admin/upload" || path === "/api/admin/upload-midia" || path === "/api/admin/upload-icone") && method === "POST") {
    try {
      let nome = "";
      let bytes: Uint8Array | null = null;
      let mime = "application/octet-stream";
      const ct = request.headers.get("content-type") || "";
      if (ct.includes("multipart/form-data")) {
        const form = await request.formData();
        const file: any = form.get("file");
        if (!file) return fail("sem arquivo");
        nome = String(file.name || form.get("nome") || "arquivo");
        mime = file.type || mime;
        bytes = new Uint8Array(await file.arrayBuffer());
      } else {
        const parsed = dataUrl(body.dados);
        if (!parsed) return fail("dados inválidos (envie {nome, dados:dataURL})");
        nome = String(body.nome || "arquivo");
        mime = parsed.mime;
        bytes = parsed.bytes;
      }
      const ext = mime.split("/")[1]?.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "bin";
      const fileName = safeFileName(nome, ext);
      let key: string;
      let url: string;
      let tipo = "imagem";
      if (path === "/api/admin/upload-icone") {
        key = `icons/${fileName}`;
        url = `/icons/${fileName}`;
      } else if (path === "/api/admin/upload-midia" && isVideo(fileName, mime)) {
        key = `video/${fileName}`;
        url = `/video/${fileName}`;
        tipo = "video";
      } else {
        key = `img/${fileName}`;
        url = `/img/${fileName}`;
      }
      await env.IMAGES.put(key, bytes as any, { httpMetadata: { contentType: mime } });
      if (path === "/api/admin/upload") return json({ ok: true, url, arquivo: fileName });
      return json({ ok: true, url, arquivo: fileName, tipo });
    } catch (e: any) {
      return fail(`falha no upload: ${e?.message || e}`, 500);
    }
  }

  if (path === "/api/admin/imagens" && method === "GET") {
    try {
      const keys = await listR2(env, "img/");
      const names = keys
        .map((k) => k.slice(4))
        .filter((k) => k && !k.includes("/"));
      const prods: any = await env.DB.prepare("SELECT foto FROM products WHERE tenant_id = ? AND foto != ''")
        .bind(slug)
        .all();
      for (const p of prods.results || []) {
        const f = String((p as any).foto || "")
          .split("/")
          .pop();
        if (f) names.push(f);
      }
      return json([...new Set([...names, ...STATIC_IMAGES])].sort());
    } catch {
      return json([...STATIC_IMAGES]);
    }
  }

  if (path === "/api/admin/midias" && method === "GET") {
    try {
      const imgs = await listR2(env, "img/");
      const vids = await listR2(env, "video/");
      const itens: any[] = [];
      for (const k of imgs) {
        const name = k.slice(4);
        if (!name || name.includes("/")) continue;
        itens.push({ tipo: "imagem", arquivo: name, url: `/img/${name}` });
      }
      for (const k of vids) {
        const name = k.slice(6);
        if (!name || name.includes("/")) continue;
        itens.push({ tipo: "video", arquivo: name, url: `/video/${name}` });
      }
      const prods: any = await env.DB.prepare(
        "SELECT foto, video FROM products WHERE tenant_id = ? AND (foto != '' OR video != '')",
      )
        .bind(slug)
        .all();
      for (const p of prods.results || []) {
        const foto = String((p as any).foto || "");
        const video = String((p as any).video || "");
        if (foto) {
          const name = foto.split("/").pop() || "";
          if (name && !itens.some((i) => i.arquivo === name)) itens.push({ tipo: "imagem", arquivo: name, url: `/img/${name}` });
        }
        if (video && isVideo(video)) {
          const cleanVideo = video.replace(/^\/+/, "").replace(/^video\//, "");
          if (cleanVideo && !itens.some((i) => i.arquivo === cleanVideo))
            itens.push({ tipo: "video", arquivo: cleanVideo, url: `/video/${cleanVideo}` });
        }
      }
      for (const name of STATIC_IMAGES)
        if (!itens.some((i) => i.arquivo === name)) itens.push({ tipo: "imagem", arquivo: name, url: `/img/${name}` });
      return json({ itens });
    } catch {
      return json({ itens: [] });
    }
  }

  if (path === "/api/admin/icones" && method === "GET") {
    try {
      const keys = await listR2(env, "icons/");
      const names = keys.map((k) => k.slice(6)).filter((k) => k && !k.includes("/"));
      return json([...new Set([...STATIC_ICONS, ...names])].sort());
    } catch {
      return json([...STATIC_ICONS]);
    }
  }

  if (path.startsWith("/api/admin/icones/") && method === "DELETE") {
    const name = decodeURIComponent(path.split("/").pop() || "").split("/").pop() || "";
    await env.IMAGES.delete(`icons/${name}`);
    return json({ ok: true });
  }

  /* resumo do admin */
  if (path === "/api/admin/resumo" && method === "GET") {
    try {
      const pedidos: any = await env.DB.prepare(
        `SELECT COUNT(*) c FROM leads WHERE tenant_id = ? AND tipo = 'pedido' AND status IN ('novo','em_producao')`,
      )
        .bind(slug)
        .first();
      const popup: any = await env.DB.prepare(
        `SELECT COUNT(*) c FROM leads WHERE tenant_id = ? AND lower(origem) LIKE 'popup%' AND status = 'novo'`,
      )
        .bind(slug)
        .first();
      const produtos: any = await env.DB.prepare("SELECT COUNT(*) c FROM products WHERE tenant_id = ? AND ativo = 1")
        .bind(slug)
        .first();
      const clientes: any = await env.DB.prepare(
        `SELECT COUNT(DISTINCT replace(replace(replace(whatsapp,'+',''),' ',''),'-','')) c
         FROM leads WHERE tenant_id = ? AND whatsapp != ''`,
      )
        .bind(slug)
        .first();
      return json({
        pedidos_novos: Number(pedidos?.c || 0),
        popup_novos: Number(popup?.c || 0),
        produtos: Number(produtos?.c || 0),
        clientes: Number(clientes?.c || 0),
        leads: Number(pedidos?.c || 0),
      });
    } catch (e: any) {
      return fail(`erro no resumo: ${e?.message || e}`, 500);
    }
  }

  /* indicadores / relatórios da loja */
  if (path === "/api/admin/indicadores" && method === "GET") {
    try {
      const periodo = String(url.searchParams.get("periodo") || "30d");
      let dias = 30;
      if (periodo === "7d") dias = 7;
      else if (periodo === "90d") dias = 90;
      else if (periodo === "12m") dias = 365;
      else if (periodo === "todos") dias = 36500;
      const desde = new Date(Date.now() - (dias - 1) * 86400000).toISOString().slice(0, 10);
      const { results: leads } = await env.DB.prepare(
        `SELECT l.*, COALESCE(l.ts, l.created_at) AS quando FROM leads l
         WHERE l.tenant_id = ? AND date(COALESCE(l.ts,l.created_at)) >= date(?)`,
      )
        .bind(slug, desde)
        .all<any>();
      const pedidos = leads.filter((l) => l.tipo === "pedido");
      const concluidos = pedidos.filter((l) => normStatus(l.status) === "concluido");
      const cancelados = pedidos.filter((l) => normStatus(l.status) === "cancelado");
      const emProducao = pedidos.filter((l) => normStatus(l.status) === "em_producao");
      const receita = concluidos.reduce((a, l) => a + (Number(l.total) || 0), 0);
      let pecas = 0;
      try {
        const it: any = await env.DB.prepare(
          `SELECT COALESCE(SUM(li.qtd),0) c FROM lead_items li
           JOIN leads l ON l.id = li.lead_id
           WHERE l.tenant_id = ? AND l.tipo = 'pedido' AND date(COALESCE(l.ts,l.created_at)) >= date(?)`,
        )
          .bind(slug, desde)
          .first();
        pecas = Number(it?.c || 0);
      } catch {}
      const clientes = new Set(leads.map((l) => digits(l.whatsapp)).filter(Boolean));
      const popup = leads.filter((l) => String(l.origem || "").toLowerCase().startsWith("popup"));
      const popupConvertidos = popup.filter((l) => l.tipo === "pedido").length;
      const nPedidos = pedidos.length;
      const kpis = {
        pedidos: nPedidos,
        concluidos: concluidos.length,
        cancelados: cancelados.length,
        em_producao: emProducao.length,
        novos: pedidos.filter((l) => normStatus(l.status) === "novo").length,
        receita,
        ticket_medio: nPedidos ? receita / nPedidos : 0,
        pecas,
        pecas_por_pedido: nPedidos ? Math.round((pecas / nPedidos) * 10) / 10 : 0,
        clientes_novos: clientes.size,
        popup_capturas: popup.length,
        popup_convertidos: popupConvertidos,
        popup_conversao: popup.length ? Math.round((popupConvertidos / popup.length) * 100) : 0,
        taxa_conclusao: nPedidos ? Math.round((concluidos.length / nPedidos) * 100) : 0,
        taxa_cancelamento: nPedidos ? Math.round((cancelados.length / nPedidos) * 100) : 0,
      };
      /* Gráficos: mensal / top / status / origem */
      const mensal: any[] = [];
      try {
        const m = await env.DB.prepare(`SELECT date(COALESCE(ts, created_at)) as mes, COUNT(*) as pedidos, COALESCE(SUM(COALESCE(total,0)),0) as receita FROM leads WHERE tenant_id = ? AND tipo = 'pedido' AND status = 'concluido' GROUP BY mes ORDER BY mes DESC LIMIT 12`).bind(slug).all<any>();
        for (const row of (m.results || [])) mensal.push({ label: String(row.mes || "").slice(5, 7) + "/" + String(row.mes || "").slice(0, 4), pedidos: Number(row.pedidos || 0), receita: Number(row.receita || 0) });
      } catch {}
      const top_produtos: any[] = [];
      try {
        const t = await env.DB.prepare(`SELECT li.nome_snapshot AS nome, SUM(li.qtd) AS qtd, SUM(COALESCE(li.preco_snapshot,0)*li.qtd) AS receita, COUNT(DISTINCT l.id) AS pedidos FROM lead_items li JOIN leads l ON l.id = li.lead_id WHERE l.tenant_id = ? AND l.tipo = 'pedido' AND l.status = 'concluido' GROUP BY li.nome_snapshot ORDER BY qtd DESC LIMIT 10`).bind(slug).all<any>();
        for (const row of (t.results || [])) top_produtos.push({ nome: row.nome, qtd: Number(row.qtd || 0), receita: Number(row.receita || 0), pedidos: Number(row.pedidos || 0) });
      } catch {}
      const status_atuais: any = {};
      try {
        const s = await env.DB.prepare(`SELECT status, COUNT(*) as n FROM leads WHERE tenant_id = ? AND tipo = 'pedido' GROUP BY status`).bind(slug).all<any>();
        for (const row of (s.results || [])) status_atuais[row.status] = Number(row.n || 0);
      } catch {}
      const origens: any[] = [];
      try {
        const o = await env.DB.prepare(`SELECT origem, COUNT(*) as pedidos FROM leads WHERE tenant_id = ? AND tipo = 'pedido' GROUP BY origem ORDER BY pedidos DESC`).bind(slug).all<any>();
        for (const row of (o.results || [])) if (row.origem) origens.push({ origem: row.origem, pedidos: Number(row.pedidos || 0) });
      } catch {}
      return json({ periodo, dias, kpis, mensal, top_produtos, status_atuais, origens });
    } catch (e: any) {
      return fail(`erro nos indicadores: ${e?.message || e}`, 500);
    }
  }

  /* leads / pedidos */
  if (path === "/api/admin/leads" && method === "GET") {
    try {
      const { results } = await env.DB.prepare(
        `SELECT * FROM leads
         WHERE tenant_id = ?
           AND tipo != 'interesse'
           AND lower(origem) != 'landing'
         ORDER BY COALESCE(ts, created_at) DESC LIMIT 500`,
      )
        .bind(slug)
        .all<any>();
      const leads = (results || []).map((l) => ({
        ...l,
        status: normStatus(l.status),
        ts: l.ts || l.created_at,
        itens: [] as any[],
      }));
      const ids = leads.map((l) => l.id);
      if (ids.length) {
        const marks = ids.map(() => "?").join(",");
        const items: any = await env.DB.prepare(
          `SELECT lead_id, product_id, nome_snapshot, qtd, preco_snapshot FROM lead_items WHERE lead_id IN (${marks})`,
        )
          .bind(...ids)
          .all<any>();
        const byLead = new Map<string, any[]>();
        for (const it of items.results || []) {
          const arr = byLead.get(it.lead_id) || [];
          arr.push({ id: it.product_id || it.nome_snapshot, nome: it.nome_snapshot, q: it.qtd, preco: it.preco_snapshot });
          byLead.set(it.lead_id, arr);
        }
        for (const l of leads) l.itens = byLead.get(l.id) || [];
      }
      return json(leads);
    } catch (e: any) {
      return fail(`erro ao listar leads: ${e?.message || e}`, 500);
    }
  }

  if (path.startsWith("/api/admin/leads/") && method === "PUT") {
    const id = decodeURIComponent(path.split("/").pop() || "");
    try {
      const sets: string[] = [];
      const vals: any[] = [];
      if (body.status !== undefined) {
        sets.push("status = ?");
        vals.push(normStatus(body.status));
      }
      if (body.motivo_cancelamento !== undefined) {
        sets.push("motivo_cancelamento = ?");
        vals.push(clean(body.motivo_cancelamento, 500));
      }
      if (body.pagamento !== undefined) {
        sets.push("pagamento = ?");
        vals.push(clean(body.pagamento, 40));
      }
      if (body.entrega !== undefined) {
        sets.push("entrega = ?");
        vals.push(clean(body.entrega, 40));
      }
      if (body.obs !== undefined) {
        sets.push("obs = ?");
        vals.push(clean(body.obs, 2000));
      }
      if (!sets.length) return json({ ok: true });
      vals.push(id, slug);
      await env.DB.prepare(`UPDATE leads SET ${sets.join(", ")} WHERE id = ? AND tenant_id = ?`)
        .bind(...vals)
        .run();
      return json({ ok: true, id });
    } catch (e: any) {
      return fail(`erro ao atualizar pedido: ${e?.message || e}`, 500);
    }
  }

  if (path.startsWith("/api/admin/leads/") && method === "DELETE") {
    const id = decodeURIComponent(path.split("/").pop() || "");
    await env.DB.batch([
      env.DB.prepare("DELETE FROM lead_items WHERE lead_id = ?").bind(id),
      env.DB.prepare("DELETE FROM leads WHERE id = ? AND tenant_id = ?").bind(id, slug),
    ]);
    return json({ ok: true, id });
  }

  /* clientes (agrupados por whatsapp) */
  if (path === "/api/admin/clientes" && method === "GET") {
    try {
      const { results } = await env.DB.prepare(
        `SELECT * FROM leads WHERE tenant_id = ? AND tipo != 'interesse' AND lower(origem) != 'landing'
         ORDER BY COALESCE(ts, created_at) DESC LIMIT 1000`,
      )
        .bind(slug)
        .all<any>();
      const notas: any = await env.DB.prepare("SELECT whatsapp, tags, notas FROM customers WHERE tenant_id = ?")
        .bind(slug)
        .all<any>();
      const extra = new Map<string, any>();
      for (const n of notas.results || []) extra.set(String(n.whatsapp), n);

      /* itens de cada pedido (histórico do cliente mostra as peças) */
      const itensPorLead = new Map<string, string[]>();
      const leadIds = (results || []).map((l) => l.id).filter(Boolean);
      if (leadIds.length) {
        try {
          const marks = leadIds.map(() => "?").join(",");
          const it: any = await env.DB.prepare(
            `SELECT lead_id, nome_snapshot, qtd FROM lead_items WHERE lead_id IN (${marks})`,
          )
            .bind(...leadIds)
            .all<any>();
          for (const row of it.results || []) {
            const arr = itensPorLead.get(row.lead_id) || [];
            arr.push(`${Number(row.qtd) || 1}x ${row.nome_snapshot}`);
            itensPorLead.set(row.lead_id, arr);
          }
        } catch {}
      }

      const groups = new Map<string, any>();
      for (const l of results || []) {
        const zap = digits(l.whatsapp);
        if (!zap) continue;
        let c = groups.get(zap);
        if (!c) {
          c = {
            whatsapp: zap,
            whatsapp_original: l.whatsapp,
            nome: "",
            pedidos: 0,
            concluidos: 0,
            cancelados: 0,
            total_gasto: 0,
            popup: false,
            origens: [] as string[],
            historico: [] as any[],
            primeira_interacao: l.ts || l.created_at,
            ultima_interacao: l.ts || l.created_at,
            tags: [] as string[],
            notas: "",
          };
          groups.set(zap, c);
        }
        if (!c.nome && l.nome) c.nome = l.nome;
        c.whatsapp_original = c.whatsapp_original || l.whatsapp;
        const quando = l.ts || l.created_at;
        if (quando && (!c.primeira_interacao || quando < c.primeira_interacao)) c.primeira_interacao = quando;
        if (quando && (!c.ultima_interacao || quando > c.ultima_interacao)) c.ultima_interacao = quando;
        const origem = String(l.origem || "");
        if (origem && !c.origens.includes(origem)) c.origens.push(origem);
        if (origem.toLowerCase().startsWith("popup")) c.popup = true;
        const st = normStatus(l.status);
        if (l.tipo === "pedido") {
          c.pedidos++;
          if (st === "concluido") {
            c.concluidos++;
            c.total_gasto += Number(l.total) || 0;
          }
          if (st === "cancelado") c.cancelados++;
        }
        c.historico.push({
          id: l.id,
          tipo: l.tipo,
          status: st,
          ts: quando,
          origem,
          total: l.total,
          itens: itensPorLead.get(l.id) || [],
        });
      }
      for (const [zap, c] of groups) {
        const ex = extra.get(zap);
        if (ex) {
          try {
            const tags = JSON.parse(ex.tags || "[]");
            c.tags = Array.isArray(tags) ? tags : [];
          } catch {
            c.tags = String(ex.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean);
          }
          c.notas = ex.notas || "";
        }
      }
      const clientes = [...groups.values()].sort((a, b) => String(b.ultima_interacao).localeCompare(String(a.ultima_interacao)));
      const popup = clientes.filter((c) => c.popup);
      const popupConvertidos = popup.filter((c) => c.pedidos > 0).length;
      return json({
        clientes,
        total: clientes.length,
        popup: popup.length,
        popup_convertidos: popupConvertidos,
        popup_conversao: popup.length ? Math.round((popupConvertidos / popup.length) * 100) : 0,
        mensagens_sem_whatsapp: (results || []).filter((l) => !digits(l.whatsapp)),
      });
    } catch (e: any) {
      return fail(`erro ao listar clientes: ${e?.message || e}`, 500);
    }
  }

  if (path.startsWith("/api/admin/clientes/") && method === "PUT") {
    const zap = decodeURIComponent(path.split("/").pop() || "");
    const tags = Array.isArray(body.tags) ? body.tags : String(body.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean);
    try {
      await env.DB.prepare(
        `INSERT INTO customers (tenant_id, whatsapp, tags, notas, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id, whatsapp) DO UPDATE SET tags = excluded.tags, notas = excluded.notas, updated_at = excluded.updated_at`,
      )
        .bind(slug, zap, JSON.stringify(tags), clean(body.notas, 4000), nowISO())
        .run();
      return json({ ok: true });
    } catch (e: any) {
      return fail(`erro ao salvar cliente: ${e?.message || e}`, 500);
    }
  }

  if (path.startsWith("/api/admin/clientes/") && method === "DELETE") {
    const zap = decodeURIComponent(path.split("/").pop() || "");
    await env.DB.prepare("DELETE FROM customers WHERE tenant_id = ? AND whatsapp = ?").bind(slug, zap).run();
    return json({ ok: true });
  }

  /* ================================================================ */
  /* super admin                                                      */
  /* ================================================================ */

  if (path.startsWith("/api/saas/")) {
    /* rotas públicas do SaaS */
    if (path === "/api/saas/info" && method === "GET") {
      const p = await getPlatform(env);
      return json({
        ok: true,
        versao: "2.0",
        plataforma: "Cloudflare Workers + D1 + R2 + KV",
        base_domain: p.dominio || url.hostname,
        ip_publico: "",
        caddy_cmd: "",
      });
    }
    if (path === "/api/saas/templates" && method === "GET") {
      return json({
        templates: [
          {
            id: "generico",
            nome: "Genérica",
            descricao: "Loja em branco para qualquer segmento.",
            segmento: "qualquer",
            tema: "artesanal",
            versao: "1.0",
            status: "estavel",
          },
          {
            id: "generico-hml",
            nome: "Genérica Homologação",
            descricao: "Design system neutro multi-segmento com 8 produtos de exemplo em 6 segmentos.",
            segmento: "qualquer",
            tema: "neutro-hml",
            versao: "1.0-hml",
            status: "homologacao",
          },
          {
            id: "religioso",
            nome: "Religioso & Artesanato",
            descricao: "Terços e devoções no tom do Ateliê, com 5 peças de exemplo.",
            segmento: "religioso",
            tema: "artesanal",
            versao: "1.0",
            status: "estavel",
          },
          {
            id: "doces",
            nome: "Doces & Festas",
            descricao: "Bolos, docinhos e encomendas para festas. Textos + 5 produtos de exemplo.",
            segmento: "doceria",
            tema: "moderno",
            versao: "1.0",
            status: "estavel",
          },
          {
            id: "vitrine-hml",
            nome: "Vitrine Express",
            descricao: "Varejo e moda com foco em conversão: catálogo, busca, filtros e carrinho.",
            segmento: "varejo / moda / acessórios",
            tema: "vitrine",
            versao: "1.0-hml",
            status: "homologacao",
          },
          {
            id: "editorial-hml",
            nome: "Editorial Casa",
            descricao: "Loja-conceito com storytelling, coleções e curadoria de objetos autorais.",
            segmento: "casa / lifestyle / marcas autorais",
            tema: "editorial",
            versao: "1.0-hml",
            status: "homologacao",
          },
          {
            id: "boutique-hml",
            nome: "Boutique Noir",
            descricao: "Loja premium com atendimento concierge e edições limitadas.",
            segmento: "joias / beleza / presentes",
            tema: "boutique",
            versao: "1.0-hml",
            status: "homologacao",
          },
        ],
      });
    }
    if (path === "/api/saas/plataforma" && method === "GET") {
      const p = await getPlatform(env);
      return json({
        nome: p.nome || "",
        dominio: p.dominio || "",
        whatsapp: p.whatsapp || "",
        whatsapp_tela: p.whatsapp_tela || "",
      });
    }

    const s = await requireSuper(request, env);
    if (!s) return fail("não autorizado", 401);

    if (path === "/api/saas/plataforma" && method === "PUT") {
      try {
        await env.DB.prepare(
          `UPDATE platform SET nome = ?, dominio = ?, whatsapp = ?, whatsapp_tela = ?, updated_at = ? WHERE id = 1`,
        )
          .bind(
            clean(body.nome, 90),
            clean(body.dominio, 160).replace(/^https?:\/\//i, "").replace(/\/$/, ""),
            clean(body.whatsapp, 30),
            clean(body.whatsapp_tela, 40),
            nowISO(),
          )
          .run();
        return json({ ok: true });
      } catch (e: any) {
        return fail(`erro ao salvar plataforma: ${e?.message || e}`, 500);
      }
    }

    /* ---------------- lojas / tenants ---------------- */
    if ((path === "/api/saas/lojas" || path === "/api/saas/tenants") && method === "GET") {
      try {
        const { results } = await env.DB.prepare("SELECT * FROM tenants ORDER BY created_at ASC").all<any>();
        const p = await getPlatform(env);
        const lojas = (results || []).map((t) => {
          const doc = digits(t.doc);
          return {
            id: t.id || t.slug,
            slug: t.slug,
            nome: t.nome || t.nome_fantasia || t.slug,
            nome_fantasia: t.nome_fantasia || t.nome || t.slug,
            email: t.email || "",
            dominio: t.dominio || "",
            zap: t.zap || "",
            zap_tela: t.zap_tela || "",
            porta: Number(t.porta || 0),
            plano: t.plano || "basico",
            status: t.status === "ativa" ? "ativa" : "suspensa",
            no_ar: !!t.no_ar,
            doc,
            doc_tipo: doc.length > 11 ? "cnpj" : "cpf",
            mensalidade: t.mensalidade != null ? Number(t.mensalidade) : MENSALIDADE[t.plano] ?? 0,
            vencimento: t.vencimento || "",
          };
        });
        if (path.endsWith("/tenants")) return json({ tenants: lojas });
        return json({ lojas, base_domain: p.dominio || url.hostname });
      } catch (e: any) {
        return fail(`erro ao listar lojas: ${e?.message || e}`, 500);
      }
    }

    if ((path === "/api/saas/lojas" || path === "/api/saas/tenants") && method === "POST") {
      try {
        const novoSslug = slugify(body.slug || body.nome, "");
        if (!novoSslug || novoSslug.length < 3) return fail("informe um slug com pelo menos 3 caracteres");
        const existe: any = await env.DB.prepare("SELECT slug FROM tenants WHERE slug = ?").bind(novoSslug).first();
        if (existe) return fail("já existe uma loja com esse slug", 409);

        const maxPorta: any = await env.DB.prepare("SELECT COALESCE(MAX(porta),3000) m FROM tenants").first();
        const porta = Number(maxPorta?.m || 3000) + 1;
        const plano = PLANOS.includes(String(body.plano)) ? String(body.plano) : "basico";
        const nome = clean(body.nome || body.nome_fantasia || novoSslug, 90);
        const zap = digits(body.zap || body.whatsapp);
        const doc = digits(body.doc);
        const dominio = clean(body.dominio, 160).replace(/^https?:\/\//i, "").replace(/\/$/, "");
        const status = "ativa";
        const id = novoSslug;
        const ts = nowISO();
        await env.DB.prepare(
          `INSERT INTO tenants
            (id, slug, nome, nome_fantasia, email, zap, zap_tela, instagram, dominio, doc, porta, plano, status, no_ar, mensalidade, vencimento, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        )
          .bind(
            id,
            novoSslug,
            nome,
            nome,
            clean(body.email, 160),
            zap,
            clean(body.zap_tela, 40),
            dominio,
            doc,
            porta,
            plano,
            status,
            MENSALIDADE[plano] ?? 0,
            addMonth(todayISO()),
            ts,
          )
          .run();

        const senha = String(body.senha_inicial || body.senha || MASTER);
        const email = clean(body.email, 160) || `admin@${novoSslug}.local`;
        await env.DB.prepare(
          `INSERT INTO users (id, tenant_id, email, senha_hash, papel) VALUES (?, ?, ?, ?, 'dono')`,
        )
          .bind(crypto.randomUUID(), novoSslug, email, await sha256(senha))
          .run();

        /* clona a configuração da loja padrão e ajusta nome/zap */
        const base = await getConfig(env, DEFAULT_TENANT);
        const cfg = JSON.parse(JSON.stringify(base || {}));
        cfg.geral = cfg.geral || {};
        const nomeAntigo = String(cfg.geral.nome || "");
        cfg.geral.nome = nome;
        if (nomeAntigo && cfg.geral.title) {
          cfg.geral.title = String(cfg.geral.title).split(nomeAntigo).join(nome);
        }
        if (zap) cfg.geral.zap = zap;
        if (body.instagram) cfg.geral.instagram = clean(body.instagram, 200);
        await saveConfig(env, novoSslug, cfg);

        /* clona catálogo da loja padrão (ids prefixados para não colidir) */
        try {
          const { results } = await env.DB.prepare("SELECT * FROM products WHERE tenant_id = ?").bind(DEFAULT_TENANT).all<any>();
          if (results?.length) {
            await env.DB.batch(
              results.map((p) =>
                env.DB.prepare(
                  `INSERT INTO products (id, tenant_id, nome, cat, colecao, preco, ordem, tag, selo, desc, foto, video, ativo)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                ).bind(
                  `${novoSslug}-${p.id}`,
                  novoSslug,
                  p.nome,
                  p.cat,
                  p.colecao,
                  p.preco,
                  p.ordem,
                  p.tag,
                  p.selo,
                  p.desc,
                  p.foto,
                  p.video,
                  p.ativo,
                ),
              ),
            );
          }
        } catch {}

        return json({ ok: true, slug: novoSslug, porta, plano, senha_inicial: senha }, 201);
      } catch (e: any) {
        return fail(`erro ao criar loja: ${e?.message || e}`, 500);
      }
    }

    /* ações por slug: /api/saas/lojas/{slug}... */
    if ((path.startsWith("/api/saas/lojas/") || path.startsWith("/api/saas/tenants/")) && /^\/api\/saas\/(lojas|tenants)\/[^/]+/.test(path)) {
      const rest = path.replace(/^\/api\/saas\/(lojas|tenants)\//, "");
      const parts = rest.split("/");
      const alvoSlug = decodeURIComponent(parts[0] || "");
      const acao = parts[1] || "";
      const t: any = await getTenant(env, alvoSlug);
      if (!t) return fail("loja não encontrada", 404);

      if (acao === "" && method === "PUT") {
        try {
          const nome = body.nome !== undefined ? clean(body.nome, 90) : t.nome || t.nome_fantasia;
          const zap = body.zap !== undefined ? digits(body.zap) : t.zap;
          await env.DB.prepare(
            `UPDATE tenants SET nome = ?, nome_fantasia = ?, zap = ?, zap_tela = ?, email = ?, dominio = ?, doc = ?, plano = ?, status = ?
             WHERE slug = ?`,
          )
            .bind(
              nome,
              nome,
              zap,
              body.zap_tela !== undefined ? clean(body.zap_tela, 40) : t.zap_tela || "",
              body.email !== undefined ? clean(body.email, 160) : t.email || "",
              body.dominio !== undefined ? clean(body.dominio, 160).replace(/^https?:\/\//i, "").replace(/\/$/, "") : t.dominio || "",
              body.doc !== undefined ? digits(body.doc) : t.doc || "",
              body.plano !== undefined && PLANOS.includes(String(body.plano)) ? String(body.plano) : t.plano,
              body.status !== undefined ? (String(body.status) === "ativa" || String(body.status) === "ativo" ? "ativa" : "suspensa") : t.status,
              alvoSlug,
            )
            .run();
          /* mantém config sincronizada */
          try {
            const cfg = await getConfig(env, alvoSlug);
            cfg.geral = cfg.geral || {};
            cfg.geral.nome = nome;
            if (zap) cfg.geral.zap = zap;
            await saveConfig(env, alvoSlug, cfg);
          } catch {}
          return json({ ok: true, slug: alvoSlug });
        } catch (e: any) {
          return fail(`erro ao atualizar loja: ${e?.message || e}`, 500);
        }
      }

      if (acao === "" && method === "DELETE") {
        try {
          await env.DB.batch([
            env.DB.prepare("DELETE FROM lead_items WHERE lead_id IN (SELECT id FROM leads WHERE tenant_id = ?)").bind(alvoSlug),
            env.DB.prepare("DELETE FROM leads WHERE tenant_id = ?").bind(alvoSlug),
            env.DB.prepare("DELETE FROM products WHERE tenant_id = ?").bind(alvoSlug),
            env.DB.prepare("DELETE FROM users WHERE tenant_id = ?").bind(alvoSlug),
            env.DB.prepare("DELETE FROM tenant_config WHERE tenant_id = ?").bind(alvoSlug),
            env.DB.prepare("DELETE FROM payments WHERE tenant_id = ?").bind(alvoSlug),
            env.DB.prepare("DELETE FROM customers WHERE tenant_id = ?").bind(alvoSlug),
            env.DB.prepare("DELETE FROM tenants WHERE slug = ?").bind(alvoSlug),
          ]);
          return json({ ok: true, slug: alvoSlug });
        } catch (e: any) {
          return fail(`erro ao remover loja: ${e?.message || e}`, 500);
        }
      }

      if (acao === "toggle" && method === "POST") {
        const novo = t.status === "ativa" ? "suspensa" : "ativa";
        await env.DB.prepare("UPDATE tenants SET status = ? WHERE slug = ?").bind(novo, alvoSlug).run();
        return json({ ok: true, slug: alvoSlug, status: novo });
      }

      if ((acao === "ligar" || acao === "desligar") && method === "POST") {
        const noAr = acao === "ligar" ? 1 : 0;
        await env.DB.prepare("UPDATE tenants SET no_ar = ? WHERE slug = ?").bind(noAr, alvoSlug).run();
        return json({ ok: true, slug: alvoSlug, no_ar: noAr, msg: noAr ? "Loja no ar." : "Loja parada." });
      }

      if (acao === "power" && method === "POST") {
        const noAr = body.no_ar != null ? (body.no_ar ? 1 : 0) : t.no_ar ? 0 : 1;
        await env.DB.prepare("UPDATE tenants SET no_ar = ? WHERE slug = ?").bind(noAr, alvoSlug).run();
        return json({ ok: true, no_ar: noAr });
      }

      if (acao === "reset-senha" && method === "POST") {
        const token = crypto.randomUUID().replace(/-/g, "");
        await env.SESSION_KV.put(`reset:${token}`, alvoSlug, { expirationTtl: 60 * 30 });
        return json({ ok: true, token, slug: alvoSlug, expira_em: 1800 });
      }

      if (acao === "logo" && method === "POST") {
        try {
          const nome = String(body.nome || "logo.png");
          const parsed = dataUrl(body.dados);
          if (!parsed) return fail("dados inválidos");
          const fileName = safeFileName(nome, "png");
          await env.IMAGES.put(`img/${fileName}`, parsed.bytes as any, { httpMetadata: { contentType: parsed.mime } });
          const urlImg = `/img/${fileName}`;
          const cfg = await getConfig(env, alvoSlug);
          cfg.visual = cfg.visual || {};
          cfg.visual.logo = urlImg;
          await saveConfig(env, alvoSlug, cfg);
          return json({ ok: true, logo: urlImg, url: urlImg, arquivo: fileName });
        } catch (e: any) {
          return fail(`erro no logo: ${e?.message || e}`, 500);
        }
      }

      if (acao === "financeiro" && method === "PUT") {
        const mensalidade = body.mensalidade != null ? Number(body.mensalidade) || 0 : t.mensalidade;
        const vencimento = body.vencimento !== undefined ? clean(body.vencimento, 10) : t.vencimento;
        const plano = body.plano && PLANOS.includes(String(body.plano)) ? String(body.plano) : t.plano;
        await env.DB.prepare("UPDATE tenants SET mensalidade = ?, vencimento = ?, plano = ? WHERE slug = ?")
          .bind(mensalidade, vencimento, plano, alvoSlug)
          .run();
        return json({ ok: true });
      }

      return fail(`ação '${acao || method}' não suportada`, 404);
    }

    /* ---------------- interessados da landing ---------------- */
    if (path === "/api/saas/interesses" && method === "GET") {
      try {
        const { results } = await env.DB.prepare(
          `SELECT id, COALESCE(ts, created_at) AS ts, nome, whatsapp, segmento, plano, status, origem
           FROM leads
           WHERE tipo = 'interesse' OR lower(origem) = 'landing'
           ORDER BY COALESCE(ts, created_at) DESC LIMIT 500`,
        ).all<any>();
        return json(
          (results || []).map((l) => ({
            id: l.id,
            ts: l.ts,
            nome: l.nome || "",
            whatsapp: l.whatsapp || "",
            segmento: l.segmento || "",
            plano: l.plano || "",
            status: l.status || "novo",
            origem: l.origem || "landing",
          })),
        );
      } catch (e: any) {
        return fail(`erro ao listar interessados: ${e?.message || e}`, 500);
      }
    }

    if (path.startsWith("/api/saas/interesses/") && method === "PUT") {
      const id = decodeURIComponent(path.split("/").pop() || "");
      await env.DB.prepare("UPDATE leads SET status = ? WHERE id = ?").bind(clean(body.status || "novo", 30), id).run();
      return json({ ok: true, id });
    }

    if (path.startsWith("/api/saas/interesses/") && method === "DELETE") {
      const id = decodeURIComponent(path.split("/").pop() || "");
      await env.DB.prepare("DELETE FROM leads WHERE id = ?").bind(id).run();
      return json({ ok: true, id });
    }

    /* ---------------- relatório consolidado ---------------- */
    if (path === "/api/saas/resumo" && method === "GET") {
      try {
        const { results: tenants } = await env.DB.prepare("SELECT * FROM tenants ORDER BY created_at ASC").all<any>();
        const desde = new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10);
        const { results: leads } = await env.DB.prepare(
          `SELECT tenant_id, tipo, status, total, origem, COALESCE(ts, created_at) AS quando
           FROM leads WHERE date(COALESCE(ts, created_at)) >= date(?)`,
        )
          .bind(desde)
          .all<any>();
        const { results: prodCounts } = await env.DB.prepare(
          "SELECT tenant_id, COUNT(*) c FROM products WHERE ativo = 1 GROUP BY tenant_id",
        ).all<any>();
        const prodMap = new Map<string, number>();
        for (const p of prodCounts || []) prodMap.set(String(p.tenant_id), Number(p.c || 0));

        const lojas = (tenants || []).map((t) => {
          const ls = (leads || []).filter((l) => l.tenant_id === t.slug);
          const pedidos = ls.filter((l) => l.tipo === "pedido");
          const validos = pedidos.filter((l) => normStatus(l.status) !== "cancelado");
          const receita = validos.reduce((a, l) => a + (Number(l.total) || 0), 0);
          return {
            slug: t.slug,
            nome: t.nome || t.nome_fantasia || t.slug,
            pedidos: pedidos.length,
            receita,
            no_ar: !!t.no_ar,
            novos: pedidos.filter((l) => normStatus(l.status) === "novo").length,
            status: t.status === "ativa" ? "ativa" : "suspensa",
            plano: t.plano || "",
            produtos: prodMap.get(String(t.slug)) || 0,
            contatos: ls.filter((l) => l.tipo === "contato").length,
          };
        });

        const pedidos = (leads || []).filter((l) => l.tipo === "pedido");
        const pedidosValidos = pedidos.filter((l) => normStatus(l.status) !== "cancelado");
        const receita = pedidosValidos.reduce((a, l) => a + (Number(l.total) || 0), 0);
        const serie: any[] = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400000);
          const dia = d.toISOString().slice(0, 10);
          const doDia = pedidos.filter((l) => String(l.quando || "").slice(0, 10) === dia);
          serie.push({
            dia,
            pedidos: doDia.length,
            receita: doDia
              .filter((l) => normStatus(l.status) !== "cancelado")
              .reduce((a, l) => a + (Number(l.total) || 0), 0),
          });
        }

        let top_produtos: any[] = [];
        try {
          const r: any = await env.DB.prepare(
            `SELECT li.nome_snapshot AS nome, COALESCE(SUM(li.qtd),0) AS qtd,
                    COALESCE(SUM(COALESCE(li.preco_snapshot,0) * li.qtd),0) AS receita
             FROM lead_items li JOIN leads l ON l.id = li.lead_id
             WHERE l.tipo = 'pedido' AND l.status != 'cancelado'
               AND date(COALESCE(l.ts,l.created_at)) >= date(?)
             GROUP BY li.nome_snapshot ORDER BY qtd DESC LIMIT 5`,
          )
            .bind(desde)
            .all<any>();
          top_produtos = (r.results || []).map((p: any) => ({
            nome: p.nome,
            qtd: Number(p.qtd || 0),
            receita: Number(p.receita || 0),
          }));
        } catch {}

        const interessados: any = await env.DB.prepare(
          "SELECT COUNT(*) c FROM leads WHERE tipo = 'interesse' OR lower(origem) = 'landing'",
        ).first();

        return json({
          totais: {
            receita,
            pedidos: pedidos.length,
            ticket_medio: pedidos.length ? receita / pedidos.length : 0,
            novos: pedidos.filter((l) => normStatus(l.status) === "novo").length,
            interessados: Number(interessados?.c || 0),
            contatos: (leads || []).filter((l) => l.tipo === "contato").length,
          },
          serie,
          top_produtos,
          lojas,
          gerado_em: nowISO(),
        });
      } catch (e: any) {
        return fail(`erro no relatório: ${e?.message || e}`, 500);
      }
    }

    /* ---------------- financeiro ---------------- */
    if (path === "/api/saas/financeiro" && method === "GET") {
      try {
        const { results: tenants } = await env.DB.prepare("SELECT * FROM tenants ORDER BY created_at ASC").all<any>();
        const { results: pags } = await env.DB.prepare("SELECT tenant_id, valor, data FROM payments").all<any>();
        const hoje = todayISO();
        const mes = monthISO();
        let mrr = 0;
        let recebidoMes = 0;
        let atrasados = 0;
        let semCobranca = 0;
        for (const p of pags || []) {
          if (String(p.data || "").startsWith(mes)) recebidoMes += Number(p.valor) || 0;
        }
        const lojas = (tenants || []).map((t) => {
          const mensalidade = t.mensalidade != null ? Number(t.mensalidade) : MENSALIDADE[t.plano] ?? 0;
          const venc = t.vencimento || "";
          let status = "em_dia";
          let dias: number | null = null;
          if (!mensalidade) {
            status = "sem_cobranca";
            semCobranca++;
          } else if (!venc) {
            status = "sem_vencimento";
          } else {
            dias = diffDays(venc, hoje);
            if (dias == null) status = "sem_vencimento";
            else if (dias < 0) {
              status = "atrasado";
              atrasados++;
            } else if (dias <= 7) status = "vence_proximo";
            else status = "em_dia";
          }
          if (t.status === "ativa" && mensalidade > 0) mrr += mensalidade;
          return {
            slug: t.slug,
            nome: t.nome || t.nome_fantasia || t.slug,
            plano: t.plano || "",
            mensalidade,
            vencimento: venc,
            n_pagamentos: (pags || []).filter((p) => p.tenant_id === t.slug).length,
            status,
            dias,
          };
        });
        return json({
          lojas,
          resumo: { mrr, recebido_mes: recebidoMes, atrasados, sem_cobranca: semCobranca, mes },
        });
      } catch (e: any) {
        return fail(`erro no financeiro: ${e?.message || e}`, 500);
      }
    }

    if (path.startsWith("/api/saas/financeiro/")) {
      const parts = path.replace("/api/saas/financeiro/", "").split("/");
      const alvoSlug = decodeURIComponent(parts[0] || "");
      const t: any = await getTenant(env, alvoSlug);
      if (!t) return fail("loja não encontrada", 404);

      if (parts.length === 1 && method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT id, data, competencia, valor, meio, status, obs FROM payments WHERE tenant_id = ? ORDER BY data DESC",
        )
          .bind(alvoSlug)
          .all<any>();
        return json({ loja: alvoSlug, pagamentos: results || [] });
      }

      if (parts.length === 1 && method === "PUT") {
        const mensalidade = body.mensalidade != null ? Number(body.mensalidade) || 0 : t.mensalidade;
        const plano = body.plano && PLANOS.includes(String(body.plano)) ? String(body.plano) : t.plano;
        const vencimento = body.vencimento !== undefined ? clean(body.vencimento, 10) : t.vencimento;
        await env.DB.prepare("UPDATE tenants SET mensalidade = ?, plano = ?, vencimento = ? WHERE slug = ?")
          .bind(mensalidade, plano, vencimento, alvoSlug)
          .run();
        return json({ ok: true, slug: alvoSlug });
      }

      if (parts.length === 2 && parts[1] === "pagamentos" && method === "POST") {
        const valor = Number(body.valor) || 0;
        const data = clean(body.data, 10) || todayISO();
        const competencia = clean(body.competencia, 7) || data.slice(0, 7);
        const id = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO payments (id, tenant_id, valor, competencia, data, meio, obs, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(id, alvoSlug, valor, competencia, data, clean(body.meio, 40), clean(body.obs, 500), nowISO())
          .run();
        let venc = t.vencimento || "";
        if (body.adiantar_vencimento) {
          const base = venc && venc >= todayISO() ? venc : todayISO();
          venc = addMonth(base);
          await env.DB.prepare("UPDATE tenants SET vencimento = ? WHERE slug = ?").bind(venc, alvoSlug).run();
        }
        return json({ ok: true, id, vencimento: venc });
      }

      if (parts.length === 3 && parts[1] === "pagamentos" && method === "DELETE") {
        const id = decodeURIComponent(parts[2]);
        await env.DB.prepare("DELETE FROM payments WHERE id = ? AND tenant_id = ?").bind(id, alvoSlug).run();
        return json({ ok: true, id });
      }
    }

    /* ---------------- painel / receita / dns ---------------- */
    if (path === "/api/saas/painel" && method === "GET") {
      const total: any = await env.DB.prepare("SELECT COUNT(*) c FROM tenants").first();
      const ativas: any = await env.DB.prepare("SELECT COUNT(*) c FROM tenants WHERE status = 'ativa'").first();
      const noAr: any = await env.DB.prepare("SELECT COUNT(*) c FROM tenants WHERE no_ar = 1").first();
      return json({
        lojas: Number(total?.c || 0),
        ativas: Number(ativas?.c || 0),
        no_ar: Number(noAr?.c || 0),
        ok: true,
      });
    }

    if (path.startsWith("/api/saas/receita/") && method === "GET") {
      const alvoSlug = decodeURIComponent(path.split("/").pop() || "");
      const mes = monthISO();
      const r: any = await env.DB.prepare(
        "SELECT COALESCE(SUM(valor),0) total FROM payments WHERE tenant_id = ? AND data LIKE ?",
      )
        .bind(alvoSlug, `${mes}%`)
        .first();
      const t: any = await getTenant(env, alvoSlug);
      const base = await baseDomain(env, url);
      const noWildcard = base.endsWith(".workers.dev");
      const cnameAlvo = noWildcard ? base : `${alvoSlug}.${base}`;
      const alvoResolve = noWildcard ? true : (await doh(cnameAlvo)).length > 0;
      return json({
        ok: true,
        slug: alvoSlug,
        mes,
        receita: Number(r?.total || 0),
        cname_alvo: cnameAlvo,
        cname_ok: alvoResolve,
        dominio: t?.dominio || "",
        base_domain: base,
        aviso: noWildcard
          ? "Sem wildcard DNS configurado: use o endereço do Worker com ?loja= ou aponte um domínio próprio."
          : alvoResolve
            ? ""
            : `O subdomínio ${cnameAlvo} ainda não resolve. Configure o registro * (wildcard) no DNS de ${base}.`,
      });
    }

    if (path.startsWith("/api/saas/dns/") && method === "GET") {
      const alvo = decodeURIComponent(path.split("/").pop() || "").toLowerCase();
      const dom = alvo.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").replace(/\.$/, "");
      if (!dom || !dom.includes(".")) return fail("domínio inválido");
      const t: any = await env.DB.prepare("SELECT * FROM tenants WHERE lower(dominio) = ? LIMIT 1").bind(dom).first();
      const base = await baseDomain(env, url);
      const noWildcard = base.endsWith(".workers.dev");
      const esperado = t ? (noWildcard ? base : `${t.slug}.${base}`) : base;
      const [raiz, www, alvoDns] = await Promise.all([doh(dom), doh(`www.${dom}`), doh(esperado)]);
      const alvoSet = new Set(alvoDns.map((v) => v.toLowerCase()));
      const aponta = (arr: string[]) =>
        arr.some((v) => {
          const s = v.toLowerCase();
          return alvoSet.has(s) || s === esperado.toLowerCase() || s.endsWith(`.${esperado.toLowerCase()}`);
        });
      const okRaiz = raiz.length > 0 && alvoSet.size > 0 && aponta(raiz);
      const okWww = www.length > 0 && alvoSet.size > 0 && aponta(www);
      return json({
        ok: okRaiz && okWww,
        ok_raiz: okRaiz,
        ok_www: okWww,
        dominio: dom,
        slug: t?.slug || "",
        esperado,
        base_domain: base,
        resolvido: { [dom]: raiz, [`www.${dom}`]: www },
        resolvido_alvo: alvoDns,
        proximo_passo: okRaiz && okWww
          ? "DNS propagado. Cadastre o domínio no Cloudflare (Workers > Custom Domains) para emitir o certificado."
          : alvoSet.size === 0
            ? `O destino ${esperado} ainda não resolve. Configure antes o wildcard/base da plataforma no Cloudflare.`
            : `Crie no provedor de DNS: @ tipo CNAME → ${esperado} e www tipo CNAME → ${esperado}. A propagação leva de minutos a algumas horas.`,
      });
    }

    return fail("rota não encontrada", 404);
  }

  return fail("rota não encontrada", 404);
}
