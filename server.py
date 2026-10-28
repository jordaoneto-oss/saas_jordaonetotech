#!/usr/bin/env python3
# Super Loja (Jordao Neto Tech) — servidor multi-tenant (Fase 1.5, file-based)
# Retrocompatível: a loja atual (raiz: config.json, js/catalog.json, data/)
# tenant padrão genérico. Novas lojas vivem em tenants/<slug>/.
#
# Resolução de tenant (ordem):
#   1) query ?loja=<slug>   2) header X-Tenant
#   3) subdomínio <slug>.plataforma.jordaonetotech.com.br / <slug>.localhost
#   4) domínio custom (saas/tenants.json -> dominio_custom)
#   5) DEFAULT_TENANT (env) / "default-tenant"
#
# Uso: python3 server.py [--host 127.0.0.1] [--port 8324]
# Env: DEFAULT_TENANT, SEED_ADMIN_PASS, SAAS_ADMIN_TOKEN, SHOW_DEFAULT_PASS
import base64
import hashlib
import gzip
import hmac
import json
import os
import re
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import unicodedata
import urllib.parse
from datetime import date, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:
    import fcntl  # POSIX: lock de escrita nos JSONs
    TEM_FCNTL = True
except ImportError:
    TEM_FCNTL = False

def _carregar_env():
    """Carrega .env (KEY=VALUE) sem sobrescrever variáveis já definidas no ambiente."""
    caminho = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    try:
        with open(caminho, encoding="utf-8") as f:
            for linha in f:
                linha = linha.strip()
                if not linha or linha.startswith("#") or "=" not in linha:
                    continue
                chave, valor = linha.split("=", 1)
                chave = chave.strip()
                if chave and chave not in os.environ:
                    os.environ[chave] = valor.strip().strip('"').strip("'")
    except OSError:
        pass


_carregar_env()

BASE = os.path.dirname(os.path.abspath(__file__))
MODO_CLONE = os.path.isfile(os.path.join(BASE, ".clone-saas")) or \
    os.path.basename(os.path.dirname(BASE)) == "lojas"
MAIN_URL = os.environ.get("MAIN_URL", "https://app.seusaas.com.br").rstrip("/")
PUBLIC_IP = os.environ.get("PUBLIC_IP", "").strip()
BASE_DOMAIN = os.environ.get("BASE_DOMAIN", "plataforma.jordaonetotech.com.br").strip().lower() or "plataforma.jordaonetotech.com.br"
TENANTS_DIR = os.path.join(BASE, "tenants")
REGISTRY = os.path.join(BASE, "saas", "tenants.json")

# Registro único de tenants (todos na pasta tenants/, sem raiz privilegiada)
ROOT_CONFIG = os.path.join(BASE, "config.json")
ROOT_CATALOGO = os.path.join(BASE, "js", "catalog.json")
ROOT_DATA = os.path.join(BASE, "data")
ROOT_LEADS = os.path.join(ROOT_DATA, "leads.json")
ROOT_ADMIN = os.path.join(ROOT_DATA, "admin.json")
ROOT_CLIENTES = os.path.join(ROOT_DATA, "clientes.json")

# Ciclo de vida do pedido. "atendido" é legado e vale como concluído.
STATUS_PEDIDO = ("novo", "em_producao", "concluido", "cancelado")
STATUS_LEGADO = {"atendido": "concluido", "em produção": "em_producao",
                 "em producao": "em_producao", "concluído": "concluido",
                 "cancelado": "cancelado"}
PAGAMENTOS = ("pendente", "pago", "parcial", "reembolsado")
ENTREGAS = ("", "retirada", "envio")

# DEFAULT_TENANT agora vem do primeiro tenant ativo no registry
DEFAULT_TENANT = os.environ.get("DEFAULT_TENANT", "default-tenant")
SEED_ADMIN_PASS = os.environ.get("SEED_ADMIN_PASS", "atelie123")
SHOW_DEFAULT_PASS = os.environ.get("SHOW_DEFAULT_PASS", "1") == "1"
SAAS_ADMIN_TOKEN = os.environ.get("SAAS_ADMIN_TOKEN", "")
SAAS_ADMIN_PASS = os.environ.get("SAAS_ADMIN_PASS", "") or SEED_ADMIN_PASS
# token efetivo: usa o configurado no ambiente ou um efêmero (homologação local)
SAAS_TOKEN = SAAS_ADMIN_TOKEN or secrets.token_urlsafe(32)
PLANOS_SAAS = {
    "basico": {"nome": "Básico", "preco": 39.9},
    "pro": {"nome": "Profissional", "preco": 69.9},
    "enterprise": {"nome": "Enterprise", "preco": 99.9},
}
SESSAO_TTL = 12 * 3600  # 12h

os.makedirs(TENANTS_DIR, exist_ok=True)
os.makedirs(ROOT_DATA, exist_ok=True)


