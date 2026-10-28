(function(){
"use strict";

let ZAP = "5516991038587";
let NOME = "Ateliê Santo Terço";
let CFG = null;
// SaaS multi-tenant: ?loja=<slug> seleciona a loja (servidor resolve por query/host/header)
const LOJA = (()=>{ try{ return (new URLSearchParams(location.search).get("loja")||"").toLowerCase(); }catch(e){ return ""; } })();
const QLOJA = LOJA ? "?loja="+encodeURIComponent(LOJA) : "";
const IMG = "img/";
/* multi-tenant ?loja=: os assets também levam o slug (loja padrão: QLOJA vazio, nada muda) */
const comLoja = u => String(u||"") + QLOJA;
const fotoSrc = f => {
  let b = String(f||"").trim() || "placeholder.png";
  if(/^(https?:)?\/\//i.test(b) || /^(data|blob):/i.test(b)) return b;
  b = b.replace(/^\/+/, "").replace(/^img\//i, "");
  return comLoja(/\.(webp|png|jpe?g|svg)$/i.test(b) ? IMG+b : IMG+b+".webp");
};
const midiaExt = v => String(v||"").split(/[?#]/)[0].toLowerCase().match(/\.([a-z0-9]+)$/);
const midiaTipo = v => { const m = midiaExt(v); return m && ["mp4","webm","ogv","ogg","mov","m4v"].includes(m[1]) ? "video" : "imagem"; };
const midiaSrc = v => {
  let s = String(v||"").trim();
  if(!s) return "";
  if(/^(https?:)?\/\//i.test(s) || /^(data|blob):/i.test(s) || /[?&]loja=/.test(s)) return s;
  s = s.replace(/^\/+/, "");
  if(!/^(img|video)\//.test(s)) s = IMG + s;
  return comLoja(s);
};
function aplicarMidiaBox(box, valor, poster, preserva){
  const v = String(valor||"").trim();
  if(!box || !v) return;
  const tipo = midiaTipo(v);
  if(preserva){
    const video = box.querySelector("[data-midia-video]");
    const img = box.querySelector("[data-midia-img]");
    if(!video || !img) return;
    if(tipo === "video"){
      const source = video.querySelector("source");
      if(source) source.src = midiaSrc(v); else video.src = midiaSrc(v);
      if(poster) video.poster = midiaSrc(poster);
      img.hidden = true;
      video.hidden = false;
      try{ video.load(); if(video.autoplay) video.play().catch(()=>{}); }catch(e){}
    } else {
      img.src = midiaSrc(v);
      img.hidden = false;
      video.hidden = true;
      try{ video.pause(); }catch(e){}
    }
    return;
  }
  box.innerHTML = tipo === "video"
    ? `<video muted loop playsinline preload="metadata"${poster?` poster="${esc(midiaSrc(poster))}"`:""}><source src="${esc(midiaSrc(v))}"></video>`
    : `<img src="${esc(midiaSrc(v))}" alt="" loading="lazy">`;
  if(tipo === "video"){
    const video = box.querySelector("video");
    if(video){
      video.muted = true;
      try{ videoObs.observe(video); video.load(); video.play().catch(()=>{}); }catch(e){}
    }
  }
}
function aplicarMidias(c){
  if(!c || typeof c !== "object") return;
  $$("[data-midia-box]").forEach(box=>{
    const chave = box.dataset.midiaBox;
    const padrao = box.dataset.midiaPadrao || "";
    const valor = obter(chave);
    const poster = box.dataset.midiaPoster ? obter(box.dataset.midiaPoster) : "";
    aplicarMidiaBox(box, valor || padrao, poster || box.dataset.posterPadrao || "", box.hasAttribute("data-midia-preserva"));
  });
}
/* miniaturas 480px p/ listas (cards, destaques, sacola) — 80% mais leves;
   o modal usa a foto cheia (detalhe + zoom) */
const fotoMini = f => {
  const limpo = String(f||"").replace(/^\/+/, "").replace(/^img\//i, "");
  const base = /\.(webp|png|jpe?g)$/i.test(limpo) ? limpo : limpo+".webp";
  return comLoja(IMG+"mini/"+base);
};
const iconeSrc = f => comLoja("img/icons/"+String(f||""));
const iconeSeloSrc = v => {
  const s = String(v||"").trim();
  if(!s) return "";
  if(/^(https?:)?\/\//i.test(s) || /^(data|blob):/i.test(s)) return s;
  if(/^img\//i.test(s)) return comLoja(s);
  return iconeSrc(s.replace(/^icons\//i, ""));
};
const ORIGEM = location.origin + "/img/";
const imgAbs = f => ORIGEM + comLoja(/\.(webp|png|jpe?g)$/i.test(f||"") ? f : f+".webp");
const CATS = {
  essencial:"Essencial", classico:"Clássica", premium:"Premium", luxo:"Luxo",
  infantil:"Para os pequenos", carro:"Para o carro"
};
/* rótulo de linha: fixas têm nome bonito, novas usam o próprio slug legível */
const rotuloCat = c => CATS[c] || String(c||"").replace(/[-_]+/g," ").trim().replace(/^\S/, m=>m.toUpperCase());
/* botões de filtro p/ linhas criadas no painel (além das 6 fixas do HTML) */
function garantirBotoesFiltros(){
  const grupo = $("#filtros");
  if(!grupo || !PRODUTOS.length) return;
  const existentes = new Set($$(".filtro", grupo).map(b=>b.dataset.cat));
  [...new Set(PRODUTOS.map(p=>p.cat).filter(Boolean))].sort().forEach(c=>{
    if(existentes.has(c)) return;
    const b = document.createElement("button");
    b.className = "filtro"; b.dataset.cat = c; b.textContent = rotuloCat(c);
    grupo.appendChild(b);
    b.addEventListener("click",()=>{
      estado.filtro = b.dataset.cat;
      desenharFiltros();
      desenhar();
      sincronizarURL();
    });
  });
}
const DEVOCOES = [
  "Nossa Senhora Aparecida","Nossa Senhora de Fátima","Nossa Senhora das Graças",
  "Virgem de Guadalupe","Sagrada Família","Divino Espírito Santo","São Miguel Arcanjo",
  "São Bento","São José","São Padre Pio","São Cristóvão","São Carlo Acutis",
  "Santa Teresinha","Santa Rita de Cássia","Santa Gianna","Anjo da Guarda"
];

const PREVIEW = (()=>{ try{ return (window.parent && window.parent !== window && window.parent.__editorPreview) || null; }catch(e){ return null; } })();
const $ = (s,e=document)=>e.querySelector(s);
const $$ = (s,e=document)=>[...e.querySelectorAll(s)];
const reais = n => n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const zapLink = txt => "https://wa.me/"+ZAP+"?text="+encodeURIComponent(txt);
const T = (chave, padrao)=>{
  if(!CFG) return padrao;
  let v = CFG;
  for(const s of chave.split(".")) v = v==null ? undefined : v[s];
  return v===undefined || v===null ? padrao : v;
};
const temPreco = p => typeof p.preco === "number";
/* busca sem acento: "fatima" encontra "Fátima", "jose" encontra "José" */
const semAcento = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

/* MEDICAO-INICIO: Pixel da Meta + GA4 (só ativa com IDs em geral.pixel_meta / geral.ga4_id) */
const MED = {pixel:"", ga4:"", pronto:false};
function iniciarMedicao(){
  if(MED.pronto) return;
  MED.pronto = true;
  let px = "", g4 = "";
  try{
    const g = (typeof CFG !== "undefined" && CFG && CFG.geral) ? CFG.geral : {};
    px = String(g.pixel_meta||"").trim();
    g4 = String(g.ga4_id||"").trim().toUpperCase();
  }catch(e){ return; }
  try{
    if(/^\d{10,20}$/.test(px)){
      MED.pixel = px;
      /* snippet oficial fbevents (enfileira até o .js carregar; bloqueador só silencia) */
      (function(f,b,e,v,n,t,s){ if(f.fbq) return; n=f.fbq=function(){ n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments); }; if(!f._fbq) f._fbq=n; n.push=n; n.loaded=!0; n.version="2.0"; n.queue=[]; t=b.createElement(e); t.async=!0; t.src=v; s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s); })(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
      if(typeof window.fbq === "function"){ window.fbq("init", px); window.fbq("track", "PageView"); }
    }
    if(/^G-[A-Z0-9]{6,}$/.test(g4)){
      MED.ga4 = g4;
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(g4);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", g4);
    }
  }catch(e){}
}
/* dispara nas duas plataformas; nunca quebra o site (tudo em try/catch) */
function medir(nomePixel, nomeGA4, dados){
  try{
    const d = dados || {};
    const fq = (typeof window !== "undefined") ? window.fbq : null;
    if(MED.pixel && typeof fq === "function"){
      if(nomePixel==="AddToCart"||nomePixel==="InitiateCheckout"||nomePixel==="Contact"||nomePixel==="ViewContent") fq("track", nomePixel, d);
      else fq("trackCustom", nomePixel, d);
    }
    if(MED.ga4 && typeof window.gtag === "function") window.gtag("event", nomeGA4||nomePixel, d);
  }catch(e){}
}
function medirAdicao(p){
  if(!p) return;
  const v = (typeof p.preco === "number") ? p.preco : 0;
  medir("AddToCart", "add_to_cart", {content_ids:[p.id], content_name:p.nome, content_category:String(p.cat||""), contents:[{id:p.id, quantity:1}], value:v, currency:"BRL"});
}
function medirCheckout(itens, total, nItens){
  medir("InitiateCheckout", "begin_checkout", {content_ids:itens.map(x=>x.id), contents:itens.filter(x=>x.preco!==null).map(x=>({id:x.id, quantity:x.q})), num_items:nItens, value:total, currency:"BRL"});
}
/* MEDICAO-FIM */
const persVazio = {devocao:"",cor:"",nome:"",prazo:""};
const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const html = document.documentElement;

/* ---------- mídia estática do HTML também resolve no tenant via ?loja= ---------- */
try{
  if(QLOJA){
    $$('img[src^="img/"]').forEach(el=>{ const v=el.getAttribute("src"); if(v&&!/[?&]loja=/.test(v)) el.setAttribute("src", v+QLOJA); });
    $$('video source[src]').forEach(el=>{ const v=el.getAttribute("src"); if(v&&!/^[a-z]+:/i.test(v||"")&&!/[?&]loja=/.test(v)) el.setAttribute("src", v+QLOJA); });
    $$('video[poster^="img/"]').forEach(el=>{ const v=el.getAttribute("poster"); if(v&&!/[?&]loja=/.test(v)) el.setAttribute("poster", v+QLOJA); });
    $$('video').forEach(v=>{ try{ v.load(); }catch(e){} });
    const mt=document.querySelector('link[rel="manifest"]'); if(mt&&mt.getAttribute("href")&&!/loja=/.test(mt.getAttribute("href"))) mt.setAttribute("href", mt.getAttribute("href")+QLOJA);
    const at=document.querySelector('link[rel="apple-touch-icon"]'); if(at&&/^img\//.test(at.getAttribute("href")||"")&&!/loja=/.test(at.getAttribute("href"))) at.setAttribute("href", at.getAttribute("href")+QLOJA);
  }
}catch(e){}

/* ---------- links fixos de WhatsApp (textos via config.zap; fallback = textos atuais) ---------- */
function ligaWhats(){
  const OLA = T("zap.msg_ola", `Olá! Vim pelo site do ${NOME} e gostaria de saber mais sobre os terços. 🤍`).replace("{NOME}", NOME);
  ["zapFlut","zapFinal","zapRodape","zapRodape2"].forEach(id=>{ const e=$("#"+id); if(e) e.href = zapLink(OLA); });
  const pe = $("#zapPerson"); if(pe) pe.href = zapLink(T("zap.msg_encomenda", "Olá! Vim pelo site e queria encomendar um terço personalizado. Posso contar a devoção que eu tenho em mente?").replace("{NOME}", NOME));
  const a = $("#ano"); if(a) a.textContent = new Date().getFullYear();
}
ligaWhats();

/* ---------- registro de pedidos / contatos (painel admin) ---------- */
function registrar(dados){
  try{
    fetch("/api/pedido"+QLOJA,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(dados)}).catch(()=>{});
  }catch(e){}
}
["zapFlut","zapFinal","zapRodape","zapRodape2"].forEach(id=>{
  const e = $("#"+id);
  if(e) e.addEventListener("click", ()=> registrar({tipo:"contato", origem:"whatsapp geral"}));
});
{ const e = $("#zapPerson"); if(e) e.addEventListener("click", ()=> registrar({tipo:"contato", origem:"encomenda personalizada"})); }

/* ---------- conteúdo editável via config.json ---------- */
function obter(chave){
  if(!CFG) return undefined;
  let v = CFG;
  for(const s of chave.split(".")) v = v==null ? undefined : v[s];
  return v;
}
const injetaFonte = link => {
  if(!link) return;
  if($$('link[data-fonte]').some(l=>l.href===link)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = link;
  l.setAttribute("data-fonte","");
  document.head.appendChild(l);
};
function aplicarVisual(c){
  if(!c || typeof c !== "object") return;
  const logo = document.querySelector("[data-logo]");
  if(logo) logo.src = fotoSrc(c.logo || "logo-retangular.webp");
  if(c.logo){
    const at = document.querySelector('link[rel="apple-touch-icon"]');
    if(at) at.href = "img/"+c.logo;
  }
  const cores = c.cores || {};
  Object.keys(cores).forEach(k=>{
    if(typeof cores[k]==="string" && cores[k]) html.style.setProperty("--"+k, cores[k]);
  });
  try{ const tc = document.querySelector('meta[name="theme-color"]'); if(tc && cores.marfim) tc.setAttribute("content", cores.marfim); }catch(e){}
  const f = c.fontes || {};
  if(f.titulos && f.titulos.familia){
    html.style.setProperty("--serif", f.titulos.familia);
    injetaFonte(f.titulos.link);
  } else {
    html.style.removeProperty("--serif");
  }
  if(f.texto && f.texto.familia){
    html.style.setProperty("--sans", f.texto.familia);
    injetaFonte(f.texto.link);
  } else {
    html.style.removeProperty("--sans");
  }
}
function aplicarConfig(c){
  if(!c || typeof c !== "object") return;
  CFG = c;
  if(c.geral){
    if(c.geral.zap) ZAP = String(c.geral.zap).replace(/\D/g,"");
    if(c.geral.nome) NOME = String(c.geral.nome);
  }
  if(c.visual) aplicarVisual(c.visual);
  aplicarBotoes(c.botoes);
  aplicarLayout(c.layout);
  aplicarMidias(c);
  $$("[data-t-html]").forEach(el=>{
    const v = obter(el.dataset.tHtml);
    if(v !== undefined) el.innerHTML = String(v);
  });
  $$("[data-t]").forEach(el=>{
    const v = obter(el.dataset.t);
    if(v === undefined) return;
    if(el.tagName === "META") el.setAttribute("content", String(v));
    else el.textContent = String(v);
  });
  $$("[data-ph]").forEach(el=>{
    const v = obter(el.dataset.ph);
    if(v !== undefined) el.setAttribute("placeholder", String(v));
  });
  $$("[data-href]").forEach(el=>{
    const v = obter(el.dataset.href);
    if(v !== undefined) el.setAttribute("href", String(v));
  });
  ligaWhats();
  renderMenu();
  renderSecoes();
  renderSugestoesPers();
  aplicarEstilos();
  aplicarIcones();
}

/* ---------- seções dinâmicas (cada loja tem as suas via config.json) ---------- */
const esc = s => String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const ICONES_SELO = [
  '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-7-10a7 7 0 0 1 14 0c0 5.5-7 10-7 10z"/><circle cx="12" cy="11" r="2.5"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M12 3v18M7 8h10"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-8-8"/><path d="M12 8v4l3 2"/><path d="M17 3l4 4-4 4"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M3 7h13v10H3zM16 10h3l2 3v4h-5z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>'
];
const ESTRELA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"/></svg>';

/* ---------- botões: formato + caixa alta via config.botoes ---------- */
function aplicarBotoes(b){
  const f = (b && b.formato) || "padrao";
  const c = (b && b.caixa) || "alta";
  document.body.dataset.btnFormato = f;
  document.body.dataset.btnCaixa = c;
}

function elementoLayout(id){
  switch(id){
    case "hero": return document.querySelector("section.hero");
    case "selos": return document.querySelector(".selos");
    case "destaques": return document.querySelector("section.destaques");
    case "oficio": return document.querySelector("section.oficio");
    case "catalogo": return document.querySelector("#catalogo");
    case "encomenda": return document.querySelector("#encomenda");
    case "devocoes": { const e = document.querySelector(".devocoes"); return e ? e.closest("section") : null; }
    case "ocasioes": return document.querySelector("#ocasioes");
    case "oracao": return document.querySelector(".oracao");
    case "misterios": return document.querySelector("#terco");
    case "sobre": return document.querySelector("#sobre");
    case "depoimentos": return document.querySelector("#depoimentos");
    case "final": return document.querySelector(".final");
    case "rodape": return document.querySelector("footer");
    default: return null;
  }
}

function aplicarLayout(l){
  if(!l || !Array.isArray(l.secoes)) return;
  const main = document.querySelector("main");
  const ordem = [];
  l.secoes.forEach(s=>{
    if(!s || !s.id) return;
    const el = elementoLayout(s.id);
    if(!el) return;
    el.setAttribute("data-oculta", s.visivel === false ? "1" : "0");
    ordem.push(el);
  });
  if(!main) return;
  ordem.forEach(el=>{ if(el.parentElement === main) main.appendChild(el); });
}

/* ---------- cache de renderização: evita refazer o DOM quando o dado não mudou ---------- */
const CACHE_RENDER = new WeakMap();
function htmlMudou(el, chave, html){
  if(!el) return false;
  if(CACHE_RENDER.get(el) === chave) return false;
  CACHE_RENDER.set(el, chave);
  el.innerHTML = html;
  return true;
}

/* ---------- estilos modulares: seção inteira e cada componente (cfg.estilo) ---------- */
const SECUNDARIOS = ".lead,.hero-prova span,.selo-item span,.dest-corpo p,.card p,.mist p,.depo-pe span,.nota-catalogo,.resumo-busca,.prazo-aviso,.fita span,.numeros div span,.ocasiao span";
const SOMBRAS = {
  suave:"0 1px 2px rgba(80,60,40,.05), 0 8px 28px rgba(80,60,40,.07)",
  forte:"0 4px 12px rgba(80,60,40,.08), 0 26px 62px rgba(80,60,40,.14)"
};
function sombraVal(v){
  if(v === "forte") return SOMBRAS.forte;
  if(v === "suave") return SOMBRAS.suave;
  return "none";
}
/* só limpamos o que foi aplicado antes (evita centenas de escritas no DOM a cada tecla) */
const APLICADO = new WeakMap();
function limparEstilo(el){
  if(!el) return;
  const prev = APLICADO.get(el);
  if(!prev) return;
  (prev.props||[]).forEach(p=>{ el.style[p] = ""; });
  (prev.vars||[]).forEach(v=>el.style.removeProperty(v));
  (prev.attrs||[]).forEach(a=>el.removeAttribute(a));
  APLICADO.set(el, null);
}
function limparSecundarios(){
  document.querySelectorAll("[data-sec-suave]").forEach(n=>{
    n.style.color = "";
    n.removeAttribute("data-sec-suave");
  });
}
function corSegura(v){
  const s = String(v||"").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : "";
}
function imagemSegura(v){
  const s = String(v||"").trim().replace(/["'()\\;<>]/g, "");
  if(!s) return "";
  if(/^(https?:)?\/\//i.test(s) || s.indexOf("data:image/") === 0) return s;
  return comLoja(s);
}
function valorFundo(f){
  if(!f || !f.tipo) return "";
  if(f.tipo === "cor") return corSegura(f.cor);
  if(f.tipo === "gradiente"){
    const a = f.angulo === undefined || f.angulo === null || f.angulo === "" ? 135 : Math.max(0, Math.min(360, Number(f.angulo) || 0));
    return `linear-gradient(${a}deg, ${corSegura(f.cor) || "#ffffff"}, ${corSegura(f.cor2) || "#e9e0d4"})`;
  }
  if(f.tipo === "imagem"){
    const src = imagemSegura(f.imagem);
    if(!src) return "";
    const escurecer = Math.max(0, Math.min(90, Number(f.escurecer || 0))) / 100;
    const camada = escurecer > 0 ? `linear-gradient(rgba(0,0,0,${escurecer}), rgba(0,0,0,${escurecer})), ` : "";
    const pos = ["center","top","bottom","left","right"].indexOf(f.posicao) >= 0 ? f.posicao : "center";
    return `${camada}url("${src}") ${pos}/cover no-repeat`;
  }
  return "";
}
function aplicarTokens(el, t, isSection){
  if(!el || !t || typeof t !== "object") return;
  const props = [], vars = [], attrs = [];
  const setP = (p, v)=>{ el.style[p] = v; props.push(p); };
  const setV = (n, v)=>{ el.style.setProperty(n, v); vars.push(n); };
  const setA = (a)=>{ el.setAttribute(a, "1"); attrs.push(a); };
  const f = t.fundo || {};
  const fundo = valorFundo(f);
  if(fundo) setP("background", fundo);
  if(t.texto && corSegura(t.texto.cor)) setP("color", corSegura(t.texto.cor));
  if(t.texto && corSegura(t.texto.suave)){
    setV("--sec-suave", corSegura(t.texto.suave));
    el.querySelectorAll(SECUNDARIOS).forEach(n=>{
      n.style.color = corSegura(t.texto.suave);
      n.setAttribute("data-sec-suave", "1");
    });
  }
  if(t.borda && corSegura(t.borda.cor)){
    const estilo = t.borda.estilo === "nenhuma" ? "none" : (t.borda.estilo === "dashed" ? "dashed" : "solid");
    const largura = t.borda.largura === undefined || t.borda.largura === null || t.borda.largura === "" ? 1 : Math.max(0, Math.min(20, Number(t.borda.largura) || 0));
    setP("borderTopWidth", largura + "px");
    setP("borderTopStyle", estilo);
    setP("borderTopColor", corSegura(t.borda.cor));
  }
  if(t.raio !== undefined && t.raio !== null && t.raio !== "") setP("borderRadius", Math.max(0, Math.min(80, Number(t.raio) || 0)) + "px");
  if(t.sombra) setP("boxShadow", sombraVal(t.sombra));
  /* fonte da seção (herda para todo o bloco) */
  if(t.fonte){
    if(t.fonte.titulos){
      const ft = window.fontePorNome ? window.fontePorNome(t.fonte.titulos) : null;
      if(ft){ setV("--serif", ft.fam); injetaFonte(window.linkFonte(ft)); }
    }
    if(t.fonte.texto){
      const ft = window.fontePorNome ? window.fontePorNome(t.fonte.texto) : null;
      if(ft){ setV("--sans", ft.fam); injetaFonte(window.linkFonte(ft)); }
    }
  }
  /* colunas da grade (computador / tablet / celular) */
  if(t.grade && Number(t.grade.desktop) > 0){
    setA("data-colunas");
    setV("--cols-d", String(Math.max(1, Math.min(8, Number(t.grade.desktop)))));
    setV("--cols-t", String(Math.max(1, Math.min(8, Number(t.grade.tablet) || Number(t.grade.desktop)))));
    setV("--cols-m", String(Math.max(1, Math.min(8, Number(t.grade.mobile) || 1))));
  }
  /* estados de hover e foco */
  const hov = t.hover || {};
  if(corSegura(hov.fundo)){ setA("data-hov-fundo"); setV("--hov-fundo", corSegura(hov.fundo)); }
  if(corSegura(hov.cor)){ setA("data-hov-cor"); setV("--hov-cor", corSegura(hov.cor)); }
  if(hov.sombra){ setA("data-hov-sombra"); setV("--hov-sombra", sombraVal(hov.sombra)); }
  if(hov.mover !== undefined && hov.mover !== null && hov.mover !== ""){
    setA("data-hov-mover");
    setV("--hov-mover", Math.max(-40, Math.min(40, Number(hov.mover) || 0)) + "px");
  }
  if(hov.escala !== undefined && hov.escala !== null && hov.escala !== ""){
    setA("data-hov-escala");
    setV("--hov-escala", Math.max(80, Math.min(140, Number(hov.escala) || 100)) / 100);
  }
  const foc = t.foco || {};
  if(corSegura(foc.cor)){ setA("data-foco-cor"); setV("--foco-cor", corSegura(foc.cor)); }
  if(foc.largura !== undefined && foc.largura !== null && foc.largura !== ""){
    setA("data-foco-larg");
    setV("--foco-larg", Math.max(1, Math.min(10, Number(foc.largura) || 2)) + "px");
  }
  /* espaço: só o lado informado muda; o outro continua como o do tema */
  if(t.espaco){
    const hero = el.classList && el.classList.contains("hero");
    if(t.espaco.topo !== undefined && t.espaco.topo !== null && t.espaco.topo !== ""){
      const v = Math.max(0, Math.min(300, Number(t.espaco.topo) || 0));
      setP("paddingTop", hero ? "calc(var(--topo) + " + v + "px)" : v + "px");
    }
    if(t.espaco.base !== undefined && t.espaco.base !== null && t.espaco.base !== ""){
      setP("paddingBottom", Math.max(0, Math.min(300, Number(t.espaco.base) || 0)) + "px");
    }
  }
  if(t.largura){
    const alvo = isSection ? (el.querySelector(".env") || el) : el;
    if(alvo === el){
      setP("maxWidth", t.largura);
      setP("marginLeft", "auto");
      setP("marginRight", "auto");
    } else {
      const prev = APLICADO.get(alvo) || {};
      APLICADO.set(alvo, {props:(prev.props||[]).concat(["maxWidth","marginLeft","marginRight"]), vars:prev.vars||[], attrs:prev.attrs||[]});
      alvo.style.maxWidth = t.largura;
      alvo.style.marginLeft = "auto";
      alvo.style.marginRight = "auto";
    }
  }
  if(t.alinhar && ["left","center","right","justify"].indexOf(t.alinhar) >= 0) setP("textAlign", t.alinhar);
  const anterior = APLICADO.get(el) || {};
  APLICADO.set(el, {
    props:(anterior.props||[]).concat(props),
    vars:(anterior.vars||[]).concat(vars),
    attrs:(anterior.attrs||[]).concat(attrs)
  });
}
let ULTIMO_ESTILO = null;
let ULTIMO_ICONES = null;
/* invalida quando o conteúdo é redesenhado (cards, selos, coleções) */
function invalidarEstilos(){ ULTIMO_ESTILO = null; ULTIMO_ICONES = null; }
function aplicarEstilos(){
  const est = (CFG && CFG.estilo) || {};
  const sig = JSON.stringify(est);
  if(sig === ULTIMO_ESTILO) return;
  ULTIMO_ESTILO = sig;
  const secoes = est.secoes || {};
  limparSecundarios();
  document.querySelectorAll("[data-slot]").forEach(el=>limparEstilo(el));
  Object.keys(secoes).forEach(id=>{
    const el = elementoLayout(id);
    if(!el) return;
    limparEstilo(el);
    const env = el.querySelector(".env");
    if(env) limparEstilo(env);
    aplicarTokens(el, secoes[id], true);
  });
  const comps = est.componentes || {};
  Object.keys(comps).forEach(secId=>{
    const slots = comps[secId] || {};
    Object.keys(slots).forEach(slot=>{
      const alvos = document.querySelectorAll('[data-slot="' + secId + "." + slot + '"]');
      alvos.forEach(el=>aplicarTokens(el, slots[slot]));
    });
  });
}

/* ---------- ícones: da seção, do cabeçalho (ornamento), das estrelas e dos cards ---------- */
function temIcone(chave){
  const mapa = window.ICONES || {};
  return !!chave && Object.prototype.hasOwnProperty.call(mapa, chave);
}
function svgIcone(chave){
  if(!temIcone(chave)) return "";
  const mapa = window.ICONES || {};
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + mapa[chave] + "</svg>";
}
function ehGrade(n){
  if(!n) return false;
  const d = getComputedStyle(n).display;
  return d === "grid" || d === "flex" || d === "inline-flex" || d === "inline-grid";
}
/* âncora segura: nunca insere o ícone como item de grid/flex (quebraria o layout) */
function ancoraIcone(el, pos){
  const raiz = el.querySelector(".cab-secao") || el;
  const titulo = raiz.querySelector ? raiz.querySelector(".titulo") : null;
  if(pos === "esquerda" && titulo) return { pai:titulo, alvo:titulo.firstElementChild || titulo, centro:false };
  const chapeu = raiz.querySelector ? raiz.querySelector(".chapeu") : null;
  if(chapeu){
    const pai = chapeu.parentElement;
    if(!pai) return null;
    if(ehGrade(pai)) return null;
    return { pai:pai, alvo:chapeu, centro: !!(pai.classList && pai.classList.contains("centro")) };
  }
  /* sem cabeçalho: só aceita um bloco único que não seja grade */
  const env = el.querySelector(".env") || el;
  const filhos = [...env.children];
  if(filhos.length === 1 && !ehGrade(filhos[0])){
    return { pai:filhos[0], alvo:filhos[0].firstElementChild || filhos[0], centro:false };
  }
  return null;
}
function aplicarIcones(){
  const est = (CFG && CFG.estilo) || {};
  const sig = JSON.stringify(est);
  if(sig === ULTIMO_ICONES) return;
  ULTIMO_ICONES = sig;
  const secoes = est.secoes || {};
  document.querySelectorAll(".sec-icone,.card-icone").forEach(n=>n.remove());
  Object.keys(secoes).forEach(id=>{
    const cfg = secoes[id] || {};
    const ic = cfg.icone || {};
    const chave = String(ic.chave || "").trim();
    const pos = String(ic.pos || "acima");
    const el = elementoLayout(id);
    if(!el) return;
    /* ícone da seção */
    if(chave && pos !== "oculto" && temIcone(chave)){
      const a = ancoraIcone(el, pos);
      if(a && a.pai){
        const tam = Math.max(12, Math.min(80, Number(ic.tamanho || 34)));
        const cor = corSegura(ic.cor);
        let estilo;
        if(pos === "esquerda-bloco"){
          estilo = "float:left;margin:2px 14px 6px 0;width:" + tam + "px;height:" + tam + "px";
        } else if(pos === "esquerda"){
          estilo = "display:inline-block;vertical-align:-0.14em;margin:0 10px 0 0;width:" + tam + "px;height:" + tam + "px";
        } else {
          estilo = (a.centro ? "display:block;margin:0 auto 14px" : "display:block;margin:0 0 14px") + ";width:" + tam + "px;height:" + tam + "px";
        }
        const node = document.createElement("span");
        node.className = "sec-icone";
        node.setAttribute("aria-hidden", "true");
        node.style.cssText = estilo + (cor ? ";color:" + cor + ";stroke:" + cor : "");
        node.innerHTML = svgIcone(chave);
        if(a.alvo && a.alvo.parentElement === a.pai) a.pai.insertBefore(node, a.alvo);
        else a.pai.insertBefore(node, a.pai.firstChild);
      }
    }
    /* ornamento do cabeçalho */
    if(el.querySelector(".ornamento")){
      const box = el.querySelector(".ornamento");
      if(cfg.ornamento){
        const orn = cfg.ornamento;
        if(!orn.chave){
          box.style.display = "none";
        } else if(temIcone(orn.chave)){
          const tam = Math.max(10, Math.min(60, Number(orn.tamanho || 24)));
          if(box.dataset.orig === undefined) box.dataset.orig = box.innerHTML;
          box.innerHTML = "<i></i>" + svgIcone(orn.chave) + "<i></i>";
          box.querySelectorAll("svg").forEach(s=>{
            s.style.width = tam + "px";
            s.style.height = tam + "px";
            const cor = corSegura(orn.cor);
            if(cor) s.style.stroke = cor;
          });
        }
      } else if(box.dataset.orig !== undefined){
        box.innerHTML = box.dataset.orig;
        box.style.display = "";
        delete box.dataset.orig;
      }
    }
    /* estrelas das avaliações */
    if(el.querySelector(".estrelas")){
      const box = el.querySelector(".estrelas");
      if(cfg.estrelas){
        const e2 = cfg.estrelas;
        if(!e2.chave){
          box.style.display = "none";
        } else if(temIcone(e2.chave)){
          const tam = Math.max(8, Math.min(36, Number(e2.tamanho || 15)));
          if(box.dataset.orig === undefined) box.dataset.orig = box.innerHTML;
          box.innerHTML = new Array(5).fill(svgIcone(e2.chave)).join("");
          box.querySelectorAll("svg").forEach(s=>{
            s.style.width = tam + "px";
            s.style.height = tam + "px";
            const cor = corSegura(e2.cor);
            if(e2.chave === "estrela"){ s.style.fill = cor || "currentColor"; }
            else if(cor){ s.style.stroke = cor; }
          });
        }
      } else if(box.dataset.orig !== undefined){
        box.innerHTML = box.dataset.orig;
        box.style.display = "";
        delete box.dataset.orig;
      }
    }
  });
  /* ícone dos componentes (card, item) */
  const comps = est.componentes || {};
  Object.keys(comps).forEach(secId=>{
    const slots = comps[secId] || {};
    Object.keys(slots).forEach(slot=>{
      const ic = (slots[slot]||{}).icone || {};
      if(!temIcone(ic.chave)) return;
      const tam = Math.max(12, Math.min(72, Number(ic.tamanho || 24)));
      const cor = corSegura(ic.cor);
      document.querySelectorAll('[data-slot="' + secId + "." + slot + '"]').forEach(el=>{
        const corpo = el.querySelector(".card-corpo, .dest-corpo, .ocasiao figcaption") || el;
        const titulo = corpo.querySelector("h3, b, .titulo, p");
        const inline = ic.pos === "esquerda" || el.tagName === "BUTTON" || getComputedStyle(el).display.indexOf("inline") === 0;
        const node = document.createElement("span");
        node.className = "card-icone";
        node.setAttribute("aria-hidden", "true");
        node.style.cssText = "display:inline-flex;width:" + tam + "px;height:" + tam + "px;margin:" +
          (inline ? "0 8px 0 0" : "0 0 10px") + (cor ? ";color:" + cor : "");
        node.innerHTML = svgIcone(ic.chave);
        if(titulo && titulo.parentElement === corpo) corpo.insertBefore(node, titulo);
        else corpo.insertBefore(node, corpo.firstChild);
      });
    });
  });
}

/* ---------- menu editável via config.menu [{t, href}] ---------- */
function renderMenu(){
  const nav = document.querySelector("#menu");
  if(!nav || !CFG) return;
  const itens = Array.isArray(CFG.menu) ? CFG.menu : null;
  if(!itens) return;
  const validos = itens.filter(m=>m && (m.t||m.titulo) && (m.href||m.link));
  if(!validos.length) return;
  nav.innerHTML = validos.map(m=>{
    const t = esc(m.t||m.titulo||"");
    let h = String(m.href||m.link||"#topo").trim();
    if(/^(javascript|data|vbscript):/i.test(h)) h = "#topo";
    return `<a href="${esc(h)}">${t}</a>`;
  }).join("");
}

/* ---------- coleções: botões que reúnem os produtos da mesma coleção ---------- */
function colecoesDisponiveis(){
  const mapa = new Map();
  (PRODUTOS||[]).forEach(p=>{
    const c = String(p.colecao||"").trim();
    if(c) mapa.set(c, (mapa.get(c)||0)+1);
  });
  /* ordem da lista mestra (Páginas › Coleções); fora da lista, por nome no fim */
  const mestra = (((CFG&&CFG.devocoes)||{}).itens||[]).map(x=>String((x&&x.t)||x||"").trim().toLowerCase());
  const pos = c => { const i = mestra.indexOf(c.toLowerCase()); return i<0 ? 1e9 : i; };
  return [...mapa.entries()].sort((a,b)=> (pos(a[0])-pos(b[0])) || a[0].localeCompare(b[0],"pt-BR"));
}
function renderColecoes(){
  const elDev = document.querySelector(".devocoes");
  if(!elDev) return;
  const cols = colecoesDisponiveis();
  const dev = (CFG && CFG.devocoes) || {};
  const itens = Array.isArray(dev.itens) ? dev.itens : [];
  const botoes = cols.map(([c,n])=>
    `<button type="button" class="devocao${estado.colecao===c?" on":""}" data-slot="devocoes.item" data-colecao="${esc(c)}" aria-pressed="${estado.colecao===c?"true":"false"}" title="Ver as ${n} peças da coleção">${esc(c)}<span class="n" aria-hidden="true"> · ${n}</span></button>`
  ).join("");
  const nomesColecao = new Set(cols.map(([c])=>c.toLowerCase()));
  // textos que já viraram botão não se repetem como selo
  const textos = itens
    .filter(s=>!nomesColecao.has(String(s.t||s).trim().toLowerCase()))
    .map(s=>`<span class="devocao" data-slot="devocoes.item">${esc(s.t||s)}</span>`).join("");
  // coleções com produtos viram botões (com contagem); demais textos seguem como selo informativo
  if(htmlMudou(elDev, botoes + textos, botoes + textos)) invalidarEstilos();
  elDev.style.display = (cols.length || itens.length) ? "" : "none";
}
function escolherColecao(c){
  const ativando = estado.colecao!==c;
  estado.colecao = ativando ? c : "";
  if(ativando){
    /* uma dimensão por vez: coleção limpa linha + busca para não sobrepor */
    estado.filtro = "tudo";
    estado.busca = "";
    const bi = $("#busca");
    if(bi) bi.value = "";
    const lb = $("#limparBusca");
    if(lb) lb.classList.remove("on");
    desenharFiltros();
  }
  renderColecoes();
  desenhar();
  sincronizarURL();
  if(estado.colecao){
    const primeiro = document.querySelector("#grade .card");
    const alvo = primeiro || $("#catalogo");
    if(alvo) alvo.scrollIntoView({behavior: reduz ? "auto" : "smooth", block: primeiro ? "center" : "start"});
  }
}

function renderSecoes(){
  if(!CFG) return;
  // selos
  const selos = Array.isArray(CFG.selos) ? CFG.selos : null;
  const elSelos = $(".selos .env");
  if(elSelos && selos){
    const html = selos.map((s,i)=>{
      const icone = iconeSeloSrc(s.icone);
      const ic = icone ? `<img class="selo-icone" src="${esc(icone)}" alt="" loading="lazy">` : ICONES_SELO[i%ICONES_SELO.length];
      return `<div class="selo-item" data-slot="selos.item">${ic}<b>${esc(s.t)}</b><span>${esc(s.s)}</span></div>`;
    }).join("");
    if(htmlMudou(elSelos, html, html)) invalidarEstilos();
  }
  // devoções / coleções: botões que filtram o catálogo pela coleção do produto;
  // sem coleções cadastradas, mostra os textos do config como antes
  renderColecoes();
  // ocasiões
  const oca = CFG.ocasioes || {};
  const elOca = $(".ocasioes");
  if(elOca){
    const itens = Array.isArray(oca.itens) ? oca.itens : null;
    if(itens){
      const html = itens.map(o=>{
        const m = o.img || "placeholder.png";
        const midia = midiaTipo(m) === "video"
          ? `<video muted loop playsinline preload="metadata" src="${esc(midiaSrc(m))}"></video>`
          : `<img src="${esc(fotoSrc(o.img))}" alt="${esc(o.titulo||"")}" loading="lazy">`;
        return `<figure class="ocasiao" data-slot="ocasioes.item">${midia}<figcaption><b>${esc(o.titulo||"")}</b><span>${esc(o.sub||"")}</span></figcaption></figure>`;
      }).join("");
      if(htmlMudou(elOca, html, html)) invalidarEstilos();
      elOca.style.display = itens.length ? "" : "none";
    }
  }
  // cartões informativos
  const mis = CFG.misterios || {};
  const elMis = $(".grade-mist");
  if(elMis){
    const itens = Array.isArray(mis.itens) ? mis.itens : null;
    if(itens){
      const html = itens.map(m=>`<div class="mist" data-slot="misterios.card"><span>${esc(m.dia||"")}</span><b>${esc(m.titulo||"")}</b><p>${esc(m.texto||"")}</p></div>`).join("");
      if(htmlMudou(elMis, html, html)) invalidarEstilos();
      elMis.style.display = itens.length ? "" : "none";
    }
  }
  // depoimentos
  const dep = CFG.depoimentos || {};
  const elDepo = $(".grade-depo");
  if(elDepo && Array.isArray(dep.lista)){
    const html = dep.lista.map(d=>`<article class="depo" data-slot="depoimentos.card"><div class="estrelas" aria-label="5 de 5 estrelas">${ESTRELA.repeat(5)}</div><p>${esc(d.texto||"")}</p><div class="depo-pe"><span class="depo-avatar" aria-hidden="true">${esc((d.nome||"?").charAt(0))}</span><div><b>${esc(d.nome||"")}</b><span>${esc(d.contexto||"")}</span></div></div></article>`).join("");
    if(htmlMudou(elDepo, html, html)) invalidarEstilos();
    elDepo.style.display = dep.lista.length ? "" : "none";
  }
  const elFaixa = $(".faixa-social");
  if(elFaixa && Array.isArray(dep.faixa)){
    const html = dep.faixa.map(f=>`<div><b>${esc(f.t)}</b><span>${esc(f.s)}</span></div>`).join("");
    if(htmlMudou(elFaixa, html, html)) invalidarEstilos();
    elFaixa.style.display = dep.faixa.length ? "" : "none";
  }
  // números da história
  const sob = CFG.sobre || {};
  const elNum = $(".sobre .numeros");
  if(elNum && Array.isArray(sob.numeros)){
    const html = sob.numeros.map(n=>`<div><b>${esc(n.v)}</b><span>${esc(n.s)}</span></div>`).join("");
    if(htmlMudou(elNum, html, html)) invalidarEstilos();
    elNum.style.display = sob.numeros.length ? "" : "none";
  }
}

/* ---------- destaques dinâmicos (ids no config; esconde se vazio) ---------- */
function renderDestaques(){
  const sec = document.querySelector("section.destaques");
  const alvo = document.querySelector(".grade-dest");
  if(!alvo) return;
  const d = (CFG && CFG.destaques) || {};
  const itens = Array.isArray(d.itens)
    ? d.itens.slice()
    : (Array.isArray(d.ids) ? d.ids.map(id=>({id})) : []);
  const cards = itens.map(it=>{
    it = it || {};
    const p = it.id ? PRODUTOS.find(x=>x.id===it.id) : null;
    const titulo = String(it.titulo||"").trim() || (p ? p.nome : "");
    const texto = String(it.texto||"").trim() || (p ? (p.desc||"") : "");
    const midiaVal = String(it.midia||"").trim() || (p ? (p.video || p.foto || "") : "");
    if(!titulo && !texto && !midiaVal) return "";
    const nome = titulo || "Destaque";
    const selo = String(it.selo !== undefined && it.selo !== null ? it.selo : ((p && (p.selo || p.tag)) || "")).trim();
    let precoTxt = String(it.preco !== undefined && it.preco !== null ? it.preco : "").trim();
    let precoNota = String(it.preco_nota !== undefined && it.preco_nota !== null ? it.preco_nota : "").trim();
    if(!precoTxt && p){ precoTxt = temPreco(p) ? reais(p.preco) : "Sob consulta"; }
    if(!precoNota && p){ precoNota = temPreco(p) ? "à vista" : "orçamento no WhatsApp"; }
    const poster = (p && p.foto) ? fotoMini(p.foto) : "img/placeholder.png";
    const customMidia = String(it.midia||"").trim();
    const ehVideo = midiaTipo(midiaVal) === "video";
    const srcMidia = !customMidia && p && !ehVideo && p.foto ? fotoMini(p.foto) : midiaSrc(midiaVal);
    const fallbackFoto = (p && p.foto) ? p.foto : "placeholder.png";
    const midia = midiaVal
      ? (ehVideo
        ? `<video muted loop playsinline preload="none" poster="${esc(midiaSrc(poster))}"><source src="${esc(midiaSrc(midiaVal))}" type="${/\.webm(?:$|[?#])/i.test(midiaVal)?"video/webm":"video/mp4"}"></video>`
        : `<img src="${esc(srcMidia)}" alt="${esc(nome)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${esc(fotoSrc(fallbackFoto))}'">`)
      : "";
    const botao = String(it.botao||"").trim() || (p ? "Adicionar" : "Ver catálogo");
    const acao = p
      ? `<button class="add" data-add="${esc(p.id)}" aria-label="Adicionar ${esc(nome)} à lista">`
      : `<a class="add" href="${esc(String(it.link||"#catalogo"))}" aria-label="${esc(botao)}">`;
    const acaoFim = p ? "</button>" : "</a>";
    const preco = (precoTxt || precoNota)
      ? `<span class="preco">${esc(precoTxt)}${precoNota?`<small>${esc(precoNota)}</small>`:""}</span>`
      : "";
    const addIcone = `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> `;
    return `<article class="dest" data-slot="destaques.card"><div class="dest-video">${midia}${selo?`<span class="dest-selo">${esc(selo)}</span>`:""}</div><div class="dest-corpo"><b>${esc(nome)}</b><p>${esc(texto)}</p><div class="dest-pe">${preco}${acao}${addIcone}${esc(botao)}${acaoFim}</div></div></article>`;
  }).filter(Boolean);
  if(!cards.length){
    if(sec) sec.style.display = "none";
    if(htmlMudou(alvo, "", "")) invalidarEstilos();
    return;
  }
  if(sec) sec.style.display = "";
  if(htmlMudou(alvo, cards.join(""), cards.join(""))) invalidarEstilos();
  alvo.querySelectorAll("video").forEach(v=>{ try{ videoObs.observe(v); }catch(e){} });
}

/* ---------- fallback de mídia: placeholder neutro quando o arquivo não existe ---------- */
document.addEventListener("error", e=>{
  const el = e.target;
  if(!(el instanceof Element)) return;
  if(el.tagName === "IMG"){
    if(el.dataset.fb || /placeholder\.png$/.test(el.src||"")) return;
    el.dataset.fb = "1";
    el.src = "img/placeholder.png";
  } else if(el.tagName === "SOURCE" && el.parentElement && el.parentElement.tagName === "VIDEO"){
    const v = el.parentElement;
    if(v.dataset.fb) return;
    v.dataset.fb = "1";
    v.poster = "img/placeholder.png";
  }
}, true);

/* ---------- vídeos: autoplay com som desligado, pausam fora da tela ---------- */
const videoObs = new IntersectionObserver(es=>{
  es.forEach(en=>{
    const v = en.target;
    /* propriedade muted (iOS exige além do atributo) preserva o autoplay */
    v.muted = true;
    if(en.isIntersecting && !reduz){ v.play().catch(()=>{}); } else { v.pause(); }
  });
},{rootMargin:"120px"});
$$("video").forEach(v=>{
  v.muted = true;
  if(reduz) v.removeAttribute("autoplay");
  videoObs.observe(v);
});

/* ---------- catálogo: dados externos ---------- */
let PRODUTOS = [];
let estado = {
  filtro: "tudo",
  busca: "",
  ordem: "destaque",
  colecao: ""
};
let lista = [];

const grade = $("#grade");

/* ---------- utilidades de catálogo ---------- */
function desenhar(){
  let listaProds = PRODUTOS.filter(p=> estado.filtro==="tudo" || p.cat===estado.filtro);
  if(estado.colecao) listaProds = listaProds.filter(p=> String(p.colecao||"").trim()===estado.colecao);
  const q = semAcento(estado.busca.trim());
  if(q){
    listaProds = listaProds.filter(p=>{
      const alvo = semAcento(p.nome+" "+(p.desc||"")+" "+(p.tag||"")+" "+rotuloCat(p.cat));
      return alvo.includes(q);
    });
  }
  if(estado.ordem==="preco-asc") listaProds.sort((a,b)=> (a.preco||1e9)-(b.preco||1e9));
  else if(estado.ordem==="preco-desc") listaProds.sort((a,b)=> (b.preco||0)-(a.preco||0));
  else if(estado.ordem==="lancamentos"){
    const novo = p => /novo|lancamento/i.test(semAcento(p.tag||""));
    listaProds.sort((a,b)=> (novo(b)?1:0)-(novo(a)?1:0));
  }
  else {
    /* sequência definida no admin (Produtos > Posição); sem número, mantém a ordem do cadastro */
    const ord = p => typeof p.ordem==="number" && isFinite(p.ordem) ? p.ordem : 9999;
    listaProds
      .map((p,i)=>({p,i}))
      .sort((a,b)=> (ord(a.p)-ord(b.p)) || (a.i-b.i))
      .forEach((x,k)=>{ listaProds[k]=x.p; });
  }

  const htmlGrade = listaProds.length ? listaProds.map((p,i)=>`
      <article class="card" data-slot="catalogo.card" style="animation-delay:${Math.min(i,12)*35}ms">
      <button class="card-foto" data-modal="${p.id}" aria-label="Ver detalhes de ${p.nome}">
        <img src="${fotoMini(p.foto)}" alt="${p.nome} — ${NOME}" loading="lazy" decoding="async" width="480" height="640" onerror="this.onerror=null;this.src='${fotoSrc(p.foto)}'">
        ${p.tag?`<span class="tag">${p.tag}</span>`:""}
        <span class="lupa" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M11 8v6M8 11h6"/></svg></span>
      </button>
      <div class="card-corpo">
        <h3>${p.nome}</h3>
        <p>${p.desc}</p>
        <div class="card-pe">
          <span class="preco">${temPreco(p)?reais(p.preco):"Sob consulta"}<small>${temPreco(p)?"à vista":"orçamento no WhatsApp"}</small></span>
          <button class="add" data-add="${p.id}" aria-label="Adicionar ${p.nome} à lista">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Adicionar
          </button>
        </div>
      </div>
    </article>`).join("")
    : (()=>{ const termo = estado.busca.trim(); const msg = `Olá, ${NOME}! 🤍\nVim pelo site e não encontrei “${termo}” no catálogo.\nVocês fazem sob encomenda?`; return `<div class="vazio"><b>Nenhuma peça encontrada</b><p>${termo?`Nada com “${esc(termo)}”. A gente faz sob encomenda:`:"Nenhuma peça nesta categoria."}</p><p style="margin-top:16px"><a class="btn btn-zap" href="${zapLink(msg)}" target="_blank" rel="noopener">Perguntar no WhatsApp</a></p></div>`; })();

  const tot = listaProds.length;
  const ativo = estado.filtro!=="tudo" || estado.busca.trim() || estado.colecao;
  if(htmlMudou(grade, htmlGrade, htmlGrade)) invalidarEstilos();
  $("#resumoBusca").innerHTML = ativo
    ? (estado.colecao
      ? `${tot===1?"1 peça":tot+" peças"} na coleção <b>${esc(estado.colecao)}</b> <button type="button" class="tirar" data-limpa-colecao style="margin-left:4px">limpar ✕</button>`
      : (tot===1 ? "1 peça encontrada" : tot+" peças encontradas"))
    : "";
}

function desenharFiltros(){
  $$("#filtros .filtro").forEach(b=>{
    const on = b.dataset.cat===estado.filtro;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
  });
}

/* contagem por categoria nos filtros (prova social + orientação) */
function pintarContagens(){
  const grupo = $("#filtros");
  if(!grupo || !PRODUTOS.length) return;
  const total = {};
  PRODUTOS.forEach(p=>{ total[p.cat]=(total[p.cat]||0)+1; });
  $$(".filtro", grupo).forEach(b=>{
    const cat = b.dataset.cat;
    const n = cat==="tudo" ? PRODUTOS.length : (total[cat]||0);
    let el = b.querySelector(".n");
    if(!el){ el = document.createElement("span"); el.className = "n"; el.setAttribute("aria-hidden","true"); b.appendChild(el); }
    el.textContent = "· "+n;
    const base = b.textContent.replace(/\s*·\s*\d+\s*$/,"");
    b.setAttribute("aria-label", base.trim()+" ("+n+" peças)");
  });
}

/* ---------- busca / filtro / ordenação ---------- */
function sincronizarURL(){
  const p = new URLSearchParams();
  if(LOJA) p.set("loja", LOJA); /* nunca perder o tenant ao filtrar/buscar */
  if(estado.filtro!=="tudo") p.set("cat", estado.filtro);
  if(estado.busca.trim()) p.set("q", estado.busca.trim());
  if(estado.colecao) p.set("col", estado.colecao);
  const qs = p.toString();
  history.replaceState(null, "", qs ? "?"+qs : location.pathname);
}

$$("#filtros .filtro").forEach(b=>b.addEventListener("click",()=>{
  estado.filtro = b.dataset.cat;
  if(estado.colecao){ estado.colecao = ""; renderColecoes(); }
  desenharFiltros();
  desenhar();
  sincronizarURL();
}));

const buscaInput = $("#busca");
const limparBusca = $("#limparBusca");
let buscaTimer = null;
buscaInput.addEventListener("input",()=>{
  clearTimeout(buscaTimer);
  buscaTimer = setTimeout(()=>{
    estado.busca = buscaInput.value;
    if(estado.colecao){ estado.colecao = ""; renderColecoes(); }
    limparBusca.classList.toggle("on", !!buscaInput.value);
    desenhar();
    sincronizarURL();
  }, 160);
});
limparBusca.addEventListener("click",()=>{ buscaInput.value=""; estado.busca=""; limparBusca.classList.remove("on"); buscaInput.focus(); desenhar(); sincronizarURL(); });

$("#ordenar").addEventListener("change", e=>{ estado.ordem = e.target.value; desenhar(); });

/* ---------- carrinho ---------- */
const CHAVE = "catalogo-lista-" + (LOJA || "padrao");
try{ lista = JSON.parse(localStorage.getItem(CHAVE)) || []; }catch(e){ lista = []; }
/* higieniza o formato sem validar contra o catálogo (ele ainda não carregou;
   a validação real acontece após o fetch, em "início") */
if(!Array.isArray(lista)) lista = [];
lista = lista
  .filter(i => i && typeof i.id === "string")
  .map(i => ({id:i.id, q:Math.max(1, parseInt(i.q)||1), pers:Object.assign({}, persVazio, i.pers||{})}));

const salvar = ()=>{ try{ localStorage.setItem(CHAVE, JSON.stringify(lista)); }catch(e){} };
const acha = id => PRODUTOS.find(p=>p.id===id);
const totalItens = ()=> lista.reduce((s,i)=>s+i.q,0);
const totalValor = ()=> lista.reduce((s,i)=>{ const p=acha(i.id); return temPreco(p) ? s+i.q*p.preco : s; },0);
const temAcombinar = ()=> lista.some(i=>!temPreco(acha(i.id)));
const persTexto = pers => [pers.devocao,pers.cor,pers.nome,pers.prazo].filter(Boolean).join(" · ");

function pintarCarrinho(){
  /* poda itens órfãos (produto saiu do catálogo) antes de renderizar —
     sem isso um item inválido quebra a sacola inteira */
  const antes = lista.length;
  lista = lista.filter(i => i && acha(i.id));
  const n = totalItens();
  const cont = $("#contador");
  cont.textContent = n;
  cont.classList.toggle("on", n>0);
  $("#resumoTopo").textContent = n===0 ? T("carrinho.resumo_vazio","nenhuma peça ainda") : (n===1 ? "1 peça escolhida" : n+" peças escolhidas");
  $("#total").textContent = reais(totalValor()) + (temAcombinar() ? " +" : "");
  $("#notaCombinar").hidden = !temAcombinar();

  $("#itens").innerHTML = lista.length ? lista.map(i=>{
    const p = acha(i.id);
    const pers = persTexto(i.pers);
    return `<div class="item">
      <button class="item-img" data-modal="${p.id}" aria-label="Editar ${p.nome}">
        <img src="${fotoMini(p.foto)}" alt="${p.nome}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fotoSrc(p.foto)}'">
      </button>
      <div>
        <h4>${p.nome}</h4>
        <div class="p">${temPreco(p)?reais(p.preco * i.q):"valor a combinar"}</div>
        ${pers?`<div class="item-pers">${pers}</div>`:""}
        <div class="item-linha">
          <div class="qtd">
            <button data-menos="${p.id}" aria-label="Diminuir quantidade de ${p.nome}">−</button>
            <span aria-live="polite">${i.q}</span>
            <button data-mais="${p.id}" aria-label="Aumentar quantidade de ${p.nome}">+</button>
          </div>
          <button class="tirar" data-modal="${p.id}">editar</button>
          <button class="tirar" data-tirar="${p.id}">remover</button>
        </div>
      </div>
    </div>`;
  }).join("") : `<div class="carrinho-vazio">
      <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      <p>${T("carrinho.vazio_titulo","Sua lista está vazia.")}<br>${T("carrinho.vazio_texto","Escolha as peças no catálogo e a gente monta o orçamento no WhatsApp.")}</p>
      <p style="margin-top:18px"><a href="#catalogo" class="btn btn-linha" data-ir-catalogo>Ver o catálogo</a></p>
    </div>`;

  /* barra fixa de checkout */
  const barra = $("#barra");
  barra.classList.toggle("on", n>0);
  barra.setAttribute("aria-hidden", n>0 ? "false" : "true");
  $("#barraInfo").innerHTML = `<b>${n} ${n===1?"peça":"peças"} · ${reais(totalValor())}${temAcombinar()?" +":""}</b><span>${n===1?"peça na sua lista":"peças na sua lista"}</span>`;
  const zap = $("#zapFlut");
  if(zap) zap.classList.toggle("esconde", n>0 && window.innerWidth<=760);

  salvar();
}

function adicionar(id, pers){
  if(!acha(id)){ toast("Produto indisponível no momento."); return; }
  const item = lista.find(i=>i.id===id);
  if(item){ item.q++; if(pers) item.pers = Object.assign({}, persVazio, pers); }
  else lista.push({id, q:1, pers: Object.assign({}, persVazio, pers||{})});
  pintarCarrinho();
  medirAdicao(acha(id));
  const bt = $(`[data-add="${id}"]`);
  if(bt){
    const antes = bt.innerHTML;
    bt.classList.add("feito");
    bt.innerHTML = `<svg viewBox="0 0 24 24"><path d="M5 12l5 5L19 7"/></svg> Na lista`;
    setTimeout(()=>{ bt.classList.remove("feito"); bt.innerHTML = antes; }, 1400);
  }
  toast("Peça adicionada à sua lista.");
}

function atualizar(id, pers){
  const item = lista.find(i=>i.id===id);
  if(item) item.pers = Object.assign({}, persVazio, pers);
  pintarCarrinho();
  toast("Personalização atualizada.");
}

document.addEventListener("click", e=>{
  const irCat = e.target.closest("[data-ir-catalogo]");
  if(irCat){ fechar(); return; } /* fecha pelo fluxo oficial (destrava o body) e deixa o #catalogo rolar */

  const add = e.target.closest("[data-add]");
  if(add){ adicionar(add.dataset.add); return; }

  const modalAbrir = e.target.closest("[data-modal]");
  if(modalAbrir){ abrirModal(modalAbrir.dataset.modal); return; }

  const mais = e.target.closest("[data-mais]");
  if(mais){ const i = lista.find(x=>x.id===mais.dataset.mais); if(i){ i.q++; pintarCarrinho(); } return; }

  const menos = e.target.closest("[data-menos]");
  if(menos){
    const i = lista.find(x=>x.id===menos.dataset.menos);
    if(i){ i.q--; if(i.q<=0) lista = lista.filter(x=>x.id!==i.id); pintarCarrinho(); }
    return;
  }

  const tirar = e.target.closest("[data-tirar]");
  if(tirar){ lista = lista.filter(x=>x.id!==tirar.dataset.tirar); pintarCarrinho(); return; }

  const col = e.target.closest("[data-colecao]");
  if(col){ escolherColecao(col.dataset.colecao); return; }

  if(e.target.closest("[data-limpa-colecao]")){ escolherColecao(estado.colecao); return; }
});
/* medição: qualquer toque em link de WhatsApp (flutuante, rodapé, personalizado, sob encomenda) */
document.addEventListener("click", e=>{
  try{
    const w = e.target && e.target.closest ? e.target.closest('a[href*="wa.me"]') : null;
    if(w) medir("Contact", "contact", {content_name:"WhatsApp"});
  }catch(e2){}
});

/* ---------- gaveta ---------- */
const gaveta = $("#gaveta"), veu = $("#veu");
let focoAnteriorGaveta = null;
const abrir = ()=>{
  focoAnteriorGaveta = document.activeElement;
  gaveta.classList.add("on"); veu.classList.add("on"); document.body.classList.add("arrumar-modal");
  $("#abreCarrinho").setAttribute("aria-expanded","true");
  $("#fechaCarrinho").focus();
};
const fechar = ()=>{
  gaveta.classList.remove("on"); veu.classList.remove("on"); document.body.classList.remove("arrumar-modal");
  $("#abreCarrinho").setAttribute("aria-expanded","false");
  if(focoAnteriorGaveta && focoAnteriorGaveta.focus) focoAnteriorGaveta.focus();
};
if(PREVIEW){
  window.__editorAbrirCarrinho = abrir;
  window.__editorFecharCarrinho = fechar;
}
/* focus trap da gaveta (teclado preso dentro enquanto aberta) */
gaveta.addEventListener("keydown", e=>{
  if(e.key!=="Tab" || !gaveta.classList.contains("on")) return;
  const f = $$("button, input, textarea, select, a[href]", gaveta).filter(el=>!el.disabled && el.offsetParent!==null);
  if(!f.length) return;
  const first = f[0], last = f[f.length-1];
  if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
});
$("#abreCarrinho").addEventListener("click", abrir);
$("#fechaCarrinho").addEventListener("click", fechar);
veu.addEventListener("click", fechar);
$("#barraPedido").addEventListener("click", abrir);

/* ---------- toast ---------- */
const toastEl = $("#toast");
const toastTxt = $("#toastTxt");
let toastTimer = null;
function toast(msg){
  toastTxt.textContent = msg;
  toastEl.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toastEl.classList.remove("on"), 3200);
}
$("#toastVer").addEventListener("click", ()=>{ toastEl.classList.remove("on"); abrir(); });

/* ---------- WhatsApp do cliente: máscara + obrigatório no pedido ---------- */
const soDigitos = s => String(s||"").replace(/\D/g,"");
function mascaraFone(v){
  v = soDigitos(v).slice(0,11);
  if(v.length>6) return `(${v.slice(0,2)}) ${v.slice(2, v.length>10?7:6)}-${v.slice(v.length>10?7:6)}`;
  if(v.length>2) return `(${v.slice(0,2)}) ${v.slice(2)}`;
  if(v.length>0) return `(${v}`;
  return "";
}
const whatsInput = $("#whatsCliente");
if(whatsInput){
  whatsInput.addEventListener("input", ()=>{
    whatsInput.value = mascaraFone(whatsInput.value);
    whatsInput.classList.remove("erro");
    const er = $("#whatsErro");
    if(er) er.hidden = true;
  });
}

/* ---------- mensagem do pedido ---------- */
const MSG_PEDIDO_PADRAO = [
  "Olá, {loja}! 🤍",
  "Vim pelo site e gostaria de encomendar:",
  "",
  "{itens}",
  "",
  "Total estimado: {total}{combinar}",
  "",
  "{observacao}",
  "",
  "{cliente}",
  "",
  "{entrega}",
  "",
  "Pode me confirmar disponibilidade, prazo e o frete?"
].join("\n");

function montarMensagemPedido(d){
  const tpl = String(T("carrinho.msg_modelo", "") || "").trim() || MSG_PEDIDO_PADRAO;
  const vals = {
    loja: NOME,
    itens: d.itens,
    total: d.total,
    combinar: d.combinar ? " (mais as peças com valor a combinar)" : "",
    observacao: d.obs ? "Personalização geral: " + d.obs : "",
    cliente: (d.nome || d.whats)
      ? "Meus dados:" + (d.nome ? "\nNome: " + d.nome : "") + (d.whats ? "\nWhatsApp: " + d.whats : "")
      : "",
    entrega: d.cep ? "CEP/cidade para estimar o frete: " + d.cep : "",
    nome: d.nome || "",
    whatsapp: d.whats || "",
    obs: d.obs || "",
    cep: d.cep || ""
  };
  let txt = tpl;
  Object.keys(vals).forEach(k=>{ txt = txt.split("{" + k + "}").join(vals[k]); });
  return txt.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

$("#fecharPedido").addEventListener("click", e=>{
  if(!lista.length){
    e.preventDefault();
    fechar();
    $("#catalogo").scrollIntoView({behavior: reduz ? "auto" : "smooth"});
    return;
  }
  const linhas = lista.map(i=>{
    const p = acha(i.id);
    const pers = persTexto(i.pers);
    return `• ${i.q}x ${p.nome} — ${temPreco(p)?reais(p.preco*i.q):"valor a combinar"}${pers?`\n    Personalização: ${pers}`:""}`;
  }).join("\n");
  const obs = $("#obs").value.trim();
  const cep = $("#cep").value.trim();
  const nome = $("#nomeCliente") ? $("#nomeCliente").value.trim() : "";
  const whatsDig = whatsInput ? soDigitos(whatsInput.value) : "";
  if(whatsDig.length < 10){
    /* número ausente/incompleto: abre os dados, destaca e foca — sem ele a loja não consegue responder */
    e.preventDefault();
    const dob = $("#dobravelDados");
    if(dob && !dob.open) dob.open = true;
    if(whatsInput){
      whatsInput.classList.add("erro");
      whatsInput.focus({preventScroll:false});
    }
    const er = $("#whatsErro");
    if(er) er.hidden = false;
    toast("Informe seu WhatsApp para concluir 🤍");
    return;
  }
  const whats = whatsInput ? whatsInput.value.trim() : "";
  const txt = montarMensagemPedido({
    itens: linhas,
    total: reais(totalValor()),
    combinar: temAcombinar(),
    obs,
    nome,
    whats,
    cep
  });
  e.currentTarget.href = zapLink(txt);
  /* medição: checkout iniciado no WhatsApp (a venda conclui fora do site) */
  try{
    medirCheckout(
      lista.map(i=>{ const p = acha(i.id); return {id:i.id, q:i.q, preco:(p && typeof p.preco==="number") ? p.preco : null}; }),
      Math.round(totalValor()*100)/100,
      totalItens()
    );
  }catch(e2){}
  /* lembra neste aparelho: próximos pedidos já vêm com o número */
  try{ localStorage.setItem("catalogo-dados-" + (LOJA || "padrao"), JSON.stringify({nome, whats: whatsDig})); }catch(e2){}
  registrar({
    tipo:"pedido",
    origem:"minha lista",
    nome, whatsapp: whatsDig,
    itens: lista.map(i=>{ const p = acha(i.id); return {id:i.id, nome:p.nome, q:i.q, preco: typeof p.preco==="number" ? p.preco : null}; }),
    total: Math.round(totalValor()*100)/100,
    cep, obs
  });
});

/* preenche nome/WhatsApp lembrados neste aparelho */
try{
  const lem = JSON.parse(localStorage.getItem("catalogo-dados-" + (LOJA || "padrao")) || "null");
  if(lem){
    const nI = $("#nomeCliente"), wI = $("#whatsCliente");
    if(nI && !nI.value && lem.nome) nI.value = lem.nome;
    if(wI && !wI.value && lem.whats) wI.value = mascaraFone(lem.whats);
  }
}catch(e){}

/* ---------- popup de captura (1x por aparelho no intervalo; bottom-sheet no mobile) ---------- */
function iniciarPopup(){
  const caixa = $("#pop");
  if(!caixa || !CFG || caixa.dataset.pronto) return;
  const cfg = CFG.popup || {};
  /* ?previa-popup=1: mostra em ~1s p/ teste (ignora ativo/visto/janela) */
  let forcar = false;
  try{ forcar = new URLSearchParams(location.search).has("previa-popup"); }catch(e2){}
  if(!forcar){
    const ativo = cfg.ativo===true || cfg.ativo==="true" || cfg.ativo===1;
    if(!ativo) return;
  }
  caixa.dataset.pronto = "1";
  const atraso = forcar ? 1000 : Math.max(5, parseFloat(cfg.atraso)||25) * 1000;
  const intervalo = Math.max(1, parseFloat(cfg.intervalo)||7) * 864e5;
  /* janela promocional (ex.: Black Friday): fora dela, não exibe (prévia ignora) */
  const agora = Date.now();
  const ini = cfg.inicio ? Date.parse(cfg.inicio) : NaN;
  const fim = cfg.fim ? Date.parse(cfg.fim) : NaN;
  if(!forcar){
    if(!isNaN(ini) && agora < ini) return;
    if(!isNaN(fim) && agora > fim) return;
  }
  /* frequência por campanha: promo nova aparece mesmo p/ quem viu a anterior */
  let h = 0;
  const baseChave = String(cfg.titulo||"")+"|"+String(cfg.inicio||"")+"|"+String(cfg.fim||"");
  for(let i=0;i<baseChave.length;i++){ h = ((h<<5)-h + baseChave.charCodeAt(i))|0; }
  const CHAVE = "popup-visto-" + (LOJA || "padrao") + "-" + (h<0?-h:h).toString(36);
  try{
    const visto = parseInt(localStorage.getItem(CHAVE)||"0", 10);
    if(!forcar && visto && Date.now()-visto < intervalo) return;
  }catch(e){}
  $("#popTitulo").textContent = cfg.titulo || "Novidades da loja";
  $("#popTexto").textContent = cfg.texto || "";
  $("#popBotao").textContent = cfg.botao || "Quero participar";
  $("#popAviso").textContent = cfg.aviso || "";
  /* contagem regressiva até o fim da promoção */
  const elCount = $("#popCount");
  let countTimer = null;
  if(elCount && !isNaN(fim)){
    const duas = n => String(n).padStart(2,"0");
    const tick = ()=>{
      const ms = fim - Date.now();
      if(ms<=0){ clearInterval(countTimer); try{caixa.classList.remove("on");document.body.classList.remove("arrumar-modal");}catch(e){} return; }
      const d = Math.floor(ms/864e5), h = Math.floor(ms%864e5/36e5), m = Math.floor(ms%36e5/6e4);
      elCount.textContent = d>0 ? `termina em ${d}d ${duas(h)}h` : `termina em ${duas(h)}:${duas(m)}`;
      elCount.hidden = false;
    };
    tick();
    countTimer = setInterval(tick, 30000);
  }
  const form = $("#popForm"), ok = $("#popOk"), nomeI = $("#popNome"), whatsI = $("#popWhats"), erro = $("#popErro");
  try{
    const lem = JSON.parse(localStorage.getItem("catalogo-dados-" + (LOJA || "padrao")) || "null");
    if(lem){ if(!nomeI.value && lem.nome) nomeI.value = lem.nome; if(!whatsI.value && lem.whats) whatsI.value = mascaraFone(lem.whats); }
  }catch(e){}
  whatsI.addEventListener("input", ()=>{ whatsI.value = mascaraFone(whatsI.value); whatsI.classList.remove("erro"); erro.hidden = true; });
  function fechar(marcar){
    if(countTimer) clearInterval(countTimer);
    caixa.classList.remove("on");
    document.body.classList.remove("arrumar-modal");
    if(marcar){ try{ localStorage.setItem(CHAVE, String(Date.now())); }catch(e){} }
  }
  function abrir(){
    if(caixa.classList.contains("on")) return;
    caixa.hidden = false;
    caixa.dataset.chave = CHAVE;
    requestAnimationFrame(()=>caixa.classList.add("on"));
    document.body.classList.add("arrumar-modal");
    setTimeout(()=>nomeI.focus({preventScroll:true}), 350);
  }
  const timer = setTimeout(abrir, reduz ? Math.min(atraso, 8000) : atraso);
  $("#popFechar").addEventListener("click", ()=>{ clearTimeout(timer); fechar(true); });
  $("#popContinuar").addEventListener("click", ()=>fechar(true));
  caixa.addEventListener("click", e=>{ if(e.target===caixa) fechar(true); });
  form.addEventListener("submit", e=>{
    e.preventDefault();
    const nome = nomeI.value.trim();
    const dig = soDigitos(whatsI.value);
    if(nome.length<2 || dig.length<10){
      whatsI.classList.toggle("erro", dig.length<10);
      nomeI.classList.toggle("erro", nome.length<2);
      erro.hidden = false;
      return;
    }
    registrar({tipo:"contato", origem:"popup: "+String(cfg.titulo||"sem título").slice(0,60), nome, whatsapp: dig});
    try{ localStorage.setItem("catalogo-dados-" + (LOJA || "padrao"), JSON.stringify({nome, whats: dig})); }catch(e2){}
    try{ localStorage.setItem(CHAVE, String(Date.now())); }catch(e){}
    const cup = String(cfg.cupom||"").trim();
    const elCup = $("#popCupom");
    if(elCup && cup){ elCup.textContent = cup; elCup.hidden = false; }
    form.hidden = true;
    ok.hidden = false;
  });
}

/* ---------- modal do produto ---------- */
const modal = $("#modal");
let modId = null;
let ultimoFoco = null;

function abrirModal(id){
  const p = acha(id); if(!p) return;
  const item = lista.find(i=>i.id===id);
  const pers = item ? item.pers : persVazio;

  $("#modFoto").src = fotoSrc(p.foto);
  $("#modFoto").alt = p.nome;
  $("#modTag").textContent = p.tag || "";
  $("#modTag").style.display = p.tag ? "inline-block" : "none";
  $("#modNome").textContent = p.nome;
  $("#modPreco").innerHTML = `${temPreco(p)?reais(p.preco):"Sob consulta"}<small>${temPreco(p)?T("geral.prazo_producao","à vista · produção de 3 a 7 dias úteis + Correios"):"orçamento no WhatsApp"}</small>`;
  $("#modDesc").textContent = p.desc;

  $("#modDevocao").value = pers.devocao || "";
  $("#modCor").value = pers.cor || "";
  $("#modNomeGrav").value = pers.nome || "";
  $("#modPrazo").value = pers.prazo || "";

  modId = id;
  modal.classList.add("on");
  document.body.classList.add("arrumar-modal");
  ultimoFoco = document.activeElement;
  const mfoto = $("#modal .modal-foto");
  if(mfoto) mfoto.classList.remove("zoom");
  $("#modFechar").focus();
}
/* toque na foto alterna zoom (ver o detalhe do artesanal) */
$("#modFoto").addEventListener("click", ()=>{
  const mfoto = $("#modal .modal-foto");
  if(mfoto) mfoto.classList.toggle("zoom");
});
function fecharModal(){
  modal.classList.remove("on");
  document.body.classList.remove("arrumar-modal");
  if(ultimoFoco) ultimoFoco.focus();
}
$("#modFechar").addEventListener("click", fecharModal);
modal.addEventListener("click", e=>{ if(e.target===modal) fecharModal(); });

function lerPersModal(){
  return {
    devocao: $("#modDevocao").value.trim(),
    cor: $("#modCor").value.trim(),
    nome: $("#modNomeGrav").value.trim(),
    prazo: $("#modPrazo").value
  };
}
$("#modAdd").addEventListener("click", ()=>{
  const id = modId;
  if(lista.find(i=>i.id===id)) atualizar(id, lerPersModal());
  else adicionar(id, lerPersModal());
  fecharModal();
});
$("#modZap").addEventListener("click", ()=>{
  const id = modId;
  const p = acha(id);
  const pers = persTexto(lerPersModal());
  const txt = `Olá, ${NOME}! 🤍\nVim pelo site e gostaria de encomendar:\n\n` +
    `• 1x ${p.nome} — ${temPreco(p)?reais(p.preco):"valor a combinar"}` +
    (pers ? `\n\nPersonalização: ${pers}` : "") +
    "\n\nPode me confirmar disponibilidade, prazo e o frete?";
  window.open(zapLink(txt), "_blank");
  registrar({tipo:"pedido", origem:"produto: "+p.nome, itens:[{id:p.id, nome:p.nome, q:1, preco: typeof p.preco==="number"?p.preco:null}], total: typeof p.preco==="number"?p.preco:null});
});
modal.addEventListener("keydown", e=>{
  if(e.key==="Tab"){
    const f = $$("button, input, select, textarea, a", modal).filter(el=>!el.disabled && el.offsetParent!==null);
    if(!f.length) return;
    const first = f[0], last = f[f.length-1];
    if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  }
});

/* preenche sugestões do campo personalizável do modal: coleções da loja; fallback = lista atual */
function renderSugestoesPers(){
  const dl = $("#modDevocoes"); if(!dl) return;
  let itens = [];
  try{ itens = (((CFG&&CFG.devocoes)||{}).itens||[]).map(x=>String((x&&x.t)||x||"").trim()).filter(Boolean); }catch(e){}
  const lista = itens.length ? itens : DEVOCOES;
  dl.innerHTML = lista.map(d=>`<option value="${esc(d)}">`).join("");
}
renderSugestoesPers();

/* ---------- teclado ---------- */
document.addEventListener("keydown", e=>{
  if(e.key!=="Escape") return;
  const pop = $("#pop");
  if(pop && pop.classList.contains("on")){ pop.classList.remove("on"); document.body.classList.remove("arrumar-modal"); try{ localStorage.setItem(pop.dataset.chave || ("popup-visto-" + (LOJA || "padrao")), String(Date.now())); }catch(e2){} return; }
  if(modal.classList.contains("on")){ fecharModal(); return; }
  if(gaveta.classList.contains("on")){ fechar(); return; }
  $("#menu").classList.remove("on");
});

/* ---------- menu mobile ---------- */
const menuToggle = $("#hamburguer");
menuToggle.addEventListener("click", ()=>{
  const on = $("#menu").classList.toggle("on");
  menuToggle.setAttribute("aria-expanded", String(on));
});
$("#menu").addEventListener("click", e=>{
  if(!e.target.closest("a")) return;
  $("#menu").classList.remove("on");
  menuToggle.setAttribute("aria-expanded", "false");
});

/* ---------- reveal ---------- */
const observador = new IntersectionObserver(es=>{
  es.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add("vis"); observador.unobserve(en.target); } });
},{threshold:.05, rootMargin:"0px 0px -30px 0px"});
$$(".rv").forEach(el=>observador.observe(el));

/* ---------- SEO: JSON-LD dinâmico ---------- */
function injetaJSONLD(){
  const itemList = {
    "@context":"https://schema.org",
    "@type":"ItemList",
    "itemListElement": PRODUTOS.map((p,i)=>({
      "@type":"ListItem","position":i+1,
        "item":{
          "@type":"Product","name":p.nome,"description":p.desc,
          "image": imgAbs(p.foto),
        "offers": temPreco(p) ? {"@type":"Offer","priceCurrency":"BRL","price":p.preco,"availability":"https://schema.org/PreOrder"} : undefined
      }
    }))
  };
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.textContent = JSON.stringify(itemList);
  document.head.appendChild(s);
}

/* ---------- PWA ---------- */
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{ navigator.serviceWorker.register("sw.js").catch(()=>{}); });
}

/* ---------- início ---------- */
html.classList.remove("no-js");
/* esqueleto anti-CLS enquanto o catálogo carrega */
grade.classList.add("carregando");
grade.innerHTML = Array.from({length:8},()=>`<div class="esqueleto" aria-hidden="true"><i></i><b></b><span></span></div>`).join("");
Promise.all([
  (PREVIEW && Array.isArray(PREVIEW.produtos)) ? Promise.resolve(PREVIEW.produtos) : fetch("js/catalog.json"+QLOJA).then(r=>r.json()).catch(()=>null),
  (PREVIEW && PREVIEW.config) ? Promise.resolve(PREVIEW.config) : fetch("config.json"+QLOJA).then(r=>r.json()).catch(()=>null)
]).then(([dados, conf])=>{
  aplicarConfig(conf);
  iniciarMedicao();
  iniciarPopup();
  if(!dados){
    grade.classList.remove("carregando");
    grade.innerHTML = `<p class="vazio"><b>Não foi possível carregar o catálogo.</b>Verifique a conexão e recarregue a página.</p>`;
    return;
  }
  PRODUTOS = dados;
  lista = lista.filter(i => PRODUTOS.some(p=>p.id===i.id));
  injetaJSONLD();
  garantirBotoesFiltros();
  /* ?cat= vindo da URL: aceita qualquer linha existente (não só as 6 fixas) */
  try{
    const pc = new URLSearchParams(location.search).get("cat");
    if(pc && /^[a-z0-9-]{1,30}$/.test(pc) && PRODUTOS.some(p=>p.cat===pc)){
      estado.filtro = pc;
    }
  }catch(e){}
  /* ?col= tem prioridade: uma dimensão por vez (limpa a linha) */
  if(estado.colecao){
    const ok = colecoesDisponiveis().some(([c])=>c===estado.colecao);
    if(ok) estado.filtro = "tudo";
    else estado.colecao = "";
  }
  desenharFiltros();
  desenhar();
  pintarContagens();
  renderDestaques();
  renderColecoes();
  aplicarEstilos();
  aplicarIcones();
  pintarCarrinho();
  grade.classList.remove("carregando");
});

/* filtro vindo da URL (?q=; ?cat= aplicado no boot após carregar o catálogo) */
try{
  const p = new URLSearchParams(location.search);
  if(p.has("q")){
    estado.busca = p.get("q");
    buscaInput.value = estado.busca;
    limparBusca.classList.toggle("on", !!estado.busca);
  }
  if(p.has("col")) estado.colecao = p.get("col");
}catch(e){}

window.__editorApply = function(conf, prods){
  if(conf) aplicarConfig(conf);
  if(Array.isArray(prods)){
    PRODUTOS = prods;
    lista = lista.filter(i => PRODUTOS.some(p=>p.id===i.id));
    garantirBotoesFiltros();
    desenharFiltros();
    desenhar();
    pintarContagens();
    renderDestaques();
    renderColecoes();
    aplicarEstilos();
    aplicarIcones();
    pintarCarrinho();
  } else {
    renderDestaques();
    renderColecoes();
    aplicarEstilos();
    aplicarIcones();
  }
};

})();