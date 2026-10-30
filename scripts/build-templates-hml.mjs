#!/usr/bin/env node
/**
 * Gera os 3 modelos de tenant em homologação (HML) com personalização modular.
 *
 * Fonte da verdade:
 *   saas/templates/<id>/config.json   → seed usado ao criar uma loja de verdade
 *   saas/templates/<id>/catalog.json  → catálogo demo
 *
 * Saídas:
 *   saas/templates/<id>/{config,catalog,meta,tokens,manifest}
 *   js/templates-hml-data.js          → usado apenas pelas páginas de homologação
 *
 * Rode com: node scripts/build-templates-hml.mjs
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const TPL_DIR = join(ROOT, "saas", "templates");
const BASE = JSON.parse(readFileSync(join(TPL_DIR, "generico", "config.json"), "utf8"));
const BASE_MANIFEST = JSON.parse(readFileSync(join(TPL_DIR, "generico", "manifest.webmanifest"), "utf8"));

const clone = (o) => JSON.parse(JSON.stringify(o));
function merge(base, over) {
  if (Array.isArray(over)) return clone(over);
  if (over && typeof over === "object") {
    const out = base && typeof base === "object" && !Array.isArray(base) ? { ...base } : {};
    for (const k of Object.keys(over)) out[k] = merge(base ? base[k] : undefined, over[k]);
    return out;
  }
  return over;
}

const produto = (id, nome, cat, preco, desc, badge, cor, icone) => ({
  id, nome, cat, tag: cat, preco, desc, foto: "", badge, selo: badge, cor, icone,
});

/* ===================================================================== */
/* 1. VITRINE EXPRESS — conversão, grade, busca, carrinho                 */
/* ===================================================================== */

