(function(){
"use strict";

const $ = (s,e=document)=>e.querySelector(s);
const $$ = (s,e=document)=>[...e.querySelectorAll(s)];
const esc = s => String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const reais = n => (typeof n==="number" ? n : 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const clone = o => JSON.parse(JSON.stringify(o));
const slugify = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60) || "produto";

const LOJA = (()=>{ try{ return (new URLSearchParams(location.search).get("loja")||"").toLowerCase(); }catch(e){ return ""; } })();
const QLOJA = LOJA ? "?loja="+encodeURIComponent(LOJA) : "";
const painelLink = aba => "admin-completo.html" + (QLOJA ? QLOJA + (aba ? "&aba="+aba : "") : (aba ? "?aba="+aba : ""));
const comLoja = u => String(u||"") + QLOJA;
const DRAFT_KEY = "wixdraft:" + (LOJA || "default");
const SESSAO_KEY = "wixeditor_aberto";

const CORES_INFO = [
  {k:"marfim", r:"Fundo da página"},
  {k:"areia", r:"Fundo suave"},
  {k:"papel", r:"Cartões"},
  {k:"linha", r:"Bordas e divisores"},
  {k:"tinta", r:"Texto principal"},
  {k:"titulo", r:"Títulos"},
  {k:"tinta-suave", r:"Texto secundário"},
  {k:"ouro", r:"Destaque e botões"},
  {k:"ouro-claro", r:"Destaque claro"},
  {k:"ouro-fraco", r:"Fundo de destaque"},
  {k:"rosa", r:"Tom de apoio"},
  {k:"rosa-claro", r:"Tom de apoio claro"},
  {k:"salvia", r:"Tom neutro verde"},
  {k:"zap", r:"WhatsApp"}
];

const FONTS = [
  {nome:"Cormorant Garamond", cat:"Elegante", gf:"Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500", fam:'"Cormorant Garamond",Georgia,serif'},
  {nome:"Playfair Display", cat:"Elegante", gf:"Playfair+Display:wght@400;500;600;700", fam:'"Playfair Display",Georgia,serif'},
  {nome:"Lora", cat:"Elegante", gf:"Lora:ital,wght@0,400;0,500;0,600;1,400", fam:'"Lora",Georgia,serif'},
  {nome:"Libre Baskerville", cat:"Elegante", gf:"Libre+Baskerville:ital,wght@0,400;0,700;1,400", fam:'"Libre Baskerville",Georgia,serif'},
  {nome:"Marcellus", cat:"Elegante", gf:"Marcellus", fam:'"Marcellus",Georgia,serif'},
  {nome:"EB Garamond", cat:"Elegante", gf:"EB+Garamond:ital,wght@0,400;0,500;0,600;1,400", fam:'"EB Garamond",Georgia,serif'},
  {nome:"Inter", cat:"Moderna", gf:"Inter:wght@300;400;500;600;700;800", fam:'"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
  {nome:"Lato", cat:"Moderna", gf:"Lato:wght@300;400;700", fam:'"Lato",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
  {nome:"Montserrat", cat:"Moderna", gf:"Montserrat:wght@300;400;500;600;700", fam:'"Montserrat",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
  {nome:"Poppins", cat:"Moderna", gf:"Poppins:wght@300;400;500;600;700", fam:'"Poppins",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
  {nome:"DM Sans", cat:"Moderna", gf:"DM+Sans:wght@400;500;700", fam:'"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
  {nome:"Nunito Sans", cat:"Moderna", gf:"Nunito+Sans:wght@300;400;600;700", fam:'"Nunito Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
  {nome:"Work Sans", cat:"Moderna", gf:"Work+Sans:wght@300;400;500;600;700", fam:'"Work Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
  {nome:"Raleway", cat:"Moderna", gf:"Raleway:wght@300;400;500;600;700", fam:'"Raleway",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}
];
function fontePorNome(nome){ return FONTS.find(f=>f.nome===nome) || null; }
function linkFonte(f){ return "https://fonts.googleapis.com/css2?family=" + f.gf + "&display=swap"; }

const ICONES = {
  capa:'<path d="M4 4h16v16H4z"/><path d="M4 9h16"/><path d="M9 9v11"/>',
  estrela:'<path d="M12 3l2.4 5.1 5.6.7-4.1 3.9 1.1 5.6L12 15.6 7 18.3l1.1-5.6L4 8.8l5.6-.7z"/>',
  brilho:'<path d="M12 3l1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
  cruz:'<path d="M12 3v18M5 9h14"/>',
  sacola:'<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  caixa:'<path d="M4 8l8-4 8 4-8 4z"/><path d="M4 8v8l8 4 8-4V8"/><path d="M12 12v8"/>',
  coracao:'<path d="M12 20s-7-4.3-7-9.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7 3.4c0 5.3-7 9.6-7 9.6z"/>',
  presente:'<path d="M4 9h16v11H4z"/><path d="M3 9h18M12 9v11"/><path d="M12 9C11 5 6 5 6 8s6 1 6 1z"/><path d="M12 9c1-4 6-4 6-1s-6 1-6 1z"/>',
  livro:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z"/><path d="M16 4v16"/>',
  relogio:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  usuario:'<circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  balao:'<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
  telefone:'<path d="M6 3h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z"/>',
  rodape:'<path d="M4 6h16v12H4z"/><path d="M4 16h16M8 6v10"/>',
  casa:'<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
  globo:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  camera:'<path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>',
  imagem:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M21 17l-5-5-5 5-2-2-6 5"/>',
  tag:'<path d="M3 12l9-9h9v9l-9 9z"/><circle cx="16" cy="8" r="1.5"/>',
  lapis:'<path d="M4 20h4L18 10l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  engrenagem:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  lupa:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-3.5-3.5"/>',
  calendario:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  sino:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  mapa:'<path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  musica:'<path d="M9 18V5l10-2v13"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>',
  sol:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
  lua:'<path d="M20 14a8 8 0 1 1-10-10 7 7 0 0 0 10 10z"/>',
  bandeira:'<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5z"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  dinheiro:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/>'
};
const ICONE_PADRAO = {
  hero:"capa", selos:"estrela", destaques:"brilho", oficio:"cruz", catalogo:"sacola",
  encomenda:"caixa", devocoes:"coracao", ocasioes:"presente", oracao:"livro",
  misterios:"relogio", sobre:"usuario", depoimentos:"balao", final:"telefone", rodape:"rodape"
};
const MENU_CAMPOS = [
  {k:"t", r:"Texto do link", t:"text"},
  {k:"href", r:"Link", t:"text", d:"Use #secao para âncoras (ex.: #catalogo) ou uma URL completa."}
];
const CARRINHO_GRUPOS = [
  {r:"Minha lista", campos:[
    {k:"titulo", r:"Título da lista", t:"text"},
    {k:"resumo_vazio", r:"Resumo quando vazia", t:"text"},
    {k:"vazio_titulo", r:"Título quando vazia", t:"text"},
    {k:"vazio_texto", r:"Texto quando vazia", t:"textarea"}
  ]},
  {r:"Dados do cliente", campos:[
    {k:"obs_rot", r:"Rótulo das observações", t:"text"},
    {k:"obs_placeholder", r:"Exemplo das observações", t:"text"},
    {k:"nome_rot", r:"Rótulo do nome", t:"text"},
    {k:"nome_placeholder", r:"Exemplo do nome", t:"text"},
    {k:"whats_rot", r:"Rótulo do WhatsApp", t:"text"},
    {k:"whats_placeholder", r:"Exemplo do WhatsApp", t:"text"},
    {k:"cep_rot", r:"Rótulo do CEP/cidade", t:"text"},
    {k:"cep_placeholder", r:"Exemplo do CEP/cidade", t:"text"}
  ]},
  {r:"Entrega e pedido", campos:[
    {k:"total_rot", r:"Rótulo do total", t:"text"},
    {k:"botao", r:"Texto do botão", t:"text"},
    {k:"nota", r:"Nota do rodapé", t:"html"},
    {k:"nota_combinar", r:"Aviso de valor a combinar", t:"html"}
  ]},
  {r:"Mensagem no WhatsApp", campos:[
    {k:"msg_modelo", r:"Texto enviado no pedido", t:"textarea", linhas:9,
     d:"Use os marcadores {loja}, {itens}, {total}, {combinar}, {observacao}, {cliente}, {entrega}, {nome}, {whatsapp} e {cep}. Mantenha {itens} e {total} para não perder os dados do pedido. Deixe em branco para usar o texto padrão."}
  ]}
];

const SECOES = [
  {id:"hero", nome:"Capa inicial", desc:"Primeira dobra com título e botões", campos:[
    {k:"midia", r:"Imagem ou vídeo da capa", t:"media", padrao:"video/video-guadalupe.mp4", d:"Envie uma imagem ou um vídeo curto (MP4/WebM). O vídeo toca sem som."},
    {k:"poster", r:"Imagem de capa do vídeo", t:"image", padrao:"img/poster-guadalupe.webp", d:"Aparece enquanto o vídeo carrega. Para usar uma imagem fixa, escolha a imagem no campo acima."},
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html", d:"Aceita <em>, <b> e <br>."},
    {k:"lead", r:"Texto de apoio", t:"html"},
    {k:"cta1", r:"Botão principal", t:"text"},
    {k:"cta2", r:"Botão secundário", t:"text"},
    {k:"nota", r:"Nota de envio", t:"html"},
    {k:"fita1", r:"Selo - linha 1", t:"text"},
    {k:"fita2", r:"Selo - linha 2", t:"text"}
  ]},
  {id:"selos", nome:"Diferenciais", desc:"Faixa de confiança com 4 selos", campos:[], array:"selos", arrayCampos:[
    {k:"icone", r:"Imagem ou ícone", t:"image", d:"Opcional. Vazio usa o ícone padrão da posição."},
    {k:"t", r:"Título", t:"text"},
    {k:"s", r:"Detalhe", t:"text"}
  ]},
  {id:"destaques", nome:"Destaques", desc:"Cartões em evidência", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"}
  ], array:"itens", arrayCampos:[
    {k:"id", r:"Produto (opcional)", t:"produto", d:"Com produto, o botão adiciona à Minha Lista. Sem produto, use o link abaixo."},
    {k:"midia", r:"Imagem ou vídeo", t:"media", d:"Vazio usa a foto ou o vídeo do produto."},
    {k:"titulo", r:"Título", t:"text", d:"Vazio usa o nome do produto."},
    {k:"texto", r:"Texto", t:"html", d:"Vazio usa a descrição do produto."},
    {k:"preco", r:"Preço (texto)", t:"text", d:"Ex.: R$ 59,90. Vazio usa o preço do produto."},
    {k:"preco_nota", r:"Observação do preço", t:"text", d:"Ex.: à vista, promocional."},
    {k:"selo", r:"Selo", t:"text", d:"Ex.: Novo, Quaresma, Pronta entrega."},
    {k:"botao", r:"Texto do botão", t:"text", d:"Vazio usa Adicionar (com produto) ou Ver catálogo."},
    {k:"link", r:"Link do botão (sem produto)", t:"text", d:"Ex.: #catalogo ou uma URL completa."}
  ]},
  {id:"oficio", nome:"O ateliê", desc:"História e materiais", campos:[
    {k:"foto1", r:"Foto principal", t:"media", padrao:"img/detalhe-mao-boreal.webp", d:"Aceita imagem ou vídeo."},
    {k:"foto2", r:"Foto secundária", t:"media", padrao:"img/detalhe-santa-rita.webp", d:"Aceita imagem ou vídeo."},
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"},
    {k:"citacao", r:"Citação", t:"html"},
    {k:"lead", r:"Texto", t:"html"},
    {k:"fe1", r:"Destaque 1", t:"html"},
    {k:"fe2", r:"Destaque 2", t:"html"},
    {k:"fe3", r:"Destaque 3", t:"html"},
    {k:"cta", r:"Botão", t:"text"}
  ]},
  {id:"catalogo", nome:"Catálogo", desc:"Vitrine com busca e filtros", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"},
    {k:"lead", r:"Texto de apoio", t:"html"},
    {k:"busca_placeholder", r:"Exemplo da busca", t:"text"},
    {k:"prazo", r:"Aviso de prazo", t:"html"},
    {k:"nota", r:"Nota final", t:"html"}
  ]},
  {id:"encomenda", nome:"Sob encomenda", desc:"Passo a passo do pedido", campos:[
    {k:"midia", r:"Imagem ou vídeo da seção", t:"media", padrao:"video/video-esmeralda.mp4", d:"Aceita imagem ou vídeo curto (MP4/WebM)."},
    {k:"poster", r:"Imagem de capa do vídeo", t:"image", padrao:"img/poster-esmeralda.webp", d:"Aparece enquanto o vídeo carrega."},
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"},
    {k:"lead", r:"Texto", t:"html"},
    {k:"botao", r:"Botão", t:"text"}
  ], array:"passos", arrayCampos:[
    {k:"t", r:"Passo - título", t:"text"},
    {k:"s", r:"Passo - detalhe", t:"html"}
  ]},
  {id:"devocoes", nome:"Devoções", desc:"Coleções e santos atendidos", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"},
    {k:"lead", r:"Texto", t:"html"}
  ], array:"itens", arrayCampos:[{k:"t", r:"Devoção / coleção", t:"text"}]},
  {id:"ocasioes", nome:"Ocasiões", desc:"Cartões de data especial", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"}
  ], array:"itens", arrayCampos:[
    {k:"img", r:"Foto ou vídeo", t:"media"},
    {k:"titulo", r:"Título", t:"text"},
    {k:"sub", r:"Subtítulo", t:"text"}
  ]},
  {id:"oracao", nome:"Frase de destaque", desc:"Citação entre seções", campos:[
    {k:"texto", r:"Texto", t:"html"},
    {k:"autor", r:"Assinatura", t:"text"}
  ]},
  {id:"misterios", nome:"Como rezar", desc:"Cartões por dia da semana", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"},
    {k:"lead", r:"Texto", t:"html"}
  ], array:"itens", arrayCampos:[
    {k:"dia", r:"Dias", t:"text"},
    {k:"titulo", r:"Título", t:"text"},
    {k:"texto", r:"Texto", t:"html"}
  ]},
  {id:"sobre", nome:"A história", desc:"Origem da marca e números", campos:[
    {k:"foto1", r:"Foto principal", t:"media", padrao:"img/encomendas-do-dia.webp", d:"Aceita imagem ou vídeo."},
    {k:"foto2", r:"Foto secundária", t:"media", padrao:"img/embalagem-presente.webp", d:"Aceita imagem ou vídeo."},
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"},
    {k:"p1", r:"Parágrafo 1", t:"html"},
    {k:"p2", r:"Parágrafo 2", t:"html"},
    {k:"p3", r:"Parágrafo 3", t:"html"},
    {k:"cta", r:"Botão", t:"text"}
  ], array:"numeros", arrayCampos:[
    {k:"v", r:"Número", t:"text"},
    {k:"s", r:"Legenda", t:"text"}
  ]},
  {id:"depoimentos", nome:"Avaliações", desc:"Provas sociais de clientes", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"},
    {k:"lead", r:"Texto", t:"html"}
  ], array:"lista", arrayCampos:[
    {k:"texto", r:"Depoimento", t:"html"},
    {k:"nome", r:"Nome", t:"text"},
    {k:"contexto", r:"Contexto", t:"text"}
  ], array2:"faixa", array2Campos:[
    {k:"t", r:"Número", t:"text"},
    {k:"s", r:"Legenda", t:"text"}
  ]},
  {id:"final", nome:"Convite final", desc:"Chamada para o WhatsApp", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"},
    {k:"lead", r:"Texto", t:"html"},
    {k:"cta1", r:"Botão principal", t:"text"},
    {k:"cta2", r:"Botão secundário", t:"text"}
  ]},
  {id:"rodape", nome:"Rodapé", desc:"Contatos e links do pé da página", campos:[
    {k:"titulo", r:"Título", t:"text"},
    {k:"sobre", r:"Sobre a loja", t:"html"},
    {k:"cat_titulo", r:"Coluna catálogo", t:"text"},
    {k:"como_titulo", r:"Coluna como comprar", t:"text"},
    {k:"nota_base", r:"Nota final", t:"html"}
  ]}
];

const state = {
  cfg:null, produtos:[], imagens:[], midias:[], temas:[], demo:false,
  selected:"hero", panel:"paginas", inspTab:"conteudo",
  device:"desktop", zoom:100, dirty:false, framePronto:false,
  history:[], redo:[], ultimoHist:0
};

function secoesLayout(){
  const l = state.cfg && state.cfg.layout;
  const atual = (l && Array.isArray(l.secoes)) ? l.secoes.filter(s=>s&&s.id) : [];
  const ids = atual.map(s=>s.id);
  SECOES.forEach(s=>{ if(!ids.includes(s.id)) atual.push({id:s.id, visivel:true}); });
  return atual.filter(s=>SECOES.some(x=>x.id===s.id));
}
function salvarLayout(lista){ state.cfg.layout = {secoes: lista.map(s=>({id:s.id, visivel:s.visivel!==false, icone:s.icone||""}))}; }

function getPath(o,p){
  let v = o;
  for(const s of String(p).split(".")){ v = (v==null ? undefined : v[s]); }
  return v;
}
function setPath(o,p,val){
  const partes = String(p).split(".");
  let v = o;
  for(let i=0;i<partes.length-1;i++){
    const s = partes[i];
    if(v[s]==null || typeof v[s]!=="object") v[s] = {};
    v = v[s];
  }
  v[partes[partes.length-1]] = val;
}
function sincronizarDestaques(){
  if(!state.cfg) return;
  const d = state.cfg.destaques || (state.cfg.destaques = {});
  const itens = Array.isArray(d.itens) ? d.itens : [];
  d.ids = itens.map(it=>String((it && it.id) || "").trim()).filter(Boolean);
}
function texto(chave, padrao){
  const v = getPath(state.cfg, chave);
  return (v===undefined || v===null) ? padrao : v;
}

async function api(caminho, opcoes){
  const url = comLoja(caminho);
  const headers = {};
  const tok = sessionStorage.getItem("tok");
  if(tok) headers["Authorization"] = "Bearer " + tok;
  const cfg = Object.assign({}, opcoes);
  if(cfg.body && !(cfg.body instanceof FormData)){
    headers["Content-Type"] = "application/json";
    if(typeof cfg.body !== "string") cfg.body = JSON.stringify(cfg.body);
  }
  cfg.headers = Object.assign(headers, cfg.headers||{});
  const r = await fetch(url, cfg);
  if(!r.ok){
    const j = await r.json().catch(()=>({}));
    const err = new Error(j.erro || ("Erro " + r.status));
    err.status = r.status;
    throw err;
  }
  return r.json().catch(()=>({}));
}

let toastTimer = null;
function toast(msg, erro){
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  t.classList.toggle("err", !!erro);
  t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ t.classList.remove("on"); setTimeout(()=>{ t.hidden = true; }, 220); }, 3000);
}

function iconeAtual(id){
  const item = secoesLayout().find(s=>s.id===id);
  return (item && item.icone) || ICONE_PADRAO[id] || "sacola";
}
function iconeSecao(id){
  const p = ICONES[iconeAtual(id)] || ICONES.sacola;
  return '<svg viewBox="0 0 24 24">' + p + '</svg>';
}
function setIcone(id, k){
  if(!ICONES[k]) return;
  const layout = secoesLayout();
  const it = layout.find(s=>s.id===id);
  if(!it) return;
  registrarHistorico(true);
  it.icone = k;
  salvarLayout(layout);
  marcarSujo();
  renderPanel();
  renderInspector();
}
function miniIcone(p){
  return '<svg viewBox="0 0 24 24">' + p + '</svg>';
}
const MINI = {
  grip:'<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>',
  eye:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>',
  eyeOff:'<path d="M3 3l18 18"/><path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.7"/><path d="M6.4 8.2A16.8 16.8 0 0 0 2 12s3.5 6 10 6a9.9 9.9 0 0 0 4-.8"/>',
  up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
  down:'<path d="M12 5v14M6 13l6 6 6-6"/>',
  trash:'<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  edit:'<path d="M4 20h4L18 10l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-3.5-3.5"/>',
  check:'<path d="M5 12l5 5L19 7"/>',
  drag:'<path d="M4 8h16M4 16h16"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>'
};

function pintarSaveEstado(modo){
  const el = $("#saveState");
  if(!el) return;
  el.classList.toggle("dirty", modo === "dirty");
  el.classList.toggle("saving", modo === "saving");
  el.innerHTML = "<i></i> " + (modo === "ok" ? "Tudo salvo" : modo === "dirty" ? "Alterações não salvas" : "Salvando…");
}

function montarConfigBase(cfg){
  const c = (cfg && typeof cfg === "object") ? clone(cfg) : {};
  if(!c.geral || typeof c.geral !== "object") c.geral = {};
  if(!c.visual || typeof c.visual !== "object") c.visual = {};
  if(!c.visual.cores || typeof c.visual.cores !== "object") c.visual.cores = {};
  if(!c.visual.fontes || typeof c.visual.fontes !== "object") c.visual.fontes = {};
  if(!c.destaques || typeof c.destaques !== "object") c.destaques = {};
  if(!Array.isArray(c.destaques.itens)){
    c.destaques.itens = (Array.isArray(c.destaques.ids) ? c.destaques.ids : []).map(id=>({id:String(id)}));
  }
  if(!c.layout || !Array.isArray(c.layout.secoes)) c.layout = {secoes:[]};
  c.layout.secoes = SECOES.map(s=>{
    const achado = (c.layout.secoes||[]).find(x=>x && x.id === s.id);
    return {id:s.id, visivel: achado ? achado.visivel !== false : true, icone: (achado && ICONES[achado.icone]) ? achado.icone : ""};
  });
  return c;
}

function imagensDeProdutos(prods){
  const set = new Set(["logo.webp","logo-retangular.webp","placeholder.png"]);
  (prods||[]).forEach(p=>{ if(p && p.foto) set.add(String(p.foto).split("/").pop()); });
  if(state.cfg && state.cfg.visual && state.cfg.visual.logo) set.add(String(state.cfg.visual.logo).split("/").pop());
  return [...set];
}

function chaveDraft(){ return state.demo ? ("wixdemo:" + (LOJA || "default")) : DRAFT_KEY; }
function salvarLocal(salvo){
  try{
    localStorage.setItem(chaveDraft(), JSON.stringify({cfg:state.cfg, produtos:state.produtos, salvo: salvo !== false}));
  }catch(e){}
}
function lerDraft(){
  try{
    const raw = localStorage.getItem(chaveDraft());
    if(!raw) return null;
    const d = JSON.parse(raw);
    return (d && typeof d === "object") ? d : null;
  }catch(e){ return null; }
}
function limparDraft(){ try{ localStorage.removeItem(chaveDraft()); }catch(e){} }

async function carregarTemas(){
  try{
    const r = await api("/api/temas");
    state.temas = (r && r.temas) || [];
  }catch(e){ state.temas = []; }
}

async function carregarTenant(){
  try{
    const t = await api("/api/tenant");
    const nome = (t && t.nome) || "Minha loja";
    $("#loginLoja").textContent = nome;
    document.title = "Editor visual · " + nome;
    $("#lojaNome").textContent = nome;
    const c = await fetch(comLoja("config.json")).then(r=>r.ok?r.json():null).catch(()=>null);
    const nomeCfg = c && c.geral && c.geral.nome;
    if(nomeCfg){
      $("#loginLoja").textContent = nomeCfg;
      document.title = "Editor visual · " + nomeCfg;
      $("#lojaNome").textContent = nomeCfg;
    }
    const logo = c && c.visual && c.visual.logo;
    $("#loginLogo").src = logo ? fotoSrc(logo) : comLoja("img/logo.webp");
  }catch(e){}
}

async function carregarDados(){
  const [cfg, prods, imgs, midias, temas] = await Promise.all([
    api("/api/admin/config").catch(()=>null),
    api("/api/admin/produtos").catch(()=>[]),
    api("/api/admin/imagens").catch(()=>[]),
    api("/api/admin/midias").catch(()=>null),
    api("/api/temas").catch(()=>({temas:[]}))
  ]);
  state.demo = false;
  state.cfg = montarConfigBase(cfg);
  state.produtos = Array.isArray(prods) ? prods : [];
  state.imagens = Array.isArray(imgs) ? imgs : [];
  state.midias = (midias && Array.isArray(midias.itens)) ? midias.itens : state.imagens.map(f=>({tipo:"imagem",url:f,arquivo:f}));
  state.temas = (temas && temas.temas) || [];
  abrirEditor();
}

async function entrarReal(senha){
  const btn = $("#btnEntrar");
  const erro = $("#erroLogin");
  btn.disabled = true;
  try{
    const j = await api("/api/login", {method:"POST", body:{senha}});
    sessionStorage.setItem("tok", j.token);
    await carregarDados();
  }catch(e){
    erro.hidden = false;
    erro.textContent = e.status === 429 ? "Muitas tentativas. Aguarde um minuto." : "Senha incorreta.";
  }finally{
    btn.disabled = false;
  }
}

async function tentarEntrar(){
  if(!sessionStorage.getItem("tok")) return;
  try{
    await carregarDados();
  }catch(e){
    sessionStorage.removeItem("tok");
  }
}

function abrirEditor(){
  $("#login").hidden = true;
  $("#app").hidden = false;
  const nome = texto("geral.nome", $("#loginLoja").textContent || "Minha loja");
  $("#lojaNome").textContent = nome;
  document.title = "Editor visual · " + nome;
  $("#viewSite").href = "/" + QLOJA;
  const d = lerDraft();
  if(d && d.cfg){
    state.cfg = montarConfigBase(d.cfg);
    if(state.demo && Array.isArray(d.produtos)) state.produtos = d.produtos;
    state.dirty = !d.salvo;
    const nomeDraft = texto("geral.nome", "");
    if(nomeDraft){ $("#lojaNome").textContent = nomeDraft; document.title = "Editor visual · " + nomeDraft; }
  }
  if(state.demo){
    $("#canvasHint").textContent = "Demonstração: as alterações ficam apenas neste navegador";
  }
  pintarSaveEstado(state.dirty ? "dirty" : "ok");
  renderPanel();
  renderInspector();
  aplicarSelecao();
  carregarPreview();
}

function elementoSecao(id){
  const doc = $("#preview").contentDocument;
  if(!doc) return null;
  switch(id){
    case "hero": return doc.querySelector("section.hero");
    case "selos": return doc.querySelector(".selos");
    case "destaques": return doc.querySelector("section.destaques");
    case "oficio": return doc.querySelector("section.oficio");
    case "catalogo": return doc.querySelector("#catalogo");
    case "encomenda": return doc.querySelector("#encomenda");
    case "devocoes": { const e = doc.querySelector(".devocoes"); return e ? e.closest("section") : null; }
    case "ocasioes": return doc.querySelector("#ocasioes");
    case "oracao": return doc.querySelector(".oracao");
    case "misterios": return doc.querySelector("#terco");
    case "sobre": return doc.querySelector("#sobre");
    case "depoimentos": return doc.querySelector("#depoimentos");
    case "final": return doc.querySelector(".final");
    case "rodape": return doc.querySelector("footer");
    case "menu": return doc.querySelector("header");
    default: return null;
  }
}

function carregarPreview(){
  window.__editorPreview = {config: state.cfg, produtos: state.produtos};
  const f = $("#preview");
  f.onload = ()=>prepararFrame();
  f.src = "/" + (QLOJA ? QLOJA + "&editor=1" : "?editor=1");
}

function injetarEstiloFrame(doc){
  if(doc.getElementById("ed-estilo")) return;
  const st = doc.createElement("style");
  st.id = "ed-estilo";
  st.textContent = [
    '[data-oculta="1"]{display:none!important}',
    '[data-editor-sec]{position:relative}',
    '[data-editor-sec]:hover{outline:2px dashed #116dff!important;outline-offset:-2px!important;cursor:pointer!important}',
    '[data-editor-sec].ed-sel{outline:2px solid #116dff!important;outline-offset:-2px!important}',
    '[data-editor-sec]>.ed-label{position:absolute!important;left:8px!important;top:8px!important;right:auto!important;bottom:auto!important;width:auto!important;height:auto!important;margin:0!important;z-index:2147483000!important;background:#116dff!important;color:#fff!important;font:600 11px/1 Inter,system-ui,sans-serif!important;padding:5px 7px!important;border:0!important;border-radius:5px!important;pointer-events:none!important;box-shadow:0 3px 10px rgba(17,109,255,.28)!important;transform:none!important;clip-path:none!important;opacity:1!important;visibility:visible!important}'
  ].join("\n");
  (doc.head || doc.documentElement).appendChild(st);
}

function marcarSecoes(){
  const doc = $("#preview").contentDocument;
  if(!doc) return;
  injetarEstiloFrame(doc);
  SECOES.forEach(s=>{
    const el = elementoSecao(s.id);
    if(!el) return;
    el.setAttribute("data-editor-sec", s.id);
    el.setAttribute("data-editor-label", s.nome);
  });
}

function prepararFrame(){
  state.framePronto = true;
  const doc = $("#preview").contentDocument;
  if(!doc) return;
  marcarSecoes();
  if(!doc.__edBind){
    doc.__edBind = true;
    doc.addEventListener("click", e=>{
      const alvo = e.target.closest && e.target.closest("[data-editor-sec]");
      if(alvo){
        e.preventDefault();
        e.stopPropagation();
        selecionar(alvo.getAttribute("data-editor-sec"), false);
        return;
      }
      if(e.target.closest && e.target.closest("a,button")){ e.preventDefault(); }
    }, true);
    doc.addEventListener("mouseover", e=>{
      const alvo = e.target.closest && e.target.closest("[data-editor-sec]");
      if(alvo) alvo.classList.add("preview-hover");
    });
    doc.addEventListener("mouseout", e=>{
      const alvo = e.target.closest && e.target.closest("[data-editor-sec]");
      if(alvo) alvo.classList.remove("preview-hover");
    });
  }
  aplicarSelecao();
  atualizarPreview();
}

function aplicarSelecao(){
  const doc = $("#preview").contentDocument;
  if(!doc) return;
  $$("[data-editor-sec].ed-sel", doc).forEach(el=>el.classList.remove("ed-sel"));
  $$(".ed-label", doc).forEach(n=>n.remove());
  const el = elementoSecao(state.selected);
  if(!el) return;
  el.classList.add("ed-sel");
  const lab = doc.createElement("span");
  lab.className = "ed-label";
  lab.textContent = nomeSecao(state.selected);
  el.appendChild(lab);
}

function atualizarPreview(){
  if(!state.framePronto) return;
  window.__editorPreview = {config: state.cfg, produtos: state.produtos};
  const w = $("#preview").contentWindow;
  if(w && typeof w.__editorApply === "function"){
    try{ w.__editorApply(state.cfg, state.produtos); }catch(e){}
  }
  marcarSecoes();
  aplicarSelecao();
}

function nomeSecao(id){
  if(id === "menu") return "Menu do topo";
  if(id === "carrinho") return "Minha Lista";
  const s = SECOES.find(x=>x.id===id);
  return s ? s.nome : id;
}

function abrirPainel(){
  const p = $("#panel");
  if(!p) return;
  p.classList.remove("oculto");
  if(window.innerWidth <= 980) p.classList.add("open");
}

function fecharPainel(){
  const p = $("#panel");
  if(!p) return;
  if(window.innerWidth <= 980) p.classList.remove("open");
  else p.classList.add("oculto");
}

function alternarPainel(){
  const p = $("#panel");
  if(!p) return;
  if(window.innerWidth <= 980) (p.classList.contains("open") ? fecharPainel() : abrirPainel());
  else (p.classList.contains("oculto") ? abrirPainel() : fecharPainel());
}

function selecionar(id, rolar){
  state.selected = id;
  $$(".section-list li").forEach(li=>li.classList.toggle("on", li.dataset.sec===id));
  const mc = $(".menu-card");
  if(mc) mc.classList.toggle("on", id === "menu");
  const cc = $(".cart-card");
  if(cc) cc.classList.toggle("on", id === "carrinho");
  const w = $("#preview").contentWindow;
  try{
    if(id === "carrinho" && w && typeof w.__editorAbrirCarrinho === "function") w.__editorAbrirCarrinho();
    else if(id !== "carrinho" && w && typeof w.__editorFecharCarrinho === "function") w.__editorFecharCarrinho();
  }catch(e){}
  aplicarSelecao();
  renderInspector();
  $("#inspector").hidden = false;
  $("#canvasHint").textContent = nomeSecao(id) + " — edite os campos à direita";
  if(rolar !== false){
    const el = elementoSecao(id);
    if(el && el.scrollIntoView) { try{ el.scrollIntoView({block:"start"}); }catch(e){} }
  }
}

function marcarSujo(){
  state.dirty = true;
  pintarSaveEstado("dirty");
  salvarLocal(false);
}

async function salvar(silencioso){
  if(state.demo){
    sincronizarDestaques();
    salvarLocal(true);
    state.dirty = false;
    pintarSaveEstado("ok");
    if(!silencioso) toast("Alterações guardadas neste navegador (modo demonstração).");
    return true;
  }
  pintarSaveEstado("saving");
  try{
    sincronizarDestaques();
    await api("/api/admin/config", {method:"PUT", body: state.cfg});
    limparDraft();
    state.dirty = false;
    pintarSaveEstado("ok");
    if(!silencioso) toast("Alterações salvas na loja.");
    return true;
  }catch(e){
    pintarSaveEstado("dirty");
    toast("Não foi possível salvar: " + e.message, true);
    return false;
  }
}

async function publicar(){
  const ok = await salvar(true);
  if(!ok) return;
  toast("Publicado! A prévia foi atualizada.");
  const f = $("#preview");
  window.__editorPreview = {config: state.cfg, produtos: state.produtos};
  try{ f.contentWindow.location.reload(); }catch(e){ f.src = f.src; }
}

function sairEditor(){
  const tok = sessionStorage.getItem("tok");
  if(tok) fetch(comLoja("/api/logout"), {method:"POST", headers:{"Authorization":"Bearer "+tok}}).catch(()=>{});
  sessionStorage.removeItem("tok");
  sessionStorage.removeItem(SESSAO_KEY);
  location.reload();
}

function temExt(f){ return /\.(webp|png|jpe?g|svg)$/i.test(String(f||"")); }
function baseFoto(f){ return temExt(f) ? String(f).split("/").pop() : String(f||"").split("/").pop(); }
function fotoSrc(f){
  let b = String(f||"placeholder.png").trim() || "placeholder.png";
  if(/^(https?:)?\/\//i.test(b) || /^(data|blob):/i.test(b)) return b;
  b = b.replace(/^\/+/, "").replace(/^img\//i, "");
  return comLoja("img/" + (temExt(b) ? b : b + ".webp"));
}

function midiaTipo(v){
  const m = String(v||"").split(/[?#]/)[0].toLowerCase().match(/\.([a-z0-9]+)$/);
  return m && ["mp4","webm","ogv","ogg","mov","m4v"].includes(m[1]) ? "video" : "imagem";
}
function midiaArquivo(v){
  return String(v||"").split(/[?#]/)[0].split("/").pop() || "";
}
function normalizarMidia(v){
  let s = String(v||"").trim();
  if(!s) return "";
  if(/^(https?:)?\/\//i.test(s) || /^(data|blob):/i.test(s)) return s;
  s = s.replace(/^\/+/, "");
  return /^(img|video)\//.test(s) ? s : "img/" + s;
}
function midiaSrc(v){
  const s = normalizarMidia(v);
  if(!s || /^(https?:)?\/\//i.test(s) || /^(data|blob):/i.test(s)) return s;
  return comLoja(s);
}
function midiasDisponiveis(){
  const lista = [];
  const vistos = new Set();
  const add = (url, tipo) => {
    const u = normalizarMidia(url);
    if(!u || vistos.has(u)) return;
    vistos.add(u);
    lista.push({url:u, arquivo:midiaArquivo(u), tipo:tipo || midiaTipo(u)});
  };
  (state.midias || []).forEach(m=>{
    if(typeof m === "string") add(m, midiaTipo(m));
    else if(m && (m.url || m.arquivo)) add(m.url || m.arquivo, m.tipo || midiaTipo(m.url || m.arquivo));
  });
  (state.imagens || []).forEach(f=>add(f, "imagem"));
  add("placeholder.png", "imagem");
  return lista;
}
function opcoesMidias(valor, padrao, soImagem){
  const atual = normalizarMidia(valor);
  const def = normalizarMidia(padrao);
  const lista = midiasDisponiveis().filter(m=>!soImagem || m.tipo !== "video");
  if(atual && !lista.some(m=>m.url===atual)) lista.unshift({url:atual, arquivo:midiaArquivo(atual), tipo:midiaTipo(atual)});
  if(def && !lista.some(m=>m.url===def)) lista.unshift({url:def, arquivo:midiaArquivo(def), tipo:midiaTipo(def)});
  const imagens = lista.filter(m=>m.tipo !== "video");
  const videos = lista.filter(m=>m.tipo === "video");
  const opt = m => `<option value="${esc(m.url)}"${m.url===atual?" selected":""}>${esc(m.arquivo)}${m.url===def?" (padrão)":""}</option>`;
  const rotulo = atual ? "Manter a atual" : (def ? "Padrão atual — " + midiaArquivo(def) : "Escolha uma mídia");
  return `<option value="">${esc(rotulo)}</option>` +
    (imagens.length ? `<optgroup label="Imagens">${imagens.map(opt).join("")}</optgroup>` : "") +
    (videos.length ? `<optgroup label="Vídeos">${videos.map(opt).join("")}</optgroup>` : "");
}
function midiaPreview(v){
  if(!v) return `<div class="media-vazio">Sem mídia</div>`;
  const src = esc(midiaSrc(v));
  return midiaTipo(v) === "video"
    ? `<video src="${src}" muted loop playsinline preload="metadata"></video>`
    : `<img src="${src}" alt="" loading="lazy">`;
}

function opcoesImagens(valor, vazio){
  const base = baseFoto(valor);
  const lista = [...new Set([...(state.imagens||[]).map(x=>String(x).split("/").pop()), "placeholder.png"])].sort();
  const tem = lista.some(x=>x===base);
  return `<option value="">${esc(vazio || "Manter a atual")}</option>` +
    (base && !tem ? `<option value="${esc(base)}" selected>${esc(base)} (atual)</option>` : "") +
    lista.map(f=>`<option value="${esc(f)}"${f===base?" selected":""}>${esc(f)}</option>`).join("");
}

function campoHtml(campo, path, valor){
  let inp = "";
  const v = (valor===undefined || valor===null) ? "" : valor;
  if(campo.t==="html" || campo.t==="textarea"){
    inp = `<textarea data-path="${esc(path)}" rows="${campo.linhas || (campo.t==="html"?4:3)}">${esc(v)}</textarea>`;
  } else if(campo.t==="select"){
    inp = `<select data-path="${esc(path)}">${(campo.op||[]).map(o=>`<option value="${esc(o.v)}"${String(v)===String(o.v)?" selected":""}>${esc(o.r)}</option>`).join("")}</select>`;
  } else if(campo.t==="check"){
    inp = `<label class="toggle-row"><span><b>${esc(campo.r)}</b>${campo.d?`<span>${esc(campo.d)}</span>`:""}</span><span class="switch"><input type="checkbox" data-path="${esc(path)}"${v===true||v==="true"?" checked":""}><i></i></span></label>`;
    return `<div class="fld full" style="margin-bottom:9px">${inp}</div>`;
  } else if(campo.t==="number"){
    inp = `<input data-path="${esc(path)}" data-num="1" inputmode="numeric" value="${esc(v)}">`;
  } else if(campo.t==="produto"){
    const atual = String(v||"");
    const prods = (state.produtos||[]).slice();
    const opts = prods.map(p=>`<option value="${esc(p.id)}"${p.id===atual?" selected":""}>${esc(p.nome)}</option>`).join("");
    const extra = atual && !prods.some(p=>p.id===atual) ? `<option value="${esc(atual)}" selected>${esc(atual)} (fora do catálogo)</option>` : "";
    inp = `<select data-path="${esc(path)}"><option value="">Sem produto (card editorial)</option>${extra}${opts}</select>`;
  } else if(campo.t==="image" || campo.t==="media"){
    const efetivo = v || campo.padrao || "";
    const soImagem = campo.t === "image";
    const accept = soImagem ? "image/webp,image/png,image/jpeg" : "image/webp,image/png,image/jpeg,video/mp4,video/webm";
    const upload = state.demo ? "" : `<label class="upload">${miniIcone(MINI.upload)} Enviar ${soImagem?"imagem":"imagem ou vídeo"}<input type="file" accept="${accept}" data-upload-midia="${esc(path)}" data-upload-tipo="${soImagem?"imagem":"midia"}"></label>`;
    inp = `<div class="media-field" data-media-field><div class="media-preview">${midiaPreview(efetivo)}</div><div class="media-controls"><select data-path="${esc(path)}" data-padrao="${esc(campo.padrao||"")}">${opcoesMidias(v, campo.padrao, soImagem)}</select>${upload}</div></div>`;
  } else {
    inp = `<input data-path="${esc(path)}" value="${esc(v)}">`;
  }
  return `<div class="fld ${campo.t==="html"||campo.t==="image"||campo.t==="media"?"full":""}"><label>${esc(campo.r)}</label>${inp}${campo.d?`<p class="hint">${campo.d}</p>`:""}</div>`;
}

function caminhoArray(sec){ return sec.id === "selos" ? "selos" : sec.id + "." + sec.array; }
function caminhoArray2(sec){ return sec.id + "." + sec.array2; }

function listaArray(secao, nome, campos, rotulo, extra){
  const arr = getPath(state.cfg, nome) || [];
  const itens = Array.isArray(arr) && arr.length ? arr : [];
  const linhas = itens.map((it,i)=>{
    const base = nome + "." + i;
    const titulo = it && (it.t || it.titulo || it.nome || it.dia || it.v) ? (it.t || it.titulo || it.nome || it.dia || it.v) : (rotulo + " " + (i+1));
    return `<div class="array-item" data-linha data-arr="${esc(nome)}">
      <div class="array-item-head">
        <b>${esc(titulo)}</b>
        <button type="button" data-act="arr-subir" data-arr="${esc(nome)}" data-i="${i}" title="Mover para cima"${i===0?" disabled":""}>${miniIcone(MINI.up)}</button>
        <button type="button" data-act="arr-descer" data-arr="${esc(nome)}" data-i="${i}" title="Mover para baixo"${i===itens.length-1?" disabled":""}>${miniIcone(MINI.down)}</button>
        <button type="button" class="danger" data-act="arr-remover" data-arr="${esc(nome)}" data-i="${i}" title="Remover">${miniIcone(MINI.trash)}</button>
      </div>
      <div class="array-item-body">${campos.map(c=>campoHtml(c, base + "." + c.k, getPath(state.cfg, base + "." + c.k))).join("")}</div>
    </div>`;
  }).join("");
  return `<div class="insp-group"><h4>${esc(rotulo)}</h4><div class="array-list">${linhas || '<p class="empty-insp">Nenhum item ainda.</p>'}</div>
    <button type="button" class="add-row" data-act="arr-add" data-arr="${esc(nome)}">${miniIcone(MINI.plus)} Adicionar item</button>${extra||""}</div>`;
}

function inspetorMenu(){
  return `<div class="insp-head">
      <span class="ic">${miniIcone(ICONES.menu)}</span>
      <span class="meta"><b>Menu do topo</b><span>Links do cabeçalho do site</span></span>
      <button class="icon-btn" data-act="fechar-insp" title="Fechar">${miniIcone(MINI.close)}</button>
    </div>
    <div class="insp-body">
      ${listaArray(null, "menu", MENU_CAMPOS, "Links do menu")}
      <p class="panel-note">A lixeira remove o link e as setas mudam a ordem. O menu mobile usa os mesmos links.</p>
    </div>`;
}

function inspetorCarrinho(){
  const corpo = CARRINHO_GRUPOS.map(g=>`<div class="insp-group"><h4>${esc(g.r)}</h4>${g.campos.map(c=>campoHtml(c, "carrinho." + c.k, getPath(state.cfg, "carrinho." + c.k))).join("")}</div>`).join("");
  return `<div class="insp-head">
      <span class="ic">${miniIcone(ICONES.sacola)}</span>
      <span class="meta"><b>Minha Lista</b><span>Sacola, dados do cliente e botão do WhatsApp</span></span>
      <button class="icon-btn" data-act="ver-carrinho" title="Ver prévia da lista">${miniIcone(MINI.eye)}</button>
      <button class="icon-btn" data-act="fechar-insp" title="Fechar">${miniIcone(MINI.close)}</button>
    </div>
    <div class="insp-body">
      ${corpo}
      <p class="panel-note">As alterações aparecem na sacola do site assim que você abre a lista.</p>
    </div>`;
}

function renderInspector(){
  const insp = $("#inspector");
  if(!insp) return;
  if(state.selected === "menu"){ insp.innerHTML = inspetorMenu(); return; }
  if(state.selected === "carrinho"){ insp.innerHTML = inspetorCarrinho(); return; }
  const sec = SECOES.find(x=>x.id===state.selected) || SECOES[0];
  const layout = secoesLayout();
  const item = layout.find(s=>s.id===sec.id);
  const visivel = item ? item.visivel !== false : true;
  const temArray = !!(sec.array || sec.array2);
  const corpo = [];
  corpo.push(`<div class="insp-body">`);
  if(sec.campos && sec.campos.length){
    corpo.push(`<div class="insp-group"><h4>Textos</h4>${sec.campos.map(c=>campoHtml(c, sec.id + "." + c.k, getPath(state.cfg, sec.id + "." + c.k))).join("")}</div>`);
  }
  if(sec.array) corpo.push(listaArray(sec, caminhoArray(sec), sec.arrayCampos || [], sec.array === "selos" ? "Selos" : (sec.id === "destaques" ? "Destaques" : "Itens")));
  if(sec.array2) corpo.push(listaArray(sec, caminhoArray2(sec), sec.array2Campos || [], "Faixa de números"));
  corpo.push(`</div>`);
  insp.innerHTML = `
    <div class="insp-head">
      <span class="ic">${iconeSecao(sec.id)}</span>
      <span class="meta"><b>${esc(sec.nome)}</b><span>${esc(sec.desc)}</span></span>
      <button class="icon-btn" data-act="fechar-insp" title="Fechar">${miniIcone(MINI.close)}</button>
    </div>
    <div class="insp-tabs">
      <button class="${state.inspTab==="conteudo"?"on":""}" data-act="insp-tab" data-tab="conteudo">Conteúdo</button>
      <button class="${state.inspTab==="ajustes"?"on":""}" data-act="insp-tab" data-tab="ajustes">Layout</button>
    </div>
    ${state.inspTab==="ajustes" ? `
      <div class="insp-body">
        <div class="insp-group"><h4>Posição e visibilidade</h4>
          <label class="toggle-row"><span><b>Mostrar esta seção</b><span>Desative para ocultar sem apagar o conteúdo.</span></span><span class="switch"><input type="checkbox" data-act="vis-sec" data-sec="${sec.id}"${visivel?" checked":""}><i></i></span></label>
          <div class="adv-item">
            <span><b>Ordem na página</b><span>Use as setas ou arraste na aba Páginas.</span></span>
            <span style="display:flex;gap:4px">
              <button class="icon-btn" data-act="subir" data-sec="${sec.id}" title="Mover para cima">${miniIcone(MINI.up)}</button>
              <button class="icon-btn" data-act="descer" data-sec="${sec.id}" title="Mover para baixo">${miniIcone(MINI.down)}</button>
            </span>
          </div>
        </div>
        <div class="insp-group"><h4>Identificação</h4>
          <div class="adv-item"><span><b>ID da seção</b><span>${esc(sec.id)}</span></span></div>
          <div class="adv-item"><span><b>Estado</b><span>${visivel?"Visível na prévia":"Oculta na prévia"}</span></span></div>
        </div>
      </div>` : corpo.join("")}
  `;
}

function renderPanel(){
  const panel = $("#panel");
  if(!panel) return;
  panel.innerHTML = panelConteudo();
  if(state.panel === "catalogo") renderListaProdutos("");
}

function panelConteudo(){
  const m = {
    paginas:{h:"Páginas", p:"Escolha uma seção, reordene e oculte o que não quiser."},
    design:{h:"Design", p:"Tema, cores, fontes e logo da loja."},
    catalogo:{h:"Catálogo", p: state.demo ? "Modo demonstração: os produtos não são alterados." : "Adicione, edite e organize os produtos."},
    config:{h:"Ajustes", p:"Dados da loja, botões e popup de captura."}
  }[state.panel] || {h:"Editor", p:""};
  let corpo = "";
  if(state.panel==="paginas") corpo = painelPaginas();
  else if(state.panel==="design") corpo = painelDesign();
  else if(state.panel==="catalogo") corpo = painelCatalogo();
  else corpo = painelConfig();
  return `<div class="panel-head"><div><h2>${esc(m.h)}</h2><p>${esc(m.p)}</p></div>
    <button class="icon-btn panel-close" data-act="fechar-panel" aria-label="Fechar painel" title="Fechar painel">${miniIcone(MINI.close)}</button></div>
    <div class="panel-body">${corpo}</div>`;
}

function painelPaginas(){
  const layout = secoesLayout();
  const menuN = Array.isArray(state.cfg.menu) ? state.cfg.menu.filter(m=>m && (m.t||m.titulo) && (m.href||m.link)).length : 0;
  const itens = layout.map((s,i)=>{
    const meta = SECOES.find(x=>x.id===s.id);
    const vis = s.visivel !== false;
    return `<li data-sec="${s.id}" draggable="true" class="${s.id===state.selected?"on":""}">
      <span class="grip" title="Arraste para reordenar">${miniIcone(MINI.grip)}</span>
      <button class="sec-main" data-act="sel" data-sec="${s.id}">${iconeSecao(s.id)}<span><b>${esc(meta.nome)}</b><small>${esc(meta.desc)}</small></span></button>
      <button class="mini" data-act="subir" data-sec="${s.id}" title="Mover para cima"${i===0?" disabled":""}>${miniIcone(MINI.up)}</button>
      <button class="mini" data-act="descer" data-sec="${s.id}" title="Mover para baixo"${i===layout.length-1?" disabled":""}>${miniIcone(MINI.down)}</button>
      <button class="mini ${vis?"":"off"}" data-act="olho" data-sec="${s.id}" title="${vis?"Ocultar seção":"Mostrar seção"}">${miniIcone(vis?MINI.eye:MINI.eyeOff)}</button>
    </li>`;
  }).join("");
  return `<div class="page-card">
      ${miniIcone('<path d="M4 4h16v16H4z"/><path d="M9 4v16"/>')}
      <span><b>Página inicial</b><span>É a página que seus clientes veem</span></span>
      <span class="tag">PRINCIPAL</span>
    </div>
    <a class="page-card admin-card" href="${painelLink("pedidos")}" data-gestao="pedidos" target="_blank" rel="noopener">
      ${miniIcone(ICONES.caixa)}
      <span><b>Pedidos e clientes</b><span>Atualize pedidos, veja clientes e relatórios</span></span>
      <span class="tag">PAINEL</span>
    </a>
    <button type="button" class="page-card menu-card${state.selected==="menu"?" on":""}" data-act="sel-menu">
      ${miniIcone(ICONES.menu)}
      <span><b>Menu do topo</b><span>${menuN} link${menuN===1?"":"s"} no cabeçalho</span></span>
      <span class="tag">EDITAR</span>
    </button>
    <button type="button" class="page-card cart-card${state.selected==="carrinho"?" on":""}" data-act="sel-carrinho">
      ${miniIcone(ICONES.sacola)}
      <span><b>Minha Lista</b><span>Textos da sacola e do pedido</span></span>
      <span class="tag">EDITAR</span>
    </button>
    <div class="panel-section-title">Seções da página</div>
    <ul class="section-list" id="listaSecoes">${itens}</ul>
    ${gradeIcones()}
    <p class="panel-note">Arraste pelo ícone à esquerda para mudar a ordem. O olho oculta a seção sem apagar o conteúdo. Clique na seção para editar os textos ou trocar o ícone.</p>`;
}

function gradeIcones(){
  const sel = state.selected;
  if(!sel || !SECOES.some(s=>s.id===sel)) return "";
  const atual = iconeAtual(sel);
  const meta = SECOES.find(s=>s.id===sel);
  const botoes = Object.keys(ICONES).map(k=>
    `<button type="button" class="icone-op${k===atual?" on":""}" data-act="set-icone" data-sec="${esc(sel)}" data-icone="${esc(k)}" title="${esc(k)}">${miniIcone(ICONES[k])}</button>`
  ).join("");
  return `<div class="panel-section-title">Ícone de "${esc(meta?meta.nome:sel)}"</div>
    <div class="icone-grid">${botoes}</div>`;
}

function camposFonte(fontes){
  const atTit = (fontes.titulos && fontes.titulos.nome) || "";
  const atTxt = (fontes.texto && fontes.texto.nome) || "";
  const opts = sel => {
    const cats = [...new Set(FONTS.map(f=>f.cat))];
    return '<option value="">Padrão do site</option>' + cats.map(cat=>
      `<optgroup label="${esc(cat)}">` + FONTS.filter(f=>f.cat===cat).map(f=>
        `<option value="${esc(f.nome)}"${f.nome===sel?" selected":""}>${esc(f.nome)}</option>`).join("") + `</optgroup>`
    ).join("");
  };
  return `<div class="fld"><label>Títulos</label><select data-fonte="titulos">${opts(atTit)}</select></div>
    <div class="fld"><label>Textos</label><select data-fonte="texto">${opts(atTxt)}</select></div>`;
}

function painelDesign(){
  const cores = (state.cfg.visual && state.cfg.visual.cores) || {};
  const fontes = (state.cfg.visual && state.cfg.visual.fontes) || {};
  const temas = state.temas.length ? state.temas : [];
  const cards = temas.map(t=>{
    const on = t.cores && Object.keys(t.cores).every(k=>cores[k]===t.cores[k]) && Object.keys(cores).every(k=>cores[k]===undefined || cores[k]===t.cores[k]);
    const sw = Object.values(t.cores||{}).slice(0,6).map(c=>`<i style="background:${esc(c)}"></i>`).join("");
    return `<button class="tema-card${on?" on":""}" data-act="tema" data-id="${esc(t.id)}">
      <span class="tema-swatches">${sw}</span>
      <b>${esc(t.nome)}</b><small>${esc(t.descricao||"")}</small>
    </button>`;
  }).join("") || '<p class="empty-insp">Nenhum tema disponível.</p>';
  const coresHtml = CORES_INFO.map(c=>{
    const val = cores[c.k] || "#000000";
    return `<label class="color-item">
      <input type="color" data-cor="${esc(c.k)}" value="${esc(val)}">
      <span class="color-meta"><label>${esc(c.r)}</label><input type="text" data-cor-txt="${esc(c.k)}" value="${esc(val)}"></span>
    </label>`;
  }).join("");
  const logo = state.cfg.visual && state.cfg.visual.logo;
  return `<div class="panel-section-title">Logo</div>
    <div class="logo-field">
      <div class="logo-preview"><img src="${esc(fotoSrc(logo || "logo-retangular.webp"))}" alt="Logo da loja" loading="lazy"></div>
      <div class="logo-controls">
        <select data-logo>${opcoesImagens(logo, "Padrão do site")}</select>
        <div class="logo-actions">
          <label class="upload">${miniIcone(MINI.upload)} Enviar novo logo<input type="file" accept="image/webp,image/png,image/jpeg" data-upload-logo></label>
          ${logo ? `<button type="button" class="btn btn-ghost btn-sm" data-act="limpar-logo">Usar padrão</button>` : ""}
        </div>
      </div>
    </div>
    <p class="panel-note">O logo aparece no topo e nos compartilhamentos. Prefira PNG ou WebP com fundo claro/transparente, até 8 MB.</p>
    <div class="panel-section-title">Tema</div>
    <div class="tema-grid">${cards}</div>
    <div class="panel-section-title">Fontes</div>
    ${camposFonte(fontes)}
    <div class="font-preview">
      <b style="font-family:${esc((fontes.titulos&&fontes.titulos.familia)||"inherit")}">${esc(texto("geral.nome","Sua loja"))}</b>
      <span style="font-family:${esc((fontes.texto&&fontes.texto.familia)||"inherit")}">Assim ficam os textos do site, com as fontes do tema escolhido.</span>
    </div>
    <div class="panel-section-title">Cores <span>${esc((state.cfg.visual && state.cfg.visual.tema) || "personalizado")}</span></div>
    <div class="color-grid">${coresHtml}</div>`;
}

function painelCatalogo(){
  return `<div class="search-row">
      <span class="search">${miniIcone(MINI.search)}<input id="buscaProd" type="search" placeholder="Buscar produto" autocomplete="off"></span>
    </div>
    <div class="prod-list" id="listaProd"></div>
    <button class="btn btn-primary btn-block" data-act="novo-prod" style="margin-top:12px"${state.demo?" disabled":""}>${miniIcone(MINI.plus)} Novo produto</button>
    <p class="panel-note">${state.demo ? "Na demonstração o catálogo é somente leitura." : "As alterações de produto são salvas direto no catálogo da loja."}</p>`;
}

function painelConfig(){
  const f = (path, r, t, d) => campoHtml({k:"", r:r, t:t||"text", d:d}, path, getPath(state.cfg, path));
  const sel = (path, r, op) => campoHtml({k:"", r:r, t:"select", op:op}, path, getPath(state.cfg, path));
  return `<div class="settings-card">
      <h3>${miniIcone(ICONES.usuario)} Dados da loja</h3>
      ${f("geral.nome","Nome da loja")}
      ${f("geral.tagline","Frase curta")}
      ${f("geral.zap","WhatsApp (só números, com DDI)")}
      ${f("geral.instagram","Link do Instagram")}
      ${f("geral.title","Título da página (SEO)")}
      ${f("geral.descricao","Descrição (SEO)","textarea")}
    </div>
    <div class="settings-card">
      <h3>${miniIcone(ICONES.telefone)} Botões</h3>
      ${sel("botoes.formato","Formato",[{v:"padrao",r:"Padrão do site"},{v:"pill",r:"Arredondado (pílula)"},{v:"quadrado",r:"Quadrado"}])}
      ${sel("botoes.caixa","Texto",[{v:"alta",r:"MAIÚSCULAS"},{v:"normal",r:"Normal"}])}
    </div>
    <div class="settings-card">
      <h3>${miniIcone(ICONES.telefone)} Mensagens de WhatsApp</h3>
      ${f("zap.msg_ola","Mensagem dos botões de WhatsApp","textarea","Texto que o cliente envia ao tocar nos botões flutuantes, do rodapé ou do convite final. Use {NOME} para o nome da loja.")}
      ${f("zap.msg_encomenda","Mensagem de encomenda personalizada","textarea","Texto do botão de encomenda. Use {NOME} para o nome da loja.")}
      <p class="panel-note">Essas mensagens saem do cliente para o WhatsApp da loja. A mensagem completa do pedido fica em Páginas &gt; Minha Lista.</p>
    </div>
    <div class="settings-card">
      <h3>${miniIcone(ICONES.livro)} Popup de captura</h3>
      ${f("popup.ativo","Exibir popup na loja","check")}
      ${f("popup.titulo","Título")}
      ${f("popup.texto","Texto","textarea")}
      ${f("popup.botao","Texto do botão")}
      ${f("popup.cupom","Cupom exibido (opcional)")}
    </div>
    <div class="settings-card">
      <h3>${miniIcone(ICONES.rodape)} Mais opções</h3>
      <p>Pedidos, clientes e relatórios ficam no painel completo. Use os atalhos abaixo.</p>
      <div class="actions">
        <a class="btn btn-secondary" href="${painelLink("pedidos")}" data-gestao="pedidos" target="_blank" rel="noopener">Pedidos</a>
        <a class="btn btn-secondary" href="${painelLink("clientes")}" data-gestao="clientes" target="_blank" rel="noopener">Clientes</a>
        <a class="btn btn-secondary" href="${painelLink("vendidos")}" data-gestao="vendidos" target="_blank" rel="noopener">Relatórios</a>
        <a class="btn btn-ghost" href="${painelLink("")}" target="_blank" rel="noopener">Painel completo</a>
        <a class="btn btn-ghost" href="/${QLOJA}" target="_blank" rel="noopener">Ver a loja</a>
      </div>
    </div>`;
}

function renderListaProdutos(q){
  const alvo = $("#listaProd");
  if(!alvo) return;
  const termo = String(q||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const lista = state.produtos.filter(p=>{
    if(!termo) return true;
    const alvoTxt = (p.nome + " " + (p.cat||"") + " " + (p.desc||"")).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    return alvoTxt.includes(termo);
  });
  if(!lista.length){
    alvo.innerHTML = '<p class="empty-insp">Nenhum produto encontrado.</p>';
    return;
  }
  alvo.innerHTML = lista.map(p=>`<div class="prod-item">
      <img src="${esc(fotoSrc(p.foto))}" alt="" loading="lazy">
      <span class="prod-meta"><b>${esc(p.nome)}</b><span>${esc(p.cat||"sem linha")}${p.colecao?" · "+esc(p.colecao):""}</span><span class="price">${typeof p.preco==="number"?reais(p.preco):"Sob consulta"}</span></span>
      <span class="prod-actions">
        <button data-act="edit-prod" data-id="${esc(p.id)}" title="Editar">${miniIcone(MINI.edit)}</button>
        <button class="danger" data-act="del-prod" data-id="${esc(p.id)}" title="Excluir"${state.demo?" disabled":""}>${miniIcone(MINI.trash)}</button>
      </span>
    </div>`).join("");
}

function moverSecao(id, dir){
  const layout = secoesLayout();
  const i = layout.findIndex(s=>s.id===id);
  const j = i + dir;
  if(i<0 || j<0 || j>=layout.length) return;
  registrarHistorico(true);
  const [x] = layout.splice(i,1);
  layout.splice(j,0,x);
  salvarLayout(layout);
  marcarSujo();
  renderPanel();
  atualizarPreview();
}

function moverSecaoPara(id, indice){
  const layout = secoesLayout();
  const i = layout.findIndex(s=>s.id===id);
  const j = Math.max(0, Math.min(layout.length - 1, indice));
  if(i<0 || i===j) return;
  registrarHistorico(true);
  const [x] = layout.splice(i,1);
  layout.splice(j,0,x);
  salvarLayout(layout);
  marcarSujo();
  renderPanel();
  atualizarPreview();
}

function alternarVisivel(id){
  const layout = secoesLayout();
  const item = layout.find(s=>s.id===id);
  if(!item) return;
  registrarHistorico(true);
  item.visivel = item.visivel === false;
  salvarLayout(layout);
  marcarSujo();
  renderPanel();
  renderInspector();
  atualizarPreview();
}

function aplicarTema(id){
  const t = state.temas.find(x=>x.id===id);
  if(!t) return;
  registrarHistorico(true);
  state.cfg.visual = state.cfg.visual || {};
  state.cfg.visual.cores = clone(t.cores || {});
  state.cfg.visual.fontes = clone(t.fontes || {});
  state.cfg.visual.tema = t.nome;
  marcarSujo();
  renderPanel();
  renderInspector();
  atualizarPreview();
  toast("Tema aplicado: " + t.nome);
}

function aplicarFonte(quem, nome){
  registrarHistorico(true);
  state.cfg.visual = state.cfg.visual || {};
  state.cfg.visual.fontes = state.cfg.visual.fontes || {};
  if(!nome){
    delete state.cfg.visual.fontes[quem];
  } else {
    const f = fontePorNome(nome);
    if(!f) return;
    state.cfg.visual.fontes[quem] = {nome:f.nome, familia:f.fam, link:linkFonte(f)};
  }
  state.cfg.visual.tema = "personalizado";
  marcarSujo();
  renderPanel();
  renderInspector();
  atualizarPreview();
}

function setCor(k, val){
  registrarHistorico(true);
  state.cfg.visual = state.cfg.visual || {};
  state.cfg.visual.cores = state.cfg.visual.cores || {};
  state.cfg.visual.cores[k] = val;
  state.cfg.visual.tema = "personalizado";
  marcarSujo();
  atualizarPreview();
}

function registrarHistorico(forcar){
  const agora = Date.now();
  if(!forcar && agora - state.ultimoHist < 700) return;
  state.ultimoHist = agora;
  state.history.push({cfg:clone(state.cfg), produtos:clone(state.produtos), selected:state.selected});
  if(state.history.length > 50) state.history.shift();
  state.redo = [];
  atualizarUndoRedo();
}

function atualizarUndoRedo(){
  const u = $("#undo"), r = $("#redo");
  if(u) u.disabled = !state.history.length;
  if(r) r.disabled = !state.redo.length;
}

function desfazer(){
  if(!state.history.length) return;
  state.redo.push({cfg:clone(state.cfg), produtos:clone(state.produtos), selected:state.selected});
  const s = state.history.pop();
  state.cfg = s.cfg;
  state.produtos = s.produtos;
  state.selected = s.selected;
  state.ultimoHist = 0;
  const nomeLoja = texto("geral.nome", "Minha loja");
  $("#lojaNome").textContent = nomeLoja;
  document.title = "Editor visual · " + nomeLoja;
  marcarSujo();
  renderPanel();
  renderInspector();
  atualizarPreview();
  atualizarUndoRedo();
}

function refazer(){
  if(!state.redo.length) return;
  state.history.push({cfg:clone(state.cfg), produtos:clone(state.produtos), selected:state.selected});
  const s = state.redo.pop();
  state.cfg = s.cfg;
  state.produtos = s.produtos;
  state.selected = s.selected;
  state.ultimoHist = 0;
  const nomeLoja = texto("geral.nome", "Minha loja");
  $("#lojaNome").textContent = nomeLoja;
  document.title = "Editor visual · " + nomeLoja;
  marcarSujo();
  renderPanel();
  renderInspector();
  atualizarPreview();
  atualizarUndoRedo();
}

function camposArray(path){
  if(path === "menu") return MENU_CAMPOS;
  for(const s of SECOES){
    if(s.array && path === caminhoArray(s)) return s.arrayCampos || [];
    if(s.array2 && path === caminhoArray2(s)) return s.array2Campos || [];
  }
  return [];
}

function atualizarCardMenu(){
  const card = $(".menu-card");
  if(!card) return;
  const n = Array.isArray(state.cfg.menu) ? state.cfg.menu.filter(m=>m && (m.t||m.titulo) && (m.href||m.link)).length : 0;
  const sm = card.querySelector("span span");
  if(sm) sm.textContent = n + " link" + (n===1?"":"s") + " no cabeçalho";
}

function adicionarItem(path){
  const arr = getPath(state.cfg, path);
  const lista = Array.isArray(arr) ? arr : [];
  const campos = camposArray(path);
  const novo = {};
  campos.forEach(c=>{ novo[c.k] = ""; });
  registrarHistorico(true);
  lista.push(novo);
  setPath(state.cfg, path, lista);
  marcarSujo();
  renderInspector();
  atualizarPreview();
  if(path === "menu") atualizarCardMenu();
}

function moverItem(path, i, dir){
  const lista = getPath(state.cfg, path);
  if(!Array.isArray(lista)) return;
  const j = i + dir;
  if(i < 0 || j < 0 || j >= lista.length) return;
  registrarHistorico(true);
  const [x] = lista.splice(i,1);
  lista.splice(j,0,x);
  marcarSujo();
  renderInspector();
  atualizarPreview();
  if(path === "menu") atualizarCardMenu();
}

function removerItem(path, i){
  const lista = getPath(state.cfg, path);
  if(!Array.isArray(lista)) return;
  registrarHistorico(true);
  lista.splice(i,1);
  marcarSujo();
  renderInspector();
  atualizarPreview();
  if(path === "menu") atualizarCardMenu();
}

function valorCampo(el){
  if(el.type === "checkbox") return el.checked;
  if(el.dataset && el.dataset.num) {
    const n = Number(String(el.value).replace(",", "."));
    return isFinite(n) ? n : "";
  }
  return el.value;
}

function ligarPainel(){
  const panel = $("#panel");
  panel.addEventListener("click", e=>{
    const b = e.target.closest("[data-act]");
    if(!b) return;
    const a = b.dataset.act;
    if(a === "fechar-panel"){ fecharPainel(); return; }
    if(a === "sel") selecionar(b.dataset.sec);
    else if(a === "subir") moverSecao(b.dataset.sec, -1);
    else if(a === "descer") moverSecao(b.dataset.sec, 1);
    else if(a === "olho") alternarVisivel(b.dataset.sec);
    else if(a === "set-icone") setIcone(b.dataset.sec, b.dataset.icone);
    else if(a === "sel-menu") selecionar("menu");
    else if(a === "sel-carrinho") selecionar("carrinho");
    else if(a === "tema") aplicarTema(b.dataset.id);
    else if(a === "novo-prod") abrirProduto(null);
    else if(a === "edit-prod") abrirProduto(b.dataset.id);
    else if(a === "del-prod") removerProduto(b.dataset.id);
    else if(a === "limpar-logo"){
      registrarHistorico(true);
      state.cfg.visual = state.cfg.visual || {};
      state.cfg.visual.logo = "";
      marcarSujo();
      renderPanel();
      atualizarPreview();
    }
  });

  panel.addEventListener("input", e=>{
    const el = e.target;
    if(el.id === "buscaProd"){ renderListaProdutos(el.value); return; }
    if(el.dataset.fonte){ aplicarFonte(el.dataset.fonte, el.value); return; }
    if(el.dataset.cor){
      const txt = panel.querySelector(`[data-cor-txt="${el.dataset.cor}"]`);
      if(txt) txt.value = el.value;
      setCor(el.dataset.cor, el.value);
      return;
    }
    if(el.dataset.corTxt){
      const val = el.value.trim();
      if(/^#[0-9a-f]{6}$/i.test(val)){
        const c = panel.querySelector(`[data-cor="${el.dataset.corTxt}"]`);
        if(c) c.value = val;
      }
      setCor(el.dataset.corTxt, val);
      return;
    }
    if("logo" in el.dataset){
      registrarHistorico(true);
      state.cfg.visual = state.cfg.visual || {};
      state.cfg.visual.logo = el.value;
      marcarSujo();
      renderPanel();
      atualizarPreview();
      return;
    }
    if(el.dataset.path){
      registrarHistorico();
      setPath(state.cfg, el.dataset.path, valorCampo(el));
      if(el.dataset.path === "geral.nome"){
        const nome = el.value || "Minha loja";
        $("#lojaNome").textContent = nome;
        document.title = "Editor visual · " + nome;
      }
      marcarSujo();
      atualizarPreview();
      if(String(el.dataset.path).indexOf("menu.") === 0) atualizarCardMenu();
    }
  });

  panel.addEventListener("change", e=>{
    const el = e.target;
    if(el.dataset.uploadLogo !== undefined){
      enviarLogo(el.files && el.files[0]);
      el.value = "";
      return;
    }
    if(el.dataset.path){
      registrarHistorico();
      setPath(state.cfg, el.dataset.path, valorCampo(el));
      marcarSujo();
      atualizarPreview();
    }
    if("logo" in el.dataset){
      registrarHistorico(true);
      state.cfg.visual = state.cfg.visual || {};
      state.cfg.visual.logo = el.value;
      marcarSujo();
      renderPanel();
      atualizarPreview();
    }
  });

  let arrastando = null;
  panel.addEventListener("dragstart", e=>{
    const li = e.target.closest("#listaSecoes li[data-sec]");
    if(!li) return;
    arrastando = li.dataset.sec;
    li.classList.add("dragging");
    try{ e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", arrastando); }catch(err){}
  });
  panel.addEventListener("dragend", e=>{
    const li = e.target.closest("#listaSecoes li[data-sec]");
    if(li) li.classList.remove("dragging");
    $$("#listaSecoes li").forEach(x=>x.classList.remove("drop"));
    arrastando = null;
  });
  panel.addEventListener("dragover", e=>{
    if(!arrastando) return;
    const li = e.target.closest("#listaSecoes li[data-sec]");
    if(!li) return;
    e.preventDefault();
    $$("#listaSecoes li").forEach(x=>x.classList.remove("drop"));
    li.classList.add("drop");
  });
  panel.addEventListener("drop", e=>{
    if(!arrastando) return;
    const li = e.target.closest("#listaSecoes li[data-sec]");
    if(!li) return;
    e.preventDefault();
    const id = arrastando;
    const layout = secoesLayout();
    const indice = layout.findIndex(s=>s.id===li.dataset.sec);
    moverSecaoPara(id, indice);
    arrastando = null;
  });
}

function manterImagem(el){
  if(el.tagName !== "SELECT" || !el.closest(".image-field") || el.value) return false;
  el.value = baseFoto(getPath(state.cfg, el.dataset.path)) || "";
  return true;
}

function ligarInspetor(){
  const insp = $("#inspector");
  insp.addEventListener("click", e=>{
    const b = e.target.closest("[data-act]");
    if(!b) return;
    const a = b.dataset.act;
    if(a === "fechar-insp"){
      insp.hidden = true;
      state.selected = "";
      aplicarSelecao();
      return;
    }
    if(a === "ver-carrinho"){
      try{ const w = $("#preview").contentWindow; if(w && typeof w.__editorAbrirCarrinho === "function") w.__editorAbrirCarrinho(); }catch(e){}
      return;
    }
    if(a === "insp-tab"){
      state.inspTab = b.dataset.tab;
      renderInspector();
      return;
    }
    if(a === "subir") moverSecao(b.dataset.sec, -1);
    else if(a === "descer") moverSecao(b.dataset.sec, 1);
    else if(a === "arr-add") adicionarItem(b.dataset.arr);
    else if(a === "arr-remover") removerItem(b.dataset.arr, Number(b.dataset.i));
    else if(a === "arr-subir") moverItem(b.dataset.arr, Number(b.dataset.i), -1);
    else if(a === "arr-descer") moverItem(b.dataset.arr, Number(b.dataset.i), 1);
  });

  insp.addEventListener("input", e=>{
    const el = e.target;
    if(el.dataset.path){
      if(manterImagem(el)) return;
      registrarHistorico();
      setPath(state.cfg, el.dataset.path, valorCampo(el));
      marcarSujo();
      atualizarPreview();
    }
  });

  insp.addEventListener("change", e=>{
    const el = e.target;
    if(el.dataset.uploadMidia){
      enviarMidia(el.dataset.uploadMidia, el.files && el.files[0], el.dataset.uploadTipo);
      el.value = "";
      return;
    }
    if(el.dataset.act === "vis-sec"){
      alternarVisivel(el.dataset.sec);
      return;
    }
    if(el.dataset.destId){
      registrarHistorico(true);
      let ids = getPath(state.cfg, "destaques.ids");
      ids = Array.isArray(ids) ? ids.slice() : [];
      if(el.checked){ if(!ids.includes(el.dataset.destId)) ids.push(el.dataset.destId); }
      else ids = ids.filter(x=>x !== el.dataset.destId);
      setPath(state.cfg, "destaques.ids", ids);
      marcarSujo();
      atualizarPreview();
      return;
    }
    if(el.dataset.path){
      if(manterImagem(el)) return;
      registrarHistorico();
      setPath(state.cfg, el.dataset.path, valorCampo(el));
      if(el.tagName === "SELECT" && el.closest(".media-field")){
        const prev = el.closest(".media-field").querySelector(".media-preview");
        if(prev) prev.innerHTML = midiaPreview(el.value || el.dataset.padrao || "");
      }
      marcarSujo();
      atualizarPreview();
    }
  });
}

function ligarTopo(){
  $$(".devices [data-device]").forEach(b=>b.addEventListener("click", ()=>{
    state.device = b.dataset.device;
    $("#app").dataset.device = state.device;
    $$(".devices [data-device]").forEach(x=>x.classList.toggle("on", x === b));
  }));
  $$(".rail [data-panel]").forEach(b=>b.addEventListener("click", ()=>{
    state.panel = b.dataset.panel;
    $$(".rail [data-panel]").forEach(x=>x.classList.toggle("on", x === b));
    renderPanel();
    abrirPainel();
  }));
  const tp = $("#togglePanel");
  if(tp) tp.addEventListener("click", alternarPainel);
  $("#helpBtn").addEventListener("click", ()=>{ $("#modalAjuda").hidden = false; });
  $("#logoutBtn").addEventListener("click", sairEditor);
  $("#undo").addEventListener("click", desfazer);
  $("#redo").addEventListener("click", refazer);
  $("#saveBtn").addEventListener("click", ()=>salvar(false));
  $("#publishBtn").addEventListener("click", publicar);
  $("#zoomOut").addEventListener("click", ()=>mudarZoom(-10));
  $("#zoomIn").addEventListener("click", ()=>mudarZoom(10));
  $("#app").dataset.device = state.device;
}

let gestaoAba = "pedidos";
let gestaoFoco = null;

function abrirGestao(aba){
  const abas = ["pedidos","clientes","vendidos"];
  aba = abas.includes(aba) ? aba : "pedidos";
  gestaoAba = aba;
  const g = $("#gestao");
  const f = $("#gestaoFrame");
  if(!g || !f) return;
  const primeiraAbertura = g.hidden;
  if(primeiraAbertura){
    gestaoFoco = document.activeElement;
    const editor = $("#app");
    if(editor) editor.inert = true;
    g.hidden = false;
  }
  $$("[data-gestao-tab]").forEach(b=>b.classList.toggle("on", b.dataset.gestaoTab === aba));
  const src = f.getAttribute("src") || "";
  if(!src || src === "about:blank"){
    f.src = painelLink(aba) + "&embed=1";
  }else{
    try{
      if(f.contentWindow && typeof f.contentWindow.__adminIrPara === "function"){
        f.contentWindow.__adminIrPara(aba);
      }else{
        f.src = painelLink(aba) + "&embed=1";
      }
    }catch(e){
      f.src = painelLink(aba) + "&embed=1";
    }
  }
  const alvo = document.querySelector(`[data-gestao-tab="${aba}"]`);
  if(alvo) alvo.focus({preventScroll:true});
}

function gestaoFecharModais(f){
  try{
    const doc = f && f.contentDocument;
    if(!doc) return;
    if(doc.querySelector(".mod:not([hidden])")){
      doc.__limpandoModais = true;
      try{
        doc.dispatchEvent(new KeyboardEvent("keydown", {key:"Escape", bubbles:true}));
      }finally{
        doc.__limpandoModais = false;
      }
    }
    doc.querySelectorAll("#modPedido, #modCliente").forEach(m => m.remove());
    const produto = doc.getElementById("modProduto");
    if(produto) produto.hidden = true;
  }catch(e){}
}

function fecharGestao(){
  const g = $("#gestao");
  if(!g || g.hidden) return;
  g.hidden = true;
  const editor = $("#app");
  if(editor) editor.inert = false;
  const f = $("#gestaoFrame");
  gestaoFecharModais(f);
  const anterior = gestaoFoco && gestaoFoco !== document.body && document.contains(gestaoFoco)
    ? gestaoFoco : $("#gestaoBtn");
  gestaoFoco = null;
  if(anterior && typeof anterior.focus === "function") anterior.focus({preventScroll:true});
}

function ligarEscGestao(f){
  try{
    const doc = f && f.contentDocument;
    if(!doc || doc.__escGestao) return;
    doc.__escGestao = true;
    doc.addEventListener("keydown", e=>{
      if(e.key !== "Escape" || doc.__limpandoModais) return;
      if(doc.querySelector(".mod:not([hidden])")) return;
      fecharGestao();
    });
  }catch(e){}
}

function ligarGestao(){
  const btn = $("#gestaoBtn");
  if(btn) btn.addEventListener("click", ()=>abrirGestao("pedidos"));
  const fechar = $("#gestaoFechar");
  if(fechar) fechar.addEventListener("click", fecharGestao);
  $$("[data-gestao-tab]").forEach(b=>b.addEventListener("click", ()=>abrirGestao(b.dataset.gestaoTab)));
  const frame = $("#gestaoFrame");
  if(frame) frame.addEventListener("load", ()=>ligarEscGestao(frame));
  document.addEventListener("click", e=>{
    const el = e.target.closest("[data-gestao]");
    if(!el) return;
    if(e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    abrirGestao(el.dataset.gestao);
  });
  document.addEventListener("keydown", e=>{
    if(e.key !== "Escape" || $("#gestao").hidden) return;
    const f = $("#gestaoFrame");
    let doc = null;
    try{ doc = f && f.contentDocument; }catch(err){}
    if(doc && doc.querySelector(".mod:not([hidden])")){
      gestaoFecharModais(f);
      return;
    }
    fecharGestao();
  });
}

function mudarZoom(delta){
  state.zoom = Math.min(150, Math.max(50, state.zoom + delta));
  const wrap = $("#frameWrap");
  wrap.style.zoom = String(state.zoom / 100);
  $("#zoomLabel").textContent = state.zoom + "%";
}

function ligarModais(){
  ["#modalProduto","#modalAjuda"].forEach(sel=>{
    const m = $(sel);
    m.addEventListener("click", e=>{ if(e.target === m) m.hidden = true; });
  });
  $("#fechaProduto").addEventListener("click", ()=>{ $("#modalProduto").hidden = true; });
  $("#cancelarProduto").addEventListener("click", ()=>{ $("#modalProduto").hidden = true; });
  $("#fechaAjuda").addEventListener("click", ()=>{ $("#modalAjuda").hidden = true; });
  $("#formProduto").addEventListener("submit", salvarProduto);
  $("#pFoto").addEventListener("change", ()=>{
    const img = $("#pFotoPrev");
    const v = $("#pFoto").value;
    if(v){ img.src = fotoSrc(v); img.hidden = false; }
    else img.hidden = true;
  });
  $("#pUpload").addEventListener("change", enviarFoto);
  $("#pVideoUpload").addEventListener("change", enviarVideoProduto);
}

function ligarLogin(){
  $("#formLogin").addEventListener("submit", e=>{
    e.preventDefault();
    entrarReal($("#senhaLogin").value);
  });
  $("#verSenha").addEventListener("click", ()=>{
    const inp = $("#senhaLogin");
    const mostrar = inp.type === "password";
    inp.type = mostrar ? "text" : "password";
    const b = $("#verSenha");
    b.setAttribute("aria-pressed", String(mostrar));
    b.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
    b.innerHTML = mostrar
      ? '<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.7"/><path d="M6.4 8.2A16.8 16.8 0 0 0 2 12s3.5 6 10 6a9.9 9.9 0 0 0 4-.8"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>';
  });
}

function ligarTeclado(){
  document.addEventListener("keydown", e=>{
    if(e.key === "Escape"){
      if(!$("#modalProduto").hidden) $("#modalProduto").hidden = true;
      else if(!$("#modalAjuda").hidden) $("#modalAjuda").hidden = true;
      else if(!$("#inspector").hidden && window.innerWidth <= 1120) $("#inspector").hidden = true;
      else $("#panel").classList.remove("open");
      return;
    }
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s"){
      e.preventDefault();
      salvar(false);
      return;
    }
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey){
      e.preventDefault();
      desfazer();
      return;
    }
    if((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))){
      e.preventDefault();
      refazer();
    }
  });
}

let editandoProduto = null;

function abrirProduto(id){
  if(state.demo){ toast("A demonstração é somente leitura.", true); return; }
  editandoProduto = id || null;
  const p = id ? state.produtos.find(x=>x.id===id) : null;
  $("#prodTitulo").textContent = p ? "Editar produto" : "Novo produto";
  $("#pNome").value = p ? (p.nome||"") : "";
  $("#pCat").value = p ? (p.cat||"") : "";
  $("#pPreco").value = p && typeof p.preco === "number" ? String(p.preco) : "";
  $("#pOrdem").value = p && typeof p.ordem === "number" ? String(p.ordem) : (p && typeof p.ordem === "string" ? p.ordem : "");
  $("#pTag").value = p ? (p.tag||"") : "";
  $("#pSelo").value = p ? (p.selo||"") : "";
  $("#pVideo").value = p ? (p.video||"") : "";
  $("#pDesc").value = p ? (p.desc||"") : "";
  const cats = [...new Set(state.produtos.map(x=>x.cat).filter(Boolean))];
  $("#listaCats").innerHTML = cats.map(c=>`<option value="${esc(c)}"></option>`).join("");
  const colecoes = [...new Set(state.produtos.map(x=>x.colecao).filter(Boolean))];
  const dev = (state.cfg.devocoes && Array.isArray(state.cfg.devocoes.itens)) ? state.cfg.devocoes.itens : [];
  dev.forEach(d=>{ const t = String((d && (d.t||d)) || "").trim(); if(t && !colecoes.includes(t)) colecoes.push(t); });
  $("#pColecao").innerHTML = '<option value="">Sem coleção</option>' + colecoes.map(c=>`<option value="${esc(c)}"${p&&p.colecao===c?" selected":""}>${esc(c)}</option>`).join("");
  $("#pFoto").innerHTML = opcoesImagens(p ? p.foto : "");
  const prev = $("#pFotoPrev");
  if(p && p.foto){ prev.src = fotoSrc(p.foto); prev.hidden = false; } else { prev.hidden = true; }
  $("#modalProduto").hidden = false;
  setTimeout(()=>$("#pNome").focus(), 60);
}

async function salvarProduto(e){
  e.preventDefault();
  if(state.demo){ toast("A demonstração é somente leitura.", true); return; }
  const nome = $("#pNome").value.trim();
  if(!nome){ toast("Informe o nome do produto.", true); return; }
  const btn = $("#salvarProduto");
  btn.disabled = true;
  let precoRaw = String($("#pPreco").value||"").trim().replace(/[^\d.,]/g,"");
  if(precoRaw.includes(",")) precoRaw = precoRaw.replace(/\./g,"").replace(",", ".");
  else {
    const partes = precoRaw.split(".");
    if(partes.length > 2) precoRaw = partes.join("");
  }
  const preco = precoRaw === "" ? null : Number(precoRaw);
  const ordemRaw = String($("#pOrdem").value||"").trim();
  const ordem = ordemRaw === "" ? null : Number(ordemRaw);
  const fotoAtual = editandoProduto ? ((state.produtos.find(x=>x.id===editandoProduto)||{}).foto || "") : "";
  const fotoEscolhida = $("#pFoto").value;
  const fotos = fotoEscolhida ? baseFoto(fotoEscolhida) : fotoAtual;
  const prod = {
    id: editandoProduto || undefined,
    nome: nome,
    cat: $("#pCat").value.trim(),
    preco: (preco != null && isFinite(preco)) ? preco : null,
    tag: $("#pTag").value.trim(),
    desc: $("#pDesc").value.trim(),
    foto: fotos || "",
    video: $("#pVideo").value.trim(),
    selo: $("#pSelo").value.trim(),
    ordem: (ordem != null && isFinite(ordem)) ? ordem : null,
    colecao: $("#pColecao").value
  };
  try{
    let salvo;
    if(editandoProduto) salvo = await api("/api/admin/produtos/" + encodeURIComponent(editandoProduto), {method:"PUT", body:prod});
    else salvo = await api("/api/admin/produtos", {method:"POST", body:prod});
    if(editandoProduto){
      const i = state.produtos.findIndex(x=>x.id===editandoProduto);
      if(i >= 0) state.produtos[i] = salvo;
    } else {
      state.produtos.push(salvo);
    }
    $("#modalProduto").hidden = true;
    renderPanel();
    atualizarPreview();
    toast(editandoProduto ? "Produto atualizado." : "Produto adicionado.");
    if(!state.imagens.includes(salvo.foto) && salvo.foto) state.imagens.push(salvo.foto);
  }catch(err){
    toast("Não foi possível salvar o produto: " + err.message, true);
  }finally{
    btn.disabled = false;
  }
}

async function removerProduto(id){
  if(state.demo){ toast("A demonstração é somente leitura.", true); return; }
  const p = state.produtos.find(x=>x.id===id);
  if(!p) return;
  if(!confirm('Excluir "' + p.nome + '"? Essa ação não pode ser desfeita.')) return;
  try{
    await api("/api/admin/produtos/" + encodeURIComponent(id), {method:"DELETE"});
    state.produtos = state.produtos.filter(x=>x.id!==id);
    const ids = getPath(state.cfg, "destaques.ids");
    if(Array.isArray(ids)) setPath(state.cfg, "destaques.ids", ids.filter(x=>x!==id));
    const itens = getPath(state.cfg, "destaques.itens");
    if(Array.isArray(itens)) setPath(state.cfg, "destaques.itens", itens.filter(x=>x && x.id!==id));
    renderPanel();
    atualizarPreview();
    toast("Produto excluído.");
  }catch(err){
    toast("Não foi possível excluir: " + err.message, true);
  }
}

function enviarLogo(arq){
  if(!arq) return;
  if(state.demo){ toast("Envio de logo indisponível na demonstração.", true); return; }
  if(arq.size > 8 * 1024 * 1024){ toast("Logo muito grande (máx. 8 MB).", true); return; }
  const leitor = new FileReader();
  leitor.onload = async ()=>{
    try{
      const r = await api("/api/admin/upload-midia", {method:"POST", body:{nome:arq.name, dados:leitor.result}});
      if(r && r.url){
        state.cfg.visual = state.cfg.visual || {};
        state.cfg.visual.logo = r.url;
        state.imagens = Array.isArray(state.imagens) ? state.imagens : [];
        if(!state.imagens.includes(r.arquivo)) state.imagens.push(r.arquivo);
        state.midias = Array.isArray(state.midias) ? state.midias : [];
        state.midias.push({tipo:"imagem", arquivo:r.arquivo, url:r.url});
        marcarSujo();
        renderPanel();
        atualizarPreview();
        toast("Logo atualizado.");
      }
    }catch(err){
      toast("Falha no envio: " + err.message, true);
    }
  };
  leitor.readAsDataURL(arq);
}

function enviarMidia(path, arq, tipo){
  if(!arq) return;
  if(state.demo){ toast("Envio de mídia indisponível na demonstração.", true); return; }
  const video = /^video\//i.test(arq.type) || midiaTipo(arq.name) === "video";
  const max = (video ? 20 : 8) * 1024 * 1024;
  if(arq.size > max){ toast((video ? "Vídeo" : "Imagem") + " muito grande (máx. " + (video ? "20 MB" : "8 MB") + ").", true); return; }
  const leitor = new FileReader();
  leitor.onload = async ()=>{
    try{
      const r = await api("/api/admin/upload-midia", {method:"POST", body:{nome:arq.name, dados:leitor.result}});
      if(r && r.url){
        state.midias = Array.isArray(state.midias) ? state.midias : [];
        state.midias.push({tipo:r.tipo === "video" ? "video" : "imagem", arquivo:r.arquivo, url:r.url});
        if(r.tipo !== "video"){
          state.imagens = Array.isArray(state.imagens) ? state.imagens : [];
          if(!state.imagens.includes(r.arquivo)) state.imagens.push(r.arquivo);
        }
        registrarHistorico(true);
        setPath(state.cfg, path, r.url);
        marcarSujo();
        atualizarPreview();
        const insp = $("#inspector"), sc = insp ? insp.scrollTop : 0;
        renderInspector();
        if(insp) insp.scrollTop = sc;
        toast(video ? "Vídeo enviado." : "Imagem enviada.");
      }
    }catch(err){
      toast("Falha no envio: " + err.message, true);
    }
  };
  leitor.readAsDataURL(arq);
}

function enviarVideoProduto(e){
  const arq = e.target.files && e.target.files[0];
  if(!arq) return;
  if(state.demo){ toast("Envio de vídeo indisponível na demonstração.", true); return; }
  if(arq.size > 20 * 1024 * 1024){ toast("Vídeo muito grande (máx. 20 MB).", true); return; }
  const leitor = new FileReader();
  leitor.onload = async ()=>{
    try{
      const r = await api("/api/admin/upload-midia", {method:"POST", body:{nome:arq.name, dados:leitor.result}});
      if(r && r.url){
        $("#pVideo").value = r.url;
        state.midias = Array.isArray(state.midias) ? state.midias : [];
        state.midias.push({tipo:"video", arquivo:r.arquivo, url:r.url});
        toast("Vídeo enviado. Salve o produto para aplicar.");
      }
    }catch(err){
      toast("Falha no envio: " + err.message, true);
    }
  };
  leitor.readAsDataURL(arq);
  e.target.value = "";
}

function enviarFoto(e){
  const arq = e.target.files && e.target.files[0];
  if(!arq) return;
  if(state.demo){ toast("Envio de imagem indisponível na demonstração.", true); return; }
  const leitor = new FileReader();
  leitor.onload = async ()=>{
    try{
      const r = await api("/api/admin/upload", {method:"POST", body:{nome:arq.name, dados:leitor.result}});
      if(r && r.arquivo){
        if(!state.imagens.includes(r.arquivo)) state.imagens.push(r.arquivo);
        $("#pFoto").innerHTML = opcoesImagens(r.arquivo);
        $("#pFoto").value = r.arquivo;
        const img = $("#pFotoPrev");
        img.src = fotoSrc(r.arquivo);
        img.hidden = false;
        toast("Imagem enviada.");
      }
    }catch(err){
      toast("Falha no envio: " + err.message, true);
    }
  };
  leitor.readAsDataURL(arq);
  e.target.value = "";
}

function init(){
  ligarLogin();
  ligarTopo();
  ligarGestao();
  ligarPainel();
  ligarInspetor();
  ligarModais();
  ligarTeclado();
  atualizarUndoRedo();
  carregarTenant();
  if(sessionStorage.getItem("tok")) tentarEntrar();
}

init();

})();
