#!/usr/bin/env node
/**
 * Gera as 3 páginas de produção dos modelos de loja.
 * Rode depois de scripts/build-templates-hml.mjs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const TPL = join(ROOT, "saas", "templates");

const IC = {
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
  type: '<path d="M5 6h14M12 6v13M8 19h8"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.8 2-1.8 0-1.2-1-1.6-1-2.7 0-.8.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="10" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14" cy="7" r="1"/><circle cx="17" cy="10" r="1"/>',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  tablet: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 18h2"/>',
  mobile: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  save: '<path d="M5 4h12l3 3v13H5z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v5h5"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M20 14v6H4V4h6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
};
const svg = (n) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;

const PAGINAS = [
  { id: "vitrine-hml", arquivo: "template-vitrine.html", cor: "#4f46e5" },
  { id: "editorial-hml", arquivo: "template-editorial.html", cor: "#b4552d" },
  { id: "boutique-hml", arquivo: "template-boutique.html", cor: "#c8a96a" },
];

const meta = (id) => JSON.parse(readFileSync(join(TPL, id, "meta.json"), "utf8"));
const config = (id) => JSON.parse(readFileSync(join(TPL, id, "config.json"), "utf8"));

const MODULOS = {
  hero: "Capa",
  selos: "Diferenciais",
  destaques: "Destaques",
  catalogo: "Catálogo",
  oficio: "Sobre / Ateliê",
  devocoes: "Coleções",
  oracao: "Frase de destaque",
  encomenda: "Atendimento",
  depoimentos: "Avaliações",
  final: "Convite final",
  rodape: "Rodapé",
};

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function pagina(p) {
  const m = meta(p.id);
  const opcoes = PAGINAS.map((x) => {
    const mm = meta(x.id);
    return `<option value="${x.id}"${x.id === p.id ? " selected" : ""}>${mm.nome}</option>`;
  }).join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${m.nome} · modelo de loja virtual</title>
<meta name="description" content="${m.descricao}">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="${p.cor}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="css/templates-hml.css">
</head>
<body data-template="${p.id}">

<header class="cx-topo">
  <a class="cx-voltar" href="templates.html" aria-label="Voltar para a galeria de modelos">${svg("arrow")}<span>Modelos</span></a>
  <div class="cx-titulo"><b id="cxNomeModelo">${m.nome}</b><span id="cxMetaModelo">HML · ${m.foco}</span></div>
  <label class="cx-modelo">Modelo <select id="cxModelo" aria-label="Trocar de modelo">${opcoes}</select></label>
  <div class="cx-dispositivos" role="group" aria-label="Visualizar em">
    <button type="button" data-device="desktop" aria-pressed="true" aria-label="Visualizar em desktop">${svg("monitor")}</button>
    <button type="button" data-device="tablet" aria-pressed="false" aria-label="Visualizar em tablet">${svg("tablet")}</button>
    <button type="button" data-device="mobile" aria-pressed="false" aria-label="Visualizar em celular">${svg("mobile")}</button>
  </div>
  <div class="cx-acoes">
    <button class="cx-btn" type="button" id="cxSalvar">${svg("save")}<span>Salvar</span></button>
    <button class="cx-btn" type="button" id="cxExportar">${svg("download")}<span>Exportar</span></button>
    <button class="cx-btn perigo" type="button" id="cxReset">${svg("reset")}<span>Restaurar</span></button>
    <a class="cx-btn primario" href="?standalone=1" target="_blank" rel="noopener">${svg("external")}<span>Ver loja</span></a>
  </div>
</header>

<div class="cx-wrap">
  <aside class="cx-painel" id="cxPainel" aria-label="Personalização do modelo">
    <div class="cx-abas" role="group" aria-label="Abas do editor">
      <button type="button" data-aba="secoes" aria-pressed="true">${svg("layers")}Seções</button>
      <button type="button" data-aba="conteudo" aria-pressed="false">${svg("type")}Conteúdo</button>
      <button type="button" data-aba="tema" aria-pressed="false">${svg("palette")}Tema</button>
      <button class="cx-fechar" type="button" id="cxFechar" aria-label="Fechar painel">${svg("close")}</button>
    </div>
    <div class="cx-corpo" id="cxCorpo"></div>
  </aside>

  <div class="cx-preview">
    <div class="cx-device is-desktop" id="cxDevice">
      <div class="cx-browser" aria-hidden="true">
        <span class="dots"><i></i><i></i><i></i></span>
        <span class="url" id="cxUrl">sualoja.com.br</span>
        <span class="lock">HML</span>
      </div>
      <div class="loja" id="loja" data-template="${p.id}"></div>
    </div>
  </div>
</div>

<button class="cx-fab" type="button" id="cxFab">${svg("sliders")}Personalizar</button>

<script src="js/templates-hml-data.js"></script>
<script src="js/templates-hml.js"></script>
</body>
</html>
`;
}

function cardModelo(p) {
  const m = meta(p.id);
  const c = config(p.id);
  const cores = c.visual?.cores || {};
  const fontes = c.visual?.fontes || {};
  const titulo = fontes.titulos?.nome || "Inter";
  const texto = fontes.texto?.nome || "Inter";
  const modulos = (c.layout?.secoes || []).filter((s) => s.visivel !== false);
  const presets = (c.presets || []).length;

  const swatches = ["marfim", "ouro", "rosa", "salvia", "tinta"]
    .filter((k) => cores[k])
    .map((k) => `<i style="background:${cores[k]}" title="${k}: ${cores[k]}"></i>`)
    .join("");

  return `<article class="card" data-tpl="${p.id}">
  <div class="tela" style="--bg:${cores.marfim};--surface:${cores.papel};--ink:${cores.tinta};--muted:${cores["tinta-suave"]};--brand:${cores.ouro};--soft:${cores["ouro-fraco"]};--line:${cores.linha};--accent:${cores.rosa};--serif:${fontes.titulos?.familia || "Georgia,serif"};--sans:${fontes.texto?.familia || "sans-serif"}" aria-hidden="true">
    <div class="tela-topo">
      <span class="mini-logo">${esc(m.nome.split(" ")[0][0])}</span>
      <span class="mini-nav"><i></i><i></i><i></i></span>
      <span class="mini-sacola"></span>
    </div>
    <div class="tela-hero">
      <small>${esc(c.hero?.chapeu || m.foco)}</small>
      <strong>${c.hero?.titulo || esc(m.nome)}</strong>
      <span class="mini-btn">${esc(c.hero?.cta1 || "Ver coleção")}</span>
    </div>
    <div class="mini-grade"><i></i><i></i><i></i></div>
    <div class="mini-selos"><i></i><i></i><i></i><i></i></div>
  </div>

  <div class="card-corpo">
    <div class="card-topo">
      <h3>${esc(m.nome)}</h3>
      <span class="tag">${esc(m.segmento)}</span>
    </div>
    <p class="foco">${esc(m.foco)} · <code>${p.id}</code></p>
    <p class="desc">${esc(m.descricao)}</p>

    <div class="paleta" aria-label="Paleta do modelo">${swatches}<span class="paleta-nota">${presets} presets</span></div>

    <div class="fontes">
      <span><b>Aa</b> ${esc(titulo)}</span>
      <span><b>Aa</b> ${esc(texto)}</span>
      <span class="raio">raio ${esc(c.visual?.raio || "0")}</span>
    </div>

    <ul class="modulos" aria-label="Módulos do modelo">
      ${modulos.map((s) => `<li>${esc(MODULOS[s.id] || s.id)}</li>`).join("")}
    </ul>

    <div class="acoes">
      <a class="btn primario" href="${p.arquivo}">${svg("sliders")}Personalizar</a>
      <a class="btn" href="${p.arquivo}?standalone=1" target="_blank" rel="noopener">${svg("external")}Ver loja</a>
    </div>
  </div>
</article>`;
}

function galeria() {
  const cards = PAGINAS.map(cardModelo).join("\n");
  const linhas = PAGINAS.map((p) => {
    const m = meta(p.id);
    const c = config(p.id);
    const n = (c.layout?.secoes || []).filter((s) => s.visivel !== false).length;
    return `<tr>
      <td><b>${esc(m.nome)}</b><br><code>${p.id}</code></td>
      <td>${esc(m.foco)}</td>
      <td>${esc(m.segmento)}</td>
      <td>${n} módulos · ${(c.presets || []).length} presets</td>
      <td>${esc(c.visual?.fontes?.titulos?.nome || "—")} + ${esc(c.visual?.fontes?.texto?.nome || "—")}</td>
      <td><a href="${p.arquivo}">abrir →</a></td>
    </tr>`;
  }).join("\n");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Modelos de loja — produção (HML v1)</title>
<meta name="description" content="Três modelos de loja virtual modulares para produção: Vitrine Express, Editorial Casa e Boutique Noir.">
<meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@300;400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,600&family=DM+Sans:wght@400;500;700&family=Cormorant+Garamond:wght@400;500;600&display=swap">
<style>
  :root{
    --bg:#eef0f4;--surface:#fff;--soft:#f7f8fa;--line:#dde2ea;--ink:#111823;--muted:#69727e;
    --brand:#4f46e5;--ok:#15803d;--radius:16px;
    --shadow:0 1px 2px rgba(17,24,35,.05),0 18px 44px rgba(17,24,35,.09);
    --sans:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  }
  *{box-sizing:border-box}
  html{scroll-behavior:smooth;scroll-padding-top:80px}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);line-height:1.6;-webkit-font-smoothing:antialiased}
  a{color:inherit}
  .ic{width:16px;height:16px;flex:none}
  .wrap{width:min(1180px,calc(100% - 40px));margin:0 auto}

  /* topo */
  .topo{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
  .topo .wrap{display:flex;align-items:center;gap:14px;min-height:64px;flex-wrap:wrap}
  .voltar{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid var(--line);border-radius:9px;background:#fff;font-size:12px;font-weight:700;text-decoration:none;color:var(--muted)}
  .voltar:hover{color:var(--ink);border-color:#c8ced8}
  .marca{display:flex;align-items:center;gap:10px;margin-right:auto}
  .marca .dot{width:34px;height:34px;border-radius:10px;background:var(--ink);color:#fff;display:grid;place-items:center;font-weight:800;font-size:13px}
  .marca b{display:block;font-size:14px;line-height:1.2;letter-spacing:-.01em}
  .marca span{display:block;font-size:11px;color:var(--muted)}
  .menu{display:flex;gap:4px;flex-wrap:wrap}
  .menu a{padding:7px 10px;border-radius:8px;font-size:12.5px;font-weight:600;text-decoration:none;color:var(--muted)}
  .menu a:hover{background:var(--soft);color:var(--ink)}
  .selo-hml{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:5px 9px;border-radius:999px;background:#e8f7ee;color:var(--ok);border:1px solid #bfe8cf}

  /* hero */
  .hero{padding:52px 0 34px}
  .hero .olho{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);margin:0 0 12px}
  .hero h1{font-size:clamp(2rem,4.4vw,3.1rem);line-height:1.08;letter-spacing:-.035em;margin:0 0 14px;max-width:16ch}
  .hero h1 em{font-style:normal;color:var(--brand)}
  .hero .lead{font-size:16px;color:var(--muted);max-width:62ch;margin:0 0 22px}
  .chips{display:flex;gap:8px;flex-wrap:wrap}
  .chip{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;background:#fff;border:1px solid var(--line);font-size:12px;font-weight:600;color:var(--muted)}
  .chip i{width:6px;height:6px;border-radius:50%;background:var(--ok);display:inline-block}

  /* grade de modelos */
  section{padding:38px 0}
  .sec-cab{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:22px}
  .sec-cab h2{font-size:clamp(1.35rem,2.4vw,1.8rem);letter-spacing:-.025em;margin:0 0 4px}
  .sec-cab p{margin:0;color:var(--muted);font-size:14px;max-width:70ch}
  .grade{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
  @media(max-width:1020px){.grade{grid-template-columns:1fr;max-width:620px;margin:0 auto}}

  .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);display:flex;flex-direction:column;transition:transform .2s ease,box-shadow .2s ease}
  .card:hover{transform:translateY(-3px);box-shadow:0 2px 4px rgba(17,24,35,.05),0 24px 54px rgba(17,24,35,.13)}
  .tela{background:var(--bg);color:var(--ink);font-family:var(--sans);padding:10px 12px 14px;border-bottom:1px solid var(--line);--mini:1}
  .tela-topo{display:flex;align-items:center;gap:8px;padding:6px 2px 10px}
  .mini-logo{width:20px;height:20px;border-radius:6px;background:var(--ink);color:var(--bg);display:grid;place-items:center;font-size:10px;font-weight:800}
  .mini-nav{display:flex;gap:6px;margin-left:auto}
  .mini-nav i{display:block;width:26px;height:4px;border-radius:2px;background:var(--muted);opacity:.35}
  .mini-sacola{width:14px;height:14px;border:1.5px solid var(--ink);border-radius:4px;margin-left:8px;opacity:.7}
  .tela-hero{padding:12px 6px 14px;display:grid;gap:7px;justify-items:start}
  .tela-hero small{font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--brand)}
  .tela-hero strong{font-family:var(--serif);font-size:22px;line-height:1.06;letter-spacing:-.02em;font-weight:600}
  .tela-hero strong em{font-style:italic;color:var(--brand)}
  .mini-btn{margin-top:2px;background:var(--brand);color:var(--bg);font-size:8px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:5px 9px;border-radius:4px}
  .mini-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:0 2px}
  .mini-grade i{display:block;aspect-ratio:1/.92;border-radius:5px;background:var(--soft);border:1px solid var(--line);position:relative;overflow:hidden}
  .mini-grade i::after{content:"";position:absolute;inset:auto 12% 14% 12%;height:4px;border-radius:2px;background:var(--muted);opacity:.25}
  .mini-grade i:nth-child(2)::after{width:60%}
  .mini-selos{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;padding:10px 2px 0}
  .mini-selos i{display:block;height:3px;border-radius:2px;background:var(--line)}
  .mini-selos i:nth-child(2){background:var(--brand);opacity:.5}

  .card-corpo{padding:18px;display:flex;flex-direction:column;gap:12px;flex:1}
  .card-topo{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap}
  .card-topo h3{margin:0;font-size:19px;letter-spacing:-.02em}
  .tag{font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:var(--soft);border:1px solid var(--line);padding:3px 7px;border-radius:999px}
  .foco{margin:0;font-size:12px;color:var(--muted)}
  .foco code{font-size:11px;background:var(--soft);border:1px solid var(--line);padding:1px 5px;border-radius:5px}
  .desc{margin:0;font-size:13px;color:var(--muted);line-height:1.55}
  .paleta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .paleta i{width:24px;height:24px;border-radius:7px;border:1px solid rgba(0,0,0,.12);display:inline-block}
  .paleta-nota{font-size:10.5px;font-weight:700;color:var(--muted);margin-left:2px}
  .fontes{display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--muted)}
  .fontes span{display:inline-flex;align-items:center;gap:5px;background:var(--soft);border:1px solid var(--line);border-radius:7px;padding:4px 7px}
  .fontes b{font-size:13px;color:var(--ink);font-weight:600}
  .fontes .raio{margin-left:auto}
  .modulos{list-style:none;display:flex;flex-wrap:wrap;gap:5px;margin:0;padding:0}
  .modulos li{font-size:10.5px;font-weight:600;color:var(--muted);border:1px dashed var(--line);border-radius:6px;padding:3px 6px}
  .acoes{display:flex;gap:8px;margin-top:auto;padding-top:4px}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 12px;border-radius:9px;border:1px solid var(--line);background:#fff;font-size:12.5px;font-weight:700;text-decoration:none;color:var(--ink);flex:1}
  .btn:hover{border-color:#b9c1cd;background:var(--soft)}
  .btn.primario{background:var(--ink);color:#fff;border-color:var(--ink)}
  .btn.primario:hover{background:#000}

  /* passos */
  .passos{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  @media(max-width:900px){.passos{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:560px){.passos{grid-template-columns:1fr}}
  .passo{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px}
  .passo b{display:grid;place-items:center;width:26px;height:26px;border-radius:8px;background:var(--ink);color:#fff;font-size:12px;margin-bottom:10px}
  .passo h3{margin:0 0 4px;font-size:14px}
  .passo p{margin:0;font-size:12.5px;color:var(--muted)}

  /* tabela */
  .tabela-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:#fff}
  table{width:100%;border-collapse:collapse;font-size:12.5px;min-width:720px}
  th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line);vertical-align:top}
  th{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);background:var(--soft)}
  tr:last-child td{border-bottom:0}
  td code{font-size:11px;background:var(--soft);padding:1px 5px;border-radius:5px}
  td a{font-weight:700;text-decoration:none;color:var(--brand)}

  /* criar loja */
  .criar{display:grid;grid-template-columns:1.05fr .95fr;gap:20px;align-items:start}
  @media(max-width:900px){.criar{grid-template-columns:1fr}}
  .caixa{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px}
  .caixa h3{margin:0 0 8px;font-size:15px}
  .caixa p{margin:0 0 12px;font-size:13px;color:var(--muted)}
  .caixa ul{margin:0;padding-left:18px;font-size:13px;color:var(--muted)}
  .caixa li{margin-bottom:6px}
  pre{margin:0;background:#111823;color:#e8edf5;border-radius:10px;padding:14px;overflow:auto;font-size:12px;line-height:1.55}
  pre .c{color:#8fa1b8}
  pre .k{color:#a5b4fc}
  pre .s{color:#86efac}
  .nota{font-size:12px;color:var(--muted);margin-top:10px}

  /* checklist */
  .check{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
  @media(max-width:760px){.check{grid-template-columns:1fr}}
  .check label{display:flex;gap:10px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-radius:10px;padding:11px 13px;font-size:12.5px;cursor:pointer}
  .check input{margin:2px 0 0;accent-color:var(--ok);width:15px;height:15px;flex:none}
  .check input:checked + span{color:var(--muted);text-decoration:line-through}
  .progresso{display:flex;align-items:center;gap:12px;margin-top:14px;font-size:12px;color:var(--muted)}
  .barra{flex:1;height:7px;border-radius:99px;background:#dfe4ec;overflow:hidden}
  .barra i{display:block;height:100%;width:0;background:var(--ok);border-radius:99px;transition:width .25s ease}
  .reset-check{border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 9px;font-size:11px;font-weight:700;color:var(--muted)}
  .reset-check:hover{color:var(--ink)}

  footer{padding:34px 0 44px;border-top:1px solid var(--line);margin-top:20px;font-size:12px;color:var(--muted)}
  footer .wrap{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}
</style>
</head>
<body>

<header class="topo">
  <div class="wrap">
    <a class="voltar" href="saas-admin.html" aria-label="Voltar ao painel">${svg("arrow")}Painel</a>
    <div class="marca">
      <span class="dot" aria-hidden="true">H</span>
      <div><b>Modelos de loja</b><span>Modelo · 3 modelos modulares</span></div>
    </div>
    <nav class="menu" aria-label="Atalhos">
      <a href="#modelos">Modelos</a>
      <a href="#personalizar">Personalizar</a>
      <a href="#criar">Criar loja</a>
      <a href="#checklist">Aceite</a>
    </nav>
    <span class="selo-hml">HML v1</span>
  </div>
</header>

<main>
  <div class="wrap hero">
    <p class="olho">Loja virtual · multi-tenant</p>
    <h1>Três modelos prontos para a loja nascer com a <em>cara do negócio.</em></h1>
    <p class="lead">Cada modelo é um seed completo: catálogo, textos, paleta, tipografia e ordem das seções. O lojista personaliza no mesmo editor modular — seções, blocos, cores, fontes e prévia responsiva — sem tocar em código.</p>
    <div class="chips">
      <span class="chip"><i></i>Seções reordenáveis</span>
      <span class="chip"><i></i>Visibilidade por módulo</span>
      <span class="chip"><i></i>3 presets de cor por modelo</span>
      <span class="chip"><i></i>Prévia desktop · tablet · celular</span>
      <span class="chip"><i></i>Carrinho + WhatsApp</span>
      <span class="chip"><i></i>Exportar / importar JSON</span>
    </div>
  </div>

  <section id="modelos">
    <div class="wrap">
      <div class="sec-cab">
        <div>
          <h2>Escolha um ponto de partida</h2>
          <p>Os três modelos usam o mesmo schema de configuração (<code>config.json</code>) do editor atual. Trocar de modelo é trocar o seed — o código da loja é o mesmo.</p>
        </div>
        <a class="btn" style="flex:0 0 auto" href="template-vitrine.html">${svg("sliders")}Abrir personalizador</a>
      </div>
      <div class="grade">
${cards}
      </div>
    </div>
  </section>

  <section id="personalizar">
    <div class="wrap">
      <div class="sec-cab">
        <div>
          <h2>Como personalizar</h2>
          <p>O painel lateral é o mesmo nos três modelos. Tudo o que você muda fica salvo neste navegador até restaurar o original.</p>
        </div>
      </div>
      <div class="passos">
        <div class="passo"><b>1</b><h3>Seções</h3><p>Arraste para reordenar, use as setas ou o olho para ocultar um módulo sem apagar o conteúdo.</p></div>
        <div class="passo"><b>2</b><h3>Conteúdo</h3><p>Edite capa, selos, produtos em destaque, coleções, depoimentos e rodapé com campos guiados.</p></div>
        <div class="passo"><b>3</b><h3>Tema</h3><p>Aplique um preset, ajuste cada cor e troque as fontes de título e texto. O contraste acompanha.</p></div>
        <div class="passo"><b>4</b><h3>Publicar</h3><p>Exporte o JSON, teste no celular e use o mesmo arquivo como base do tenant na produção.</p></div>
      </div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="sec-cab">
        <div>
          <h2>Comparativo rápido</h2>
          <p>Use o foco de cada modelo para escolher o seed na criação da loja.</p>
        </div>
      </div>
      <div class="tabela-wrap">
        <table>
          <thead><tr><th>Modelo</th><th>Foco</th><th>Segmento</th><th>Estrutura</th><th>Tipografia</th><th></th></tr></thead>
          <tbody>
${linhas}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section id="criar">
    <div class="wrap">
      <div class="sec-cab">
        <div>
          <h2>Criar uma loja com o modelo</h2>
          <p>Na produção local, o clone lê <code>saas/templates/&lt;id&gt;/</code> e aplica o tema sugerido do <code>meta.json</code>.</p>
        </div>
      </div>
      <div class="criar">
        <div class="caixa">
          <h3>Pelo painel</h3>
          <p>Em <b>Painel SaaS → Lojas → Nova loja</b>, escolha o modelo e o tema. O formulário já lista os templates encontrados em <code>saas/templates/</code>.</p>
          <ul>
            <li><b>Modelo</b>: <code>vitrine-hml</code>, <code>editorial-hml</code> ou <code>boutique-hml</code></li>
            <li><b>Tema inicial</b>: <code>vitrine</code>, <code>editorial</code> ou <code>boutique</code> (ou outro preset)</li>
            <li>O clone troca nome, WhatsApp, catálogo, imagens e manifesto — o restante vem do seed.</li>
          </ul>
          <p class="nota">Dica: use o botão <b>Exportar</b> no personalizador para guardar a configuração validada em HML.</p>
        </div>
        <div class="caixa">
          <h3>Pela API local</h3>
          <p>O mesmo payload usado pelo painel:</p>
<pre><span class="c">// POST /api/saas/lojas</span>
{
  <span class="k">"slug"</span>: <span class="s">"minha-loja"</span>,
  <span class="k">"nome"</span>: <span class="s">"Minha Loja"</span>,
  <span class="k">"zap"</span>: <span class="s">"5511999999999"</span>,
  <span class="k">"template"</span>: <span class="s">"vitrine-hml"</span>,
  <span class="k">"tema"</span>: <span class="s">"vitrine"</span>
}</pre>
          <p class="nota">Os temas <code>vitrine</code>, <code>editorial</code> e <code>boutique</code> estão em <code>saas/temas.json</code> e em <code>/api/temas</code>.</p>
        </div>
      </div>
    </div>
  </section>

  <section id="checklist">
    <div class="wrap">
      <div class="sec-cab">
        <div>
          <h2>Checklist de aceite (HML)</h2>
          <p>Marque o que já foi validado. O progresso fica salvo neste navegador.</p>
        </div>
      </div>
      <div class="check">
        <label><input type="checkbox" data-check="1"><span>Abrir os 3 modelos e conferir capa, catálogo, carrinho e checkout no WhatsApp.</span></label>
        <label><input type="checkbox" data-check="2"><span>Reordenar seções por arrastar e por setas; ocultar e reexibir pelo olho.</span></label>
        <label><input type="checkbox" data-check="3"><span>Editar textos da capa, selos, destaques, coleções, depoimentos e rodapé.</span></label>
        <label><input type="checkbox" data-check="4"><span>Aplicar os 3 presets de cor e trocar as fontes de título/texto em cada modelo.</span></label>
        <label><input type="checkbox" data-check="5"><span>Validar prévia em desktop, tablet e celular — incluindo o carrinho lateral.</span></label>
        <label><input type="checkbox" data-check="6"><span>Salvar, recarregar a página e confirmar que as alterações persistem.</span></label>
        <label><input type="checkbox" data-check="7"><span>Exportar o JSON, restaurar o original e conferir que o reset limpa só a configuração.</span></label>
        <label><input type="checkbox" data-check="8"><span>Criar um tenant de teste com cada modelo e abrir a loja publicada.</span></label>
        <label><input type="checkbox" data-check="9"><span>Conferir busca, filtro por categoria, ordenação e estado vazio do catálogo.</span></label>
        <label><input type="checkbox" data-check="10"><span>Rodar <code>npm run build</code> e confirmar que as páginas e assets foram para <code>public/</code>.</span></label>
      </div>
      <div class="progresso">
        <div class="barra" aria-hidden="true"><i id="barraCheck"></i></div>
        <span id="textoCheck">0 de 10</span>
        <button class="reset-check" type="button" id="resetCheck">Limpar</button>
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <span>HML v1 · 3 modelos · <code>saas/templates/*-hml</code></span>
    <span>Gerado por <code>scripts/build-hml-pages.mjs</code></span>
  </div>
</footer>

<script>
(function () {
  var CHAVE = "hml-tpl-checklist";
  var caixas = Array.prototype.slice.call(document.querySelectorAll("[data-check]"));
  var barra = document.getElementById("barraCheck");
  var texto = document.getElementById("textoCheck");

  function ler() {
    try { return JSON.parse(localStorage.getItem(CHAVE) || "[]"); } catch (e) { return []; }
  }
  function pintar() {
    var feitos = caixas.filter(function (c) { return c.checked; }).length;
    barra.style.width = (feitos / caixas.length * 100) + "%";
    texto.textContent = feitos + " de " + caixas.length;
  }
  function salvar() {
    localStorage.setItem(CHAVE, JSON.stringify(caixas.filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.check; })));
    pintar();
  }

  var salvos = ler();
  caixas.forEach(function (c) { c.checked = salvos.indexOf(c.dataset.check) >= 0; });
  caixas.forEach(function (c) { c.addEventListener("change", salvar); });
  document.getElementById("resetCheck").addEventListener("click", function () {
    caixas.forEach(function (c) { c.checked = false; });
    localStorage.removeItem(CHAVE);
    pintar();
  });
  pintar();
})();
</script>
</body>
</html>
`;
}

for (const p of PAGINAS) {
  writeFileSync(join(ROOT, p.arquivo), pagina(p), "utf8");
  console.log(`✓ ${p.arquivo}`);
}

writeFileSync(join(ROOT, "templates.html"), galeria(), "utf8");
console.log("✓ templates.html");