def ler(arq, padrao):
    try:
        with open(arq, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return padrao


def gravar(arq, obj):
    os.makedirs(os.path.dirname(arq), exist_ok=True)
    tmp = arq + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        if TEM_FCNTL:
            try:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            except Exception:
                pass
        json.dump(obj, f, ensure_ascii=False, indent=2)
    os.replace(tmp, arq)


def hx(s):
    return hashlib.sha256(s.encode()).hexdigest()


PBKDF2_ITER = 200_000


def hash_senha(pwd):
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", str(pwd).encode(), salt, PBKDF2_ITER)
    return f"pbkdf2${PBKDF2_ITER}${salt.hex()}${dk.hex()}"


def confere_senha(pwd, stored):
    import hmac
    try:
        if isinstance(stored, str) and stored.startswith("pbkdf2$"):
            _, it, salt, dk = stored.split("$")
            calc = hashlib.pbkdf2_hmac("sha256", str(pwd).encode(),
                                       bytes.fromhex(salt), int(it)).hex()
            return hmac.compare_digest(calc, dk)
        return hmac.compare_digest(hx(str(pwd)), str(stored))
    except Exception:
        return False


def precisa_upgrade(stored):
    return not (isinstance(stored, str) and stored.startswith("pbkdf2$"))


def seo_base(slug, headers):
    """URL canônica desta loja: MAIN_URL p/ principal; Host real p/ demais."""
    env = os.environ.get("SEO_BASE", "").rstrip("/")
    if env:
        return env
    if not MODO_CLONE and slug == tenant_default():
        return MAIN_URL
    host = (headers.get("Host", "") or "").split(":")[0].strip() or "localhost"
    proto = (headers.get("X-Forwarded-Proto", "") or "http").split(",")[0].strip() or "http"
    return f"{proto}://{host}"


def seo_vars(slug, headers):
    cfg = ler(tpaths(slug)["config"], {})
    g = cfg.get("geral", {}) if isinstance(cfg, dict) else {}
    base = seo_base(slug, headers)

    def limpo(v):
        return re.sub(r"\s+", " ", str(v or "")).replace("\\", "").replace('"', "").strip()

    nome = limpo(g.get("nome") or "Minha loja")
    logo = ""
    vis = cfg.get("visual", {}) if isinstance(cfg, dict) else {}
    cand = str(vis.get("logo") or "").lstrip("/")
    if cand:
        if not re.search(r"\.(webp|png|jpe?g|svg)$", cand, re.I):
            cand += ".webp"
        for d in ([tpaths(slug)["imgdir"]] if not is_default(slug) else []) + \
                 [os.path.join(BASE, "img")]:
            full = os.path.normpath(os.path.join(d, cand))
            if full.startswith(os.path.normpath(d)) and os.path.isfile(full):
                logo = f"{base}/img/{cand}"
                break
    if not logo:
        for d in ([tpaths(slug)["imgdir"]] if not is_default(slug) else []) + \
                 [os.path.join(BASE, "img")]:
            if os.path.isfile(os.path.join(d, "logo.webp")):
                logo = f"{base}/img/logo.webp"
                break
    if not logo:
        logo = f"{base}/img/placeholder.png"
    zap = "+" + re.sub(r"\D", "", str(g.get("zap") or ""))
    insta = str(g.get("instagram") or "").strip()
    return {
        "{{SEO_URL}}": base,
        "{{SEO_TITLE}}": limpo(g.get("title") or nome),
        "{{SEO_NAME}}": nome,
        "{{SEO_DESC}}": limpo(g.get("descricao") or nome),
        "{{SEO_IMAGE}}": logo,
        "{{SEO_PHONE}}": zap if len(zap) > 5 else "",
        "{{SEO_INSTAGRAM}}": f'"{insta}"' if insta else "",
        "{{SEO_PRODUTO}}": limpo(g.get("produto") or "Produto em destaque"),
        "{{SEO_CATEGORIA}}": limpo(g.get("categoria") or "Produtos"),
    }


LINHAS_NOME = {
    "essencial": "Essencial", "classico": "Clássica", "premium": "Premium",
    "luxo": "Luxo", "infantil": "Para os pequenos", "carro": "Para o carro",
}


def rotulo_linha(cat):
    c = str(cat or "").strip()
    if c in LINHAS_NOME:
        return LINHAS_NOME[c]
    return c.replace("-", " ").replace("_", " ").strip().capitalize() or "Geral"


def llms_txt(slug, headers):
    """Resumo em Markdown para assistentes de IA (padrão llms.txt).

    O catálogo da vitrine é renderizado por JavaScript, invisível a crawlers;
    aqui vai o conteúdo essencial em texto puro, sempre atualizado por loja.
    """
    cfg = ler(tpaths(slug)["config"], {})
    g = cfg.get("geral", {}) if isinstance(cfg, dict) else {}
    base = seo_base(slug, headers)

    def limpo(v):
        return re.sub(r"\s+", " ", str(v or "")).replace("\\", "").strip()

    nome = limpo(g.get("nome") or "Minha loja")
    tagline = limpo(g.get("tagline") or "")
    desc = limpo(g.get("descricao") or nome)
    zap = re.sub(r"\D", "", str(g.get("zap") or ""))
    zap_tela = limpo(g.get("zap_tel") or "")
    insta = str(g.get("instagram") or "").strip()
    prazo = limpo(g.get("prazo_producao") or "")

    prods = ler(tpaths(slug)["catalogo"], [])
    if not isinstance(prods, list):
        prods = []

    def preco_fmt(p):
        v = p.get("preco")
        if isinstance(v, (int, float)):
            return "R$ " + f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return "Sob consulta"

    linhas = []
    linhas.append(f"# {nome}" + (f" — {tagline}" if tagline else ""))
    linhas.append("")
    linhas.append(f"> {desc}")
    linhas.append("")
    linhas.append(f"- Site: {base}/")
    if zap:
        linhas.append(f"- WhatsApp: https://wa.me/{zap}" +
                      (f" ({zap_tela})" if zap_tela else ""))
    if insta:
        linhas.append(f"- Instagram: {insta}")
    if prazo:
        linhas.append(f"- Prazo: {prazo}")
    linhas.append("- Área de entrega: todo o Brasil")
    linhas.append("")
    linhas.append("## Como comprar")
    linhas.append("")
    linhas.append("1. Abra o catálogo no site e use a busca ou os filtros por linha.")
    linhas.append("2. Toque em Adicionar nas peças desejadas.")
    linhas.append("3. Feche a lista pelo botão de WhatsApp: o pedido chega pronto para a loja.")
    linhas.append("4. Peças sem preço exibido são feitas sob encomenda: chame no WhatsApp.")
    linhas.append("")
    grupos = {}
    for p in prods:
        if not isinstance(p, dict):
            continue
        grupos.setdefault(str(p.get("cat") or "geral"), []).append(p)
    if grupos:
        linhas.append("## Linhas do catálogo")
        linhas.append("")
        for cat in sorted(grupos, key=lambda c: (-len(grupos[c]), rotulo_linha(c))):
            linhas.append(f"- {rotulo_linha(cat)}: {len(grupos[cat])} peças")
        linhas.append("")
    linhas.append(f"## Catálogo completo ({len(prods)} peças, preços em reais)")
    linhas.append("")
    for p in prods:
        if not isinstance(p, dict):
            continue
        partes = [f"- {limpo(p.get('nome') or 'Peça')}", preco_fmt(p)]
        extra = " · ".join(x for x in (
            rotulo_linha(p.get("cat")),
            limpo(p.get("colecao") or ""),
            limpo(p.get("tag") or ""),
        ) if x)
        if extra:
            partes.append(extra)
        d = limpo(p.get("desc") or "")
        if d:
            partes.append(d[:220])
        linhas.append(" — ".join(partes))
    linhas.append("")
    linhas.append("## Perguntas frequentes")
    linhas.append("")
    linhas.append("- Fazem personalização (cor, modelo, nome ou medida)? Sim, pelo WhatsApp.")
    linhas.append(f"- Qual o prazo? {prazo or 'Consulte no WhatsApp.'}")
    linhas.append("- Enviam para todo o Brasil? Sim, pelos Correios após a produção.")
    linhas.append("- E se a peça que quero não tem preço no site? É feita sob encomenda: peça o orçamento no WhatsApp.")
    linhas.append("")
    return "\n".join(linhas).encode()


# ---------- tenants ----------
def carregar_registry():
    reg = ler(REGISTRY, None)
    if not isinstance(reg, dict) or "tenants" not in reg:
        reg = {"default": DEFAULT_TENANT,
               "tenants": [{"slug": DEFAULT_TENANT, "nome": "Loja padrão",
                             "email": "", "zap": "", "plano": "pro",
                             "status": "ativo", "dominio_custom": "",
                             "created_at": time.strftime("%Y-%m-%dT%H:%M:%S")}]}
        gravar(REGISTRY, reg)
    return reg


def achar_tenant(slug):
    slug = (slug or "").strip().lower()
    if not slug or not re.match(r"^[a-z0-9-]+$", slug):
        return None
    for t in carregar_registry().get("tenants", []):
        if t.get("slug") == slug and t.get("status", "ativo") == "ativo":
            return t
    return None


def tenant_default():
    reg = carregar_registry()
    for t in reg.get("tenants", []):
        if t.get("status", "ativo") == "ativo":
            return t["slug"]
    return DEFAULT_TENANT or "default-tenant"


def tdir(slug):
    return os.path.join(TENANTS_DIR, slug)


def is_default(slug):
    return slug == tenant_default()


def tpaths(slug):
    """Paths de dados do tenant. Todos usam tenants/<slug>/."""
    d = tdir(slug)
    return {"config": os.path.join(d, "config.json"),
            "catalogo": os.path.join(d, "catalog.json"),
            "leads": os.path.join(d, "leads.json"),
            "admin": os.path.join(d, "admin.json"),
            "clientes": os.path.join(d, "clientes.json"),
            "imgdir": os.path.join(d, "img")}


def status_pedido(v):
    """Normaliza o status (aceita valores antigos) para o ciclo atual."""
    s = str(v or "novo").strip().lower()
    s = STATUS_LEGADO.get(s, s)
    return s if s in STATUS_PEDIDO else "novo"


def agora_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%S")


def data_conclusao(lead):
    return (lead.get("concluido_ts") or lead.get("status_ts") or
            lead.get("ts") or "")


def data_cancelamento(lead):
    return lead.get("cancelado_ts") or lead.get("status_ts") or lead.get("ts") or ""


def normaliza_zap(z):
    d = re.sub(r"\D", "", str(z or ""))
    if len(d) in (10, 11):
        d = "55" + d
    return d


def sem_acento_busca(s):
    return unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower()


def lead_publico(l):
    """Cópia do lead com status/campos normalizados (não altera o arquivo)."""
    x = dict(l)
    x["status"] = status_pedido(x.get("status"))
    x.setdefault("status_ts", x.get("ts") or "")
    x.setdefault("pagamento", "pendente")
    x.setdefault("entrega", "")
    x.setdefault("motivo_cancelamento", "")
    return x


def garantir_admin(slug):
    p = tpaths(slug)["admin"]
    conf = ler(p, {})
    if not isinstance(conf, dict) or "senha" not in conf:
        conf = {"senha": hash_senha(SEED_ADMIN_PASS)}
        gravar(p, conf)
    return conf


# ---------- identidade visual por tenant ----------
COR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


def tenant_cores(slug):
    t = achar_tenant(slug) or {}
    cfg = ler(tpaths(slug)["config"], {})
    vis = cfg.get("visual") if isinstance(cfg.get("visual"), dict) else {}
    cores = vis.get("cores") if isinstance(vis.get("cores"), dict) else {}
    primaria = str(t.get("cores_botao") or t.get("cores_botão") or cores.get("ouro") or "#2E7CFF")
    fundo = str(t.get("cores_bg") or cores.get("marfim") or "#F4F6FB")
    if not COR_RE.match(primaria):
        primaria = "#2E7CFF"
    if not COR_RE.match(fundo):
        fundo = "#F4F6FB"
    return primaria, fundo


def config_tenant(slug):
    """config.json do tenant com a marca do registry aplicada.

    O registry (Super Admin) é a fonte da verdade do logo; o admin.js do
    painel lê ``visual.logo`` como nome de arquivo dentro de img/.
    """
    cfg = ler(tpaths(slug)["config"], {})
    if not isinstance(cfg, dict):
        cfg = {}
    logo = str((achar_tenant(slug) or {}).get("logo") or "").strip()
    vis = cfg.get("visual") if isinstance(cfg.get("visual"), dict) else {}
    if logo:
        if logo.startswith(("http://", "https://")):
            vis["logo"] = logo
        else:
            nome = logo.rsplit("/", 1)[-1]
            if nome:
                vis["logo"] = nome
    cfg["visual"] = vis
    return cfg


def tenant_logo_url(slug):
    """URL pública do logo do tenant (usada no site, admin e super admin)."""
    t = achar_tenant(slug) or {}
    logo = str(t.get("logo") or "").strip()
    if logo:
        return logo if logo.startswith(("http://", "https://")) else "/" + logo.lstrip("/")
    cfg = ler(tpaths(slug)["config"], {})
    vis = cfg.get("visual") if isinstance(cfg.get("visual"), dict) else {}
    lg = str(vis.get("logo") or "").strip()
    if lg.startswith(("http://", "https://")):
        return lg
    cand = lg.lstrip("/")
    if cand:
        # só devolve a URL se o arquivo existir (evita logo quebrado/404)
        for pasta in (tpaths(slug)["imgdir"], os.path.join(BASE, "img")):
            if os.path.isfile(os.path.join(pasta, cand)):
                return ("/" if cand.startswith("img/") else "/img/") + cand
    if os.path.isfile(os.path.join(tpaths(slug)["imgdir"], "logo.webp")):
        return "/img/logo.webp"
    return "/img/logo-default.webp"


def atualizar_tenant(slug, b):
    """Atualiza cadastro/branding do tenant no registry e no config.json."""
    reg = carregar_registry()
    t = next((x for x in reg.get("tenants", []) if x.get("slug") == slug), None)
    if t is None:
        return None, "tenant não encontrado"
    if "nome" in b:
        nome = limpa_nome(b.get("nome", ""))
        if not nome:
            return None, "nome não pode ficar vazio"
        t["nome"] = nome
    if "email" in b:
        email = str(b.get("email", "")).strip()[:120]
        if email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
            return None, "e-mail inválido"
        t["email"] = email
    if "zap" in b:
        zap = re.sub(r"\D", "", str(b.get("zap", "")))
        if zap and len(zap) < 10:
            return None, "WhatsApp inválido (use DDD + número)"
        t["zap"] = zap
    if "logo" in b:
        logo = str(b.get("logo") or "").strip()
        if logo and not logo.startswith(("/", "http://", "https://")):
            return None, "logo deve ser um caminho (/img/...) ou URL"
        t["logo"] = logo[:300]
    if "cores_botao" in b or "cores_botão" in b:
        cor = str(b.get("cores_botao") or b.get("cores_botão") or "").strip()
        if not COR_RE.match(cor):
            return None, "cor primária inválida (use #RRGGBB)"
        t["cores_botao"] = cor
        t.pop("cores_botão", None)
    if "cores_bg" in b:
        cor = str(b.get("cores_bg") or "").strip()
        if not COR_RE.match(cor):
            return None, "cor de fundo inválida (use #RRGGBB)"
        t["cores_bg"] = cor
    if "tagline" in b:
        t["tagline"] = str(b.get("tagline", "")).strip()[:140]
    if "segmento" in b:
        t["segmento"] = str(b.get("segmento", "")).strip()[:60]
    if "plano" in b:
        plano = str(b.get("plano", "")).strip().lower()
        if plano not in PLANOS_SAAS:
            return None, "plano inválido"
        t["plano"] = plano
    if "status" in b:
        status = str(b.get("status", "")).strip().lower()
        if status not in ("ativo", "pendente", "suspenso"):
            return None, "status inválido"
        t["status"] = status
    if "dominio_custom" in b:
        t["dominio_custom"] = str(b.get("dominio_custom", "")).strip().lower()[:120]
    t["atualizado_em"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    gravar(REGISTRY, reg)
    # espelha identidade no config.json servido ao front
    try:
        cfg_path = tpaths(slug)["config"]
        cfg = ler(cfg_path, {})
        if isinstance(cfg, dict):
            geral = cfg.setdefault("geral", {})
            geral["nome"] = t["nome"]
            if t.get("tagline"):
                geral["tagline"] = t["tagline"]
            if t.get("zap"):
                geral["zap"] = t["zap"]
            visual = cfg.setdefault("visual", {}) if isinstance(cfg.setdefault("visual", {}), dict) else {}
            cores = visual.setdefault("cores", {}) if isinstance(visual.setdefault("cores", {}), dict) else {}
            primaria, fundo = tenant_cores(slug)
            cores["ouro"] = primaria
            cores["marfim"] = fundo
            if t.get("logo"):
                logo_t = str(t["logo"]).strip()
                visual["logo"] = logo_t if logo_t.startswith(("http://", "https://")) else logo_t.rsplit("/", 1)[-1]
            else:
                visual["logo"] = ""
            gravar(cfg_path, cfg)
    except Exception:
        pass
    return t, None


def apagar_tenant(slug):
    reg = carregar_registry()
    if slug == reg.get("default") or slug == "default-tenant":
        return False, "o tenant padrão não pode ser excluído"
    t = next((x for x in reg.get("tenants", []) if x.get("slug") == slug), None)
    if t is None:
        return False, "tenant não encontrado"
    if len(reg.get("tenants", [])) <= 1:
        return False, "é preciso manter ao menos um tenant"
    reg["tenants"] = [x for x in reg["tenants"] if x.get("slug") != slug]
    gravar(REGISTRY, reg)
    fin = carregar_fin()
    if isinstance(fin.get("lojas"), dict):
        fin["lojas"].pop(slug, None)
        gravar(FIN_REG, fin)
    try:
        d = tdir(slug)
        if os.path.isdir(d):
            shutil.rmtree(d)
        # remove logos enviados pelo super admin (img/<slug>-logo-*)
        pasta_img = os.path.join(BASE, "img")
        if os.path.isdir(pasta_img):
            for arq in os.listdir(pasta_img):
                if arq.startswith(f"{slug}-logo-"):
                    try:
                        os.remove(os.path.join(pasta_img, arq))
                    except Exception:
                        pass
    except Exception as e:
        return True, f"removido do registry, mas a pasta falhou: {e}"
    return True, None



def resolver_tenant(headers, host, query):
    # 1) ?loja=
    try:
        qs = urllib.parse.parse_qs(query or "")
        if qs.get("loja", [""])[0]:
            t = achar_tenant(qs["loja"][0])
            if t:
                return t["slug"]
    except Exception:
        pass
    # 2) header X-Tenant
    try:
        xt = headers.get("X-Tenant", "").strip().lower()
        if xt and achar_tenant(xt):
            return xt
    except Exception:
        pass
    # 3) Host: subdomínio ou domínio custom
    h = (host or "").split(":")[0].strip().lower()
    if h:
        reg = carregar_registry()
        for t in reg.get("tenants", []):
            dc = (t.get("dominio_custom") or "").lower()
            if dc and h == dc:
                return t["slug"]
        partes = h.split(".")
        # <slug>.plataforma.jordaonetotech.com.br / <slug>.localhost / <slug>.127.0.0.1
        if len(partes) >= 2 and achar_tenant(partes[0]):
            # evita confundir www/dominio raiz
            if partes[0] not in ("www", "localhost"):
                return partes[0]
    return tenant_default()


# garante admin do default no boot (não cria senha nova por cima)
garantir_admin(tenant_default())

SESSOES = {}  # token -> {"tenant": slug, "exp": ts}
TENTATIVAS = {}  # ip -> [timestamps] (rate-limit login)
PEDIDOS = {}  # ip -> [timestamps] (rate-limit /api/pedido: 10/min)
INTERESSES_RL = {}  # ip -> [timestamps] (rate-limit /api/saas/interesse: 5/min)
PEDIDO_MAX_BYTES = 64 * 1024
CORPO_MAX_BYTES = 32 * 1024 * 1024  # teto global anti-OOM (upload de vídeo 20MB + base64 + JSON)
PLATAFORMA = os.path.join(BASE, "saas", "plataforma.json")
INTERESSES = os.path.join(BASE, "saas", "interesses.json")
INT_STATUS = ("novo", "contatado", "convertido", "descartado")


def sessao_valida(tok, slug):
    s = SESSOES.get(tok, None)
    if not s:
        return False
    if s.get("exp", 0) < time.time():
        SESSOES.pop(tok, None)
        return False
    return s.get("tenant") == slug


def limpa_sessoes():
    agora = time.time()
    for k in [k for k, v in SESSOES.items() if v.get("exp", 0) < agora]:
        SESSOES.pop(k, None)


def revogar_sessoes(slug, exceto=""):
    for t in [t for t, s in SESSOES.items() if s.get("tenant") == slug and t != exceto]:
        SESSOES.pop(t, None)


def slug_ok(s):
    return bool(s) and bool(re.match(r"^[a-z0-9-]{3,60}$", s))


def limpa_nome(nome, max=80):
    """Nome de loja/pessoa sem quebras de linha (evita injeção em arquivos
    gerados como o Caddyfile: `# {nome}`) e sem espaços duplicados."""
    return re.sub(r"\s+", " ", str(nome or "")).strip()[:max]


def podar(d, limite=2000):
    if len(d) > limite:
        for k in list(d)[:len(d) - limite]:
            d.pop(k, None)


def ip_cliente(handler):
    """IP real do cliente p/ rate-limit. Atrás do Caddy o peer é sempre
    127.0.0.1 (todos os visitantes virariam um IP só, quebrando o limite) —
    nesse caso usa o X-Forwarded-For que o próprio Caddy preenche.
    Conexão direta (dev): usa o peer. Só confia no header vindo de loopback."""
    try:
        peer = handler.client_address[0]
    except Exception:
        return ""
    if peer in ("127.0.0.1", "::1", "::ffff:127.0.0.1"):
        xff = (handler.headers.get("X-Forwarded-For") or "")
        if xff:
            cand = xff.split(",")[0].strip()
            if re.match(r"^[0-9a-fA-F:.]{3,45}$", cand):
                return cand
    return peer


MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json",
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".xml": "application/xml",
    ".txt": "text/plain; charset=utf-8",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
}

ESTATICOS_CACHE = (".webp", ".png", ".jpg", ".jpeg", ".mp4", ".webm", ".woff2", ".woff")


def rotas(p):
    partes = [x for x in p.split("/") if x]
    if len(partes) >= 3 and partes[:3] == ["api", "saas", "login"]:
        return "/api/saas/login", None
    if len(partes) >= 3 and partes[:3] == ["api", "saas", "painel"]:
        return "/api/saas/painel", None
    if len(partes) >= 3 and partes[:3] == ["api", "saas", "tenants"]:
        if len(partes) >= 5 and partes[4] in ("logo", "financeiro", "pagamentos"):
            return "/api/saas/tenants/" + partes[4], urllib.parse.unquote(partes[3])
        if len(partes) >= 4:
            return "/api/saas/tenants", urllib.parse.unquote(partes[3])
        return "/api/saas/tenants", None
    if len(partes) >= 4 and partes[0] == "api" and partes[1] == "admin":
        nome = partes[2]
        if nome in ("produtos", "leads", "clientes") and len(partes) >= 4:
            return "/api/admin/" + nome, urllib.parse.unquote(partes[3])
    if len(partes) >= 3 and partes[0] == "api" and partes[1] == "saas" and partes[2] == "lojas":
        if len(partes) >= 5 and partes[4] in ("ligar", "desligar", "reset-senha"):
            return "/api/saas/lojas/" + partes[4], urllib.parse.unquote(partes[3])
        if len(partes) >= 4:
            return "/api/saas/lojas", urllib.parse.unquote(partes[3])
        return "/api/saas/lojas", None
    if len(partes) >= 3 and partes[0] == "api" and partes[1] == "admin" and partes[2] == "icones":
        if len(partes) >= 4:
            return "/api/admin/icones", urllib.parse.unquote(partes[3])
        return "/api/admin/icones", None
    if len(partes) >= 3 and partes[0] == "api" and partes[1] == "saas" and partes[2] == "financeiro":
        if len(partes) >= 6 and partes[4] == "pagamentos":
            return "/api/saas/financeiro/pagamento", [urllib.parse.unquote(partes[3]),
                                                      urllib.parse.unquote(partes[5])]
        if len(partes) >= 5 and partes[4] == "pagamentos":
            return "/api/saas/financeiro/pagamentos", urllib.parse.unquote(partes[3])
        if len(partes) >= 4:
            return "/api/saas/financeiro", urllib.parse.unquote(partes[3])
        return "/api/saas/financeiro", None
    if len(partes) == 3 and partes[0] == "api" and partes[1] == "saas" and partes[2] in ("interesse", "plataforma", "interesses", "info"):
        return "/api/saas/" + partes[2], None
    if len(partes) == 4 and partes[0] == "api" and partes[1] == "saas" and partes[2] == "interesses":
        return "/api/saas/interesses", urllib.parse.unquote(partes[3])
    if len(partes) == 4 and partes[0] == "api" and partes[1] == "saas" and partes[2] == "dns":
        return "/api/saas/dns", urllib.parse.unquote(partes[3]).strip().lower()
    if len(partes) == 4 and partes[0] == "api" and partes[1] == "saas" and partes[2] == "receita":
        return "/api/saas/receita", urllib.parse.unquote(partes[3]).strip().lower()
    return p, None


def receita_dns(slug):
    """Gera a receita DNS da loja p/ o registro.br do cliente.
    Retorna dict (ou erro em 'erro'). O CNAME gerado é <slug>.<base> e a
    função já confere se ele resolve para o IP da VPS (pré-requisito:
    wildcard *.base apontado — Fase 6 do roteiro)."""
    if not slug_ok(slug):
        return {"erro": "loja inválida"}
    reg = carregar_lojas()
    loja = next((x for x in reg.get("lojas", []) if x.get("slug") == slug), None)
    if loja is None:
        return {"erro": "loja não encontrada"}
    cname = f"{slug}.{BASE_DOMAIN}"
    try:
        cname_ips = socket.gethostbyname_ex(cname)[2]
    except Exception:
        cname_ips = []
    cname_ok = bool(PUBLIC_IP) and PUBLIC_IP in cname_ips
    dom = (loja.get("dominio") or "").strip().lower() or "<dominio-do-cliente>"
    return {
        "slug": slug, "nome": loja.get("nome", ""), "dominio": loja.get("dominio", ""),
        "base_domain": BASE_DOMAIN, "ip_publico": PUBLIC_IP,
        "cname_alvo": cname, "cname_resolve": cname_ips, "cname_ok": cname_ok,
        "registros": [
            {"host": "@", "tipo": "A", "valor": PUBLIC_IP or "<IP-da-VPS>",
             "para": f"raiz {dom} (na raiz, CNAME é proibido)"},
            {"host": "www", "tipo": "CNAME", "valor": cname,
             "para": f"www.{dom} acompanha o IP da VPS sozinho"},
        ],
        "aviso": "" if cname_ok else
                 f"CNAME {cname} não resolve para {PUBLIC_IP or 'o IP da VPS'} — confira o wildcard *.[SECURITY_DATA] antes de mandar o cliente configurar.",
    }


def agregar_vendas(leads):
    """Receita e ranking consideram apenas pedidos concluídos.

    Pedidos cancelados não entram em faturamento nem em "mais vendidos";
    ficam contabilizados à parte para as métricas de perda.
    """
    por = {}
    tot_recebidos = tot_ped = tot_canc = tot_abertos = 0
    tot_itens = 0
    tot_receita = 0.0
    for l in leads:
        if l.get("tipo") != "pedido":
            continue
        tot_recebidos += 1
        st = status_pedido(l.get("status"))
        if st == "cancelado":
            tot_canc += 1
        if st in ("novo", "em_producao"):
            tot_abertos += 1
        if st != "concluido":
            continue
        tot_ped += 1
        for it in l.get("itens", []):
            pid = it.get("id")
            q = int(it.get("q") or 1)
            d = por.setdefault(pid, {"id": pid, "nome": it.get("nome", "Peça"), "qtd": 0, "pedidos": 0, "receita": 0})
            d["qtd"] += q
            d["pedidos"] += 1
            tot_itens += q
            preco = it.get("preco")
            if isinstance(preco, (int, float)):
                d["receita"] += q * preco
                tot_receita += q * preco
    ranking = sorted(por.values(), key=lambda x: x["qtd"], reverse=True)
    return {"ranking": ranking, "total_pedidos": tot_ped,
            "total_itens": tot_itens, "total_receita": round(tot_receita, 2),
            "total_recebidos": tot_recebidos, "total_cancelados": tot_canc,
            "total_abertos": tot_abertos}


def lista_clientes(leads, extras=None):
    """Agrupa os registros por WhatsApp (deduplicação) e monta o histórico."""
    extras = extras if isinstance(extras, dict) else {}
    mapa = {}
    for l in leads:
        zap = normaliza_zap(l.get("whatsapp"))
        if not zap:
            continue
        c = mapa.get(zap)
        if c is None:
            c = {"whatsapp": zap, "whatsapp_original": "",
                 "nome": "", "origens": [], "tipos": {"pedido": 0, "contato": 0},
                 "pedidos": 0, "concluidos": 0, "cancelados": 0,
                 "total_gasto": 0.0, "popup": False,
                 "primeira_interacao": "", "ultima_interacao": "",
                 "tags": [], "notas": "", "historico": []}
            mapa[zap] = c
        ts = str(l.get("ts") or "")
        if ts and (not c["primeira_interacao"] or ts < c["primeira_interacao"]):
            c["primeira_interacao"] = ts
        if ts and ts >= c["ultima_interacao"]:
            c["ultima_interacao"] = ts
            if l.get("nome"):
                c["nome"] = str(l["nome"])[:120]
            if l.get("whatsapp"):
                c["whatsapp_original"] = str(l["whatsapp"])[:30]
        origem = str(l.get("origem") or "").strip()
        if origem and origem not in c["origens"] and len(c["origens"]) < 12:
            c["origens"].append(origem)
        if origem.lower().startswith("popup"):
            c["popup"] = True
        tipo = "pedido" if l.get("tipo") == "pedido" else "contato"
        c["tipos"][tipo] = c["tipos"].get(tipo, 0) + 1
        st = status_pedido(l.get("status"))
        if tipo == "pedido":
            c["pedidos"] += 1
            if st == "concluido":
                c["concluidos"] += 1
                tot = l.get("total")
                if isinstance(tot, (int, float)):
                    c["total_gasto"] += float(tot)
            elif st == "cancelado":
                c["cancelados"] += 1
        itens = [f'{i.get("q", 1)}x {i.get("nome", "Peça")}'
                 for i in (l.get("itens") or []) if isinstance(i, dict)]
        c["historico"].append({"id": l.get("id"), "ts": ts, "tipo": tipo,
                               "status": st, "origem": origem,
                               "total": l.get("total"), "itens": itens[:12]})
    for zap, c in mapa.items():
        e = extras.get(zap) if isinstance(extras.get(zap), dict) else {}
        c["tags"] = [str(t)[:30] for t in (e.get("tags") or [])][:12]
        c["notas"] = str(e.get("notas") or "")[:1000]
        c["total_gasto"] = round(c["total_gasto"], 2)
        c["historico"].sort(key=lambda h: h.get("ts", ""), reverse=True)
        c["historico"] = c["historico"][:20]
    return sorted(mapa.values(), key=lambda c: c.get("ultima_interacao", ""), reverse=True)


def categoria_origem(o):
    o = str(o or "").lower()
    if o.startswith("popup"):
        return "Popup"
    if o.startswith("produto"):
        return "Produto"
    if "minha lista" in o:
        return "Sacola"
    if "whatsapp" in o:
        return "WhatsApp"
    if "encomenda" in o:
        return "Encomenda"
    return "Outros"


def intervalo_indicadores(periodo):
    hoje = date.today()
    p = str(periodo or "30d").strip().lower()
    if p == "tudo":
        return None, hoje
    if p == "12m":
        return hoje - timedelta(days=364), hoje
    m = re.match(r"^(\d+)d$", p)
    dias = int(m.group(1)) if m else 30
    dias = max(1, min(dias, 3650))
    return hoje - timedelta(days=dias - 1), hoje


def no_intervalo(ts, ini, fim):
    d = str(ts or "")[:10]
    if not d:
        return False
    if ini is not None and d < ini.isoformat():
        return False
    return d <= fim.isoformat()


def add_meses(ano, mes, delta):
    total = (ano * 12 + (mes - 1)) + delta
    return total // 12, total % 12 + 1


def indicadores_loja(leads, periodo):
    ini, fim = intervalo_indicadores(periodo)
    hoje = date.today()
    pedidos = [l for l in leads if l.get("tipo") == "pedido"]
    recebidos = [l for l in pedidos if no_intervalo(l.get("ts"), ini, fim)]
    concluidos = [l for l in pedidos
                  if status_pedido(l.get("status")) == "concluido"
                  and no_intervalo(data_conclusao(l), ini, fim)]
    cancelados = [l for l in pedidos
                  if status_pedido(l.get("status")) == "cancelado"
                  and no_intervalo(data_cancelamento(l), ini, fim)]

    receita = 0.0
    pecas = 0
    por = {}
    for l in concluidos:
        tot = l.get("total")
        if isinstance(tot, (int, float)):
            receita += float(tot)
        for it in l.get("itens", []):
            if not isinstance(it, dict):
                continue
            q = int(it.get("q") or 1)
            pecas += q
            pid = it.get("id")
            d = por.setdefault(pid, {"id": pid, "nome": it.get("nome", "Peça"),
                                     "qtd": 0, "pedidos": 0, "receita": 0.0})
            d["qtd"] += q
            d["pedidos"] += 1
            preco = it.get("preco")
            if isinstance(preco, (int, float)):
                d["receita"] += q * float(preco)
    top = sorted(por.values(), key=lambda x: (x["qtd"], x["receita"]), reverse=True)
    for d in top:
        d["receita"] = round(d["receita"], 2)

    # clientes novos = primeiro contato dentro do período
    primeiro = {}
    zaps_com_pedido = set()
    for l in leads:
        z = normaliza_zap(l.get("whatsapp"))
        if not z:
            continue
        ts = str(l.get("ts") or "")
        if ts and (z not in primeiro or ts < primeiro[z]):
            primeiro[z] = ts
        if l.get("tipo") == "pedido":
            zaps_com_pedido.add(z)
    clientes_novos = sum(1 for z, ts in primeiro.items()
                         if no_intervalo(ts, ini, fim))

    popup = [l for l in leads if str(l.get("origem", "")).lower().startswith("popup")]
    popup_periodo = [l for l in popup if no_intervalo(l.get("ts"), ini, fim)]
    popup_zaps = {normaliza_zap(l.get("whatsapp")) for l in popup_periodo}
    popup_zaps.discard("")
    convertidos = {z for z in popup_zaps if z in zaps_com_pedido}

    # últimos 12 meses de vendas concluídas (por data de conclusão)
    serie = {}
    for i in range(11, -1, -1):
        y, m = add_meses(hoje.year, hoje.month, -i)
        serie[f"{y:04d}-{m:02d}"] = {"mes": f"{y:04d}-{m:02d}",
                                     "label": f"{['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][m-1]}/{str(y)[2:]}",
                                     "pedidos": 0, "receita": 0.0}
    for l in pedidos:
        if status_pedido(l.get("status")) != "concluido":
            continue
        chave = str(data_conclusao(l))[:7]
        if chave in serie:
            serie[chave]["pedidos"] += 1
            tot = l.get("total")
            if isinstance(tot, (int, float)):
                serie[chave]["receita"] += float(tot)
    mensal = list(serie.values())
    for d in mensal:
        d["receita"] = round(d["receita"], 2)

    status_atuais = {s: 0 for s in STATUS_PEDIDO}
    for l in pedidos:
        status_atuais[status_pedido(l.get("status"))] += 1
    status_periodo = {s: 0 for s in STATUS_PEDIDO}
    for l in recebidos:
        status_periodo[status_pedido(l.get("status"))] += 1

    origens = {}
    for l in recebidos:
        k = categoria_origem(l.get("origem"))
        origens[k] = origens.get(k, 0) + 1

    n_recebidos = len(recebidos)
    n_concluidos = len(concluidos)
    n_cancelados = len(cancelados)
    return {
        "periodo": str(periodo or "30d"),
        "de": ini.isoformat() if ini else "",
        "ate": fim.isoformat(),
        "kpis": {
            "pedidos": n_recebidos,
            "concluidos": n_concluidos,
            "cancelados": n_cancelados,
            "em_producao": sum(1 for l in pedidos if status_pedido(l.get("status")) == "em_producao"),
            "novos": sum(1 for l in pedidos if status_pedido(l.get("status")) == "novo"),
            "receita": round(receita, 2),
            "ticket_medio": round(receita / n_concluidos, 2) if n_concluidos else 0,
            "pecas": pecas,
            "pecas_por_pedido": round(pecas / n_concluidos, 1) if n_concluidos else 0,
            "clientes_novos": clientes_novos,
            "popup_capturas": len(popup_periodo),
            "popup_convertidos": len(convertidos),
            "popup_conversao": round(100 * len(convertidos) / len(popup_zaps), 1) if popup_zaps else 0,
            "taxa_conclusao": round(100 * n_concluidos / n_recebidos, 1) if n_recebidos else 0,
            "taxa_cancelamento": round(100 * n_cancelados / n_recebidos, 1) if n_recebidos else 0,
        },
        "status_atuais": status_atuais,
        "status_periodo": status_periodo,
        "mensal": mensal,
        "top_produtos": top[:50],
        "origens": sorted(({"origem": k, "pedidos": v} for k, v in origens.items()),
                          key=lambda x: x["pedidos"], reverse=True),
        "popup": {"capturas": len(popup_periodo), "convertidos": len(convertidos),
                  "taxa": round(100 * len(convertidos) / len(popup_zaps), 1) if popup_zaps else 0},
    }


def novo_id(nome, prods):
    base = re.sub(r"[^a-z0-9]+", "-", (nome or "").lower()).strip("-") or "peca"
    existentes = {p.get("id") for p in prods}
    if base not in existentes:
        return base
    n = 2
    while f"{base}-{n}" in existentes:
        n += 1
    return f"{base}-{n}"


ICONES_EXT = (".svg", ".webp", ".png", ".jpg", ".jpeg")
ICONES_MAX = 2 * 1024 * 1024


def listar_icones(slug):
    try:
        base = {f for f in os.listdir(os.path.join(BASE, "img", "icons"))
                if f.lower().endswith(ICONES_EXT)}
    except Exception:
        base = set()
    if not is_default(slug):
        try:
            d = os.path.join(tpaths(slug)["imgdir"], "icons")
            base |= {f for f in os.listdir(d) if f.lower().endswith(ICONES_EXT)}
        except Exception:
            pass
    return sorted(base)


def icones_dir(slug):
    if is_default(slug):
        d = os.path.join(BASE, "img", "icons")
    else:
        d = os.path.join(tpaths(slug)["imgdir"], "icons")
    os.makedirs(d, exist_ok=True)
    return d


BLOQUEADOS = ("data", "tenants", "lojas", "backups", "saas", "scripts", "db",
              "docs", "deploy", ".env", ".git", "caddyfile")
BLOQ_EXT = (".py", ".pyc", ".sqlite", ".sqlite3", ".log", ".pid", ".bak", ".swp",
            ".md")


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "SuperLoja"
    sys_version = ""
    timeout = 10  # cliente lento não prende thread (Slowloris)

    def log_message(self, fmt, *args):
        pass

    # ---------- helpers ----------
    def _json(self, obj, code=200):
        corpo = json.dumps(obj, ensure_ascii=False).encode()
        self._envia(corpo, "application/json; charset=utf-8", code, "no-store")

    TEXTO_GZIP = {"text/html", "text/css", "application/javascript",
                  "application/json", "application/xml", "text/plain",
                  "application/manifest+json", "image/svg+xml"}

    def handle_one_request(self):
        """Nunca derruba a thread/processo: BrokenPipe vira silêncio, resto vira 500."""
        try:
            super().handle_one_request()
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            try:
                import traceback
                traceback.print_exc()
            except Exception:
                pass
            try:
                self._json({"erro": "falha interna"}, 500)
            except Exception:
                pass

    def _corpo_grande_demais(self):
        try:
            return int(self.headers.get("Content-Length") or 0) > CORPO_MAX_BYTES
        except Exception:
            return False

    def _envia(self, corpo, tipo, code=200, cache="no-cache"):
        """Envia bytes com gzip quando o cliente aceita (3-5x menor no 4G)."""
        try:
            enc = ""
            base = tipo.split(";")[0].strip()
            if len(corpo) > 512 and base in self.TEXTO_GZIP and \
                    "gzip" in (self.headers.get("Accept-Encoding") or ""):
                try:
                    corpo = gzip.compress(corpo, compresslevel=6)
                    enc = "gzip"
                except Exception:
                    pass
            self.send_response(code)
            self.send_header("Content-Type", tipo)
            self.send_header("Content-Length", str(len(corpo)))
            self.send_header("Cache-Control", cache)
            self.send_header("Vary", "Accept-Encoding")
            if enc:
                self.send_header("Content-Encoding", enc)
            self.end_headers()
            self.wfile.write(corpo)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _corpo(self):
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except Exception:
            return {}
        if n <= 0:
            return {}
        if n > CORPO_MAX_BYTES:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception:
            return {}

    def _token(self):
        a = self.headers.get("Authorization", "")
        return a[7:].strip() if a.startswith("Bearer ") else ""

    def _slug(self):
        p = urllib.parse.urlparse(self.path)
        return resolver_tenant(self.headers, self.headers.get("Host", ""), p.query)

    def _precisa_admin(self, slug):
        limpa_sessoes()
        if not sessao_valida(self._token(), slug):
            self._json({"erro": "não autenticado"}, 401)
            return False
        return True

    def _precisa_saas(self):
        tok = self._token()
        if not tok:
            self._json({"erro": "não autenticado", "codigo": "login_necessario"}, 401)
            return False
        if SAAS_ADMIN_TOKEN and hmac.compare_digest(tok, SAAS_ADMIN_TOKEN):
            return True
        if hmac.compare_digest(tok, SAAS_TOKEN):
            return True
        self._json({"erro": "sessão expirada — entre novamente", "codigo": "login_necessario"}, 401)
        return False

    # ---------- estáticos com overlay por tenant ----------
    def _estatico(self, caminho, slug):
        rel = urllib.parse.unquote(caminho).lstrip("/")
        if not rel:
            rel = "index.html"
        primeira = rel.split("/")[0].lower()
        if primeira in BLOQUEADOS or primeira.startswith(".") or ".." in rel:
            self._json({"erro": "proibido"}, 403)
            return
        if rel.lower().endswith(BLOQ_EXT):
            self._json({"erro": "proibido"}, 403)
            return
        # config/catálogo dinâmicos por tenant (frontend não muda)
        if rel == "config.json":
            self._json(config_tenant(slug))
            return
        if rel in ("js/catalog.json", "js%2Fcatalog.json"):
            self._json(ler(tpaths(slug)["catalogo"], []))
            return
        # resumo para assistentes de IA (sempre atualizado, por loja)
        if rel == "llms.txt":
            try:
                corpo = llms_txt(slug, self.headers)
            except Exception:
                self._json({"erro": "não encontrado"}, 404)
                return
            self._envia(corpo, "text/markdown; charset=utf-8", 200, "public, max-age=3600")
            return
        # index com SEO da loja (canonical/og/JSON-LD por tenant)
        if rel == "index.html":
            try:
                with open(os.path.join(BASE, "index.html"), encoding="utf-8") as f:
                    html = f.read()
            except FileNotFoundError:
                self._json({"erro": "não encontrado"}, 404)
                return
            for k, v in seo_vars(slug, self.headers).items():
                html = html.replace(k, v)
            corpo = html.encode()
            self._envia(corpo, "text/html; charset=utf-8", 200, "no-cache")
            return
        # painéis do tenant: logo e cor da marca aplicados pelo Super Admin
        if rel in ("admin-completo.html", "admin.html", "editor.html"):
            try:
                with open(os.path.join(BASE, rel), encoding="utf-8") as f:
                    html = f.read()
            except FileNotFoundError:
                self._json({"erro": "não encontrado"}, 404)
                return
            logo = urllib.parse.quote(tenant_logo_url(slug), safe="/:?=&%")
            primaria, _fundo = tenant_cores(slug)
            estilo = (f"<style>:root{{--ouro:{primaria};--ouro-claro:{primaria};"
                      f"--ouro-fraco:{primaria}26;}}</style>")
            html = html.replace('src="img/logo.webp"', f'src="{logo}"')
            html = html.replace("</head>", estilo + "\n</head>", 1)
            self._envia(html.encode(), "text/html; charset=utf-8", 200, "no-store")
            return
        # overlay de imagens: tenants/<slug>/img/ -> img/ compartilhado
        if rel == "img" or rel.startswith("img/"):
            sub = rel[4:]
            if not is_default(slug):
                cand = os.path.join(tpaths(slug)["imgdir"], sub)
                if sub and os.path.isfile(cand):
                    return self._arquivo(cand)
            return self._arquivo(os.path.join(BASE, rel))
        # overlay de vídeos: tenants/<slug>/video/ -> video/ compartilhado
        if rel == "video" or rel.startswith("video/"):
            sub = rel[6:]
            if not is_default(slug):
                cand = os.path.join(tdir(slug), "video", sub)
                if sub and os.path.isfile(cand):
                    return self._arquivo(cand)
            return self._arquivo(os.path.join(BASE, rel))
        # manifest por tenant (se existir override)
        if rel == "manifest.webmanifest" and not is_default(slug):
            cand = os.path.join(tdir(slug), "manifest.webmanifest")
            if os.path.isfile(cand):
                return self._arquivo(cand)
        # favicon (reutiliza icon-192 como .ico tolerante)
        if rel == "favicon.ico":
            return self._arquivo(os.path.join(BASE, "img", "icon-192.png"))
        alvo = os.path.normpath(os.path.join(BASE, rel))
        if not alvo.startswith(BASE) or not os.path.isfile(alvo):
            self._json({"erro": "não encontrado"}, 404)
            return
        self._arquivo(alvo)

    def _arquivo(self, alvo):
        ext = os.path.splitext(alvo)[1].lower()
        ct = MIME.get(ext, "application/octet-stream")
        try:
            with open(alvo, "rb") as f:
                corpo = f.read()
        except FileNotFoundError:
            self._json({"erro": "não encontrado"}, 404)
            return
        if ext in ESTATICOS_CACHE:
            cache = "public, max-age=3600"
        elif ext in (".html", ".json", ".webmanifest"):
            cache = "no-store"  # páginas admin/painel: nunca guardar, sempre a versão nova
        else:
            cache = "no-cache"
        self._envia(corpo, ct, 200, cache)

    # ---------- rotas ----------
    def do_GET(self):
        p = urllib.parse.urlparse(self.path)
        host = (self.headers.get("Host", "") or "").split(":")[0].strip().lower()
        # No domínio oficial da plataforma, a raiz abre o superadmin.
        if host and host == host_plataforma() and p.path in ("/", "/index.html"):
            self.send_response(302)
            self.send_header("Location", "/saas-admin.html")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        slug = resolver_tenant(self.headers, self.headers.get("Host", ""), p.query)
        rota, ident = rotas(p.path)
        TP = tpaths(slug)

        if rota == "/api/tenant":
            t = achar_tenant(slug) or {"slug": slug}
            cfg = ler(TP["config"], {})
            g = cfg.get("geral", {}) if isinstance(cfg, dict) else {}
            self._json({"slug": slug, "nome": t.get("nome") or g.get("nome", slug),
                        "plano": t.get("status") and t.get("plano", "basico")})
            return
        if rota == "/api/temas":
            self._json({"temas": carregar_temas()})
            return
        if rota == "/api/saas/resumo":
            if not self._precisa_saas():
                return
            self._json(resumo_plataforma())
            return
        if rota == "/api/saas/plataforma":
            p = carregar_plataforma()
            self._json({"nome": p.get("nome", "Super Loja"),
                        "whatsapp": re.sub(r"\D", "", str(p.get("whatsapp", ""))),
                        "whatsapp_tela": str(p.get("whatsapp_tela", "")),
                        "dominio": str(p.get("dominio", ""))})
            return
        if rota == "/api/saas/interesses" and ident is None:
            if not self._precisa_saas():
                return
            lst = ler(INTERESSES, [])
            lst.sort(key=lambda l: l.get("ts", ""), reverse=True)
            self._json(lst)
            return
        if rota == "/api/saas/info":
            if not self._precisa_saas():
                return
            cmd = f"python3 scripts/gerar_caddy.py --base {BASE_DOMAIN}"
            if PUBLIC_IP:
                cmd += f" --admin-ip {PUBLIC_IP}"
            self._json({"ip_publico": PUBLIC_IP, "base_domain": BASE_DOMAIN,
                        "caddy_cmd": cmd,
                        "instrucao_dns": f"No registro.br do cliente: A @ -> IP da VPS (na raiz, CNAME é proibido) + CNAME www -> <slug>.{BASE_DOMAIN}"})
            return
        if rota == "/api/saas/dns":
            if not self._precisa_saas():
                return
            dom = (ident or "").strip().lower().rstrip(".")
            if dom.startswith("www."):
                dom = dom[4:]
            if not DOMINIO_RE.match(dom or ""):
                self._json({"erro": "domínio inválido (ex.: lojadoana.com.br)"}, 400)
                return
            alvos = [dom, "www." + dom]
            resolvidos = {}
            for h in alvos:
                try:
                    _, _, ips = socket.gethostbyname_ex(h)
                    resolvidos[h] = ips
                except Exception:
                    resolvidos[h] = []
            esperado = PUBLIC_IP
            if not esperado:
                try:
                    esperado = socket.gethostbyname(socket.gethostname())
                except Exception:
                    esperado = ""
            def ok_host(h):
                return bool(esperado) and esperado in (resolvidos.get(h) or [])
            self._json({"dominio": dom, "esperado": esperado,
                        "resolvido": resolvidos,
                        "ok_raiz": ok_host(dom), "ok_www": ok_host("www." + dom),
                        "ok": ok_host(dom) and ok_host("www." + dom),
                        "proximo_passo": "gerar_caddy + reload" if ok_host(dom) else "aguardar propagação DNS (até 4h)"})
            return
        if rota == "/api/saas/receita":
            if not self._precisa_saas():
                return
            rec = receita_dns(ident or "")
            self._json(rec, 200 if "erro" not in rec else 404)
            return
        if rota == "/api/saas/tenants":
            if not self._precisa_saas():
                return
            self._json(carregar_registry())
            return
        if rota == "/api/saas/painel":
            if not self._precisa_saas():
                return
            self._json(painel_tenants())
            return
        if rota == "/api/saas/lojas" and ident is None:
            if not self._precisa_saas():
                return
            reg = carregar_lojas()
            out = []
            for l in reg.get("lojas", []):
                c = dict(l)
                c["no_ar"] = porta_viva(l.get("porta", 0)) if l.get("status") == "ativa" else False
                out.append(c)
            self._json({"lojas": out, "base_domain": BASE_DOMAIN,
                        "dominio_plataforma": host_plataforma()})
            return
        if rota == "/api/saas/templates" and ident is None:
            if not self._precisa_saas():
                return
            self._json({"templates": listar_templates()})
            return
        if rota == "/api/saas/financeiro" and ident is None:
            if not self._precisa_saas():
                return
            reg = carregar_lojas()
            fin = carregar_fin()
            out = []
            for l in reg.get("lojas", []):
                e = fin_entry(fin, l["slug"])
                st, diff = fin_status(e)
                out.append({"slug": l["slug"], "nome": l.get("nome", ""),
                            "status_loja": l.get("status", ""),
                            "plano": e.get("plano", ""), "mensalidade": e.get("mensalidade", 0),
                            "vencimento": e.get("vencimento", ""),
                            "status": st, "dias": diff,
                            "n_pagamentos": len(e.get("pagamentos", []))})
            out.sort(key=lambda x: ({"atrasado": 0, "vence_proximo": 1, "sem_vencimento": 2,
                                     "em_dia": 3, "sem_cobranca": 4}.get(x["status"], 5), x["slug"]))
            self._json({"lojas": out, "resumo": fin_resumo(fin, reg.get("lojas", []))})
            return
        if rota == "/api/saas/financeiro" and ident is not None:
            if not self._precisa_saas():
                return
            reg = carregar_lojas()
            loja = next((l for l in reg.get("lojas", []) if l.get("slug") == ident), None)
            if loja is None:
                self._json({"erro": "loja não encontrada"}, 404)
                return
            fin = carregar_fin()
            e = fin_entry(fin, ident)
            st, diff = fin_status(e)
            pags = sorted(e.get("pagamentos", []), key=lambda p: p.get("data", ""), reverse=True)
            self._json({"slug": ident, "nome": loja.get("nome", ""),
                        "plano": e.get("plano", ""), "mensalidade": e.get("mensalidade", 0),
                        "vencimento": e.get("vencimento", ""), "status": st, "dias": diff,
                        "pagamentos": pags})
            return
        if rota == "/api/admin/config":
            if not self._precisa_admin(slug):
                return
            self._json(config_tenant(slug))
            return
        if rota == "/api/admin/produtos":
            if not self._precisa_admin(slug):
                return
            self._json(ler(TP["catalogo"], []))
            return
        if rota == "/api/admin/leads":
            if not self._precisa_admin(slug):
                return
            leads = ler(TP["leads"], [])
            leads = sorted(leads, key=lambda l: l.get("ts", ""), reverse=True)
            self._json([lead_publico(l) for l in leads])
            return
        if rota == "/api/admin/vendas":
            if not self._precisa_admin(slug):
                return
            self._json(agregar_vendas(ler(TP["leads"], [])))
            return
        if rota == "/api/admin/resumo":
            if not self._precisa_admin(slug):
                return
            leads = ler(TP["leads"], [])
            prods = ler(TP["catalogo"], [])
            vendas = agregar_vendas(leads)
            pedidos = [l for l in leads if l.get("tipo") == "pedido"]
            popup = [l for l in leads if str(l.get("origem", "")).lower().startswith("popup")]
            novos = sum(1 for l in leads if status_pedido(l.get("status")) == "novo")
            pedidos_novos = sum(1 for l in pedidos if status_pedido(l.get("status")) == "novo")
            self._json({"produtos": len(prods), "contatos": len(leads),
                        "novos": novos, "pedidos": vendas["total_pedidos"],
                        "receita": vendas["total_receita"],
                        "pedidos_novos": pedidos_novos,
                        "pedidos_abertos": vendas["total_abertos"],
                        "pedidos_cancelados": vendas["total_cancelados"],
                        "clientes": len({normaliza_zap(l.get("whatsapp")) for l in leads
                                         if normaliza_zap(l.get("whatsapp"))}),
                        "popup": len(popup),
                        "popup_novos": sum(1 for l in popup
                                           if status_pedido(l.get("status")) == "novo")})
            return
        if rota == "/api/admin/clientes":
            if not self._precisa_admin(slug):
                return
            qs = urllib.parse.parse_qs(p.query or "")
            q = (qs.get("q", [""])[0] or "").strip()
            seg = (qs.get("segmento", ["todos"])[0] or "todos").strip().lower()
            leads = ler(TP["leads"], [])
            extras = ler(TP["clientes"], {})
            todos = lista_clientes(leads, extras)
            clientes = todos
            if q:
                alvo = sem_acento_busca(q)
                clientes = [c for c in clientes
                            if alvo in sem_acento_busca(
                                " ".join([c.get("nome", ""), c.get("whatsapp", ""),
                                          c.get("whatsapp_original", ""), c.get("notas", ""),
                                          " ".join(c.get("origens", [])),
                                          " ".join(c.get("tags", []))]))]
            if seg == "popup":
                clientes = [c for c in clientes if c.get("popup")]
            elif seg == "com_pedidos":
                clientes = [c for c in clientes if c.get("pedidos", 0) > 0]
            elif seg == "sem_pedidos":
                clientes = [c for c in clientes if c.get("pedidos", 0) == 0]
            popup = [c for c in todos if c.get("popup")]
            convertidos = [c for c in popup if c.get("pedidos", 0) > 0]
            sem_zap = [lead_publico(l) for l in leads
                       if l.get("tipo") == "contato" and not normaliza_zap(l.get("whatsapp"))]
            sem_zap.sort(key=lambda l: l.get("ts", ""), reverse=True)
            self._json({"clientes": clientes, "total": len(clientes),
                        "popup": len(popup), "popup_convertidos": len(convertidos),
                        "popup_conversao": round(100 * len(convertidos) / len(popup), 1) if popup else 0,
                        "mensagens_sem_whatsapp": sem_zap[:50]})
            return
        if rota == "/api/admin/indicadores":
            if not self._precisa_admin(slug):
                return
            qs = urllib.parse.parse_qs(p.query or "")
            periodo = (qs.get("periodo", ["30d"])[0] or "30d").strip().lower()
            self._json(indicadores_loja(ler(TP["leads"], []), periodo))
            return
        if rota == "/api/admin/imagens":
            if not self._precisa_admin(slug):
                return
            try:
                base_imgs = set(f for f in os.listdir(os.path.join(BASE, "img"))
                                if f.lower().endswith((".webp", ".png", ".jpg", ".jpeg")))
            except Exception:
                base_imgs = set()
            if not is_default(slug):
                try:
                    ove = set(f for f in os.listdir(TP["imgdir"])
                              if f.lower().endswith((".webp", ".png", ".jpg", ".jpeg")))
                    base_imgs |= ove
                except Exception:
                    pass
            self._json(sorted(base_imgs))
            return
        if rota == "/api/admin/midias":
            if not self._precisa_admin(slug):
                return
            def listar(pasta, tipos):
                try:
                    return set(f for f in os.listdir(pasta)
                               if f.lower().endswith(tipos) and os.path.isfile(os.path.join(pasta, f)))
                except Exception:
                    return set()
            imgs = listar(os.path.join(BASE, "img"), (".webp", ".png", ".jpg", ".jpeg"))
            vids = listar(os.path.join(BASE, "video"), (".mp4", ".webm"))
            if not is_default(slug):
                imgs |= listar(TP["imgdir"], (".webp", ".png", ".jpg", ".jpeg"))
                vids |= listar(os.path.join(tdir(slug), "video"), (".mp4", ".webm"))
            itens = ([{"tipo": "imagem", "arquivo": f, "url": "img/" + f} for f in sorted(imgs)] +
                     [{"tipo": "video", "arquivo": f, "url": "video/" + f} for f in sorted(vids)])
            self._json({"itens": itens, "imagens": sorted(imgs), "videos": sorted(vids)})
            return
        if rota == "/api/admin/icones" and ident is None:
            if not self._precisa_admin(slug):
                return
            self._json(listar_icones(slug))
            return
        self._estatico(p.path, slug)

    def do_POST(self):
        if self._corpo_grande_demais():
            self._json({"erro": "dados muito grandes"}, 413)
            return
        p = urllib.parse.urlparse(self.path)
        slug = resolver_tenant(self.headers, self.headers.get("Host", ""), p.query)
        rota, ident = rotas(p.path)
        TP = tpaths(slug)

        if rota == "/api/saas/login":
            ip = ip_cliente(self)
            agora = time.time()
            TENTATIVAS[ip] = [t for t in TENTATIVAS.get(ip, []) if agora - t < 60]
            if len(TENTATIVAS[ip]) >= 10:
                self._json({"erro": "muitas tentativas, aguarde 1 minuto"}, 429)
                return
            TENTATIVAS[ip].append(agora)
            podar(TENTATIVAS)
            b = self._corpo()
            senha = str(b.get("senha") or b.get("token") or "")
            ok = False
            via_token = False
            if senha:
                if SAAS_ADMIN_TOKEN and hmac.compare_digest(senha, SAAS_ADMIN_TOKEN):
                    ok, via_token = True, True
                elif hmac.compare_digest(senha, SAAS_ADMIN_PASS):
                    ok = True
            if not ok:
                self._json({"erro": "senha inválida"}, 401)
                return
            TENTATIVAS.pop(ip, None)
            self._json({"token": SAAS_TOKEN, "via": "token" if via_token else "senha"})
            return

        elif rota == "/api/login":
            # rate-limit simples: 8 tentativas/min por IP
            ip = ip_cliente(self)
            agora = time.time()
            TENTATIVAS[ip] = [t for t in TENTATIVAS.get(ip, []) if agora - t < 60]
            if len(TENTATIVAS[ip]) >= 8:
                self._json({"erro": "muitas tentativas, aguarde"}, 429)
                return
            TENTATIVAS[ip].append(agora)
            podar(TENTATIVAS)
            b = self._corpo()
            conf = garantir_admin(slug)
            if confere_senha(str(b.get("senha", "")), conf.get("senha")):
                if precisa_upgrade(conf.get("senha")):
                    conf["senha"] = hash_senha(str(b.get("senha", "")))
                    gravar(tpaths(slug)["admin"], conf)
                tok = secrets.token_hex(24)
                SESSOES[tok] = {"tenant": slug, "exp": agora + SESSAO_TTL}
                self._json({"token": tok, "tenant": slug})
                return
            self._json({"erro": "senha incorreta"}, 401)
            return

        if rota == "/api/logout":
            if self._token() in SESSOES:
                del SESSOES[self._token()]
            self._json({"ok": True})
            return

        if rota == "/api/trocar-senha":
            if not self._precisa_admin(slug):
                return
            b = self._corpo()
            conf = garantir_admin(slug)
            if not confere_senha(str(b.get("atual", "")), conf.get("senha")):
                self._json({"erro": "senha atual incorreta"}, 401)
                return
            nova = str(b.get("nova", ""))
            if len(nova) < 6:
                self._json({"erro": "a nova senha precisa de pelo menos 6 caracteres"}, 400)
                return
            conf["senha"] = hash_senha(nova)
            gravar(TP["admin"], conf)
            revogar_sessoes(slug, exceto=self._token())
            self._json({"ok": True})
            return

        if rota == "/api/pedido":
            try:
                if int(self.headers.get("Content-Length") or 0) > PEDIDO_MAX_BYTES:
                    self._json({"erro": "pedido muito grande"}, 413)
                    return
            except Exception:
                pass
            ip = ip_cliente(self)
            agora = time.time()
            PEDIDOS[ip] = [t for t in PEDIDOS.get(ip, []) if agora - t < 60]
            if len(PEDIDOS[ip]) >= 10:
                self._json({"erro": "muitas tentativas, aguarde"}, 429)
                return
            PEDIDOS[ip].append(agora)
            podar(PEDIDOS)
            self._registrar_lead(self._corpo(), slug)
            return

        if rota == "/api/saas/interesse":
            try:
                if int(self.headers.get("Content-Length") or 0) > 32 * 1024:
                    self._json({"erro": "dados muito grandes"}, 413)
                    return
            except Exception:
                pass
            ip = ip_cliente(self)
            agora = time.time()
            INTERESSES_RL[ip] = [t for t in INTERESSES_RL.get(ip, []) if agora - t < 60]
            if len(INTERESSES_RL[ip]) >= 5:
                self._json({"erro": "muitas tentativas, aguarde"}, 429)
                return
            INTERESSES_RL[ip].append(agora)
            podar(INTERESSES_RL)
            b = self._corpo()
            if not isinstance(b, dict):
                b = {}
            nome = str(b.get("nome", "")).strip()[:120]
            whats = str(b.get("whatsapp", "")).strip()[:30]
            if not nome or not whats:
                self._json({"erro": "informe nome e WhatsApp"}, 400)
                return
            lst = ler(INTERESSES, [])
            reg = {"id": "I" + str(int(time.time() * 1000)),
                   "ts": time.strftime("%Y-%m-%dT%H:%M:%S"),
                   "nome": nome, "whatsapp": whats,
                   "segmento": str(b.get("segmento", ""))[:60],
                   "plano": str(b.get("plano", ""))[:30],
                   "status": "novo"}
            lst.append(reg)
            gravar(INTERESSES, lst)
            self._json({"ok": True})
            return

        if rota == "/api/saas/tenants":
            if not self._precisa_saas():
                return
            b = self._corpo()
            extras = {k: b.get(k) for k in
                      ("logo", "cores_botao", "cores_bg", "tagline", "segmento", "status", "dominio_custom")
                      if k in b}
            novo = criar_tenant(b.get("slug", ""), b.get("nome", ""),
                                b.get("zap", ""), b.get("email", ""),
                                b.get("plano", "basico"), extras)
            if not novo:
                self._json({"erro": "slug inválido (3-40, a-z/0-9/-), já existe ou nome ausente"}, 400)
                return
            self._json(novo)
            return

        if rota == "/api/saas/tenants/logo":
            if not self._precisa_saas():
                return
            if not slug_ok(ident):
                self._json({"erro": "tenant inválido"}, 400)
                return
            if not any(t.get("slug") == ident for t in carregar_registry().get("tenants", [])):
                self._json({"erro": "tenant não encontrado"}, 404)
                return
            b = self._corpo()
            dados = str(b.get("data") or "")
            m = re.match(r"^data:image/(png|jpe?g|webp);base64,([A-Za-z0-9+/=\s]+)$", dados)
            if not m:
                self._json({"erro": "envie uma imagem PNG, JPG ou WebP"}, 400)
                return
            try:
                bruto = base64.b64decode(m.group(2), validate=False)
            except Exception:
                self._json({"erro": "imagem inválida"}, 400)
                return
            if len(bruto) > 2 * 1024 * 1024:
                self._json({"erro": "imagem maior que 2 MB"}, 413)
                return
            ext = {"png": "png", "jpeg": "jpg", "jpg": "jpg", "webp": "webp"}[m.group(1).lower()]
            nome_arq = f"{ident}-logo-{int(time.time())}.{ext}"
            destino = os.path.join(BASE, "img", nome_arq)
            try:
                with open(destino, "wb") as f:
                    f.write(bruto)
            except Exception as e:
                self._json({"erro": f"não foi possível salvar: {e}"}, 500)
                return
            # limpa logos antigos do tenant (evita lixo em img/)
            try:
                for arq in os.listdir(os.path.join(BASE, "img")):
                    if arq.startswith(f"{ident}-logo-") and arq != nome_arq:
                        os.remove(os.path.join(BASE, "img", arq))
            except Exception:
                pass
            novo, erro = atualizar_tenant(ident, {"logo": f"/img/{nome_arq}"})
            if erro:
                self._json({"erro": erro}, 400)
                return
            self._json({"ok": True, "logo": f"/img/{nome_arq}", "tenant": novo})
            return

        if rota == "/api/saas/tenants/pagamentos":
            if not self._precisa_saas():
                return
            if not slug_ok(ident):
                self._json({"erro": "tenant inválido"}, 400)
                return
            if not any(t.get("slug") == ident for t in carregar_registry().get("tenants", [])):
                self._json({"erro": "tenant não encontrado"}, 404)
                return
            b = self._corpo()
            try:
                valor = round(float(str(b.get("valor", "")).replace(",", ".")), 2)
            except Exception:
                valor = 0
            if valor <= 0:
                self._json({"erro": "valor precisa ser maior que zero"}, 400)
                return
            dt = data_iso(b.get("data") or date.today().isoformat())
            if not dt:
                self._json({"erro": "data inválida (AAAA-MM-DD)"}, 400)
                return
            comp = str(b.get("competencia") or dt.strftime("%Y-%m"))
            if not re.match(r"^\d{4}-\d{2}$", comp):
                self._json({"erro": "competência inválida (AAAA-MM)"}, 400)
                return
            status = str(b.get("status") or "pago")
            if status not in PAG_STATUS:
                self._json({"erro": "status inválido"}, 400)
                return
            meio = str(b.get("meio") or "Outro")
            if meio not in PAG_MEIOS:
                meio = "Outro"
            fin = carregar_fin()
            e = fin_entry(fin, ident)
            pag = {"id": "P" + str(int(time.time() * 1000)),
                   "data": dt.isoformat(), "competencia": comp, "valor": valor,
                   "meio": meio, "status": status,
                   "obs": str(b.get("obs", "")).strip()[:200]}
            e["pagamentos"].append(pag)
            if b.get("adiantar_vencimento") and status == "pago":
                base = data_iso(e.get("vencimento") or "") or dt
                e["vencimento"] = somar_mes(max(base, dt)).isoformat()
            gravar(FIN_REG, fin)
            st, diff = fin_status(e)
            self._json({"pagamento": pag, "vencimento": e["vencimento"],
                        "status": st, "dias": diff})
            return

        if rota == "/api/saas/lojas":
            if not self._precisa_saas():
                return
            b = self._corpo()
            loja, erro = clonar_loja(b.get("slug", ""), b.get("nome", ""),
                                     b.get("zap", ""), b.get("email", ""),
                                     str(b.get("senha_inicial", "")),
                                     str(b.get("dominio", "")),
                                     str(b.get("doc", "")),
                                     str(b.get("tema", "artesanal")),
                                     str(b.get("template", "generico")))
            if not loja:
                self._json({"erro": erro}, 400)
                return
            loja = dict(loja)
            loja["no_ar"] = False
            loja["front"] = f"http://localhost:{loja['porta']}/"
            loja["painel"] = f"http://localhost:{loja['porta']}/editor.html"
            self._json(loja)
            return

        if rota == "/api/saas/lojas/reset-senha":
            if not self._precisa_saas():
                return
            if not slug_ok(ident):
                self._json({"erro": "loja inválida"}, 400)
                return
            reg = carregar_lojas()
            loja = next((x for x in reg["lojas"] if x.get("slug") == ident), None)
            if loja is None:
                self._json({"erro": "loja não encontrada"}, 404)
                return
            ddata = os.path.join(LOJAS_DIR, ident, "data")
            if not os.path.isdir(ddata):
                self._json({"erro": "ambiente da loja não encontrado"}, 404)
                return
            token = secrets.token_urlsafe(32)
            gravar(os.path.join(ddata, "reset.json"),
                   {"token": hx(token), "exp": time.time() + RESET_TTL})
            self._json({"token": token, "expira_min": RESET_TTL // 60})
            return

        if rota == "/api/redefinir-senha":
            b = self._corpo()
            nova = str(b.get("nova", ""))
            if len(nova) < 6:
                self._json({"erro": "a nova senha precisa de pelo menos 6 caracteres"}, 400)
                return
            rp = reset_path_para(slug)
            rec = ler(rp, None)
            if not isinstance(rec, dict) or rec.get("exp", 0) < time.time() or \
                    not hmac.compare_digest(str(rec.get("token", "")), hx(str(b.get("token", "")))):
                self._json({"erro": "link inválido ou expirado — gere um novo no suporte"}, 401)
                return
            try:
                os.remove(rp)  # uso único
            except Exception:
                pass
            TP = tpaths(slug)
            conf = garantir_admin(slug)
            conf["senha"] = hash_senha(nova)
            gravar(TP["admin"], conf)
            revogar_sessoes(slug)
            self._json({"ok": True})
            return

        if rota == "/api/saas/financeiro/pagamentos":
            if not self._precisa_saas():
                return
            if not slug_ok(ident):
                self._json({"erro": "loja inválida"}, 400)
                return
            reg = carregar_lojas()
            if not any(l.get("slug") == ident for l in reg.get("lojas", [])):
                self._json({"erro": "loja não encontrada"}, 404)
                return
            b = self._corpo()
            try:
                valor = round(float(str(b.get("valor", "")).replace(",", ".")), 2)
            except Exception:
                valor = 0
            if valor <= 0:
                self._json({"erro": "valor precisa ser maior que zero"}, 400)
                return
            dt = data_iso(b.get("data") or date.today().isoformat())
            if not dt:
                self._json({"erro": "data inválida (AAAA-MM-DD)"}, 400)
                return
            comp = str(b.get("competencia") or dt.strftime("%Y-%m"))
            if not re.match(r"^\d{4}-\d{2}$", comp):
                self._json({"erro": "competência inválida (AAAA-MM)"}, 400)
                return
            status = str(b.get("status") or "pago")
            if status not in PAG_STATUS:
                self._json({"erro": "status inválido"}, 400)
                return
            meio = str(b.get("meio") or "Outro")
            if meio not in PAG_MEIOS:
                meio = "Outro"
            fin = carregar_fin()
            e = fin_entry(fin, ident)
            pag = {"id": "P" + str(int(time.time() * 1000)),
                   "data": dt.isoformat(), "competencia": comp, "valor": valor,
                   "meio": meio, "status": status,
                   "obs": str(b.get("obs", "")).strip()[:200]}
            e["pagamentos"].append(pag)
            if b.get("adiantar_vencimento") and status == "pago":
                base = data_iso(e.get("vencimento") or "") or dt
                e["vencimento"] = somar_mes(max(base, dt)).isoformat()
            gravar(FIN_REG, fin)
            st, diff = fin_status(e)
            self._json({"pagamento": pag, "vencimento": e["vencimento"],
                        "status": st, "dias": diff})
            return

        if rota in ("/api/saas/lojas/ligar", "/api/saas/lojas/desligar"):
            if not self._precisa_saas():
                return
            if not slug_ok(ident):
                self._json({"erro": "loja inválida"}, 400)
                return
            reg = carregar_lojas()
            loja = next((x for x in reg["lojas"] if x.get("slug") == ident), None)
            if loja is None:
                self._json({"erro": "loja não encontrada"}, 404)
                return
            if rota.endswith("/ligar"):
                if loja.get("status") != "ativa":
                    self._json({"erro": "loja suspensa — ative antes de ligar"}, 400)
                    return
                ok, msg = ligar_loja(loja)
            else:
                ok, msg = desligar_loja(loja)
            time.sleep(0.5)
            loja = dict(loja)
            loja["no_ar"] = porta_viva(loja.get("porta", 0))
            self._json({"ok": ok, "msg": msg, "no_ar": loja["no_ar"],
                        "slug": loja["slug"], "porta": loja["porta"]},
                       200 if ok else 500)
            return

        if rota == "/api/admin/produtos":
            if not self._precisa_admin(slug):
                return
            b = self._corpo()
            nome = str(b.get("nome", "")).strip()
            if not nome:
                self._json({"erro": "informe o nome do produto"}, 400)
                return
            prods = ler(TP["catalogo"], [])
            if any(x.get("id") == b.get("id") for x in prods):
                self._json({"erro": "já existe um produto com este id"}, 400)
                return
            if not b.get("id"):
                b["id"] = novo_id(nome, prods)
            b = {k: v for k, v in b.items() if k in ("id", "nome", "cat", "preco", "tag", "desc", "foto", "video", "selo", "ordem", "colecao")}
            prods.append(b)
            gravar(TP["catalogo"], prods)
            self._json(b)
            return

        if rota == "/api/admin/upload":
            if not self._precisa_admin(slug):
                return
            b = self._corpo()
            dados = str(b.get("dados", ""))
            nome = str(b.get("nome", "imagem"))
            if not dados.startswith("data:") or "base64," not in dados:
                self._json({"erro": "envie uma imagem em base64"}, 400)
                return
            try:
                raw = base64.b64decode(dados.split("base64,", 1)[1])
            except Exception:
                self._json({"erro": "imagem inválida"}, 400)
                return
            if len(raw) > 8 * 1024 * 1024:
                self._json({"erro": "imagem muito grande (máx. 8 MB)"}, 400)
                return
            mt = dados.split(";", 1)[0].split("/", 1)[-1].lower()
            ext = {"png": ".png", "jpeg": ".jpg", "jpg": ".jpg", "webp": ".webp"}.get(mt)
            if not ext:
                self._json({"erro": "formato inválido (use PNG, WebP ou JPG)"}, 400)
                return
            valido = (
                (ext == ".png" and raw.startswith(b"\x89PNG\r\n\x1a\n")) or
                (ext == ".jpg" and raw.startswith(b"\xff\xd8\xff")) or
                (ext == ".webp" and len(raw) >= 12 and raw[:4] == b"RIFF" and raw[8:12] == b"WEBP")
            )
            if not valido:
                self._json({"erro": "o arquivo não é uma imagem válida"}, 400)
                return
            seg = re.sub(r"[^a-z0-9]+", "-", os.path.splitext(os.path.basename(nome))[0].lower()) or "imagem"
            arq = f"{seg}-{int(time.time())}-{os.urandom(3).hex()}{ext}"
            destino = TP["imgdir"] if not is_default(slug) else os.path.join(BASE, "img")
            os.makedirs(destino, exist_ok=True)
            with open(os.path.join(destino, arq), "wb") as f:
                f.write(raw)
            self._json({"arquivo": arq, "url": "img/" + arq})
            return

        if rota == "/api/admin/upload-midia":
            if not self._precisa_admin(slug):
                return
            b = self._corpo()
            dados = str(b.get("dados", ""))
            nome = str(b.get("nome", "midia"))
            if not dados.startswith("data:") or "base64," not in dados:
                self._json({"erro": "envie uma imagem ou vídeo em base64"}, 400)
                return
            try:
                raw = base64.b64decode(dados.split("base64,", 1)[1])
            except Exception:
                self._json({"erro": "arquivo inválido"}, 400)
                return
            mt = dados.split(";", 1)[0].split("/", 1)[-1].lower()
            ext = {"png": ".png", "jpeg": ".jpg", "jpg": ".jpg", "webp": ".webp",
                   "mp4": ".mp4", "webm": ".webm"}.get(mt)
            if not ext:
                self._json({"erro": "formato inválido (use PNG, WebP, JPG, MP4 ou WebM)"}, 400)
                return
            video = ext in (".mp4", ".webm")
            if len(raw) > (20 if video else 8) * 1024 * 1024:
                self._json({"erro": ("vídeo" if video else "imagem") + " muito grande (máx. " +
                            ("20 MB" if video else "8 MB") + ")"}, 400)
                return
            if video:
                valido = (ext == ".mp4" and b"ftyp" in raw[:64]) or \
                         (ext == ".webm" and raw.startswith(b"\x1aE\xdf\xa3"))
            else:
                valido = (
                    (ext == ".png" and raw.startswith(b"\x89PNG\r\n\x1a\n")) or
                    (ext == ".jpg" and raw.startswith(b"\xff\xd8\xff")) or
                    (ext == ".webp" and len(raw) >= 12 and raw[:4] == b"RIFF" and raw[8:12] == b"WEBP")
                )
            if not valido:
                self._json({"erro": "o arquivo não é uma mídia válida"}, 400)
                return
            seg = re.sub(r"[^a-z0-9]+", "-", os.path.splitext(os.path.basename(nome))[0].lower()) or "midia"
            arq = f"{seg}-{int(time.time())}-{os.urandom(3).hex()}{ext}"
            pasta = "video" if video else "img"
            if is_default(slug):
                destino = os.path.join(BASE, pasta)
            else:
                destino = os.path.join(tdir(slug), pasta)
            os.makedirs(destino, exist_ok=True)
            with open(os.path.join(destino, arq), "wb") as f:
                f.write(raw)
            self._json({"tipo": pasta, "arquivo": arq, "url": pasta + "/" + arq})
            return

        if rota == "/api/admin/upload-icone":
            if not self._precisa_admin(slug):
                return
            b = self._corpo()
            dados = str(b.get("dados", ""))
            nome = str(b.get("nome", "icone"))
            if not dados.startswith("data:") or "base64," not in dados:
                self._json({"erro": "envie um ícone em base64"}, 400)
                return
            mt = dados.split(";", 1)[0].split(":", 1)[-1].lower()
            ext = { "image/svg+xml": ".svg", "image/png": ".png",
                    "image/webp": ".webp", "image/jpeg": ".jpg" }.get(mt)
            if not ext:
                self._json({"erro": "formato inválido (use SVG, PNG, WebP ou JPG)"}, 400)
                return
            try:
                raw = base64.b64decode(dados.split("base64,", 1)[1])
            except Exception:
                self._json({"erro": "arquivo inválido"}, 400)
                return
            if len(raw) > ICONES_MAX:
                self._json({"erro": "ícone muito grande (máx. 2 MB)"}, 400)
                return
            if ext == ".svg":
                txt = raw.decode("utf-8", "ignore").lower()
                if "<script" in txt or "javascript:" in txt or "onload" in txt or "onerror" in txt:
                    self._json({"erro": "SVG com conteúdo bloqueado por segurança"}, 400)
                    return
            seg = re.sub(r"[^a-z0-9]+", "-", os.path.splitext(os.path.basename(nome))[0].lower()) or "icone"
            arq = f"{seg}-{int(time.time())}{ext}"
            with open(os.path.join(icones_dir(slug), arq), "wb") as f:
                f.write(raw)
            self._json({"arquivo": arq, "url": "img/icons/" + arq})
            return

        self._json({"erro": "rota não encontrada"}, 404)

    def do_PUT(self):
        if self._corpo_grande_demais():
            self._json({"erro": "dados muito grandes"}, 413)
            return
        p = urllib.parse.urlparse(self.path)
        slug = resolver_tenant(self.headers, self.headers.get("Host", ""), p.query)
        rota, ident = rotas(p.path)
        TP = tpaths(slug)

        if rota == "/api/saas/tenants":
            if not self._precisa_saas():
                return
            if not slug_ok(ident):
                self._json({"erro": "tenant inválido"}, 400)
                return
            b = self._corpo()
            atualizado, erro = atualizar_tenant(ident, b)
            if erro:
                self._json({"erro": erro}, 400)
                return
            if not atualizado:
                self._json({"erro": "tenant não encontrado"}, 404)
                return
            self._json(atualizado)
            return

        if rota == "/api/saas/tenants/financeiro":
            if not self._precisa_saas():
                return
            if not slug_ok(ident):
                self._json({"erro": "tenant inválido"}, 400)
                return
            if not any(t.get("slug") == ident for t in carregar_registry().get("tenants", [])):
                self._json({"erro": "tenant não encontrado"}, 404)
                return
            b = self._corpo()
            fin = carregar_fin()
            e = fin_entry(fin, ident)
            if "plano" in b:
                plano = str(b.get("plano") or "").strip().lower()
                if plano not in ("", *PLANOS_SAAS.keys()):
                    self._json({"erro": "plano inválido"}, 400)
                    return
                e["plano"] = plano
            if "mensalidade" in b:
                try:
                    mens = round(float(str(b.get("mensalidade")).replace(",", ".")), 2)
                except Exception:
                    self._json({"erro": "mensalidade inválida"}, 400)
                    return
                if mens < 0:
                    self._json({"erro": "mensalidade inválida"}, 400)
                    return
                e["mensalidade"] = mens
            if "vencimento" in b:
                v = str(b.get("vencimento") or "").strip()
                if v and not data_iso(v):
                    self._json({"erro": "vencimento inválido (AAAA-MM-DD)"}, 400)
                    return
                e["vencimento"] = v
            if "obs" in b:
                e["obs"] = str(b.get("obs", "")).strip()[:200]
            gravar(FIN_REG, fin)
            st, diff = fin_status(e)
            self._json({"slug": ident, "plano": e["plano"], "mensalidade": e["mensalidade"],
                        "vencimento": e["vencimento"], "status": st, "dias": diff})
            return

        if rota == "/api/saas/lojas":
            if not self._precisa_saas():
                return
            if not slug_ok(ident):
                self._json({"erro": "loja inválida"}, 400)
                return
            b = self._corpo()
            reg = carregar_lojas()
            idx = next((i for i, x in enumerate(reg["lojas"]) if x.get("slug") == ident), None)
            if idx is None:
                self._json({"erro": "loja não encontrada"}, 404)
                return
            if b.get("status") in ("ativa", "suspensa"):
                reg["lojas"][idx]["status"] = b["status"]
                salvar_lojas(reg)
            if "dominio" in b:
                dom, erro_dom = validar_dominio(b.get("dominio", ""), reg,
                                                exceto=reg["lojas"][idx].get("slug", ""))
                if erro_dom:
                    self._json({"erro": erro_dom}, 400)
                    return
                reg["lojas"][idx]["dominio"] = dom
                salvar_lojas(reg)
            if "doc" in b:
                doc_dig, doc_tipo, erro_doc = validar_doc(b.get("doc", ""))
                if erro_doc:
                    self._json({"erro": erro_doc}, 400)
                    return
                reg["lojas"][idx]["doc"] = doc_dig
                reg["lojas"][idx]["doc_tipo"] = doc_tipo
                salvar_lojas(reg)
            # dados cadastrais: registry + config.json da loja (fonte do front)
            if "nome" in b or "zap" in b or "email" in b:
                if "nome" in b:
                    nome = limpa_nome(b.get("nome", ""))
                    if not nome:
                        self._json({"erro": "nome não pode ficar vazio"}, 400)
                        return
                    reg["lojas"][idx]["nome"] = nome
                if "zap" in b:
                    zap = re.sub(r"\D", "", str(b.get("zap", "")))
                    if not zap:
                        self._json({"erro": "whatsapp inválido (use só números, com DDI)"}, 400)
                        return
                    reg["lojas"][idx]["zap"] = zap
                if "email" in b:
                    reg["lojas"][idx]["email"] = str(b.get("email", "")).strip()
                salvar_lojas(reg)
                try:
                    cfg_path = os.path.join(LOJAS_DIR, reg["lojas"][idx]["slug"], "config.json")
                    cfg = ler(cfg_path, {})
                    if isinstance(cfg, dict):
                        cfg.setdefault("geral", {})["nome"] = reg["lojas"][idx]["nome"]
                        cfg["geral"]["zap"] = reg["lojas"][idx]["zap"]
                        if "rodape" in cfg and isinstance(cfg["rodape"], dict):
                            cfg["rodape"]["titulo"] = reg["lojas"][idx]["nome"]
                        gravar(cfg_path, cfg)
                except Exception as e:
                    self._json({"erro": f"salvo no registro, mas config da loja falhou: {e}"}, 500)
                    return
            self._json(reg["lojas"][idx])
            return

        if rota == "/api/saas/financeiro":
            if not self._precisa_saas():
                return
            if ident is not None and not slug_ok(ident):
                self._json({"erro": "loja inválida"}, 400)
                return
            reg = carregar_lojas()
            if not any(l.get("slug") == ident for l in reg.get("lojas", [])):
                self._json({"erro": "loja não encontrada"}, 404)
                return
            b = self._corpo()
            fin = carregar_fin()
            e = fin_entry(fin, ident)
            if "plano" in b:
                plano = str(b.get("plano") or "")
                if plano not in ("", "basico", "pro"):
                    self._json({"erro": "plano inválido"}, 400)
                    return
                e["plano"] = plano
            if "mensalidade" in b:
                try:
                    mens = round(float(str(b.get("mensalidade")).replace(",", ".")), 2)
                except Exception:
                    self._json({"erro": "mensalidade inválida"}, 400)
                    return
                if mens < 0:
                    self._json({"erro": "mensalidade inválida"}, 400)
                    return
                e["mensalidade"] = mens
            if "vencimento" in b:
                v = str(b.get("vencimento") or "").strip()
                if v and not data_iso(v):
                    self._json({"erro": "vencimento inválido (AAAA-MM-DD)"}, 400)
                    return
                e["vencimento"] = v
            gravar(FIN_REG, fin)
            st, diff = fin_status(e)
            self._json({"slug": ident, "plano": e["plano"], "mensalidade": e["mensalidade"],
                        "vencimento": e["vencimento"], "status": st, "dias": diff})
            return

        if rota == "/api/saas/plataforma":
            if not self._precisa_saas():
                return
            b = self._corpo()
            p = carregar_plataforma()
            if "nome" in b and str(b.get("nome", "")).strip():
                p["nome"] = str(b.get("nome", "")).strip()[:80]
            if "whatsapp" in b:
                p["whatsapp"] = re.sub(r"\D", "", str(b.get("whatsapp", "")))[:20]
            if "whatsapp_tela" in b:
                p["whatsapp_tela"] = str(b.get("whatsapp_tela", "")).strip()[:30]
            if "dominio" in b:
                d = str(b.get("dominio", "")).strip().lower()
                d = re.sub(r"^https?://", "", d).split("/")[0]
                if d.startswith("www."):
                    d = d[4:]
                p["dominio"] = d.rstrip(".")[:120]
            gravar(PLATAFORMA, p)
            self._json({"ok": True, "nome": p["nome"], "whatsapp": p["whatsapp"],
                        "whatsapp_tela": p["whatsapp_tela"],
                        "dominio": p.get("dominio", "")})
            return

        if rota == "/api/saas/interesses":
            if not self._precisa_saas():
                return
            b = self._corpo()
            lst = ler(INTERESSES, [])
            idx = next((i for i, x in enumerate(lst) if x.get("id") == ident), None)
            if idx is None:
                self._json({"erro": "não encontrado"}, 404)
                return
            if b.get("status") in INT_STATUS:
                lst[idx]["status"] = b["status"]
                gravar(INTERESSES, lst)
            self._json(lst[idx])
            return

        if rota == "/api/admin/config":
            if not self._precisa_admin(slug):
                return
            b = self._corpo()
            if not isinstance(b, dict):
                self._json({"erro": "configuração inválida"}, 400)
                return
            gravar(TP["config"], b)
            self._json({"ok": True})
            return

        if rota == "/api/admin/produtos":
            if not self._precisa_admin(slug):
                return
            prods = ler(TP["catalogo"], [])
            idx = next((i for i, x in enumerate(prods) if x.get("id") == ident), None)
            if idx is None:
                self._json({"erro": "produto não encontrado"}, 404)
                return
            b = self._corpo()
            b["id"] = ident
            b = {k: v for k, v in b.items() if k in ("id", "nome", "cat", "preco", "tag", "desc", "foto", "video", "selo", "ordem", "colecao")}
            prods[idx] = b
            gravar(TP["catalogo"], prods)
            self._json(b)
            return

        if rota == "/api/admin/leads":
            if not self._precisa_admin(slug):
                return
            leads = ler(TP["leads"], [])
            idx = next((i for i, x in enumerate(leads) if x.get("id") == ident), None)
            if idx is None:
                self._json({"erro": "registro não encontrado"}, 404)
                return
            b = self._corpo()
            if not isinstance(b, dict):
                b = {}
            lead = leads[idx]
            if "status" in b:
                bruto = str(b.get("status") or "novo").strip().lower()
                if bruto not in STATUS_PEDIDO and bruto not in STATUS_LEGADO:
                    self._json({"erro": "status inválido"}, 400)
                    return
                novo = status_pedido(bruto)
                anterior = status_pedido(lead.get("status"))
                if novo != anterior:
                    ts = agora_iso()
                    lead["status"] = novo
                    lead["status_ts"] = ts
                    if novo == "concluido":
                        lead["concluido_ts"] = ts
                        lead.pop("cancelado_ts", None)
                    elif novo == "cancelado":
                        lead["cancelado_ts"] = ts
                        lead.pop("concluido_ts", None)
                    else:
                        lead.pop("concluido_ts", None)
                        lead.pop("cancelado_ts", None)
                if novo == "cancelado":
                    motivo = b.get("motivo_cancelamento", b.get("motivo", ""))
                    lead["motivo_cancelamento"] = str(motivo or lead.get("motivo_cancelamento") or "")[:300]
                else:
                    lead["motivo_cancelamento"] = ""
            if b.get("pagamento") in PAGAMENTOS:
                lead["pagamento"] = b["pagamento"]
            if b.get("entrega") in ENTREGAS:
                lead["entrega"] = b["entrega"]
            gravar(TP["leads"], leads)
            self._json(lead_publico(lead))
            return

        if rota == "/api/admin/clientes":
            if not self._precisa_admin(slug):
                return
            zap = normaliza_zap(ident)
            if not zap:
                self._json({"erro": "cliente inválido"}, 400)
                return
            b = self._corpo()
            if not isinstance(b, dict):
                b = {}
            extras = ler(TP["clientes"], {})
            if not isinstance(extras, dict):
                extras = {}
            reg = extras.get(zap) if isinstance(extras.get(zap), dict) else {}
            if "tags" in b:
                tags = b.get("tags") if isinstance(b.get("tags"), list) else []
                reg["tags"] = [str(t).strip()[:30] for t in tags if str(t).strip()][:12]
            if "notas" in b:
                reg["notas"] = str(b.get("notas") or "")[:1000]
            extras[zap] = reg
            gravar(TP["clientes"], extras)
            self._json({"whatsapp": zap, "tags": reg.get("tags", []),
                        "notas": reg.get("notas", "")})
            return

        self._json({"erro": "rota não encontrada"}, 404)

    def do_DELETE(self):
        if self._corpo_grande_demais():
            self._json({"erro": "dados muito grandes"}, 413)
            return
        p = urllib.parse.urlparse(self.path)
        slug = resolver_tenant(self.headers, self.headers.get("Host", ""), p.query)
        rota, ident = rotas(p.path)
        TP = tpaths(slug)

        if rota == "/api/saas/tenants":
            if not self._precisa_saas():
                return
            if not slug_ok(ident):
                self._json({"erro": "tenant inválido"}, 400)
                return
            ok, erro = apagar_tenant(ident)
            if not ok:
                self._json({"erro": erro}, 400)
                return
            self._json({"ok": True, "aviso": erro})
            return

        if rota == "/api/saas/lojas":
            if not self._precisa_saas():
                return
            if not slug_ok(ident):
                self._json({"erro": "loja inválida"}, 400)
                return
            reg = carregar_lojas()
            alvo = next((x for x in reg["lojas"] if x.get("slug") == ident), None)
            if alvo is None:
                self._json({"erro": "loja não encontrada"}, 404)
                return
            reg["lojas"] = [x for x in reg["lojas"] if x.get("slug") != ident]
            salvar_lojas(reg)
            # para o processo antes de apagar a pasta (evita órfão ocupando a porta)
            try:
                desligar_loja(alvo)
            except Exception:
                pass
            try:
                d = os.path.join(LOJAS_DIR, ident)
                if os.path.isdir(d):
                    shutil.rmtree(d)
            except Exception as e:
                self._json({"erro": f"registro removido, mas a pasta falhou: {e}"}, 500)
                return
            self._json({"ok": True})
            return

        if rota == "/api/admin/produtos":
            if not self._precisa_admin(slug):
                return
            prods = ler(TP["catalogo"], [])
            novo = [x for x in prods if x.get("id") != ident]
            if len(novo) == len(prods):
                self._json({"erro": "produto não encontrado"}, 404)
                return
            gravar(TP["catalogo"], novo)
            self._json({"ok": True})
            return

        if rota == "/api/admin/leads":
            if not self._precisa_admin(slug):
                return
            leads = ler(TP["leads"], [])
            novo = [x for x in leads if x.get("id") != ident]
            if len(novo) == len(leads):
                self._json({"erro": "registro não encontrado"}, 404)
                return
            gravar(TP["leads"], novo)
            self._json({"ok": True})
            return

        if rota == "/api/admin/icones":
            if not self._precisa_admin(slug):
                return
            arq = os.path.basename(ident or "")
            if not arq or not arq.lower().endswith(ICONES_EXT) or arq != ident:
                self._json({"erro": "ícone inválido"}, 400)
                return
            removido = False
            for d in ([os.path.join(tpaths(slug)["imgdir"], "icons")] if not is_default(slug) else []) + \
                     [os.path.join(BASE, "img", "icons")]:
                alvo = os.path.join(d, arq)
                if os.path.isfile(alvo):
                    try:
                        os.remove(alvo)
                        removido = True
                    except Exception:
                        pass
                    break
            if not removido:
                self._json({"erro": "ícone não encontrado"}, 404)
                return
            self._json({"ok": True})
            return

        if rota == "/api/saas/financeiro/pagamento":
            if not self._precisa_saas():
                return
            slug, pid = ident
            if not slug_ok(slug):
                self._json({"erro": "loja inválida"}, 400)
                return
            fin = carregar_fin()
            e = fin_entry(fin, slug)
            novo = [x for x in e.get("pagamentos", []) if x.get("id") != pid]
            if len(novo) == len(e.get("pagamentos", [])):
                self._json({"erro": "pagamento não encontrado"}, 404)
                return
            e["pagamentos"] = novo
            gravar(FIN_REG, fin)
            self._json({"ok": True})
            return

        if rota == "/api/saas/interesses":
            if not self._precisa_saas():
                return
            lst = ler(INTERESSES, [])
            novo = [x for x in lst if x.get("id") != ident]
            if len(novo) == len(lst):
                self._json({"erro": "não encontrado"}, 404)
                return
            gravar(INTERESSES, novo)
            self._json({"ok": True})
            return

        self._json({"erro": "rota não encontrada"}, 404)

    def _registrar_lead(self, b, slug):
        TP = tpaths(slug)
        leads = ler(TP["leads"], [])
        if not isinstance(b, dict):
            b = {}
        itens = b.get("itens") if isinstance(b.get("itens"), list) else []
        itens = itens[:50]
        limpos = []
        for it in itens:
            if not isinstance(it, dict):
                continue
            try:
                qtd = max(1, min(int(it.get("q") or 1), 99))
            except Exception:
                qtd = 1
            limpos.append({
                "id": str(it.get("id", ""))[:80],
                "nome": str(it.get("nome", "Peça"))[:120],
                "q": qtd,
                "preco": it.get("preco") if isinstance(it.get("preco"), (int, float)) else None,
            })
        try:
            total = b.get("total")
            total = round(float(total), 2) if total is not None else None
        except Exception:
            total = None
        ts = agora_iso()
        reg = {
            "id": "L" + str(int(time.time() * 1000)),
            "ts": ts,
            "tipo": "pedido" if b.get("tipo") == "pedido" else "contato",
            "origem": str(b.get("origem", ""))[:120],
            "nome": str(b.get("nome", "")).strip()[:120],
            "whatsapp": str(b.get("whatsapp", "")).strip()[:30],
            "itens": limpos,
            "total": total,
            "cep": str(b.get("cep", "")).strip()[:100],
            "obs": str(b.get("obs", "")).strip()[:500],
            "status": "novo",
            "status_ts": ts,
            "pagamento": "pendente",
            "entrega": str(b.get("entrega", "")).strip()[:20],
            "consentimento_lgpd": bool(b.get("consentimento_lgpd")),
        }
        leads.append(reg)
        gravar(TP["leads"], leads)
        self._json({"ok": True, "id": reg["id"]})


def criar_tenant(slug, nome, zap, email="", plano="basico", extras=None):
    slug = (slug or "").strip().lower()
    nome = limpa_nome(nome)
    zap = re.sub(r"\D", "", zap or "")
    if not re.match(r"^[a-z0-9-]{3,40}$", slug) or not nome:
        return None
    if slug in ("admin", "api", "www", "app", "painel", "super-admin"):
        return None
    reg = carregar_registry()
    if any(t.get("slug") == slug for t in reg.get("tenants", [])):
        return None
    d = os.path.join(TENANTS_DIR, slug)
    os.makedirs(os.path.join(d, "img"), exist_ok=True)
    # seed: dados neutros do template genérico (zero vínculo com a loja padrão)
    try:
        import shutil
        tdir0 = resolver_template_dir("generico-hml")
        for src, dst in ((os.path.join(tdir0, "config.json"), os.path.join(d, "config.json")),
                         (os.path.join(tdir0, "catalog.json"), os.path.join(d, "catalog.json")),
                         (os.path.join(tdir0, "manifest.webmanifest"), os.path.join(d, "manifest.webmanifest"))):
            if os.path.isfile(src) and not os.path.isfile(dst):
                shutil.copyfile(src, dst)
        imgt = os.path.join(tdir0, "img")
        if os.path.isdir(imgt):
            shutil.copytree(imgt, os.path.join(d, "img"), dirs_exist_ok=True)
        # personaliza identidade mínima
        cfg = ler(os.path.join(d, "config.json"), {})
        if isinstance(cfg, dict):
            cfg.setdefault("geral", {})["nome"] = nome
            cfg["geral"]["zap"] = zap
            vis = cfg.setdefault("visual", {}) if isinstance(cfg.setdefault("visual", {}), dict) else {}
            vis["logo"] = "logo.webp"
            gravar(os.path.join(d, "config.json"), cfg)
        # logo padrão da plataforma até o super admin enviar a marca do cliente
        padrao = os.path.join(BASE, "img", "logo-default.webp")
        if os.path.isfile(padrao):
            shutil.copyfile(padrao, os.path.join(d, "img", "logo.webp"))
        gravar(os.path.join(d, "leads.json"), [])
        gravar(os.path.join(d, "admin.json"), {"senha": hash_senha(SEED_ADMIN_PASS)})
    except Exception:
        pass
    t = {"slug": slug, "nome": nome, "email": email, "zap": zap,
         "plano": plano if plano in PLANOS_SAAS else "basico",
         "status": "ativo", "dominio_custom": "",
         "logo": "/img/logo-default.webp", "cores_botao": "#2E7CFF", "cores_bg": "#F4F6FB",
         "tagline": "", "segmento": "",
         "created_at": time.strftime("%Y-%m-%dT%H:%M:%S")}
    reg["tenants"].append(t)
    gravar(REGISTRY, reg)
    if isinstance(extras, dict) and extras:
        atualizado, erro = atualizar_tenant(slug, extras)
        if erro:
            return None
        if atualizado:
            return atualizado
    return t


# ---------- lojas isoladas (1 pasta + 1 processo por cliente) ----------
LOJAS_DIR = os.path.join(BASE, "lojas")
RESET_TTL = 1800  # link de reset de senha: 30 min, uso único


def reset_path_para(slug):
    """reset.json ao lado do admin.json do tenant/loja."""
    return os.path.join(os.path.dirname(tpaths(slug)["admin"]), "reset.json")
LOJAS_REG = os.path.join(BASE, "saas", "lojas.json")
TEMPLATE_DIR = os.path.join(BASE, "saas", "template")
LOJAS_PORTA_BASE = 8331
# código vai junto; DADOS vêm do template (loja nova nasce em branco)
LOJAS_IGNORAR = {"lojas", "tenants", "backups", "__pycache__", ".git", ".DS_Store",
                 "saas", "db", "config.json", "manifest.webmanifest"}


def carregar_lojas():
    reg = ler(LOJAS_REG, None)
    if not isinstance(reg, dict) or "lojas" not in reg:
        reg = {"lojas": []}
        gravar(LOJAS_REG, reg)
    return reg


def salvar_lojas(reg):
    gravar(LOJAS_REG, reg)


def porta_viva(porta):
    try:
        s = socket.create_connection(("127.0.0.1", int(porta)), timeout=1)
        s.close()
        return True
    except Exception:
        return False


DOMINIO_RE = re.compile(r"^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$")


def validar_doc(doc):
    """Valida CPF (11) ou CNPJ (14) com dígito verificador.
    Retorna (só_dígitos, 'cpf'|'cnpj'|''. Erro vazio = ok (vazio permitido)."""
    d = re.sub(r"\D", "", str(doc or ""))
    if not d:
        return "", "", ""
    if len(d) not in (11, 14) or len(set(d)) == 1:
        return "", "", "CPF/CNPJ inválido (dígitos insuficientes ou repetidos)"
    nums = [int(x) for x in d]
    if len(d) == 11:
        for i in (9, 10):
            s = sum(nums[j] * (i + 1 - j) for j in range(i))
            if nums[i] != (s * 10 % 11) % 10:
                return "", "", "CPF inválido (dígito verificador)"
        return d, "cpf", ""
    for i in (12, 13):
        pesos = ([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] if i == 12
                 else [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
        s = sum(nums[j] * pesos[j] for j in range(i))
        r = s % 11
        if nums[i] != (0 if r < 2 else 11 - r):
            return "", "", "CNPJ inválido (dígito verificador)"
    return d, "cnpj", ""


def validar_dominio(dom, reg, exceto=""):
    """Normaliza e valida domínio próprio. Retorna (dom|\"\", erro|\"\")."""
    dom = (dom or "").strip().lower().rstrip(".")
    if not dom:
        return "", ""
    if not DOMINIO_RE.match(dom):
        return "", "domínio inválido (ex.: lojadoana.com.br)"
    for l in reg.get("lojas", []):
        if l.get("slug") != exceto and (l.get("dominio") or "").lower() == dom:
            return "", "domínio já usado por outra loja"
    return dom, ""


PIDDIR = "/tmp/saas_lojas"  # mesmo path de scripts/lojas.py (CLI e API interoperam)


def pidfile(slug):
    os.makedirs(PIDDIR, exist_ok=True)
    return os.path.join(PIDDIR, slug + ".pid")


def ligar_loja(loja):
    """Sobe o processo da loja isolada. Retorna (ok, msg)."""
    porta = int(loja.get("porta", 0))
    slug = loja.get("slug", "")
    if porta_viva(porta):
        return True, "já estava no ar"
    path = os.path.join(LOJAS_DIR, slug)
    if not os.path.isfile(os.path.join(path, "server.py")):
        return False, "pasta do ambiente não encontrada"
    try:
        host = os.environ.get("HOST", "127.0.0.1")  # 0.0.0.0 p/ testar no celular (mesmo Wi-Fi)
        log = open(os.path.join(tempfile.gettempdir(), f"saas_{slug}.log"), "a", encoding="utf-8")
        try:
            p = subprocess.Popen([sys.executable, "server.py", "--host", host, "--port", str(porta)],
                                 cwd=path, stdout=log, stderr=log, close_fds=True)
        finally:
            log.close()  # o filho mantém o fd; o pai fecha p/ não vazar (Too many open files)
        open(pidfile(slug), "w").write(str(p.pid))
        return True, f"processo iniciado (pid {p.pid})"
    except Exception as e:
        return False, f"falha ao iniciar: {e}"


def desligar_loja(loja):
    """Para o processo da loja isolada. Retorna (ok, msg)."""
    slug = loja.get("slug", "")
    porta = int(loja.get("porta", 0) or 0)
    pf = pidfile(slug)
    try:
        pid = int(open(pf).read().strip())
    except Exception:
        pid = 0
    if pid:
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        except Exception as e:
            return False, f"falha ao parar: {e}"
        try:
            os.remove(pf)
        except Exception:
            pass
        return True, "processo parado"
    # sem pidfile (ex.: processo subido pelo terminal): localiza pela porta
    if porta and porta_viva(porta):
        achados = pids_na_porta(porta)
        if not achados:
            return False, "no ar mas sem controle (reinicie pelo terminal)"
        for p in achados:
            try:
                os.kill(p, signal.SIGTERM)
            except Exception:
                pass
        return True, "processo parado (localizado pela porta)"
    return True, "já estava parada"


def pids_na_porta(porta):
    """PIDs ouvindo na porta TCP (fallback sem pidfile)."""
    try:
        out = subprocess.run(["lsof", "-ti", f"tcp:{int(porta)}"],
                             capture_output=True, text=True, timeout=5)
        pids = [int(x) for x in out.stdout.split() if x.strip().isdigit()]
        return [p for p in pids if p != os.getpid()]
    except Exception:
        return []


TEMAS_REG = os.path.join(BASE, "saas", "temas.json")


def carregar_temas():
    reg = ler(TEMAS_REG, None)
    if isinstance(reg, dict) and isinstance(reg.get("temas"), list):
        return [t for t in reg["temas"] if isinstance(t, dict) and t.get("id")]
    return []


def achar_tema(tid):
    tid = (tid or "").strip().lower()
    for t in carregar_temas():
        if t.get("id") == tid:
            return t
    return None


TEMPLATES_DIR = os.path.join(BASE, "saas", "templates")


def listar_templates():
    """Lista templates de loja (saas/templates/<id>/ + fallback legado saas/template/)."""
    out = []
    vistos = set()
    try:
        nomes = sorted(os.listdir(TEMPLATES_DIR))
    except OSError:
        nomes = []
    for nid in nomes:
        if nid.startswith("."):
            continue
        tdir = os.path.join(TEMPLATES_DIR, nid)
        if not os.path.isdir(tdir):
            continue
        meta = ler(os.path.join(tdir, "meta.json"), {})
        if not isinstance(meta, dict):
            meta = {}
        nid_norm = str(meta.get("id") or nid).strip().lower()
        if not nid_norm or nid_norm in vistos:
            continue
        vistos.add(nid_norm)
        out.append({"id": nid_norm,
                    "nome": meta.get("nome") or nid_norm,
                    "descricao": meta.get("descricao") or "",
                    "segmento": meta.get("segmento") or "",
                    "tema": (meta.get("tema") or "artesanal")})
    if "generico" not in vistos and os.path.isdir(TEMPLATE_DIR):
        out.insert(0, {"id": "generico", "nome": "Genérica",
                       "descricao": "Loja em branco para qualquer segmento.",
                       "segmento": "qualquer", "tema": "artesanal"})
    return out


def resolver_template_dir(tid):
    """Diretório de dados do template; fallback: saas/templates/generico, depois saas/template legado."""
    tid = (tid or "").strip().lower() or "generico"
    cand = os.path.join(TEMPLATES_DIR, tid)
    if os.path.isdir(cand) and os.path.isfile(os.path.join(cand, "config.json")):
        return cand
    gen = os.path.join(TEMPLATES_DIR, "generico")
    if os.path.isdir(gen) and os.path.isfile(os.path.join(gen, "config.json")):
        return gen
    return TEMPLATE_DIR


def meta_template(tid):
    tdir = resolver_template_dir(tid)
    meta = ler(os.path.join(tdir, "meta.json"), {})
    return meta if isinstance(meta, dict) else {}


def clonar_loja(slug, nome, zap, email="", senha_inicial="", dominio="", doc="", tema="artesanal", template="generico"):
    slug = (slug or "").strip().lower()
    nome = limpa_nome(nome)
    zap = re.sub(r"\D", "", zap or "")
    if not re.match(r"^[a-z0-9-]{3,40}$", slug) or not nome or not zap:
        return None, "slug inválido, nome ou zap ausentes"
    reg = carregar_lojas()
    if any(l.get("slug") == slug for l in reg["lojas"]):
        return None, "já existe uma loja com este slug"
    doc_dig, doc_tipo, erro_doc = validar_doc(doc)
    if erro_doc:
        return None, erro_doc
    dominio, erro_dom = validar_dominio(dominio, reg)
    if erro_dom:
        return None, erro_dom
    usadas = {l.get("porta") for l in reg["lojas"]}
    porta = LOJAS_PORTA_BASE
    while porta in usadas:
        porta += 1
    dest = os.path.join(LOJAS_DIR, slug)

    def ign(d, nomes):
        rel = os.path.relpath(d, BASE)
        if rel == ".":
            return [n for n in nomes if n in LOJAS_IGNORAR]
        return [n for n in nomes if n == ".DS_Store"]

    try:
        shutil.copytree(BASE, dest, ignore=ign)
    except Exception as e:
        return None, f"falha ao clonar: {e}"
    # a loja clonada não leva o painel superadmin nem o sitemap da loja principal
    for extra in ("saas-admin.html", "sitemap.xml"):
        try:
            p = os.path.join(dest, extra)
            if os.path.isfile(p):
                os.remove(p)
        except Exception:
            pass
    # marca como clone: SEO (canonical/og) usa o Host real, nunca o domínio principal
    try:
        open(os.path.join(dest, ".clone-saas"), "w").write(slug)
    except Exception:
        pass
    try:
        # ---- dados: tudo vem do template escolhido (só dados, código é único) ----
        tdir = resolver_template_dir(template)
        tmeta = meta_template(template)
        tcfg = ler(os.path.join(tdir, "config.json"), {})
        tcfg.setdefault("geral", {})["nome"] = nome
        tcfg["geral"]["zap"] = zap
        # tema visual inicial: o escolhido no painel, com fallback p/ o sugerido do template
        pres = achar_tema(tema) or achar_tema(tmeta.get("tema")) or achar_tema("artesanal")
        if pres:
            vis = tcfg.setdefault("visual", {})
            if isinstance(pres.get("cores"), dict):
                vis["cores"] = dict(pres["cores"])
            if isinstance(pres.get("fontes"), dict):
                vis["fontes"] = pres["fontes"]
        if not tcfg.setdefault("rodape", {}).get("titulo"):
            tcfg["rodape"]["titulo"] = nome
        gravar(os.path.join(dest, "config.json"), tcfg)
        gravar(os.path.join(dest, "js", "catalog.json"),
               ler(os.path.join(tdir, "catalog.json"), []))
        man = ler(os.path.join(tdir, "manifest.webmanifest"), None)
        if isinstance(man, dict):
            man["name"] = nome
            man["short_name"] = nome
            gravar(os.path.join(dest, "manifest.webmanifest"), man)
        # imagens: só as neutras do template + marca da plataforma (rodapé)
        imgd = os.path.join(dest, "img")
        shutil.rmtree(imgd, ignore_errors=True)
        shutil.copytree(os.path.join(tdir, "img"), imgd)
        # marca da plataforma (rodapé "Site feito por")
        try:
            mm = os.path.join(imgd, "marca")
            os.makedirs(mm, exist_ok=True)
            for f in ("simbolo-cor.svg", "simbolo-cor.png"):
                o = os.path.join(BASE, "img", "marca", f)
                if os.path.isfile(o):
                    shutil.copyfile(o, os.path.join(mm, f))
        except Exception:
            pass
        # vídeos: começam vazios (dono envia os dele pelo painel futuramente)
        vidd = os.path.join(dest, "video")
        shutil.rmtree(vidd, ignore_errors=True)
        os.makedirs(vidd, exist_ok=True)
        gravar(os.path.join(dest, "data", "leads.json"), [])
        # temas visuais disponíveis também dentro da loja (painel usa /api/temas local)
        try:
            if os.path.isfile(TEMAS_REG):
                os.makedirs(os.path.join(dest, "saas"), exist_ok=True)
                shutil.copyfile(TEMAS_REG, os.path.join(dest, "saas", "temas.json"))
        except Exception:
            pass
        pwd = senha_inicial if len(senha_inicial) >= 6 else SEED_ADMIN_PASS
        gravar(os.path.join(dest, "data", "admin.json"), {"senha": hash_senha(pwd)})
        env_path = os.path.join(dest, ".env")
        if not os.path.exists(env_path):
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(f"DEFAULT_TENANT={slug}\nPORT={porta}\nHOST=127.0.0.1\n")
    except Exception as e:
        return None, f"falha ao personalizar: {e}"
    loja = {"slug": slug, "nome": nome, "email": email, "zap": zap,
            "porta": porta, "path": f"lojas/{slug}", "status": "ativa",
            "dominio": dominio, "doc": doc_dig, "doc_tipo": doc_tipo,
            "template": (template or "generico").strip().lower() or "generico",
            "tema": (tema or "artesanal").strip().lower() or "artesanal",
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%S")}
    reg["lojas"].append(loja)
    salvar_lojas(reg)
    return loja, ""


# ---------- financeiro (controle de pagamentos dos clientes) ----------
FIN_REG = os.path.join(BASE, "saas", "financeiro.json")
PAG_MEIOS = ("Pix", "Boleto", "Cartão", "Transferência", "Dinheiro", "Outro")
PAG_STATUS = ("pago", "pendente", "cancelado")


def carregar_fin():
    reg = ler(FIN_REG, None)
    if not isinstance(reg, dict) or "lojas" not in reg:
        reg = {"lojas": {}}
        gravar(FIN_REG, reg)
    return reg


def carregar_plataforma():
    p = ler(PLATAFORMA, None)
    if not isinstance(p, dict):
        p = {"nome": "Super Loja", "whatsapp": "", "whatsapp_tela": "", "dominio": ""}
        gravar(PLATAFORMA, p)
    p.setdefault("nome", "Super Loja")
    p.setdefault("whatsapp", "")
    p.setdefault("whatsapp_tela", "")
    p.setdefault("dominio", "")
    return p


def host_plataforma():
    """Domínio oficial da plataforma (configurável no superadmin)."""
    return str(carregar_plataforma().get("dominio", "") or "").strip().lower().rstrip(".")


def fin_entry(reg, slug):
    e = reg["lojas"].get(slug)
    if not isinstance(e, dict):
        e = {"plano": "", "mensalidade": 0, "vencimento": "", "pagamentos": []}
        reg["lojas"][slug] = e
    e.setdefault("plano", "")
    e.setdefault("mensalidade", 0)
    e.setdefault("vencimento", "")
    e.setdefault("pagamentos", [])
    return e


def data_iso(v):
    try:
        return datetime.strptime(str(v)[:10], "%Y-%m-%d").date()
    except Exception:
        return None


def somar_mes(d, n=1):
    import calendar
    m = d.month - 1 + n
    ano, mes = d.year + m // 12, m % 12 + 1
    return date(ano, mes, min(d.day, calendar.monthrange(ano, mes)[1]))


def fin_status(e, hoje=None):
    hoje = hoje or date.today()
    try:
        mens = float(e.get("mensalidade") or 0)
    except Exception:
        mens = 0
    venc = data_iso(e.get("vencimento") or "")
    if mens <= 0 and not venc:
        return "sem_cobranca", None
    if not venc:
        return "sem_vencimento", None
    diff = (venc - hoje).days
    if diff < 0:
        return "atrasado", diff
    if diff <= 7:
        return "vence_proximo", diff
    return "em_dia", diff


def fin_resumo(reg, lojas):
    hoje = date.today()
    mes = hoje.strftime("%Y-%m")
    mrr = 0.0
    recebido = 0.0
    atrasados = sem_cob = 0
    for l in lojas:
        e = fin_entry(reg, l["slug"])
        try:
            mrr += float(e.get("mensalidade") or 0) if l.get("status") == "ativa" and e.get("plano") else 0
        except Exception:
            pass
        for p in e.get("pagamentos", []):
            if p.get("status") == "pago" and str(p.get("data", ""))[:7] == mes:
                try:
                    recebido += float(p.get("valor") or 0)
                except Exception:
                    pass
        st, _ = fin_status(e, hoje)
        if st == "atrasado" and l.get("status") == "ativa":
            atrasados += 1
        if st == "sem_cobranca":
            sem_cob += 1
    return {"mrr": round(mrr, 2), "recebido_mes": round(recebido, 2),
            "mes": mes, "atrasados": atrasados, "sem_cobranca": sem_cob}


def resumo_plataforma(dias=14):
    """Agregado da plataforma: vendas das lojas + financeiro + interessados."""
    hoje = date.today()
    dias_lista = [(hoje - timedelta(days=i)).isoformat() for i in range(dias - 1, -1, -1)]
    serie = {d: {"dia": d, "pedidos": 0, "receita": 0.0, "contatos": 0} for d in dias_lista}
    reg = carregar_lojas()
    fin = carregar_fin()
    lojas_out, top, origens = [], {}, {}
    tot = {"produtos": 0, "contatos": 0, "novos": 0, "pedidos": 0, "receita": 0.0}
    for l in reg.get("lojas", []):
        slug = l.get("slug", "")
        base = os.path.join(LOJAS_DIR, slug)
        try:
            prods = ler(os.path.join(base, "js", "catalog.json"), [])
            n_prods = len(prods) if isinstance(prods, list) else 0
        except Exception:
            n_prods = 0
        try:
            leads = ler(os.path.join(base, "data", "leads.json"), [])
            if not isinstance(leads, list):
                leads = []
        except Exception:
            leads = []
        c_ped = c_cont = c_novos = 0
        rec = 0.0
        for ld in leads:
            if not isinstance(ld, dict):
                continue
            dia = str(ld.get("ts", ""))[:10]
            tipo = ld.get("tipo")
            if tipo == "pedido":
                c_ped += 1
                try:
                    rec += float(ld.get("total") or 0)
                except Exception:
                    pass
                if dia in serie:
                    serie[dia]["pedidos"] += 1
                    try:
                        serie[dia]["receita"] += float(ld.get("total") or 0)
                    except Exception:
                        pass
                for it in ld.get("itens") or []:
                    if not isinstance(it, dict):
                        continue
                    nome = str(it.get("nome") or "Peça").strip()[:80]
                    try:
                        q = int(it.get("q") or 1)
                    except Exception:
                        q = 1
                    e = top.setdefault(nome, {"nome": nome, "qtd": 0, "receita": 0.0})
                    e["qtd"] += q
                    try:
                        pr = it.get("preco")
                        if isinstance(pr, (int, float)):
                            e["receita"] += q * pr
                    except Exception:
                        pass
            else:
                c_cont += 1
                if dia in serie:
                    serie[dia]["contatos"] += 1
            if ld.get("status") == "novo":
                c_novos += 1
            og = str(ld.get("origem") or "site").strip()[:60] or "site"
            origens[og] = origens.get(og, 0) + 1
        tot["produtos"] += n_prods
        tot["contatos"] += c_cont
        tot["novos"] += c_novos
        tot["pedidos"] += c_ped
        tot["receita"] += rec
        e = fin_entry(fin, slug)
        lojas_out.append({"slug": slug, "nome": l.get("nome", ""),
                          "status": l.get("status", ""),
                          "no_ar": porta_viva(l.get("porta", 0)),
                          "plano": e.get("plano", ""),
                          "produtos": n_prods, "contatos": c_cont,
                          "novos": c_novos, "pedidos": c_ped,
                          "receita": round(rec, 2)})
    lojas_out.sort(key=lambda x: x["receita"], reverse=True)
    try:
        interesses = ler(INTERESSES, [])
        if not isinstance(interesses, list):
            interesses = []
    except Exception:
        interesses = []
    int_por = {}
    for it in interesses:
        st = it.get("status", "novo") if isinstance(it, dict) else "novo"
        int_por[st] = int_por.get(st, 0) + 1
    n_int = len(interesses)
    n_conv = int_por.get("convertido", 0)
    fr = fin_resumo(fin, reg.get("lojas", []))
    tot["receita"] = round(tot["receita"], 2)
    return {
        "gerado_em": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "totais": {
            "lojas": len(lojas_out),
            "ativas": sum(1 for l in lojas_out if l["status"] == "ativa"),
            "no_ar": sum(1 for l in lojas_out if l["no_ar"]),
            "produtos": tot["produtos"], "contatos": tot["contatos"],
            "novos": tot["novos"], "pedidos": tot["pedidos"],
            "receita": tot["receita"],
            "ticket_medio": round(tot["receita"] / tot["pedidos"], 2) if tot["pedidos"] else 0,
            "mrr": fr.get("mrr", 0), "recebido_mes": fr.get("recebido_mes", 0),
            "mes": fr.get("mes", ""), "atrasados": fr.get("atrasados", 0),
            "interessados": n_int,
            "conversao_int": round(100 * n_conv / n_int, 1) if n_int else 0,
        },
        "serie": [dict(v, receita=round(v["receita"], 2)) for v in serie.values()],
        "top_produtos": sorted(top.values(), key=lambda x: x["qtd"], reverse=True)[:8],
        "origens": sorted(({"origem": k, "n": v} for k, v in origens.items()),
                          key=lambda x: x["n"], reverse=True)[:8],
        "interesses": int_por,
        "lojas": lojas_out,
    }


def painel_tenants(dias=30):
    """Agregado real usado pelo Super Admin de homologação.

    Fonte: saas/tenants.json (cadastro/branding), saas/financeiro.json
    (cobranças/pagamentos) e tenants/<slug>/leads.json (pedidos/contatos).
    """
    hoje = date.today()
    corte = (hoje - timedelta(days=max(1, dias))).isoformat()
    mes_atual = hoje.strftime("%Y-%m")
    reg = carregar_registry()
    fin = carregar_fin()
    tenants = []
    atividades = []
    top_produtos = {}
    origens = {}
    metodos = {}
    serie_recebido = {}
    serie_pedidos_receita = {}
    serie_pedidos_qtd = {}
    total = {"tenants": 0, "ativos": 0, "pendentes": 0, "suspensos": 0,
             "pedidos": 0, "pedidos_30d": 0, "receita": 0.0, "receita_30d": 0.0,
             "contatos": 0, "novos": 0, "concluidos": 0, "cancelados": 0,
             "recebido_total": 0.0, "recebido_mes": 0.0,
             "mrr": 0.0, "atrasados": 0, "sem_cobranca": 0, "ticket_medio": 0.0,
             "conversao": 0.0, "inadimplencia": 0.0}
    planos = {k: {"codigo": k, "nome": v["nome"], "preco": v["preco"],
                  "tenants": 0, "mrr": 0.0}
              for k, v in PLANOS_SAAS.items()}
    segmentos = {}

    for t in reg.get("tenants", []):
        slug = t.get("slug", "")
        if not slug:
            continue
        nome = t.get("nome") or slug
        e = fin_entry(fin, slug)
        st, diff = fin_status(e, hoje)
        leads = ler(tpaths(slug)["leads"], [])
        if not isinstance(leads, list):
            leads = []
        vendas = {"pedidos": 0, "pedidos_30d": 0, "receita": 0.0, "receita_30d": 0.0,
                  "contatos": 0, "novos": 0, "concluidos": 0, "cancelados": 0,
                  "ticket_medio": 0.0, "ultimo": ""}
        for ld in leads:
            if not isinstance(ld, dict):
                continue
            ts = str(ld.get("ts") or "")
            if ts > vendas["ultimo"]:
                vendas["ultimo"] = ts
            dia = ts[:10]
            st_lead = status_pedido(ld.get("status"))
            if st_lead == "novo":
                vendas["novos"] += 1
            elif st_lead == "concluido":
                vendas["concluidos"] += 1
            elif st_lead == "cancelado":
                vendas["cancelados"] += 1
            og = str(ld.get("origem") or "site").strip()[:60] or "site"
            origens[og] = origens.get(og, 0) + 1
            if ld.get("tipo") == "pedido":
                try:
                    valor = float(ld.get("total") or 0)
                except Exception:
                    valor = 0.0
                vendas["pedidos"] += 1
                vendas["receita"] += valor
                if dia and dia >= corte:
                    vendas["pedidos_30d"] += 1
                    vendas["receita_30d"] += valor
                if ts:
                    chave = ts[:7]
                    serie_pedidos_qtd[chave] = serie_pedidos_qtd.get(chave, 0) + 1
                    serie_pedidos_receita[chave] = serie_pedidos_receita.get(chave, 0.0) + valor
                    atividades.append({"tipo": "pedido", "slug": slug, "nome": nome,
                                       "titulo": "Pedido " + st_lead.replace("_", " "),
                                       "detalhe": f"{nome} · R$ {valor:.2f}".replace(".", ","),
                                       "ts": ts})
                for it in ld.get("itens") or []:
                    if not isinstance(it, dict):
                        continue
                    pnome = str(it.get("nome") or "Item").strip()[:80]
                    try:
                        qtd = int(it.get("q") or 1)
                    except Exception:
                        qtd = 1
                    try:
                        preco = float(it.get("preco") or 0)
                    except Exception:
                        preco = 0.0
                    item = top_produtos.setdefault(pnome, {"nome": pnome, "qtd": 0, "receita": 0.0})
                    item["qtd"] += qtd
                    item["receita"] += preco * qtd
            else:
                vendas["contatos"] += 1
                if ts:
                    atividades.append({"tipo": "contato", "slug": slug, "nome": nome,
                                       "titulo": "Novo contato",
                                       "detalhe": f"{nome} · {og}",
                                       "ts": ts})
        vendas["ticket_medio"] = round(vendas["receita"] / vendas["pedidos"], 2) if vendas["pedidos"] else 0.0

        recebido = 0.0
        pagamentos = []
        for p in e.get("pagamentos", []):
            if not isinstance(p, dict):
                continue
            data_p = str(p.get("data") or "")
            try:
                valor_p = float(p.get("valor") or 0)
            except Exception:
                valor_p = 0.0
            pagamentos.append(p)
            if p.get("status") == "pago":
                recebido += valor_p
                if data_p[:7]:
                    serie_recebido[data_p[:7]] = serie_recebido.get(data_p[:7], 0.0) + valor_p
                if data_p[:7] == mes_atual:
                    total["recebido_mes"] += valor_p
                meio = str(p.get("meio") or "Outro")
                metodos[meio] = metodos.get(meio, 0.0) + valor_p
                atividades.append({"tipo": "pagamento", "slug": slug, "nome": nome,
                                   "titulo": "Pagamento recebido",
                                   "detalhe": f"{nome} · {meio} · R$ {valor_p:.2f}".replace(".", ","),
                                   "ts": data_p + "T12:00:00"})
        pagamentos.sort(key=lambda x: str(x.get("data", "")), reverse=True)
        total["recebido_total"] += recebido

        plano_t = str(e.get("plano") or t.get("plano") or "")
        if plano_t in planos:
            planos[plano_t]["tenants"] += 1
        primaria, fundo = tenant_cores(slug)
        item = {
            "slug": slug,
            "nome": nome,
            "email": t.get("email", ""),
            "zap": t.get("zap", ""),
            "status": t.get("status", "ativo"),
            "plano": plano_t,
            "logo": tenant_logo_url(slug),
            "cores_botao": primaria,
            "cores_bg": fundo,
            "tagline": t.get("tagline", ""),
            "segmento": t.get("segmento", ""),
            "dominio_custom": t.get("dominio_custom", ""),
            "created_at": t.get("created_at", ""),
            "financeiro": {
                "plano": plano_t,
                "mensalidade": float(e.get("mensalidade") or 0),
                "vencimento": e.get("vencimento", ""),
                "obs": e.get("obs", ""),
                "status": st, "dias": diff,
                "n_pagamentos": len(pagamentos),
                "pagamentos": pagamentos[:6],
            },
            "vendas": vendas,
        }
        tenants.append(item)

        if t.get("status", "ativo") == "ativo":
            total["ativos"] += 1
            if float(e.get("mensalidade") or 0) > 0:
                total["mrr"] += float(e.get("mensalidade") or 0)
                if plano_t in planos:
                    planos[plano_t]["mrr"] += float(e.get("mensalidade") or 0)
            if st == "atrasado":
                total["atrasados"] += 1
        elif t.get("status") == "pendente":
            total["pendentes"] += 1
        else:
            total["suspensos"] += 1
        if st == "sem_cobranca":
            total["sem_cobranca"] += 1
        seg = str(t.get("segmento") or "Não definido")
        segmentos[seg] = segmentos.get(seg, 0) + 1
        total["pedidos"] += vendas["pedidos"]
        total["pedidos_30d"] += vendas["pedidos_30d"]
        total["receita"] += vendas["receita"]
        total["receita_30d"] += vendas["receita_30d"]
        total["contatos"] += vendas["contatos"]
        total["novos"] += vendas["novos"]
        total["concluidos"] += vendas["concluidos"]
        total["cancelados"] += vendas["cancelados"]
        if t.get("created_at"):
            atividades.append({"tipo": "tenant", "slug": slug, "nome": nome,
                               "titulo": "Tenant criado", "detalhe": nome,
                               "ts": str(t.get("created_at"))})

    total["tenants"] = len(tenants)
    total["receita"] = round(total["receita"], 2)
    total["receita_30d"] = round(total["receita_30d"], 2)
    total["recebido_total"] = round(total["recebido_total"], 2)
    total["recebido_mes"] = round(total["recebido_mes"], 2)
    total["mrr"] = round(total["mrr"], 2)
    leads_total = total["pedidos"] + total["contatos"]
    total["ticket_medio"] = round(total["receita"] / total["pedidos"], 2) if total["pedidos"] else 0.0
    total["conversao"] = round(100 * total["pedidos"] / leads_total, 1) if leads_total else 0.0
    total["inadimplencia"] = round(100 * total["atrasados"] / total["ativos"], 1) if total["ativos"] else 0.0

    interesses = ler(INTERESSES, [])
    if not isinstance(interesses, list):
        interesses = []
    int_status = {}
    for it in interesses:
        if isinstance(it, dict):
            k = it.get("status", "novo")
            int_status[k] = int_status.get(k, 0) + 1
    total["interessados"] = len(interesses)
    total["conversao_int"] = round(100 * int_status.get("convertido", 0) / len(interesses), 1) if interesses else 0.0

    serie = []
    for i in range(7, -1, -1):
        d = somar_mes(date(hoje.year, hoje.month, 1), -i)
        chave = d.strftime("%Y-%m")
        serie.append({
            "mes": chave,
            "label": ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
                      "Jul", "Ago", "Set", "Out", "Nov", "Dez"][d.month - 1],
            "recebido": round(serie_recebido.get(chave, 0.0), 2),
            "receita_pedidos": round(serie_pedidos_receita.get(chave, 0.0), 2),
            "pedidos": serie_pedidos_qtd.get(chave, 0),
        })

    atividades.sort(key=lambda x: x.get("ts", ""), reverse=True)
    retorno_tenants = []
    for t in tenants:
        t2 = dict(t)
        retorno_tenants.append(t2)
    return {
        "gerado_em": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "dias": dias,
        "default": reg.get("default", DEFAULT_TENANT),
        "totais": total,
        "tenants": retorno_tenants,
        "planos": [{**p, "mrr": round(p["mrr"], 2)} for p in planos.values()],
        "segmentos": sorted(({"nome": k, "n": v} for k, v in segmentos.items()),
                            key=lambda x: x["n"], reverse=True),
        "serie": serie,
        "top_produtos": sorted((dict(v, receita=round(v["receita"], 2))
                                for v in top_produtos.values()),
                               key=lambda x: x["qtd"], reverse=True)[:8],
        "origens": sorted(({"origem": k, "n": v} for k, v in origens.items()),
                          key=lambda x: x["n"], reverse=True)[:8],
        "metodos": sorted(({"meio": k, "valor": round(v, 2)} for k, v in metodos.items()),
                          key=lambda x: x["valor"], reverse=True),
        "atividades": atividades[:15],
        "interesses": {"total": len(interesses), "por_status": int_status,
                       "convertidos": int_status.get("convertido", 0)},
        "plataforma": carregar_plataforma(),
    }


def main():
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8324"))
    args = sys.argv[1:]
    for i, a in enumerate(args):
        if a == "--host" and i + 1 < len(args):
            host = args[i + 1]
        elif a == "--port" and i + 1 < len(args):
            port = int(args[i + 1])
        elif a in ("-h", "--help"):
            print("Uso: python3 server.py [--host 0.0.0.0] [--port 8324]")
            print("Env: DEFAULT_TENANT, SEED_ADMIN_PASS, SAAS_ADMIN_TOKEN")
            return
    Handler.timeout = 10  # cliente lento não prende thread p/ sempre (Slowloris)
    serv = ThreadingHTTPServer((host, port), Handler)
    serv.daemon_threads = True  # thread órfã não segura o processo no restart
    serv.request_queue_size = 64  # teto de fila; excesso recebe refusal em vez de OOM
    print(f"Super Loja (Jordao Neto Tech) em http://{host}:{port} (tenant padrão: {tenant_default()})")
    print(f"Loja: http://localhost:{port}/?loja={tenant_default()}")
    print(f"Painel: http://localhost:{port}/editor.html?loja={tenant_default()}")
    if SHOW_DEFAULT_PASS and not SAAS_ADMIN_TOKEN:
        print("Aviso: defina SAAS_ADMIN_TOKEN e SEED_ADMIN_PASS em produção.")
    try:
        serv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
