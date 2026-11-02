/* ==========================================================================
   Templates renderer + personalizador modular (Nuvemshop-like)
   3 modelos: vitrine-hml · editorial-hml · boutique-hml
   Dados: window.TEMPLATES_HML (gerado por scripts/build-templates-hml.mjs)
   ========================================================================== */
(function () {
  "use strict";

  const $ = (s, e = document) => e.querySelector(s);
  const $$ = (s, e = document) => [...e.querySelectorAll(s)];
  const esc = (v) => String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const money = (n) => (typeof n === "number" ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const TPL_ID = document.body.dataset.template || "vitrine-hml";
  const PACOTE = window.TEMPLATES_HML && window.TEMPLATES_HML[TPL_ID];
  const PAGINAS = {
    "vitrine-hml": "template-vitrine.html",
    "editorial-hml": "template-editorial.html",
    "boutique-hml": "template-boutique.html",
  };

  if (!PACOTE) {
    const alvo = $("#loja");
    if (alvo) alvo.innerHTML = '<p style="padding:48px;font-family:sans-serif">Modelo não encontrado. Volte para <a href="templates.html">a galeria de modelos</a>.</p>';
    return;
  }

  const BASE = clone(PACOTE.config);
  const CATALOGO = PACOTE.catalog || [];
  const META = PACOTE.meta || {};
  const STORAGE = "hml-tpl:" + TPL_ID;
  const CART_KEY = "hml-cart:" + TPL_ID;

  /* ------------------------------------------------------------------ */
  /* ícones                                                             */
  /* ------------------------------------------------------------------ */
  const ICONES = {
    bag: '<path d="M6 7h12l1 13H5z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-3.5-3.5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/>',
    arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    check: '<path d="M5 12l5 5L19 7"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z"/>',
    truck: '<path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>',
    heart: '<path d="M12 20s-7-4.3-7-9.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7 3.4c0 5.3-7 9.6-7 9.6z"/>',
    whatsapp: '<path d="M21 12a9 9 0 1 1-16.5 5L3 21l4.2-1.4A9 9 0 0 1 21 12z"/><path d="M9 9.5c.5 2.5 3 5 5.5 5.5l1-1.5 2 1c-.3 1.5-1.2 2-2.5 1.8-3.5-.5-6.5-3.5-7-7-.2-1.3.3-2.2 1.8-2.5l1 2z"/>',
    instagram: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.4"/><path d="M17 7.2h.01"/>',
    pin: '<path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 6.2A10.9 10.9 0 0 1 12 6c6.4 0 10 6 10 6a17.4 17.4 0 0 1-3.1 3.6M6.3 7.6A17.6 17.6 0 0 0 2 12s3.6 6 10 6c1.3 0 2.5-.2 3.6-.6"/>',
    drag: '<path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.8 2-1.8 0-1.2-1-1.6-1-2.7 0-.8.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="10" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14" cy="7" r="1"/><circle cx="17" cy="10" r="1"/>',
    type: '<path d="M5 6h14M12 6v13M8 19h8"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
    monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    tablet: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 18h2"/>',
    mobile: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v5h5"/>',
    save: '<path d="M5 4h12l3 3v13H5z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M20 14v6H4V4h6"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    /* produtos */
    camiseta: '<path d="M8 5l-4 3 2 3 2-1v9h8v-9l2 1 2-3-4-3a4 4 0 0 1-8 0z"/>',
    bolsa: '<path d="M5 9h14l-1 11H6z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/>',
    tenis: '<path d="M3 15h18v4H3z"/><path d="M3 15l4-5 4 2 3-1 3 2 4 2"/><path d="M7 15l1-2M11 15l1-2M15 15l1-2"/>',
    garrafa: '<path d="M10 3h4v4l2 3v10H8V10l2-3z"/><path d="M10 12h4"/>',
    oculos: '<path d="M3 14a3 3 0 1 0 6 0 3 3 0 0 0-6 0zM15 14a3 3 0 1 0 6 0 3 3 0 0 0-6 0z"/><path d="M9 14h6M3 13l2-3h4M21 13l-2-3h-4"/>',
    mochila: '<path d="M6 9a6 6 0 0 1 12 0v11H6z"/><path d="M9 9V7a3 3 0 0 1 6 0v2M9 14h6"/>',
    meia: '<path d="M7 3h6v8l5 4a3 3 0 0 1-2 5l-6-2a4 4 0 0 1-3-4z"/>',
    bone: '<path d="M4 14a8 8 0 0 1 16 0z"/><path d="M4 14h16v3H4zM12 6v8"/>',
    vaso: '<path d="M9 3h6l-1 5c3 2 4 5 3 9-1 3-3 4-5 4s-4-1-5-4c-1-4 0-7 3-9z"/><path d="M10 8h4"/>',
    manta: '<path d="M4 5h16v14H4z"/><path d="M4 9h16M4 15h16M8 5v14M16 5v14"/>',
    copo: '<path d="M7 4h10l-1 16H8z"/><path d="M8 9h8"/>',
    bandeja: '<path d="M3 9h18v8H3z"/><path d="M6 9V7h12v2M3 13h18"/>',
    vela: '<path d="M9 10h6v10H9z"/><path d="M12 3c2 2 2 4 0 6-2-2-2-4 0-6z"/><path d="M9 14h6"/>',
    caderno: '<path d="M6 3h13v18H6z"/><path d="M9 3v18M12 8h4M12 12h4"/>',
    aroma: '<path d="M9 9h6v11H9z"/><path d="M12 3v5M9 6c0 2 1 3 3 3s3-1 3-3"/>',
    colar: '<path d="M5 5c0 8 3 13 7 15 4-2 7-7 7-15"/><circle cx="12" cy="20" r="2"/><path d="M5 5h.01M19 5h.01"/>',
    brinco: '<circle cx="12" cy="15" r="5"/><path d="M12 10V5"/>',
    anel: '<circle cx="12" cy="14" r="6"/><path d="M9 7l3-4 3 4"/>',
    pulseira: '<ellipse cx="12" cy="12" rx="7" ry="8"/><path d="M12 4v3M12 17v3"/>',
    perfume: '<path d="M9 9h6v11H9z"/><path d="M10 9V6h4v3M12 3v3"/><path d="M12 14h.01"/>',
    estojo: '<path d="M4 8h16v12H4z"/><path d="M4 12h16M9 8V6h6v2"/>',
    kit: '<path d="M4 9h16v11H4z"/><path d="M3 9h18M12 9v11"/><path d="M12 9C11 5 6 5 6 8s6 1 6 1zM12 9c1-4 6-4 6-1s-6 1-6 1z"/>',
  };
  const svg = (nome, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ICONES.bag}</svg>`;

  /* ------------------------------------------------------------------ */
  /* fontes disponíveis para o painel                                    */
  /* ------------------------------------------------------------------ */
  const FONTES = [
    { nome: "Manrope", gf: "Manrope:wght@500;600;700;800", fam: '"Manrope",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
    { nome: "Inter", gf: "Inter:wght@300;400;500;600;700", fam: '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
    { nome: "DM Sans", gf: "DM+Sans:wght@400;500;700", fam: '"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
    { nome: "Montserrat", gf: "Montserrat:wght@300;400;500;600;700", fam: '"Montserrat",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
    { nome: "Poppins", gf: "Poppins:wght@300;400;500;600;700", fam: '"Poppins",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
    { nome: "Playfair Display", gf: "Playfair+Display:wght@400;500;600;700", fam: '"Playfair Display",Georgia,serif' },
    { nome: "Fraunces", gf: "Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400", fam: '"Fraunces",Georgia,serif' },
    { nome: "Cormorant Garamond", gf: "Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400", fam: '"Cormorant Garamond",Georgia,serif' },
    { nome: "Lora", gf: "Lora:ital,wght@0,400;0,500;0,600;1,400", fam: '"Lora",Georgia,serif' },
    { nome: "Libre Baskerville", gf: "Libre+Baskerville:ital,wght@0,400;0,700;1,400", fam: '"Libre Baskerville",Georgia,serif' },
  ];
  const fontePorNome = (n) => FONTES.find((f) => f.nome === n);
  const linkFonte = (f) => `https://fonts.googleapis.com/css2?family=${f.gf}&display=swap`;

  const CORES_INFO = [
    { k: "marfim", r: "Fundo da página" },
    { k: "areia", r: "Fundo suave" },
    { k: "papel", r: "Cartões" },
    { k: "linha", r: "Bordas" },
    { k: "tinta", r: "Texto principal" },
    { k: "tinta-suave", r: "Texto secundário" },
    { k: "ouro", r: "Destaque / CTA" },
    { k: "ouro-claro", r: "Destaque claro" },
    { k: "ouro-fraco", r: "Fundo de destaque" },
    { k: "rosa", r: "Tom de apoio" },
    { k: "rosa-claro", r: "Apoio claro" },
    { k: "salvia", r: "Neutro verde" },
    { k: "zap", r: "WhatsApp" },
  ];

  /* ------------------------------------------------------------------ */
  /* schema modular das seções                                          */
  /* ------------------------------------------------------------------ */
  const SECOES_META = {
    hero: {
      nome: "Capa", desc: "Primeira dobra: título, texto, botões e selos",
      campos: [
        { k: "chapeu", r: "Chamada pequena" },
        { k: "titulo", r: "Título (aceita <em> e <br>)", t: "html" },
        { k: "lead", r: "Texto de apoio", t: "html" },
        { k: "cta1", r: "Botão principal" },
        { k: "cta2", r: "Botão secundário" },
        { k: "nota", r: "Nota abaixo dos botões" },
        { k: "fita1", r: "Selo 1" },
        { k: "fita2", r: "Selo 2" },
      ],
    },
    selos: {
      nome: "Diferenciais", desc: "Faixa de confiança com 4 selos",
      array: "selos", item: [{ k: "t", r: "Título" }, { k: "s", r: "Detalhe" }],
    },
    destaques: {
      nome: "Destaques", desc: "Produtos em evidência",
      campos: [{ k: "chapeu", r: "Chamada pequena" }, { k: "titulo", r: "Título", t: "html" }],
      produtos: true,
    },
    catalogo: {
      nome: "Catálogo", desc: "Vitrine com busca, filtros, ordenação e carrinho",
      campos: [
        { k: "chapeu", r: "Chamada pequena" },
        { k: "titulo", r: "Título", t: "html" },
        { k: "lead", r: "Texto de apoio", t: "html" },
        { k: "busca_placeholder", r: "Exemplo da busca" },
        { k: "prazo", r: "Aviso de prazo", t: "html" },
        { k: "nota", r: "Nota final", t: "html" },
      ],
    },
    oficio: {
      nome: "Sobre / Ateliê", desc: "História, diferenciais e chamada",
      campos: [
        { k: "chapeu", r: "Chamada pequena" },
        { k: "titulo", r: "Título", t: "html" },
        { k: "citacao", r: "Citação", t: "html" },
        { k: "lead", r: "Texto", t: "html" },
        { k: "fe1", r: "Diferencial 1", t: "html" },
        { k: "fe2", r: "Diferencial 2", t: "html" },
        { k: "fe3", r: "Diferencial 3", t: "html" },
        { k: "cta", r: "Botão" },
      ],
    },
    devocoes: {
      nome: "Coleções", desc: "Cartões grandes de coleções ou ambientes",
      campos: [
        { k: "chapeu", r: "Chamada pequena" },
        { k: "titulo", r: "Título", t: "html" },
        { k: "lead", r: "Texto", t: "html" },
      ],
      array: "itens",
      item: [{ k: "t", r: "Nome da coleção" }, { k: "cor", r: "Cores do cartão", t: "cor2" }],
    },
    oracao: {
      nome: "Frase de destaque", desc: "Citação entre seções",
      campos: [{ k: "texto", r: "Texto", t: "html" }, { k: "autor", r: "Assinatura" }],
    },
    encomenda: {
      nome: "Atendimento / Passos", desc: "Como comprar ou ser atendido",
      campos: [
        { k: "chapeu", r: "Chamada pequena" },
        { k: "titulo", r: "Título", t: "html" },
        { k: "lead", r: "Texto", t: "html" },
        { k: "botao", r: "Botão" },
      ],
      array: "passos",
      item: [{ k: "t", r: "Passo — título" }, { k: "s", r: "Passo — detalhe", t: "textarea" }],
    },
    depoimentos: {
      nome: "Avaliações", desc: "Prova social + faixa de números",
      campos: [
        { k: "chapeu", r: "Chamada pequena" },
        { k: "titulo", r: "Título", t: "html" },
        { k: "lead", r: "Texto", t: "html" },
      ],
      array: "lista",
      item: [{ k: "texto", r: "Depoimento", t: "textarea" }, { k: "nome", r: "Nome" }, { k: "contexto", r: "Contexto" }],
      array2: "faixa",
      item2: [{ k: "t", r: "Número" }, { k: "s", r: "Legenda" }],
    },
    final: {
      nome: "Convite final", desc: "Chamada para o WhatsApp",
      campos: [
        { k: "chapeu", r: "Chamada pequena" },
        { k: "titulo", r: "Título", t: "html" },
        { k: "lead", r: "Texto", t: "html" },
        { k: "cta1", r: "Botão principal" },
        { k: "cta2", r: "Botão secundário" },
      ],
    },
    rodape: {
      nome: "Rodapé", desc: "Contato, links e nota final",
      campos: [
        { k: "titulo", r: "Título" },
        { k: "sobre", r: "Sobre a loja", t: "textarea" },
        { k: "cat_titulo", r: "Coluna catálogo" },
        { k: "como_titulo", r: "Coluna ajuda" },
        { k: "nota_base", r: "Nota final" },
      ],
    },
  };

  /* ------------------------------------------------------------------ */
  /* estado                                                             */
  /* ------------------------------------------------------------------ */
  function mesclar(base, over) {
    if (Array.isArray(over)) return clone(over);
    if (over && typeof over === "object") {
      const out = base && typeof base === "object" && !Array.isArray(base) ? { ...base } : {};
      for (const k of Object.keys(over)) out[k] = mesclar(base ? base[k] : undefined, over[k]);
      return out;
    }
    return over;
  }
  function carregar() {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) return mesclar(clone(BASE), JSON.parse(raw));
    } catch (e) {}
    return clone(BASE);
  }
  function carregarCarrinho() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch (e) { return []; }
  }

  let cfg = carregar();
  let carrinho = carregarCarrinho();
  let selecionada = "hero";
  let aba = "secoes";
  let device = "desktop";
  let filtro = { q: "", cat: "Tudo", ordem: "destaque" };
  let salvarTimer = null;

  /* ------------------------------------------------------------------ */
  /* helpers de estilo                                                  */
  /* ------------------------------------------------------------------ */
  function injetaFonte(f) {
    if (!f || !f.link) return;
    if ($$('link[data-hml-font]').some((l) => l.href === f.link)) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = f.link;
    l.setAttribute("data-hml-font", "");
    document.head.appendChild(l);
  }
  function aplicarCss() {
    const loja = $("#loja");
    if (!loja) return;
    const v = cfg.visual || {};
    const cores = v.cores || {};
    Object.keys(cores).forEach((k) => { if (cores[k]) loja.style.setProperty("--" + k, cores[k]); });
    if (v.fontes && v.fontes.titulos) {
      loja.style.setProperty("--serif", v.fontes.titulos.familia);
      injetaFonte(v.fontes.titulos);
    }
    if (v.fontes && v.fontes.texto) {
      loja.style.setProperty("--sans", v.fontes.texto.familia);
      injetaFonte(v.fontes.texto);
    }
    loja.style.setProperty("--raio", v.raio || "10px");
    loja.style.setProperty("--container", v.container || "1180px");
    loja.dataset.template = TPL_ID;
    loja.dataset.btnFormato = (cfg.botoes && cfg.botoes.formato) || "padrao";
    loja.dataset.btnCaixa = (cfg.botoes && cfg.botoes.caixa) || "alta";
    loja.dataset.header = (cfg.header && cfg.header.variant) || "promo";
  }
  function agendarSalvar() {
    clearTimeout(salvarTimer);
    salvarTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE, JSON.stringify(cfg)); } catch (e) {}
    }, 500);
  }
  function salvarCarrinho() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(carrinho)); } catch (e) {}
  }

  /* ------------------------------------------------------------------ */
  /* render: loja                                                       */
  /* ------------------------------------------------------------------ */
  const inicial = () => String((cfg.geral && cfg.geral.nome) || "L").trim().charAt(0).toUpperCase();
  const nomeLoja = () => (cfg.geral && cfg.geral.nome) || "Minha loja";
  const tagline = () => (cfg.geral && cfg.geral.tagline) || "Loja online";
  const zapNumero = () => String((cfg.geral && cfg.geral.zap) || "").replace(/\D/g, "");

  function midiaProduto(p) {
    if (p.foto) {
      return `<img src="img/${esc(p.foto)}" alt="${esc(p.nome)}" loading="lazy" decoding="async">`;
    }
    return `<span class="produto-forma f1"></span><span class="produto-forma f2"></span><span class="produto-icone">${svg(p.icone || "bag")}</span>`;
  }
  function cardProduto(p) {
    const cor = Array.isArray(p.cor) ? p.cor : ["#e9e3d8", "#c9bfae"];
    const preco = p.preco == null
      ? '<span class="preco sob">Sob consulta</span>'
      : `<span class="preco">${money(p.preco)}</span>`;
    return `<article class="produto" data-prod="${esc(p.id)}">
      <div class="produto-midia" style="--a:${esc(cor[0])};--b:${esc(cor[1])}">
        ${p.badge || p.selo ? `<span class="selo-prod">${esc(p.badge || p.selo)}</span>` : ""}
        ${midiaProduto(p)}
        <button class="add" type="button" data-add="${esc(p.id)}" aria-label="Adicionar ${esc(p.nome)} à lista">${svg("plus")}</button>
      </div>
      <div class="produto-info">
        <span class="produto-cat">${esc(p.cat || p.tag || "")}</span>
        <h3>${esc(p.nome)}</h3>
        <p>${esc(p.desc || "")}</p>
        <div class="produto-preco">${preco}<button class="link-add" type="button" data-add="${esc(p.id)}">Adicionar</button></div>
      </div>
    </article>`;
  }
  function cabecalho(obj, centro) {
    if (!obj) return "";
    return `<div class="sec-head${centro ? " centro" : ""}">
      ${obj.chapeu ? `<span class="chapeu">${esc(obj.chapeu)}</span>` : ""}
      ${obj.titulo ? `<h2>${obj.titulo}</h2>` : ""}
      ${obj.lead ? `<p class="lead">${obj.lead}</p>` : ""}
    </div>`;
  }

  function renderHeader() {
    const a = cfg.anuncio || {};
    const anuncio = a.texto
      ? `<div class="anuncio"><div class="container anuncio-in"><span>${esc(a.texto)}</span>${a.botao ? `<a href="${esc(a.link || "#catalogo")}">${esc(a.botao)} ${svg("arrow")}</a>` : ""}</div></div>`
      : "";
    const menu = (cfg.menu || []).map((m) => `<a href="${esc(m.href || "#catalogo")}">${esc(m.t)}</a>`).join("");
    return `${anuncio}
    <header class="topo">
      <div class="container topo-in">
        <button class="icone-btn menu-btn" type="button" data-menu aria-label="Abrir menu" aria-expanded="false">${svg("menu")}</button>
        <a class="marca" href="#topo" aria-label="${esc(nomeLoja())} — início">
          <span class="monograma">${esc(inicial())}</span>
          <span class="marca-txt"><b>${esc(nomeLoja())}</b><small>${esc(tagline())}</small></span>
        </a>
        <nav class="nav" id="nav" aria-label="Menu principal">${menu}</nav>
        <div class="acoes">
          <button class="icone-btn" type="button" data-busca aria-label="Buscar no catálogo">${svg("search")}</button>
          <button class="icone-btn sacola-btn" type="button" data-sacola aria-label="Abrir minha lista" aria-expanded="false">${svg("bag")}<span class="contador" id="contador">0</span></button>
        </div>
      </div>
    </header>`;
  }

  function heroArte() {
    if (TPL_ID === "editorial-hml") {
      return `<div class="arte arte-editorial">
        <span class="arco a1"></span><span class="arco a2"></span>
        <span class="orb o1">${svg("vaso")}</span><span class="orb o2">${svg("vela")}</span>
        <span class="selo-arte">feito à mão · pequenos lotes</span>
      </div>`;
    }
    if (TPL_ID === "boutique-hml") {
      return `<div class="arte arte-boutique">
        <span class="linha l1"></span><span class="linha l2"></span>
        <span class="medalhao">${svg("colar")}</span>
        <span class="selo-arte">edição limitada · ouro 18k</span>
      </div>`;
    }
    return `<div class="arte arte-vitrine">
      <span class="arte-card c1">${svg("camiseta")}<b>Camiseta</b><small>R$ 89,90</small></span>
      <span class="arte-card c2">${svg("bolsa")}<b>Bolsa</b><small>R$ 149,90</small></span>
      <span class="arte-card c3">${svg("tenis")}<b>Tênis</b><small>R$ 219,90</small></span>
      <span class="arte-selo">${svg("star")} curadoria 4,9</span>
    </div>`;
  }

  function renderHero() {
    const h = cfg.hero || {};
    return `<section class="sec hero" id="hero" data-sec="hero">
      <div class="container hero-grid">
        <div class="hero-txt">
          ${h.chapeu ? `<span class="chapeu">${esc(h.chapeu)}</span>` : ""}
          <h1>${h.titulo || ""}</h1>
          ${h.lead ? `<p class="lead">${h.lead}</p>` : ""}
          <div class="hero-ctas">
            <a class="btn btn-primary" href="#catalogo">${esc(h.cta1 || "Ver catálogo")}</a>
            <a class="btn btn-outline" href="#final">${esc(h.cta2 || "Falar com a loja")}</a>
          </div>
          ${h.nota ? `<p class="hero-nota">${svg("check")} ${esc(h.nota)}</p>` : ""}
        </div>
        <div class="hero-art">${heroArte()}</div>
      </div>
      ${h.fita1 || h.fita2 ? `<div class="container hero-fita"><span>${esc(h.fita1 || "")}</span><i></i><span>${esc(h.fita2 || "")}</span></div>` : ""}
    </section>`;
  }

  function renderSelos() {
    const itens = cfg.selos || [];
    const icones = ["truck", "refresh", "shield", "star"];
    return `<section class="sec selos" data-sec="selos">
      <div class="container selos-in">
        ${itens.map((s, i) => `<div class="selo-item"><span class="selo-ic">${svg(icones[i % icones.length])}</span><span><b>${esc(s.t)}</b><small>${esc(s.s)}</small></span></div>`).join("")}
      </div>
    </section>`;
  }

  function renderDestaques() {
    const d = cfg.destaques || {};
    const ids = Array.isArray(d.ids) ? d.ids : [];
    let itens = ids.map((id) => CATALOGO.find((p) => p.id === id)).filter(Boolean);
    if (!itens.length) itens = CATALOGO.slice(0, 4);
    return `<section class="sec sec-destaques" id="destaques" data-sec="destaques">
      <div class="container">
        <div class="sec-head-linha">
          ${cabecalho(d)}
          <a class="link-seta" href="#catalogo">Ver tudo ${svg("arrow")}</a>
        </div>
        <div class="grade-produtos grade-4">${itens.map(cardProduto).join("")}</div>
      </div>
    </section>`;
  }

  function categorias() {
    return ["Tudo", ...new Set(CATALOGO.map((p) => p.cat).filter(Boolean))];
  }
  function renderCatalogo() {
    const c = cfg.catalogo || {};
    return `<section class="sec sec-catalogo" id="catalogo" data-sec="catalogo">
      <div class="container">
        ${cabecalho(c)}
        <div class="cat-toolbar">
          <div class="cat-busca">${svg("search")}<input id="busca" type="search" value="${esc(filtro.q)}" placeholder="${esc(c.busca_placeholder || "Buscar…")}" aria-label="Buscar no catálogo" autocomplete="off"></div>
          <div class="cat-chips" role="group" aria-label="Filtrar por categoria">
            ${categorias().map((cat, i) => `<button class="chip" type="button" data-cat="${esc(cat)}" aria-pressed="${cat === filtro.cat}" class="${cat === filtro.cat ? "on" : ""}">${esc(cat)}</button>`).join("")}
          </div>
          <label class="cat-ordem">Ordenar
            <select id="ordem" aria-label="Ordenar produtos">
              <option value="destaque" ${filtro.ordem === "destaque" ? "selected" : ""}>Destaques</option>
              <option value="menor" ${filtro.ordem === "menor" ? "selected" : ""}>Menor preço</option>
              <option value="maior" ${filtro.ordem === "maior" ? "selected" : ""}>Maior preço</option>
              <option value="nome" ${filtro.ordem === "nome" ? "selected" : ""}>Nome A–Z</option>
            </select>
          </label>
        </div>
        <p class="cat-resumo" id="resumo">${CATALOGO.length} peças</p>
        <div class="grade-produtos grade-4" id="grade">${CATALOGO.map(cardProduto).join("")}</div>
        <div class="cat-vazio" id="vazio" hidden>
          <span>${svg("search")}</span>
          <b>Nada encontrado por aqui.</b>
          <p>Tente outra palavra ou limpe os filtros.</p>
          <button class="btn btn-outline" type="button" data-limpar>Limpar filtros</button>
        </div>
        ${c.prazo ? `<p class="cat-prazo">${svg("truck")} ${c.prazo}</p>` : ""}
        ${c.nota ? `<p class="cat-nota">${c.nota}</p>` : ""}
      </div>
    </section>`;
  }

  function renderOficio() {
    const o = cfg.oficio || {};
    const icones = TPL_ID === "boutique-hml" ? ["colar", "anel", "brinco"] : TPL_ID === "editorial-hml" ? ["vaso", "manta", "vela"] : ["camiseta", "bolsa", "tenis"];
    return `<section class="sec sec-oficio" id="oficio" data-sec="oficio">
      <div class="container split">
        <div class="oficio-arte" aria-hidden="true">
          <span class="oa a1">${svg(icones[0])}</span>
          <span class="oa a2">${svg(icones[1])}</span>
          <span class="oa a3">${svg(icones[2])}</span>
          <span class="oa-selo">${svg("heart")} feito com cuidado</span>
        </div>
        <div class="oficio-txt">
          ${cabecalho(o)}
          ${o.citacao ? `<blockquote class="citacao">${o.citacao}</blockquote>` : ""}
          <ul class="fe">
            ${[o.fe1, o.fe2, o.fe3].filter(Boolean).map((f) => `<li>${svg("check")}<span>${f}</span></li>`).join("")}
          </ul>
          ${o.cta ? `<a class="btn btn-outline" href="#catalogo">${esc(o.cta)}</a>` : ""}
        </div>
      </div>
    </section>`;
  }

  function renderDevocoes() {
    const d = cfg.devocoes || {};
    const itens = d.itens || [];
    return `<section class="sec sec-devocoes" id="devocoes" data-sec="devocoes">
      <div class="container">
        ${cabecalho(d)}
        <div class="colecoes">
          ${itens.map((it, i) => {
            const cor = Array.isArray(it.cor) ? it.cor : ["#d8c2a4", "#a9855f"];
            return `<a class="colecao" href="#catalogo" style="--a:${esc(cor[0])};--b:${esc(cor[1])}">
              <span class="colecao-num">0${i + 1}</span>
              <span class="colecao-icone">${svg(it.icone || "vaso")}</span>
              <span class="colecao-nome">${esc(it.t)}</span>
              <span class="colecao-seta">${svg("arrow")}</span>
            </a>`;
          }).join("")}
        </div>
      </div>
    </section>`;
  }

  function renderOracao() {
    const o = cfg.oracao || {};
    return `<section class="sec sec-oracao" id="oracao" data-sec="oracao">
      <div class="container oracao-in">
        <span class="aspas" aria-hidden="true">“</span>
        <blockquote>${o.texto || ""}</blockquote>
        ${o.autor ? `<cite>${esc(o.autor)}</cite>` : ""}
      </div>
    </section>`;
  }

  function renderEncomenda() {
    const e = cfg.encomenda || {};
    return `<section class="sec sec-encomenda" id="encomenda" data-sec="encomenda">
      <div class="container split split-invert">
        <div class="enc-txt">
          ${cabecalho(e)}
          ${e.botao ? `<a class="btn btn-primary" href="#final">${esc(e.botao)}</a>` : ""}
        </div>
        <ol class="passos">
          ${(e.passos || []).map((p, i) => `<li><span class="passo-num">0${i + 1}</span><div><b>${esc(p.t)}</b><p>${esc(p.s)}</p></div></li>`).join("")}
        </ol>
      </div>
    </section>`;
  }

  function renderDepoimentos() {
    const d = cfg.depoimentos || {};
    return `<section class="sec sec-depoimentos" id="depoimentos" data-sec="depoimentos">
      <div class="container">
        ${cabecalho(d)}
        <div class="depo-grid">
          ${(d.lista || []).map((x) => `<figure class="depo">
            <div class="estrelas" aria-label="5 de 5 estrelas">${svg("star")}${svg("star")}${svg("star")}${svg("star")}${svg("star")}</div>
            <blockquote>${x.texto || ""}</blockquote>
            <figcaption><b>${esc(x.nome)}</b><span>${esc(x.contexto)}</span></figcaption>
          </figure>`).join("")}
        </div>
        ${(d.faixa || []).length ? `<div class="faixa">${d.faixa.map((f) => `<div><b>${esc(f.t)}</b><span>${esc(f.s)}</span></div>`).join("")}</div>` : ""}
      </div>
    </section>`;
  }

  function renderFinal() {
    const f = cfg.final || {};
    return `<section class="sec sec-final" id="final" data-sec="final">
      <div class="container final-in">
        <div class="final-txt">
          ${f.chapeu ? `<span class="chapeu">${esc(f.chapeu)}</span>` : ""}
          <h2>${f.titulo || ""}</h2>
          ${f.lead ? `<p class="lead">${f.lead}</p>` : ""}
        </div>
        <div class="final-ctas">
          <a class="btn btn-zap" href="https://wa.me/${zapNumero()}?text=${encodeURIComponent((cfg.zap && cfg.zap.msg_ola || "Olá! Vim pelo site e quero saber mais.").replace("{NOME}", nomeLoja()))}" target="_blank" rel="noopener">${svg("whatsapp")} ${esc(f.cta1 || "Falar no WhatsApp")}</a>
          <a class="btn btn-outline" href="#catalogo">${esc(f.cta2 || "Voltar ao catálogo")}</a>
        </div>
      </div>
    </section>`;
  }

  function renderRodape() {
    const r = cfg.rodape || {};
    const zap = zapNumero();
    return `<footer class="rodape" id="rodape" data-sec="rodape">
      <div class="container rodape-grid">
        <div class="rodape-marca">
          <a class="marca" href="#topo"><span class="monograma">${esc(inicial())}</span><span class="marca-txt"><b>${esc(nomeLoja())}</b><small>${esc(tagline())}</small></span></a>
          <p>${r.sobre || ""}</p>
          <div class="sociais">
            <a href="https://wa.me/${zap}" target="_blank" rel="noopener" aria-label="WhatsApp">${svg("whatsapp")}</a>
            <a href="${esc((cfg.geral && cfg.geral.instagram) || "#")}" target="_blank" rel="noopener" aria-label="Instagram">${svg("instagram")}</a>
          </div>
        </div>
        <div class="rodape-col">
          <h4>${esc(r.cat_titulo || "Catálogo")}</h4>
          <a href="#destaques">Destaques</a><a href="#catalogo">Todas as peças</a>${(cfg.devocoes && cfg.devocoes.itens || []).slice(0, 2).map((i) => `<a href="#devocoes">${esc(i.t)}</a>`).join("")}
        </div>
        <div class="rodape-col">
          <h4>${esc(r.como_titulo || "Ajuda")}</h4>
          <a href="#oficio">Sobre a loja</a><a href="#depoimentos">Avaliações</a>${cfg.encomenda && cfg.encomenda.titulo ? '<a href="#encomenda">Como comprar</a>' : ""}<a href="#final">Falar no WhatsApp</a>
        </div>
        <div class="rodape-col">
          <h4>Contato</h4>
          <a href="https://wa.me/${zap}" target="_blank" rel="noopener">${esc((cfg.geral && cfg.geral.zap_tel) || "WhatsApp")}</a>
          <span>${svg("clock")} ${esc((cfg.geral && cfg.geral.prazo_producao) || "")}</span>
          <span>${svg("pin")} Envio para todo o Brasil</span>
        </div>
      </div>
      <div class="container rodape-base">
        <span>© 2026 ${esc(nomeLoja())}. Todos os direitos reservados.</span>
        <span>${r.nota_base || ""}</span>
        <span class="credito">Feito com Super Loja</span>
      </div>
    </footer>`;
  }

  function renderSacola() {
    const c = cfg.carrinho || {};
    return `<div class="veu" data-fechar-sacola hidden></div>
    <aside class="sacola" id="sacola" aria-hidden="true" aria-label="${esc(c.titulo || "Minha lista")}">
      <div class="sacola-topo">
        <div><span class="chapeu">Sua seleção</span><h2>${esc(c.titulo || "Minha lista")}</h2></div>
        <button class="icone-btn" type="button" data-fechar-sacola aria-label="Fechar lista">${svg("close")}</button>
      </div>
      <div class="sacola-itens" id="sacolaItens"></div>
      <div class="sacola-rodape">
        <div class="sacola-total"><span>${esc(c.total_rot || "Total estimado")}</span><b id="sacolaTotal">R$ 0,00</b></div>
        <a class="btn btn-zap btn-bloco" id="sacolaZap" href="#" target="_blank" rel="noopener">${svg("whatsapp")} ${esc(c.botao || "Fechar pedido no WhatsApp")}</a>
        <p class="sacola-nota">${c.nota || ""}</p>
      </div>
    </aside>`;
  }

  const RENDER_SECAO = {
    hero: renderHero,
    selos: renderSelos,
    destaques: renderDestaques,
    catalogo: renderCatalogo,
    oficio: renderOficio,
    devocoes: renderDevocoes,
    oracao: renderOracao,
    encomenda: renderEncomenda,
    depoimentos: renderDepoimentos,
    final: renderFinal,
    rodape: renderRodape,
  };

  function renderLoja() {
    const loja = $("#loja");
    if (!loja) return;
    const scrollEl = loja.querySelector(".loja-scroll");
    const scroll = scrollEl ? scrollEl.scrollTop : 0;
    aplicarCss();
    const layout = (cfg.layout && Array.isArray(cfg.layout.secoes)) ? cfg.layout.secoes : [];
    const corpo = layout.filter((s) => s && s.visivel !== false).map((s) => (RENDER_SECAO[s.id] ? RENDER_SECAO[s.id]() : "")).join("");
    loja.innerHTML = `<div class="loja-scroll"><a class="pular" href="#catalogo">Pular para o catálogo</a>${renderHeader()}<main id="topo">${corpo}</main></div>${renderSacola()}<div class="toast" id="toast" role="status" aria-live="polite"></div>`;
    aplicarFiltro();
    atualizarSacola();
    const novoScroll = loja.querySelector(".loja-scroll");
    if (novoScroll) novoScroll.scrollTop = scroll;
  }

  /* ------------------------------------------------------------------ */
  /* catálogo: busca / filtro / ordem                                   */
  /* ------------------------------------------------------------------ */
  function aplicarFiltro() {
    const grade = $("#grade");
    if (!grade) return;
    const q = norm(filtro.q);
    let itens = CATALOGO.filter((p) => {
      const okCat = filtro.cat === "Tudo" || p.cat === filtro.cat;
      const texto = norm([p.nome, p.cat, p.desc, p.tag].join(" "));
      return okCat && (!q || texto.includes(q));
    });
    if (filtro.ordem === "menor") itens.sort((a, b) => (a.preco == null ? 1e12 : a.preco) - (b.preco == null ? 1e12 : b.preco));
    if (filtro.ordem === "maior") itens.sort((a, b) => (b.preco == null ? -1 : b.preco) - (a.preco == null ? -1 : a.preco));
    if (filtro.ordem === "nome") itens.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    grade.innerHTML = itens.map(cardProduto).join("");
    const resumo = $("#resumo");
    if (resumo) resumo.textContent = `${itens.length} ${itens.length === 1 ? "peça" : "peças"}${filtro.cat !== "Tudo" ? " em " + filtro.cat : ""}${filtro.q ? " para “" + filtro.q + "”" : ""}`;
    const vazio = $("#vazio");
    if (vazio) vazio.hidden = itens.length > 0;
    $$(".chip", $("#loja")).forEach((b) => {
      const on = b.dataset.cat === filtro.cat;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.classList.toggle("on", on);
    });
  }

  /* ------------------------------------------------------------------ */
  /* sacola                                                             */
  /* ------------------------------------------------------------------ */
  function acharProduto(id) { return CATALOGO.find((p) => p.id === id); }
  function addCarrinho(id) {
    const p = acharProduto(id);
    if (!p) return;
    const item = carrinho.find((x) => x.id === id);
    if (item) item.qtd += 1; else carrinho.push({ id, qtd: 1 });
    salvarCarrinho();
    atualizarSacola();
    toast(`${p.nome} entrou na sua lista`);
  }
  function mudarQtd(id, delta) {
    const item = carrinho.find((x) => x.id === id);
    if (!item) return;
    item.qtd += delta;
    if (item.qtd <= 0) carrinho = carrinho.filter((x) => x.id !== id);
    salvarCarrinho();
    atualizarSacola();
  }
  function remover(id) {
    carrinho = carrinho.filter((x) => x.id !== id);
    salvarCarrinho();
    atualizarSacola();
  }
  function totalCarrinho() {
    return carrinho.reduce((s, it) => {
      const p = acharProduto(it.id);
      return s + (p && typeof p.preco === "number" ? p.preco * it.qtd : 0);
    }, 0);
  }
  function atualizarSacola() {
    const contador = $("#contador");
    const qtdTotal = carrinho.reduce((s, i) => s + i.qtd, 0);
    if (contador) contador.textContent = String(qtdTotal);
    const box = $("#sacolaItens");
    if (!box) return;
    const c = cfg.carrinho || {};
    if (!carrinho.length) {
      box.innerHTML = `<div class="sacola-vazia"><span>${svg("bag")}</span><b>${esc(c.vazio_titulo || "Sua lista está vazia.")}</b><p>${esc(c.vazio_texto || "Escolha as peças no catálogo.")}</p><button class="btn btn-outline" type="button" data-fechar-sacola>Ver catálogo</button></div>`;
    } else {
      box.innerHTML = carrinho.map((it) => {
        const p = acharProduto(it.id);
        if (!p) return "";
        const cor = Array.isArray(p.cor) ? p.cor : ["#e9e3d8", "#c9bfae"];
        return `<div class="sacola-item">
          <div class="si-midia" style="--a:${esc(cor[0])};--b:${esc(cor[1])}">${svg(p.icone || "bag")}</div>
          <div class="si-info">
            <b>${esc(p.nome)}</b>
            <span>${p.preco == null ? "Sob consulta" : money(p.preco)}</span>
            <div class="qtd"><button type="button" data-qtd="-1" data-id="${esc(p.id)}" aria-label="Diminuir">${svg("minus")}</button><span>${it.qtd}</span><button type="button" data-qtd="1" data-id="${esc(p.id)}" aria-label="Aumentar">${svg("plus")}</button></div>
          </div>
          <button class="si-rem" type="button" data-rem="${esc(p.id)}" aria-label="Remover ${esc(p.nome)}">${svg("trash")}</button>
        </div>`;
      }).join("");
    }
    const total = $("#sacolaTotal");
    if (total) total.textContent = money(totalCarrinho());
    const zap = $("#sacolaZap");
    if (zap) {
      const vazio = !carrinho.length;
      zap.classList.toggle("is-off", vazio);
      zap.setAttribute("aria-disabled", vazio ? "true" : "false");
      zap.tabIndex = vazio ? -1 : 0;
      const linhas = carrinho.map((it) => {
        const p = acharProduto(it.id);
        if (!p) return "";
        return `${it.qtd}x ${p.nome}${p.preco == null ? " (sob consulta)" : " — " + money(p.preco * it.qtd)}`;
      }).filter(Boolean).join("\n");
      const msg = `Olá, ${nomeLoja()}! Vim pelo site e gostaria de fazer um pedido:\n\n${linhas || "Ainda estou escolhendo."}\n\nTotal estimado: ${money(totalCarrinho())}\n\nPode confirmar disponibilidade, prazo e frete?`;
      zap.href = vazio ? "#catalogo" : `https://wa.me/${zapNumero()}?text=${encodeURIComponent(msg)}`;
    }
  }
  function abrirSacola(abrir) {
    const s = $("#sacola");
    const v = $(".veu", $("#loja"));
    if (!s) return;
    s.classList.toggle("on", abrir);
    s.setAttribute("aria-hidden", abrir ? "false" : "true");
    if (v) v.hidden = !abrir;
    document.body.classList.toggle("sacola-aberta", abrir);
    const loja = $("#loja");
    if (loja) loja.classList.toggle("sacola-aberta", abrir);
    const btn = $("[data-sacola]", $("#loja"));
    if (btn) btn.setAttribute("aria-expanded", abrir ? "true" : "false");
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("on"), 2400);
  }

  /* ------------------------------------------------------------------ */
  /* eventos da loja (delegação)                                        */
  /* ------------------------------------------------------------------ */
  function ligarLoja() {
    const loja = $("#loja");
    if (!loja || loja.dataset.ligado) return;
    loja.dataset.ligado = "1";

    loja.addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]");
      if (add) { e.preventDefault(); addCarrinho(add.dataset.add); return; }
      if (e.target.closest("[data-sacola]")) { abrirSacola(true); return; }
      if (e.target.closest("[data-fechar-sacola]")) { abrirSacola(false); return; }
      const menuBtn = e.target.closest("[data-menu]");
      if (menuBtn) {
        const nav = $("#nav", loja);
        const aberto = nav.classList.toggle("aberto");
        menuBtn.setAttribute("aria-expanded", aberto ? "true" : "false");
        return;
      }
      if (e.target.closest("[data-busca]")) {
        const alvo = $("#catalogo");
        if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => { const b = $("#busca"); if (b) b.focus(); }, 420);
        return;
      }
      const cat = e.target.closest("[data-cat]");
      if (cat) { filtro.cat = cat.dataset.cat; aplicarFiltro(); return; }
      if (e.target.closest("[data-limpar]")) {
        filtro = { q: "", cat: "Tudo", ordem: "destaque" };
        const b = $("#busca"); if (b) b.value = "";
        const o = $("#ordem"); if (o) o.value = "destaque";
        aplicarFiltro();
        return;
      }
      const qtd = e.target.closest("[data-qtd]");
      if (qtd) { mudarQtd(qtd.dataset.id, Number(qtd.dataset.qtd)); return; }
      const rem = e.target.closest("[data-rem]");
      if (rem) { remover(rem.dataset.rem); return; }
      const link = e.target.closest(".nav a, .pular, .rodape a[href^='#']");
      if (link) {
        const nav = $("#nav", loja);
        if (nav) nav.classList.remove("aberto");
      }
    });

    loja.addEventListener("input", (e) => {
      if (e.target.id === "busca") { filtro.q = e.target.value; aplicarFiltro(); }
    });
    loja.addEventListener("change", (e) => {
      if (e.target.id === "ordem") { filtro.ordem = e.target.value; aplicarFiltro(); }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") abrirSacola(false);
    });
  }

  /* ------------------------------------------------------------------ */
  /* painel: helpers                                                    */
  /* ------------------------------------------------------------------ */
  function getPath(obj, path) {
    return String(path).split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function setPath(obj, path, val) {
    const partes = String(path).split(".");
    let o = obj;
    for (let i = 0; i < partes.length - 1; i++) {
      if (o[partes[i]] == null || typeof o[partes[i]] !== "object") o[partes[i]] = {};
      o = o[partes[i]];
    }
    o[partes[partes.length - 1]] = val;
  }
  function campoHtml(c, sec) {
    const v = getPath(cfg, sec + "." + c.k);
    const id = `cx-${sec}-${c.k}`;
    if (c.t === "textarea" || c.t === "html") {
      return `<label class="cx-campo" for="${id}"><span>${esc(c.r)}</span><textarea id="${id}" rows="${c.t === "html" ? 3 : 4}" data-campo="${sec}.${c.k}">${esc(v == null ? "" : v)}</textarea></label>`;
    }
    return `<label class="cx-campo" for="${id}"><span>${esc(c.r)}</span><input id="${id}" type="text" data-campo="${sec}.${c.k}" value="${esc(v == null ? "" : v)}"></label>`;
  }
  function itemCamposHtml(sec, array, item, idx, campos) {
    return `<div class="cx-item">
      <div class="cx-item-topo"><b>${esc(item.t || "Item " + (idx + 1))}</b><button class="cx-mini" type="button" data-del-item="${array}" data-idx="${idx}" aria-label="Remover item">${svg("trash")}</button></div>
      ${campos.map((c) => {
        const v = item[c.k];
        if (c.t === "cor2") {
          const cor = Array.isArray(v) ? v : ["#d8c2a4", "#a9855f"];
          return `<div class="cx-campo"><span>${esc(c.r)}</span><div class="cx-cores2"><input type="color" value="${esc(cor[0])}" data-item-cor="${array}" data-idx="${idx}" data-ck="${c.k}" data-ci="0" aria-label="Cor 1"><input type="color" value="${esc(cor[1])}" data-item-cor="${array}" data-idx="${idx}" data-ck="${c.k}" data-ci="1" aria-label="Cor 2"></div></div>`;
        }
        if (c.t === "textarea") {
          return `<label class="cx-campo"><span>${esc(c.r)}</span><textarea rows="3" data-array="${array}" data-idx="${idx}" data-ck="${c.k}">${esc(v == null ? "" : v)}</textarea></label>`;
        }
        return `<label class="cx-campo"><span>${esc(c.r)}</span><input type="text" data-array="${array}" data-idx="${idx}" data-ck="${c.k}" value="${esc(v == null ? "" : v)}"></label>`;
      }).join("")}
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* painel: seções                                                     */
  /* ------------------------------------------------------------------ */
  function renderSecoesPainel() {
    const layout = (cfg.layout && cfg.layout.secoes) || [];
    return `<div class="cx-painel-cab"><span class="cx-kicker">Estrutura</span><h3>Seções da página</h3><p>Arraste para reordenar, oculte o que não quiser e clique para editar o conteúdo.</p></div>
      <div class="cx-lista" id="cxLista">
        ${layout.map((s, i) => {
          const m = SECOES_META[s.id] || { nome: s.id, desc: "" };
          const vis = s.visivel !== false;
          return `<div class="cx-sec${vis ? "" : " off"}${selecionada === s.id ? " sel" : ""}" draggable="true" data-linha="${s.id}" data-idx="${i}">
            <span class="cx-drag" aria-hidden="true">${svg("drag")}</span>
            <button class="cx-sec-nome" type="button" data-sel="${s.id}"><b>${esc(m.nome)}</b><small>${esc(m.desc)}</small></button>
            <div class="cx-sec-acoes">
              <button type="button" class="cx-mini" data-subir="${s.id}" aria-label="Mover para cima" ${i === 0 ? "disabled" : ""}>${svg("arrowUp")}</button>
              <button type="button" class="cx-mini" data-descer="${s.id}" aria-label="Mover para baixo" ${i === layout.length - 1 ? "disabled" : ""}>${svg("arrowDown")}</button>
              <button type="button" class="cx-mini" data-olho="${s.id}" aria-label="${vis ? "Ocultar" : "Mostrar"} seção" aria-pressed="${vis}">${svg(vis ? "eye" : "eyeOff")}</button>
            </div>
          </div>`;
        }).join("")}
      </div>
      <div class="cx-dica">${svg("layers")}<span>O modelo tem <b>${layout.length} módulos</b>. A ordem e a visibilidade valem para a loja publicada.</span></div>`;
  }

  /* ------------------------------------------------------------------ */
  /* painel: conteúdo                                                   */
  /* ------------------------------------------------------------------ */
  function renderConteudoPainel() {
    const m = SECOES_META[selecionada];
    if (!m) return `<div class="cx-dica">Selecione uma seção na aba <b>Seções</b>.</div>`;
    const sec = cfg[selecionada] || {};
    const campos = (m.campos || []).map((c) => campoHtml(c, selecionada)).join("");
    let arr = "";
    if (m.array) {
      const itens = Array.isArray(sec[m.array]) ? sec[m.array] : [];
      arr += `<div class="cx-sub"><div class="cx-sub-topo"><h4>${esc(m.nome)} — itens</h4><button class="cx-add" type="button" data-add-item="${m.array}">${svg("plus")} Adicionar</button></div>
        ${itens.map((it, i) => itemCamposHtml(selecionada, m.array, it, i, m.item || [])).join("") || '<p class="cx-vazio">Nenhum item. Adicione o primeiro.</p>'}
      </div>`;
    }
    if (m.array2) {
      const itens = Array.isArray(sec[m.array2]) ? sec[m.array2] : [];
      arr += `<div class="cx-sub"><div class="cx-sub-topo"><h4>Faixa de números</h4><button class="cx-add" type="button" data-add-item="${m.array2}">${svg("plus")} Adicionar</button></div>
        ${itens.map((it, i) => itemCamposHtml(selecionada, m.array2, it, i, m.item2 || [])).join("") || '<p class="cx-vazio">Nenhum número.</p>'}
      </div>`;
    }
    let produtos = "";
    if (m.produtos) {
      const ids = (cfg.destaques && cfg.destaques.ids) || [];
      produtos = `<div class="cx-sub"><div class="cx-sub-topo"><h4>Produtos em destaque</h4><small>${ids.length} selecionados</small></div>
        <div class="cx-checks">${CATALOGO.map((p) => `<label class="cx-check"><input type="checkbox" data-destaque="${esc(p.id)}" ${ids.includes(p.id) ? "checked" : ""}><span><b>${esc(p.nome)}</b><small>${esc(p.cat)} · ${p.preco == null ? "sob consulta" : money(p.preco)}</small></span></label>`).join("")}</div>
        <p class="cx-dica">A ordem dos destaques segue a ordem do catálogo.</p></div>`;
    }
    return `<div class="cx-painel-cab"><span class="cx-kicker">Conteúdo</span><h3>${esc(m.nome)}</h3><p>${esc(m.desc)}</p></div>
      <div class="cx-campos">${campos}</div>${arr}${produtos}
      <div class="cx-dica">${svg("save")} Alterações salvas automaticamente neste navegador.</div>`;
  }

  /* ------------------------------------------------------------------ */
  /* painel: tema                                                       */
  /* ------------------------------------------------------------------ */
  function renderTemaPainel() {
    const v = cfg.visual || {};
    const cores = v.cores || {};
    const presets = cfg.presets || [];
    const fTit = v.fontes && v.fontes.titulos ? v.fontes.titulos.nome : "";
    const fTxt = v.fontes && v.fontes.texto ? v.fontes.texto.nome : "";
    const g = cfg.geral || {};
    return `<div class="cx-painel-cab"><span class="cx-kicker">Identidade</span><h3>Tema e marca</h3><p>Troque a paleta, as fontes e a forma dos botões sem quebrar o layout.</p></div>
      <div class="cx-bloco">
        <h4>${svg("palette")} Paletas prontas</h4>
        <div class="cx-presets">${presets.map((p, i) => `<button class="cx-preset" type="button" data-preset="${i}" style="--a:${esc(p.cores.ouro)};--b:${esc(p.cores.marfim)};--c:${esc(p.cores.tinta)}"><span class="cx-preset-cores"><i style="background:${esc(p.cores.ouro)}"></i><i style="background:${esc(p.cores.marfim)}"></i><i style="background:${esc(p.cores.rosa)}"></i></span><b>${esc(p.nome)}</b></button>`).join("")}</div>
      </div>
      <div class="cx-bloco">
        <h4>${svg("sliders")} Cores</h4>
        <div class="cx-cor-grid">${CORES_INFO.map((c) => `<label class="cx-cor"><input type="color" value="${esc(cores[c.k] || "#000000")}" data-cor="${c.k}" aria-label="${esc(c.r)}"><span>${esc(c.r)}<small>${esc(c.k)}</small></span></label>`).join("")}</div>
      </div>
      <div class="cx-bloco">
        <h4>${svg("type")} Tipografia</h4>
        <label class="cx-campo"><span>Fonte dos títulos</span><select data-fonte="titulos">${FONTES.map((f) => `<option ${f.nome === fTit ? "selected" : ""}>${f.nome}</option>`).join("")}</select></label>
        <label class="cx-campo"><span>Fonte dos textos</span><select data-fonte="texto">${FONTES.map((f) => `<option ${f.nome === fTxt ? "selected" : ""}>${f.nome}</option>`).join("")}</select></label>
      </div>
      <div class="cx-bloco">
        <h4>${svg("layers")} Forma e layout</h4>
        <div class="cx-duo">
          <label class="cx-campo"><span>Botões</span><select data-formato><option value="padrao" ${cfg.botoes.formato === "padrao" ? "selected" : ""}>Padrão</option><option value="pill" ${cfg.botoes.formato === "pill" ? "selected" : ""}>Pill</option><option value="quadrado" ${cfg.botoes.formato === "quadrado" ? "selected" : ""}>Quadrado</option></select></label>
          <label class="cx-campo"><span>Caixa</span><select data-caixa><option value="alta" ${cfg.botoes.caixa === "alta" ? "selected" : ""}>Alta</option><option value="normal" ${cfg.botoes.caixa === "normal" ? "selected" : ""}>Normal</option></select></label>
        </div>
        <div class="cx-duo">
          <label class="cx-campo"><span>Raio dos cantos</span><input type="text" data-raio value="${esc(v.raio || "10px")}" placeholder="10px"></label>
          <label class="cx-campo"><span>Largura máxima</span><input type="text" data-container value="${esc(v.container || "1180px")}" placeholder="1180px"></label>
        </div>
        <label class="cx-campo"><span>Cabeçalho</span><select data-header><option value="promo" ${cfg.header.variant === "promo" ? "selected" : ""}>Com barra de anúncio</option><option value="centered" ${cfg.header.variant === "centered" ? "selected" : ""}>Centralizado editorial</option><option value="minimal" ${cfg.header.variant === "minimal" ? "selected" : ""}>Minimalista</option></select></label>
        <label class="cx-campo"><span>Barra de anúncio</span><input type="text" data-anuncio value="${esc((cfg.anuncio && cfg.anuncio.texto) || "")}" placeholder="Deixe vazio para esconder"></label>
      </div>
      <div class="cx-bloco">
        <h4>${svg("heart")} Marca e contato</h4>
        <label class="cx-campo"><span>Nome da loja</span><input type="text" data-geral="nome" value="${esc(g.nome || "")}"></label>
        <label class="cx-campo"><span>Assinatura curta</span><input type="text" data-geral="tagline" value="${esc(g.tagline || "")}"></label>
        <div class="cx-duo">
          <label class="cx-campo"><span>WhatsApp (só números)</span><input type="text" inputmode="numeric" data-geral="zap" value="${esc(g.zap || "")}"></label>
          <label class="cx-campo"><span>WhatsApp na tela</span><input type="text" data-geral="zap_tel" value="${esc(g.zap_tel || "")}"></label>
        </div>
      </div>
      <div class="cx-bloco">
        <h4>${svg("menu")} Menu</h4>
        ${(cfg.menu || []).map((m, i) => `<div class="cx-menu-item"><input type="text" data-menu-campo="t" data-idx="${i}" value="${esc(m.t)}" aria-label="Texto do link"><input type="text" data-menu-campo="href" data-idx="${i}" value="${esc(m.href)}" aria-label="Link"><button class="cx-mini" type="button" data-menu-del="${i}" aria-label="Remover link">${svg("trash")}</button></div>`).join("")}
        <button class="cx-add" type="button" data-menu-add>${svg("plus")} Adicionar link</button>
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* painel: render e eventos                                           */
  /* ------------------------------------------------------------------ */
  function renderPainel() {
    const corpo = $("#cxCorpo");
    if (!corpo) return;
    if (aba === "secoes") corpo.innerHTML = renderSecoesPainel();
    else if (aba === "conteudo") corpo.innerHTML = renderConteudoPainel();
    else corpo.innerHTML = renderTemaPainel();
    $$("[data-aba]", document).forEach((b) => b.setAttribute("aria-pressed", b.dataset.aba === aba ? "true" : "false"));
  }

  function atualizarLoja() {
    aplicarCss();
    renderLoja();
  }
  function renderTudo() {
    aplicarCss();
    renderLoja();
    renderPainel();
    atualizarTopo();
  }

  function moverSecao(id, delta) {
    const lista = cfg.layout.secoes;
    const i = lista.findIndex((s) => s.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= lista.length) return;
    const [x] = lista.splice(i, 1);
    lista.splice(j, 0, x);
    agendarSalvar();
    renderPainel();
    atualizarLoja();
  }
  function alternarSecao(id) {
    const s = cfg.layout.secoes.find((x) => x.id === id);
    if (!s) return;
    s.visivel = s.visivel === false;
    agendarSalvar();
    renderPainel();
    atualizarLoja();
  }
  function aplicarPreset(i) {
    const p = (cfg.presets || [])[i];
    if (!p) return;
    cfg.visual.cores = { ...p.cores };
    agendarSalvar();
    renderPainel();
    atualizarLoja();
  }
  function trocarFonte(campo, nome) {
    const f = fontePorNome(nome);
    if (!f) return;
    cfg.visual.fontes[campo] = { nome: f.nome, link: linkFonte(f), familia: f.fam };
    agendarSalvar();
    atualizarLoja();
  }

  function ligarPainel() {
    const corpo = $("#cxCorpo");
    if (!corpo) return;

    corpo.addEventListener("click", (e) => {
      const sel = e.target.closest("[data-sel]");
      if (sel) { selecionada = sel.dataset.sel; aba = "conteudo"; renderPainel(); return; }
      const subir = e.target.closest("[data-subir]");
      if (subir) { moverSecao(subir.dataset.subir, -1); return; }
      const descer = e.target.closest("[data-descer]");
      if (descer) { moverSecao(descer.dataset.descer, 1); return; }
      const olho = e.target.closest("[data-olho]");
      if (olho) { alternarSecao(olho.dataset.olho); return; }
      const preset = e.target.closest("[data-preset]");
      if (preset) { aplicarPreset(Number(preset.dataset.preset)); return; }
      const addItem = e.target.closest("[data-add-item]");
      if (addItem) {
        const arr = addItem.dataset.addItem;
        const sec = cfg[selecionada] || (cfg[selecionada] = {});
        if (!Array.isArray(sec[arr])) sec[arr] = [];
        const modelo = arr === "faixa" ? { t: "Novo", s: "Legenda" } : arr === "selos" ? { t: "Novo diferencial", s: "Detalhe" } : arr === "passos" ? { t: "Novo passo", s: "Detalhe" } : arr === "itens" ? { t: "Nova coleção", cor: ["#d8c2a4", "#a9855f"] } : { texto: "Novo depoimento", nome: "Cliente", contexto: "Produto" };
        sec[arr].push(modelo);
        agendarSalvar();
        renderPainel();
        atualizarLoja();
        return;
      }
      const delItem = e.target.closest("[data-del-item]");
      if (delItem) {
        const arr = delItem.dataset.delItem;
        const sec = cfg[selecionada];
        if (sec && Array.isArray(sec[arr])) sec[arr].splice(Number(delItem.dataset.idx), 1);
        agendarSalvar();
        renderPainel();
        atualizarLoja();
        return;
      }
      const menuDel = e.target.closest("[data-menu-del]");
      if (menuDel) {
        cfg.menu.splice(Number(menuDel.dataset.menuDel), 1);
        agendarSalvar();
        renderPainel();
        atualizarLoja();
        return;
      }
      if (e.target.closest("[data-menu-add]")) {
        cfg.menu.push({ t: "Novo link", href: "#catalogo" });
        agendarSalvar();
        renderPainel();
        atualizarLoja();
        return;
      }
    });

    corpo.addEventListener("input", (e) => {
      const alvo = e.target;
      if (alvo.matches("[data-campo]")) {
        setPath(cfg, alvo.dataset.campo, alvo.value);
      } else if (alvo.matches("[data-array]")) {
        const sec = cfg[selecionada];
        const arr = sec && sec[alvo.dataset.array];
        const item = arr && arr[Number(alvo.dataset.idx)];
        if (item) item[alvo.dataset.ck] = alvo.value;
      } else if (alvo.matches("[data-item-cor]")) {
        const sec = cfg[selecionada];
        const arr = sec && sec[alvo.dataset.itemCor];
        const item = arr && arr[Number(alvo.dataset.idx)];
        if (item) {
          if (!Array.isArray(item[alvo.dataset.ck])) item[alvo.dataset.ck] = ["#d8c2a4", "#a9855f"];
          item[alvo.dataset.ck][Number(alvo.dataset.ci)] = alvo.value;
        }
      } else if (alvo.matches("[data-cor]")) {
        cfg.visual.cores[alvo.dataset.cor] = alvo.value;
        aplicarCss();
      } else if (alvo.matches("[data-geral]")) {
        cfg.geral[alvo.dataset.geral] = alvo.value;
      } else if (alvo.matches("[data-menu-campo]")) {
        const i = Number(alvo.dataset.idx);
        if (cfg.menu[i]) cfg.menu[i][alvo.dataset.menuCampo] = alvo.value;
      } else if (alvo.matches("[data-raio]")) {
        cfg.visual.raio = alvo.value;
        aplicarCss();
      } else if (alvo.matches("[data-container]")) {
        cfg.visual.container = alvo.value;
        aplicarCss();
      } else if (alvo.matches("[data-anuncio]")) {
        cfg.anuncio = cfg.anuncio || {};
        cfg.anuncio.texto = alvo.value;
        atualizarLoja();
      } else {
        return;
      }
      agendarSalvar();
      if (alvo.matches("[data-geral]") || alvo.matches("[data-menu-campo]")) atualizarLoja();
      else if (alvo.matches("[data-campo]") || alvo.matches("[data-array]") || alvo.matches("[data-item-cor]")) atualizarLoja();
    });

    corpo.addEventListener("change", (e) => {
      const alvo = e.target;
      if (alvo.matches("[data-fonte]")) { trocarFonte(alvo.dataset.fonte, alvo.value); return; }
      if (alvo.matches("[data-formato]")) { cfg.botoes.formato = alvo.value; aplicarCss(); agendarSalvar(); return; }
      if (alvo.matches("[data-caixa]")) { cfg.botoes.caixa = alvo.value; aplicarCss(); agendarSalvar(); return; }
      if (alvo.matches("[data-header]")) { cfg.header.variant = alvo.value; atualizarLoja(); agendarSalvar(); return; }
      if (alvo.matches("[data-destaque]")) {
        const id = alvo.dataset.destaque;
        const ids = new Set((cfg.destaques && cfg.destaques.ids) || []);
        if (alvo.checked) ids.add(id); else ids.delete(id);
        cfg.destaques.ids = [...ids];
        agendarSalvar();
        atualizarLoja();
        renderPainel();
        return;
      }
    });

    /* drag & drop */
    corpo.addEventListener("dragstart", (e) => {
      const linha = e.target.closest("[data-linha]");
      if (!linha) return;
      e.dataTransfer.setData("text/plain", linha.dataset.linha);
      e.dataTransfer.effectAllowed = "move";
      linha.classList.add("arrastando");
    });
    corpo.addEventListener("dragend", (e) => {
      const linha = e.target.closest("[data-linha]");
      if (linha) linha.classList.remove("arrastando");
      $$(".cx-sec", corpo).forEach((l) => l.classList.remove("sobre"));
    });
    corpo.addEventListener("dragover", (e) => {
      const linha = e.target.closest("[data-linha]");
      if (!linha) return;
      e.preventDefault();
      $$(".cx-sec", corpo).forEach((l) => l.classList.remove("sobre"));
      linha.classList.add("sobre");
    });
    corpo.addEventListener("drop", (e) => {
      const linha = e.target.closest("[data-linha]");
      if (!linha) return;
      e.preventDefault();
      const origem = e.dataTransfer.getData("text/plain");
      const destino = linha.dataset.linha;
      if (!origem || origem === destino) return;
      const lista = cfg.layout.secoes;
      const de = lista.findIndex((s) => s.id === origem);
      const para = lista.findIndex((s) => s.id === destino);
      if (de < 0 || para < 0) return;
      const [x] = lista.splice(de, 1);
      lista.splice(para, 0, x);
      agendarSalvar();
      renderPainel();
      atualizarLoja();
    });
  }

  /* ------------------------------------------------------------------ */
  /* topo / dispositivo / ações                                         */
  /* ------------------------------------------------------------------ */
  function atualizarTopo() {
    const el = $("#cxNomeModelo");
    if (el) el.textContent = META.nome || TPL_ID;
    const sub = $("#cxMetaModelo");
    if (sub) sub.textContent = `${META.versao || "1.0-hml"} · ${META.foco || "loja virtual"} · ${(cfg.layout.secoes || []).length} módulos`;
    const sel = $("#cxModelo");
    if (sel) sel.value = TPL_ID;
    $$("[data-device]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.device === device ? "true" : "false"));
    const dev = $("#cxDevice");
    if (dev) {
      dev.classList.remove("is-desktop", "is-tablet", "is-mobile");
      dev.classList.add("is-" + device);
    }
  }

  function ligarTopo() {
    $$("[data-device]").forEach((b) => b.addEventListener("click", () => {
      device = b.dataset.device;
      atualizarTopo();
    }));
    $$("[data-aba]").forEach((b) => b.addEventListener("click", () => {
      aba = b.dataset.aba;
      renderPainel();
    }));
    const sel = $("#cxModelo");
    if (sel) sel.addEventListener("change", () => {
      const pag = PAGINAS[sel.value];
      if (pag) location.href = pag + (location.search.includes("standalone=1") ? "?standalone=1" : "");
    });
    const salvar = $("#cxSalvar");
    if (salvar) salvar.addEventListener("click", () => {
      try { localStorage.setItem(STORAGE, JSON.stringify(cfg)); toast("Modelo salvo neste navegador"); } catch (e) { toast("Não foi possível salvar"); }
    });
    const exportar = $("#cxExportar");
    if (exportar) exportar.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `config-${TPL_ID}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast("Configuração exportada");
    });
    const reset = $("#cxReset");
    if (reset) reset.addEventListener("click", () => {
      if (!confirm("Restaurar o modelo original? Suas alterações locais serão perdidas.")) return;
      localStorage.removeItem(STORAGE);
      cfg = clone(BASE);
      carrinho = [];
      salvarCarrinho();
      selecionada = "hero";
      filtro = { q: "", cat: "Tudo", ordem: "destaque" };
      renderTudo();
      toast("Modelo restaurado");
    });
    const fab = $("#cxFab");
    if (fab) fab.addEventListener("click", () => document.body.classList.add("painel-aberto"));
    const fechar = $("#cxFechar");
    if (fechar) fechar.addEventListener("click", () => document.body.classList.remove("painel-aberto"));
  }

  /* ------------------------------------------------------------------ */
  /* start                                                              */
  /* ------------------------------------------------------------------ */
  function init() {
    if (new URLSearchParams(location.search).has("standalone")) document.body.classList.add("modo-loja");
    ligarLoja();
    ligarPainel();
    ligarTopo();
    renderTudo();
    /* re-renderiza ao voltar para a aba (fontes podem ter carregado) */
    window.addEventListener("pageshow", () => { if (document.body.classList.contains("modo-loja")) renderLoja(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