const vitrine = {
  template: {
    id: "vitrine-hml",
    nome: "Vitrine Express",
    versao: "1.0-hml",
    status: "homologacao",
    foco: "loja virtual de conversão",
    segmento: "varejo / moda / acessórios",
  },
  geral: {
    nome: "Nova Vitrine",
    tagline: "Sua loja online, pronta para vender",
    title: "Nova Vitrine — Loja online com checkout no WhatsApp",
    descricao:
      "Moda, acessórios e utilidades com curadoria. Escolha as peças, monte sua lista e finalize o pedido no WhatsApp.",
    instagram: "",
    zap: "5511999999999",
    zap_tel: "(11) 99999-9999",
    prazo_producao: "envio em até 2 dias úteis · frete confirmado no WhatsApp",
    produto: "Produtos selecionados",
    categoria: "Varejo",
  },
  visual: {
    logo: "logo.png",
    raio: "14px",
    container: "1180px",
    cores: {
      marfim: "#ffffff",
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
      titulos: {
        nome: "Manrope",
        link: "https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap",
        familia: '"Manrope",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      },
      texto: {
        nome: "Inter",
        link: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
        familia: '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      },
    },
  },
  header: { variant: "promo" },
  anuncio: {
    texto: "Frete grátis acima de R$ 199 · cupom BEMVINDA10 na primeira compra",
    link: "#catalogo",
    botao: "Aproveitar",
  },
  hero: {
    chapeu: "Nova coleção · outono 2026",
    titulo: "Peças que resolvem<br>o seu <em>dia.</em>",
    lead:
      "Curadoria de moda, acessórios e utilidades para quem quer praticidade sem abrir mão do estilo. Escolha, monte sua lista e finalize no WhatsApp.",
    cta1: "Ver a coleção",
    cta2: "Falar com a loja",
    nota: "Troca fácil em até 7 dias · atendimento humano de verdade",
    fita1: "Curadoria semanal",
    fita2: "novidades toda quinta",
  },
  selos: [
    { t: "Envio rápido", s: "Postado em até 2 dias" },
    { t: "Troca fácil", s: "7 dias para trocar" },
    { t: "Compra segura", s: "Pedido confirmado no WhatsApp" },
    { t: "Curadoria", s: "Peças escolhidas uma a uma" },
  ],
  destaques: {
    chapeu: "Mais desejados",
    titulo: "Os <em>favoritos</em> da semana",
    ids: ["camiseta-essencial", "bolsa-transversal", "tenis-urbano", "garrafa-termica"],
  },
  oficio: {
    chapeu: "Sobre a vitrine",
    titulo: "Uma loja pequena,<br><em>escolhida a dedo.</em>",
    citacao: '"Menos opções, mais acerto. Cada peça entra na vitrine porque a gente usaria."',
    lead:
      "A Nova Vitrine nasceu para encurtar o caminho entre você e o que funciona: peças versáteis, fornecedores testados e atendimento de gente para gente.",
    fe1: "<b>Curadoria real</b> — testamos textura, caimento e acabamento antes de publicar.",
    fe2: "<b>Estoque enxuto</b> — menos excesso, mais peças que você realmente veste.",
    fe3: "<b>Atendimento direto</b> — dúvida de tamanho? Chama no WhatsApp e a gente ajuda.",
    cta: "Conhecer a loja",
  },
  catalogo: {
    chapeu: "Catálogo",
    titulo: "Escolha as suas <em>peças</em>",
    lead:
      "Filtre por categoria, busque pelo nome e monte sua lista. O pedido chega organizado no WhatsApp da loja.",
    prazo: "Enviamos para todo o Brasil. Frete e prazo são confirmados no atendimento.",
    nota: 'Não encontrou seu tamanho? <a href="#final">Fale com a gente</a> que verificamos com o fornecedor.',
    busca_placeholder: "Buscar por peça, cor ou categoria…",
  },
  depoimentos: {
    chapeu: "Quem comprou",
    titulo: "Avaliações <em>reais</em>",
    lead: "Mais de 1.200 pedidos enviados. Algumas palavras de quem já recebeu:",
    lista: [
      {
        texto:
          '"A camiseta tem um caimento perfeito e o tecido é gostoso de verdade. Chegou antes do prazo e a embalagem é caprichada."',
        nome: "Marina",
        contexto: "Camiseta essencial",
      },
      {
        texto:
          '"Comprei a bolsa para viajar e virou a minha favorita. Cabe tudo e não pesa. O atendimento no WhatsApp respondeu na hora."',
        nome: "Camila",
        contexto: "Bolsa transversal",
      },
      {
        texto:
          '"Tênis leve, confortável e do jeito que aparecia nas fotos. Troquei o número sem burocracia e chegou rápido."',
        nome: "Rafael",
        contexto: "Tênis urbano",
      },
    ],
    faixa: [
      { t: "4,9/5", s: "média das avaliações" },
      { t: "1.200+", s: "pedidos enviados" },
      { t: "24h", s: "resposta no WhatsApp" },
    ],
  },
  final: {
    chapeu: "Fale com a loja",
    titulo: "Ficou na dúvida?<br><em>A gente ajuda.</em>",
    lead:
      "Manda o que você procura, seu tamanho ou uma referência. Respondemos em horário comercial com opções, prazo e frete.",
    cta1: "Chamar no WhatsApp",
    cta2: "Voltar ao catálogo",
  },
  rodape: {
    titulo: "Nova Vitrine",
    sobre:
      "Curadoria de moda, acessórios e utilidades. Compra pelo site, atendimento no WhatsApp e envio para todo o Brasil.",
    cat_titulo: "Comprar",
    como_titulo: "Ajuda",
    nota_base: "Preços e estoque sujeitos a alteração. Imagens ilustrativas.",
  },
  menu: [
    { t: "Novidades", href: "#destaques" },
    { t: "Catálogo", href: "#catalogo" },
    { t: "A loja", href: "#oficio" },
    { t: "Avaliações", href: "#depoimentos" },
  ],
  botoes: { formato: "pill", caixa: "alta" },
  layout: {
    secoes: [
      { id: "hero", visivel: true },
      { id: "selos", visivel: true },
      { id: "destaques", visivel: true },
      { id: "catalogo", visivel: true },
      { id: "oficio", visivel: true },
      { id: "depoimentos", visivel: true },
      { id: "final", visivel: true },
      { id: "rodape", visivel: true },
    ],
  },
  presets: [
    {
      nome: "Índigo",
      cores: {
        marfim: "#ffffff", areia: "#f4f6fb", papel: "#ffffff", linha: "#e3e8f2",
        tinta: "#0f172a", "tinta-suave": "#5b6577", ouro: "#4f46e5",
        "ouro-claro": "#818cf8", "ouro-fraco": "#eef2ff", rosa: "#f59e0b",
        "rosa-claro": "#fef3c7", salvia: "#10b981", zap: "#16a34a",
      },
    },
    {
      nome: "Coral",
      cores: {
        marfim: "#fffaf7", areia: "#fdf0e9", papel: "#ffffff", linha: "#f0ddd2",
        tinta: "#241512", "tinta-suave": "#766057", ouro: "#e0523f",
        "ouro-claro": "#f08a72", "ouro-fraco": "#fde7df", rosa: "#f2b544",
        "rosa-claro": "#fdf1d6", salvia: "#3f8f6b", zap: "#178a4c",
      },
    },
    {
      nome: "Grafite",
      cores: {
        marfim: "#f7f7f5", areia: "#ededE8", papel: "#ffffff", linha: "#d9d9d2",
        tinta: "#1c1c1a", "tinta-suave": "#66665f", ouro: "#2f3437",
        "ouro-claro": "#5b6165", "ouro-fraco": "#e8e9e6", rosa: "#c08a3e",
        "rosa-claro": "#f5ead6", salvia: "#5f7d61", zap: "#1f8c5a",
      },
    },
  ],
};

const catalogoVitrine = [
  produto("camiseta-essencial", "Camiseta essencial algodão", "Moda", 89.9,
    "Algodão penteado 30.1, caimento reto e gola reforçada. Do P ao GG.", "Mais vendido",
    ["#e7e2d8", "#c9c0b2"], "camiseta"),
  produto("bolsa-transversal", "Bolsa transversal compacta", "Acessórios", 149.9,
    "Nylon reciclado, alça ajustável e bolso interno. Cabe celular, carteira e chaves.", "Novo",
    ["#d9c7b4", "#b39a80"], "bolsa"),
  produto("tenis-urbano", "Tênis urbano leve", "Calçados", 219.9,
    "Solado macio e cabedal respirável. Numeração 34 ao 44.", "",
    ["#d7dde4", "#aeb9c4"], "tenis"),
  produto("garrafa-termica", "Garrafa térmica 500 ml", "Utilidades", 79.9,
    "Inox 18/8, mantém gelado por 12h. Tampa antivazamento.", "Pronta entrega",
    ["#cfe0dc", "#9dbbb4"], "garrafa"),
  produto("oculos-sol", "Óculos de sol acetato", "Acessórios", 129.9,
    "Proteção UV400, lentes polarizadas e case rígido incluso.", "",
    ["#e4d6c3", "#c2a98d"], "oculos"),
  produto("mochila-compacta", "Mochila compacta urbana", "Acessórios", 189.9,
    'Compartimento para notebook 14", tecido resistente à água.', "Mais vendido",
    ["#d6d9cf", "#aab0a2"], "mochila"),
  produto("kit-meias", "Kit 3 pares de meias", "Moda", 39.9,
    "Algodão com elastano, punho confortável. Cores neutras.", "",
    ["#ece7df", "#d5cec3"], "meia"),
  produto("bone-aba", "Boné aba curva", "Acessórios", 59.9,
    "Ajuste traseiro e bordado discreto. Aba curva com estrutura firme.", "Novo",
    ["#dfd3c3", "#b9a78f"], "bone"),
];

/* ===================================================================== */
/* 2. EDITORIAL CASA — storytelling, coleções, lifestyle                 */
/* ===================================================================== */

const editorial = {
  template: {
    id: "editorial-hml",
    nome: "Editorial Casa",
    versao: "1.0-hml",
    status: "homologacao",
    foco: "loja-conceito e storytelling",
    segmento: "casa / lifestyle / marcas autorais",
  },
  geral: {
    nome: "Casa Editorial",
    tagline: "Objetos para morar devagar",
    title: "Casa Editorial — Objetos autorais para morar devagar",
    descricao:
      "Cerâmica, linho, madeira e aromas em pequenos lotes. Uma curadoria de objetos autorais para deixar a casa com a sua cara.",
    instagram: "",
    zap: "5511999999999",
    zap_tel: "(11) 99999-9999",
    prazo_producao: "peças produzidas em pequenos lotes · envio em até 5 dias úteis",
    produto: "Objetos de casa",
    categoria: "Casa e lifestyle",
  },
  visual: {
    logo: "logo.png",
    raio: "0px",
    container: "1240px",
    cores: {
      marfim: "#f6f1e7",
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
      titulos: {
        nome: "Fraunces",
        link: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&display=swap",
        familia: '"Fraunces",Georgia,serif',
      },
      texto: {
        nome: "DM Sans",
        link: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap",
        familia: '"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      },
    },
  },
  header: { variant: "centered" },
  anuncio: { texto: "", link: "", botao: "" },
  hero: {
    chapeu: "Coleção outono · 2026",
    titulo: "A casa também<br><em>conta histórias.</em>",
    lead:
      "Objetos de cerâmica, linho e madeira escolhidos para durar. Peças autorais, produzidas em pequenos lotes, para quem gosta de morar com intenção.",
    cta1: "Explorar a coleção",
    cta2: "Nossa história",
    nota: "Peças autorais · produção em pequenos lotes · envio consciente",
    fita1: "Feito para durar",
    fita2: "não para acompanhar tendência",
  },
  selos: [
    { t: "Pequenos lotes", s: "Nada de produção em massa" },
    { t: "Materiais naturais", s: "Cerâmica, linho e madeira" },
    { t: "Feito no Brasil", s: "Ateliês parceiros" },
    { t: "Envio consciente", s: "Embalagem sem plástico" },
  ],
  destaques: {
    chapeu: "Seleção da semana",
    titulo: "Peças que <em>aquecem</em> o ambiente",
    ids: ["vaso-ceramica", "manta-algodao", "vela-artesanal", "bandeja-madeira"],
  },
  oficio: {
    chapeu: "Nosso ateliê",
    titulo: "A beleza do <em>imperfeito.</em>",
    citacao: '"Cada peça sai diferente da outra. É isso que faz ela ser sua."',
    lead:
      "Trabalhamos com ateliês pequenos, de pessoas que conhecem o processo inteiro. A cerâmica tem marcas da mão, o linho amassa com o uso e a madeira ganha história. A gente gosta assim.",
    fe1: "<b>Origem rastreável</b> — sabemos quem fez e de onde veio cada peça.",
    fe2: "<b>Produção lenta</b> — pequenos lotes, sem pressa e sem sobra.",
    fe3: "<b>Reparo e cuidado</b> — orientamos como cuidar para durar mais.",
    cta: "Conhecer os ateliês",
  },
  devocoes: {
    chapeu: "Coleções",
    titulo: "Três formas de <em>morar</em>",
    lead: "Comece pelo ambiente que você quer transformar. Cada coleção foi montada para conversar entre si.",
    itens: [
      { t: "Mesa posta", cor: ["#d8b98c", "#a97d4f"], icone: "copo" },
      { t: "Sala de estar", cor: ["#c9b79d", "#8f7b62"], icone: "manta" },
      { t: "Quarto e banho", cor: ["#b9c0a8", "#7f8a6e"], icone: "vela" },
    ],
  },
  catalogo: {
    chapeu: "Catálogo",
    titulo: "Objetos para <em>todos os dias</em>",
    lead:
      "Uma seleção enxuta de peças que usam, lavam e envelhecem bem. Toque para adicionar à sua lista.",
    prazo: "Produção em pequenos lotes. Prazo e frete confirmados no WhatsApp.",
    nota: 'Procura uma peça específica? <a href="#final">Conte para a gente</a>.',
    busca_placeholder: "Buscar por peça, material ou ambiente…",
  },
  oracao: {
    texto: '"A casa não precisa ser perfeita. Precisa parecer com quem mora nela."',
    autor: "Casa Editorial",
  },
  depoimentos: {
    chapeu: "Quem leva para casa",
    titulo: "Histórias que <em>continuam</em>",
    lead: "Cada peça sai daqui com uma história. Estas são algumas que voltaram para contar:",
    lista: [
      {
        texto:
          '"O vaso chegou embalado com um cuidado que eu não esperava. A cor é ainda mais bonita ao vivo e já virou o centro da mesa."',
        nome: "Beatriz",
        contexto: "Vaso cerâmica areia",
      },
      {
        texto:
          '"A manta é leve e quente na medida. Uso todos os dias no sofá e continua impecável depois de lavar."',
        nome: "Helena",
        contexto: "Manta de algodão cru",
      },
      {
        texto:
          '"Comprei a vela de presente e acabei ficando com ela. O cheiro é discreto e a embalagem dispensa papel de presente."',
        nome: "Clara",
        contexto: "Vela artesanal figo",
      },
    ],
    faixa: [
      { t: "100%", s: "peças autorais" },
      { t: "12", s: "ateliês parceiros" },
      { t: "5 dias", s: "para postar" },
    ],
  },
  final: {
    chapeu: "Vamos conversar",
    titulo: "Tem um espaço<br><em>esperando por você?</em>",
    lead:
      "Conte o ambiente, a paleta ou a peça que você procura. A gente ajuda a compor e envia opções com prazo e frete.",
    cta1: "Falar no WhatsApp",
    cta2: "Voltar ao catálogo",
  },
  rodape: {
    titulo: "Casa Editorial",
    sobre:
      "Curadoria de objetos autorais para casa. Cerâmica, linho, madeira e aromas em pequenos lotes, feitos no Brasil.",
    cat_titulo: "Coleções",
    como_titulo: "Ajuda",
    nota_base: "Peças artesanais: variações de tom, textura e forma fazem parte.",
  },
  menu: [
    { t: "Coleções", href: "#devocoes" },
    { t: "Destaques", href: "#destaques" },
    { t: "Ateliê", href: "#oficio" },
    { t: "Catálogo", href: "#catalogo" },
    { t: "Histórias", href: "#depoimentos" },
  ],
  botoes: { formato: "quadrado", caixa: "normal" },
  layout: {
    secoes: [
      { id: "hero", visivel: true },
      { id: "selos", visivel: true },
      { id: "devocoes", visivel: true },
      { id: "destaques", visivel: true },
      { id: "oficio", visivel: true },
      { id: "oracao", visivel: true },
      { id: "catalogo", visivel: true },
      { id: "depoimentos", visivel: true },
      { id: "final", visivel: true },
      { id: "rodape", visivel: true },
    ],
  },
  presets: [
    {
      nome: "Terracota",
      cores: {
        marfim: "#f6f1e7", areia: "#ece3d3", papel: "#fffdf8", linha: "#ddd0bb",
        tinta: "#211d17", "tinta-suave": "#6b6153", ouro: "#b4552d",
        "ouro-claro": "#d98a63", "ouro-fraco": "#f6e4d8", rosa: "#8a9a7b",
        "rosa-claro": "#e6ece1", salvia: "#6f7d5c", zap: "#1f7a4d",
      },
    },
    {
      nome: "Oliva",
      cores: {
        marfim: "#f3f2e9", areia: "#e6e5d6", papel: "#fdfcf6", linha: "#d2d1bd",
        tinta: "#20231b", "tinta-suave": "#626757", ouro: "#5f7248",
        "ouro-claro": "#8fa176", "ouro-fraco": "#e5ead9", rosa: "#b07a4f",
        "rosa-claro": "#f0e0d0", salvia: "#7d8a63", zap: "#1f7a4d",
      },
    },
    {
      nome: "Papel",
      cores: {
        marfim: "#faf8f3", areia: "#f0ece2", papel: "#ffffff", linha: "#e0dacd",
        tinta: "#1f1d19", "tinta-suave": "#6a655b", ouro: "#2f2c27",
        "ouro-claro": "#6b655a", "ouro-fraco": "#ece8df", rosa: "#a8875c",
        "rosa-claro": "#f1e8d9", salvia: "#7d8a75", zap: "#1f7a4d",
      },
    },
  ],
};

const catalogoEditorial = [
  produto("vaso-ceramica", "Vaso cerâmica areia", "Casa", 189,
    "Torneado à mão, esmalte fosco e base selada. 24 cm de altura.", "Feito à mão",
    ["#e7d8c3", "#cbb69a"], "vaso"),
  produto("manta-algodao", "Manta de algodão cru", "Têxtil", 249,
    "Tecelagem manual em algodão orgânico. 1,30 × 1,80 m.", "",
    ["#efe6d7", "#d3c3ad"], "manta"),
  produto("copo-ambar", "Copo âmbar soprado", "Mesa", 69,
    "Vidro soprado artesanal, 300 ml. Pequenas bolhas fazem parte.", "Novo",
    ["#d9b98c", "#b8875a"], "copo"),
  produto("bandeja-madeira", "Bandeja madeira freijó", "Mesa", 159,
    "Madeira de reflorestamento com acabamento em óleo natural. 40 × 25 cm.", "",
    ["#d8c2a4", "#a9855f"], "bandeja"),
  produto("vela-artesanal", "Vela artesanal figo", "Aroma", 89,
    "Cera de coco, pavio de algodão e essência de figo. 220 g.", "Mais vendido",
    ["#e3d3bf", "#bfa98e"], "vela"),
  produto("caderno-linho", "Caderno capa linho", "Papelaria", 74,
    "96 páginas pautadas, capa em linho e costura aparente.", "",
    ["#d9d3c6", "#b3aa99"], "caderno"),
  produto("bolsa-linho", "Bolsa de linho", "Acessórios", 219,
    "Linho lavado, alças reforçadas e forro interno. Cabe notebook 13\".", "",
    ["#e8ddcb", "#c7b69c"], "bolsa"),
  produto("aromatizante", "Aromatizante cítrico", "Aroma", 79,
    "Óleos essenciais de laranja, limão e cedro. 200 ml.", "Sob encomenda",
    ["#e6ddc7", "#c4b590"], "aroma"),
];

/* ===================================================================== */
/* 3. BOUTIQUE NOIR — premium, escuro, concierge                         */
/* ===================================================================== */

const boutique = {
  template: {
    id: "boutique-hml",
    nome: "Boutique Noir",
    versao: "1.0-hml",
    status: "homologacao",
    foco: "loja premium e atendimento concierge",
    segmento: "joias / beleza / presentes",
  },
  geral: {
    nome: "Boutique Noir",
    tagline: "Joias e objetos de desejo",
    title: "Boutique Noir — Joias em banho de ouro e edições limitadas",
    descricao:
      "Joias em banho de ouro 18k, pedras naturais e objetos de desejo em edição limitada. Atendimento concierge pelo WhatsApp.",
    instagram: "",
    zap: "5511999999999",
    zap_tel: "(11) 99999-9999",
    prazo_producao: "peças sob encomenda · produção de 7 a 12 dias úteis",
    produto: "Joias e objetos",
    categoria: "Joias e beleza",
  },
  visual: {
    logo: "logo.png",
    raio: "0px",
    container: "1200px",
    cores: {
      marfim: "#0d0c0a",
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
      titulos: {
        nome: "Cormorant Garamond",
        link: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap",
        familia: '"Cormorant Garamond",Georgia,serif',
      },
      texto: {
        nome: "Inter",
        link: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap",
        familia: '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      },
    },
  },
  header: { variant: "minimal" },
  anuncio: {
    texto: "Atendimento concierge · embalagem de presente inclusa · envio segurado",
    link: "#final",
    botao: "Falar agora",
  },
  hero: {
    chapeu: "Coleção assinatura",
    titulo: "O luxo de<br><em>ser você.</em>",
    lead:
      "Joias em banho de ouro 18k, pedras naturais e peças em edição limitada. Atendimento concierge para escolher com calma e receber em casa.",
    cta1: "Ver a coleção",
    cta2: "Agendar atendimento",
    nota: "Embalagem de presente inclusa · envio segurado para todo o Brasil",
    fita1: "Edição limitada",
    fita2: "feita para durar",
  },
  selos: [
    { t: "Banho de ouro 18k", s: "Garantia de 12 meses" },
    { t: "Pedras naturais", s: "Selecionadas uma a uma" },
    { t: "Embalagem presente", s: "Pronta para presentear" },
    { t: "Envio segurado", s: "Para todo o Brasil" },
  ],
  destaques: {
    chapeu: "Seleção assinatura",
    titulo: "Peças para <em>lembrar</em>",
    ids: ["colar-fio-ouro", "brinco-argola", "anel-signet", "perfume-ambar"],
  },
  oficio: {
    chapeu: "O atelier",
    titulo: "Feito para <em>poucos.</em>",
    citacao: '"Uma joia não precisa gritar. Ela precisa ficar."',
    lead:
      "Cada peça nasce de uma conversa: a ocasião, a pele, o jeito de usar. Trabalhamos com produção pequena, acabamento manual e pedras escolhidas uma a uma.",
    fe1: "<b>Banho de ouro 18k</b> — espessura reforçada e garantia de 12 meses.",
    fe2: "<b>Pedras naturais</b> — selecionadas por tom, corte e transparência.",
    fe3: "<b>Atendimento concierge</b> — acompanhamento do pedido ao pós-venda.",
    cta: "Conhecer o atelier",
  },
  catalogo: {
    chapeu: "Coleção",
    titulo: "Objetos de <em>desejo</em>",
    lead:
      "Peças em edição limitada, prontas para envio ou sob encomenda. Selecione e fale com o concierge para confirmar detalhes.",
    prazo: "Peças sob encomenda: 7 a 12 dias úteis. Pronta entrega: envio em 2 dias.",
    nota: 'Quer uma peça personalizada? <a href="#encomenda">Fale com o atelier</a>.',
    busca_placeholder: "Buscar por peça, pedra ou coleção…",
  },
  encomenda: {
    chapeu: "Atendimento concierge",
    titulo: "Do primeiro <em>olhar</em> ao presente",
    lead:
      "Um atendimento próximo para escolher a peça certa, ajustar o tamanho e cuidar de cada detalhe da entrega.",
    passos: [
      { t: "Escolha a peça", s: "Monte sua lista ou envie uma referência pelo WhatsApp." },
      { t: "Atendimento concierge", s: "Confirmamos pedra, tamanho, prazo e forma de pagamento." },
      { t: "Embalagem e envio", s: "A peça sai em estojo, com embalagem de presente e envio segurado." },
    ],
    botao: "Agendar atendimento",
  },
  depoimentos: {
    chapeu: "Quem já recebeu",
    titulo: "Histórias <em>para guardar</em>",
    lead: "Cada peça carrega uma ocasião. Algumas palavras de quem escolheu a Boutique Noir:",
    lista: [
      {
        texto:
          '"Comprei o colar para o meu aniversário e foi um dos presentes mais bonitos que já recebi. O acabamento é impecável e a embalagem emociona."',
        nome: "Larissa",
        contexto: "Colar fio dourado",
      },
      {
        texto:
          '"O atendimento pelo WhatsApp foi cuidadoso do início ao fim. Me ajudaram a escolher o tamanho e a peça chegou antes do prazo."',
        nome: "Patrícia",
        contexto: "Brinco argola",
      },
      {
        texto:
          '"Pedi o kit presente para a minha mãe. Ela usou todos os dias desde então. Voltarei para a próxima ocasião."',
        nome: "Renata",
        contexto: "Kit presente assinatura",
      },
    ],
    faixa: [
      { t: "18k", s: "banho de ouro" },
      { t: "12 meses", s: "de garantia" },
      { t: "100%", s: "embalagem presente" },
    ],
  },
  final: {
    chapeu: "Atendimento privado",
    titulo: "Vamos encontrar<br><em>a sua peça?</em>",
    lead:
      "Conte a ocasião, o estilo e o orçamento. O concierge responde com opções selecionadas, prazo e condições.",
    cta1: "Falar com o concierge",
    cta2: "Voltar à coleção",
  },
  rodape: {
    titulo: "Boutique Noir",
    sobre:
      "Joias em banho de ouro 18k, pedras naturais e objetos de desejo em edição limitada. Atendimento concierge e envio segurado.",
    cat_titulo: "Coleção",
    como_titulo: "Atendimento",
    nota_base: "Peças artesanais: pequenas variações de pedra e acabamento fazem parte.",
  },
  menu: [
    { t: "Coleção", href: "#destaques" },
    { t: "Atelier", href: "#oficio" },
    { t: "Catálogo", href: "#catalogo" },
    { t: "Atendimento", href: "#encomenda" },
  ],
  botoes: { formato: "quadrado", caixa: "alta" },
  layout: {
    secoes: [
      { id: "hero", visivel: true },
      { id: "selos", visivel: true },
      { id: "destaques", visivel: true },
      { id: "oficio", visivel: true },
      { id: "catalogo", visivel: true },
      { id: "encomenda", visivel: true },
      { id: "depoimentos", visivel: true },
      { id: "final", visivel: true },
      { id: "rodape", visivel: true },
    ],
  },
  presets: [
    {
      nome: "Noir",
      cores: {
        marfim: "#0d0c0a", areia: "#151310", papel: "#1b1814", linha: "#332d24",
        tinta: "#f4ecdd", "tinta-suave": "#b7a98f", ouro: "#c8a96a",
        "ouro-claro": "#e2c995", "ouro-fraco": "#2a2318", rosa: "#a8735b",
        "rosa-claro": "#2e211b", salvia: "#7f8b72", zap: "#2f9e68",
      },
    },
    {
      nome: "Champagne",
      cores: {
        marfim: "#f8f3e9", areia: "#efe6d5", papel: "#fffdf8", linha: "#dfd1b9",
        tinta: "#2a2117", "tinta-suave": "#7a6a55", ouro: "#a98443",
        "ouro-claro": "#c9a96e", "ouro-fraco": "#f0e6d2", rosa: "#b07a5a",
        "rosa-claro": "#f2e2d7", salvia: "#7f8b72", zap: "#1f7a4d",
      },
    },
    {
      nome: "Esmeralda",
      cores: {
        marfim: "#0a100e", areia: "#101a16", papel: "#14201b", linha: "#263a32",
        tinta: "#eef4ed", "tinta-suave": "#a9b8ad", ouro: "#c9a96e",
        "ouro-claro": "#e3c995", "ouro-fraco": "#1c2b24", rosa: "#b07a5a",
        "rosa-claro": "#2a1f1a", salvia: "#8fa88f", zap: "#2f9e68",
      },
    },
  ],
};

const catalogoBoutique = [
  produto("colar-fio-ouro", "Colar fio dourado", "Colares", 329,
    "Corrente veneziana em banho de ouro 18k, 45 cm com extensor.", "Assinatura",
    ["#d8c39a", "#a98a5c"], "colar"),
  produto("brinco-argola", "Brinco argola texturizada", "Brincos", 189,
    "Argola média com textura martelada e fecho de pressão.", "Mais vendido",
    ["#e2d0ae", "#b99a6d"], "brinco"),
  produto("anel-signet", "Anel signet clássico", "Anéis", 279,
    "Aro largo com face oval lisa. Disponível do 14 ao 24.", "",
    ["#d5c3a4", "#a78a62"], "anel"),
  produto("pulseira-elos", "Pulseira de elos", "Pulseiras", 249,
    "Elos ovais com fecho de mosquetão. 18 cm ajustável.", "Novo",
    ["#dfcda9", "#b39568"], "pulseira"),
  produto("perfume-ambar", "Perfume âmbar noir 50 ml", "Fragrâncias", 389,
    "Âmbar, baunilha e madeiras. Fixação de 8 a 10 horas.", "Exclusivo",
    ["#c9b18d", "#8f6f4d"], "perfume"),
  produto("vela-noir", "Vela noir 220 g", "Casa", 159,
    "Cera vegetal, pavio de algodão e essência amadeirada.", "",
    ["#d8c9b2", "#a88f70"], "vela"),
  produto("estojo-joias", "Estojo de joias em veludo", "Acessórios", 129,
    "Estojo compacto com divisórias e fecho magnético.", "",
    ["#c9b8a6", "#9a8069"], "estojo"),
  produto("kit-presente", "Kit presente assinatura", "Kits", 499,
    "Colar, brinco e embalagem de presente em estojo rígido.", "Sob encomenda",
    ["#dcc9a6", "#b08d5f"], "kit"),
];

/* ===================================================================== */
/* build                                                                  */
/* ===================================================================== */

const MODELOS = [
  { id: "vitrine-hml", over: vitrine, catalog: catalogoVitrine, cor: "#4f46e5" },
  { id: "editorial-hml", over: editorial, catalog: catalogoEditorial, cor: "#b4552d" },
  { id: "boutique-hml", over: boutique, catalog: catalogoBoutique, cor: "#c8a96a" },
];

const dados = {};

for (const modelo of MODELOS) {
  const dir = join(TPL_DIR, modelo.id);
  mkdirSync(dir, { recursive: true });

  const cfg = merge(BASE, modelo.over);
  cfg.template = { ...modelo.over.template };
  cfg.rodape.titulo = cfg.geral.nome;
  cfg.visual.logo = "logo.png";

  writeFileSync(join(dir, "config.json"), JSON.stringify(cfg, null, 2) + "\n", "utf8");
  writeFileSync(join(dir, "catalog.json"), JSON.stringify(modelo.catalog, null, 2) + "\n", "utf8");

  const meta = {
    id: modelo.id,
    nome: modelo.over.template.nome,
    descricao: cfg.geral.descricao,
    segmento: modelo.over.template.segmento,
    tema: modelo.id.replace("-hml", ""),
    versao: "1.0-hml",
    status: "homologacao",
    foco: modelo.over.template.foco,
    modulos: cfg.layout.secoes.map((s) => s.id),
  };
  writeFileSync(join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n", "utf8");

  const man = clone(BASE_MANIFEST);
  man.name = cfg.geral.nome;
  man.short_name = cfg.geral.nome;
  man.description = cfg.geral.descricao;
  man.background_color = cfg.visual.cores.marfim;
  man.theme_color = cfg.visual.cores.marfim;
  writeFileSync(join(dir, "manifest.webmanifest"), JSON.stringify(man, null, 2) + "\n", "utf8");

  const tokens = {
    template: modelo.id,
    versao: "1.0-hml",
    cores: cfg.visual.cores,
    tipografia: {
      titulos: cfg.visual.fontes.titulos.nome,
      texto: cfg.visual.fontes.texto.nome,
    },
    forma: { raio: cfg.visual.raio, botoes: cfg.botoes, container: cfg.visual.container },
    modulos: cfg.layout.secoes.map((s) => ({ id: s.id, visivel: s.visivel !== false })),
    presets: cfg.presets.map((p) => p.nome),
  };
  writeFileSync(join(dir, "tokens.json"), JSON.stringify(tokens, null, 2) + "\n", "utf8");

  /* imagens neutras: o lojista troca no painel */
  const srcImg = join(TPL_DIR, "generico", "img");
  const dstImg = join(dir, "img");
  rmSync(dstImg, { recursive: true, force: true });
  cpSync(srcImg, dstImg, { recursive: true });
  if (existsSync(join(srcImg, "logo.png"))) {
    copyFileSync(join(srcImg, "logo.png"), join(dstImg, "logo.png"));
  }

  dados[modelo.id] = { meta, config: cfg, catalog: modelo.catalog };
  console.log(`✓ ${modelo.id}`);
}

const out = `/* Gerado por scripts/build-templates-hml.mjs — não edite à mão. */
window.TEMPLATES_HML = ${JSON.stringify(dados, null, 2)};
`;
writeFileSync(join(ROOT, "js", "templates-hml-data.js"), out, "utf8");
console.log("✓ js/templates-hml-data.js");
