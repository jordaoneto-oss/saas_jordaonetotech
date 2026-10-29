(function(){
"use strict";

/* ---------- estado ---------- */
const $ = s=>document.querySelector(s);
const $$ = s=>[...document.querySelectorAll(s)];
let CFG = null;
let IMAGENS = [];
let ICONES = [];
let PRODUTOS = [];
let LEADS = [];
let EDITANDO_PRODUTO = null;

const tok = ()=> sessionStorage.getItem("tok") || "";
const LOJA = (()=>{ try{ return (new URLSearchParams(location.search).get("loja")||"").toLowerCase(); }catch(e){ return ""; } })();
const EMBED = (()=>{ try{ return new URLSearchParams(location.search).has("embed"); }catch(e){ return false; } })();
if(EMBED) document.body.classList.add("embed");
const QLOJA = LOJA ? "?loja="+encodeURIComponent(LOJA) : "";
const comLoja = u => u + (u.includes("?") ? "&" : QLOJA ? "?" : "") + (QLOJA ? QLOJA.slice(1) : "");
const reais = n => (typeof n==="number" ? n : 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const baseDe = f => String(f||"").replace(/\.(webp|png|jpe?g)$/i,"");
const temExt = f => /\.(webp|png|jpe?g|svg)$/i.test(String(f||""));
const fotoSrc = f => {
  const s = String(f||"").trim();
  if(s==="") return "img/produto-generico.webp";  // produto sem foto: não gera /img/.webp quebrado
  if(/^(https?:)?\/\//i.test(s) || /^(data|blob):/i.test(s)) return s;
  if(temExt(s)) return comLoja("img/"+s);
  return comLoja("img/"+s+".webp");
};
const iconeSrc = f => comLoja("img/icons/"+String(f||""));
/* busca sem acento: "fatima" encontra "Fátima" */
const semAcento = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

async function api(caminho, opcoes){
  caminho = comLoja(caminho);
  const headers = {"Authorization":"Bearer "+tok()};
  if(opcoes && opcoes.body && !(opcoes.body instanceof FormData)){
    headers["Content-Type"] = "application/json";
    if(typeof opcoes.body !== "string") opcoes.body = JSON.stringify(opcoes.body);
  }
  const r = await fetch(caminho, Object.assign({}, opcoes, {headers}));
  if(r.status === 401){ sair(); throw new Error("Sessão expirada"); }
  if(!r.ok){
    const j = await r.json().catch(()=>({}));
    throw new Error(j.erro || ("Erro "+r.status));
  }
  return r.json().catch(()=>({}));
}

function toast(msg){
  const t = $("#toastAdmin");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._x);
  t._x = setTimeout(()=>{ t.hidden = true; }, 3000);
}

/* ---------- navegação ---------- */
const TITULOS = {
  painel:"Início", paginas:"Conteúdo do site", produtos:"Produtos",
  pedidos:"Pedidos", clientes:"Clientes", vendidos:"Relatórios",
  lista:"Finalizar compra", visual:"Aparência", config:"Configurações"
};
const ABA_INICIAL = (()=>{ try{ const a=(new URLSearchParams(location.search).get("aba")||"").toLowerCase(); return ["pedidos","clientes","vendidos"].includes(a) ? a : ""; }catch(e){ return ""; } })();
const FONTES_PRESET = {
  titulos:[
    {nome:"Cormorant Garamond", link:"https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap", familia:'"Cormorant Garamond",Georgia,serif'},
    {nome:"Playfair Display", link:"https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap", familia:'"Playfair Display",Georgia,serif'},
    {nome:"Merriweather", link:"https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap", familia:'"Merriweather",Georgia,serif'},
    {nome:"Inter", link:"https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap", familia:'"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
    {nome:"Poppins", link:"https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&display=swap", familia:'"Poppins",-apple-system,"Segoe UI",sans-serif'},
    {nome:"Georgia", link:"", familia:"Georgia,'Times New Roman',serif"}
  ],
  texto:[
    {nome:"Lato", link:"https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap", familia:'"Lato",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
    {nome:"Open Sans", link:"https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600&display=swap", familia:'"Open Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
    {nome:"Inter", link:"https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap", familia:'"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
    {nome:"Arial", link:"", familia:"Arial,Helvetica,sans-serif"}
  ]
};
const CORES_INFO = [
  {k:"marfim", r:"Fundo da página"},
  {k:"areia", r:"Fundo suave / hover"},
  {k:"papel", r:"Fundos de cartões"},
  {k:"linha", r:"Bordas e divisores"},
  {k:"tinta", r:"Texto principal"},
  {k:"tinta-suave", r:"Texto secundário"},
  {k:"ouro", r:"Cor de destaque / botões"},
  {k:"ouro-claro", r:"Destaque claro"},
  {k:"ouro-fraco", r:"Fundo de destaque"},
  {k:"rosa", r:"Tom rosa (detalhes)"},
  {k:"rosa-claro", r:"Tom rosa claro"},
  {k:"salvia", r:"Tom verde-salvia"},
  {k:"zap", r:"WhatsApp / confirmações"}
];
function irPara(aba){
  $$(".aba").forEach(b=>b.classList.toggle("on", b.dataset.aba===aba));
  $$(".aba-conteudo").forEach(s=>s.classList.toggle("on", s.id==="aba-"+aba));
  $("#tituloAba").textContent = TITULOS[aba] || aba;
  menuMobile(false);
  const cargas = {
    painel: ()=>carregarPainel(),
    paginas: ()=>carregarConteudo("aba-paginas", "paginas"),
    lista: ()=>carregarConteudo("aba-lista", "lista"),
    visual: ()=>carregarVisual(),
    produtos: ()=>carregarProdutos(),
    pedidos: ()=>carregarPedidos(),
    clientes: ()=>carregarClientes(),
    vendidos: ()=>carregarRelatorios(),
    config: ()=>carregarConfig()
  };
  if(cargas[aba]) cargas[aba]();
}
window.__adminIrPara = aba => { if(!tok()) return; irPara(aba); };
$$(".aba").forEach(b=>b.addEventListener("click", ()=>irPara(b.dataset.aba)));
function menuMobile(abrir){
  const m = $("#menu");
  const v = $("#veuMenu");
  const on = abrir === undefined ? !m.classList.contains("on") : abrir;
  m.classList.toggle("on", on);
  if(v) v.hidden = !on;
  $("#hamburguer").setAttribute("aria-expanded", String(on));
}
$("#hamburguer").addEventListener("click", ()=>menuMobile());
$("#veuMenu").addEventListener("click", ()=>menuMobile(false));
$("#sair").addEventListener("click", sair);

/* mostrar / ocultar senha no login */
$("#verSenha").addEventListener("click", ()=>{
  const inp = $("#senhaLogin");
  const show = inp.type === "password";
  inp.type = show ? "text" : "password";
  const b = $("#verSenha");
  b.textContent = show ? "🙈" : "👁";
  b.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
  b.setAttribute("aria-pressed", String(show));
});

/* mostrar / ocultar em qualquer campo de senha com [data-ver] (redefinição, troca) */
document.addEventListener("click", e=>{
  const b = e.target.closest("[data-ver]");
  if(!b) return;
  const inp = document.getElementById(b.dataset.ver);
  if(!inp) return;
  const show = inp.type === "password";
  inp.type = show ? "text" : "password";
  b.textContent = show ? "🙈" : "👁";
  b.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
  b.setAttribute("aria-pressed", String(show));
});

/* ESC fecha modal de produto e menu mobile */
document.addEventListener("keydown", e=>{
  if(e.key==="Escape"){
    if(!$("#modProduto").hidden) $("#modProduto").hidden = true;
    else menuMobile(false);
  }
});

/* avisa antes de sair com bloco não salvo */
window.addEventListener("beforeunload", e=>{
  if(document.querySelector(".btn-primario.pendente")){
    e.preventDefault();
    e.returnValue = "";
  }
});

/* badges do menu: novos pedidos, capturas de popup e total de produtos */
async function atualizarBadges(){
  try{
    const r = await api("/api/admin/resumo");
    const ped = $("#contaPedidos");
    if(ped){
      ped.hidden = !(r.pedidos_novos > 0);
      ped.textContent = r.pedidos_novos > 99 ? "99+" : String(r.pedidos_novos);
    }
    const cli = $("#contaClientes");
    if(cli){
      cli.hidden = !(r.popup_novos > 0);
      cli.textContent = r.popup_novos > 99 ? "99+" : String(r.popup_novos);
    }
    const novos = $("#contaNovos");
    if(novos){
      novos.hidden = !(r.pedidos_novos > 0);
      novos.textContent = r.pedidos_novos > 99 ? "99+" : String(r.pedidos_novos);
    }
    const cp = $("#contaProdutos");
    if(cp){
      cp.hidden = !(r.produtos > 0);
      cp.textContent = r.produtos > 99 ? "99+" : String(r.produtos);
      cp.style.background = "var(--ouro)";
    }
  }catch(e){}
}

function sair(){
  try{ fetch("/api/logout"+QLOJA, {method:"POST", headers:{"Authorization":"Bearer "+tok()}}).catch(()=>{}); }catch(e){}
  sessionStorage.removeItem("tok");
  location.reload();
}

/* ---------- login ---------- */
const TOKEN_RESET = (()=>{ try{ return new URLSearchParams(location.search).get("reset") || ""; }catch(e){ return ""; } })();
if(TOKEN_RESET){
  $("#formLogin").hidden = true;
  $("#formReset").hidden = false;
}
$("#formReset").addEventListener("submit", async e=>{
  e.preventDefault();
  const e1 = $("#novaReset").value, e2 = $("#novaReset2").value;
  const mostra = m => { const x = $("#erroReset"); x.textContent = m; x.hidden = false; };
  if(e1 !== e2){ mostra("As senhas não conferem."); return; }
  if(e1.length < 6){ mostra("A senha precisa de pelo menos 6 caracteres."); return; }
  try{
    const r = await fetch("/api/redefinir-senha"+QLOJA, {method:"POST",
      headers:{"Content-Type":"application/json"}, body:JSON.stringify({token:TOKEN_RESET, nova:e1})});
    const j = await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.erro || "não foi possível redefinir");
    toast("Senha redefinida! Entre com a nova senha.");
    location.search = QLOJA; // limpa o token da URL
  }catch(err){ mostra(err.message); }
});
$("#formLogin").addEventListener("submit", async e=>{
  e.preventDefault();
  const senha = $("#senhaLogin").value;
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true;
  try{
    const r = await fetch("/api/login"+QLOJA, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({senha})});
    if(r.status === 429) throw new Error("muitas tentativas — aguarde um minuto");
    if(!r.ok) throw new Error("erro");
    const j = await r.json();
    sessionStorage.setItem("tok", j.token);
    entrar();
  }catch(err){
    const x = $("#erroLogin");
    x.textContent = err.message.includes("tentativas") ? "Muitas tentativas. Aguarde um minuto e tente de novo." : "Senha incorreta.";
    x.hidden = false;
  }finally{
    btn.disabled = false;
  }
});

async function entrar(){
  try{
    await api("/api/admin/resumo");
    CFG = garantirItensDestaques(await api("/api/admin/config").catch(()=>null));
    aplicarVisualAdmin();
    $("#login").classList.remove("on");
    $("#app").classList.add("on");
    atualizarBadges();
    irPara(ABA_INICIAL || "painel");
  }catch(e){
    sair();
  }
}

function aplicarVisualAdmin(){
  /* painel em dark fixo (igual ao superadmin): aplica só a logo da loja,
     as cores valem para o site — confira em "Ver o site" */
  if(!CFG) return;
  try{
    const nome = (CFG.geral && CFG.geral.nome) || "Minha loja";
    document.title = "Painel · " + nome;
    const nm = $("#nomeMenu"); if(nm) nm.textContent = nome;
    const vs = $("#verSite"); if(vs && typeof QLOJA !== "undefined") vs.href = "/" + QLOJA;
  }catch(e){}
  if(!CFG.visual) return;
  const logo = CFG.visual.logo;
  if(logo){
    const src = fotoSrc(logo);
    const a = $("#logoLogin"); if(a) a.src = src;
    const b = $("#logoMenu"); if(b) b.src = src;
  }
}

/* ---------- conteúdo editável (schema) ---------- */
/* tipo: text | textarea | html | number */
function garantirItensDestaques(cfg){
  if(!cfg || typeof cfg !== "object") return cfg;
  if(!cfg.destaques || typeof cfg.destaques !== "object") cfg.destaques = {};
  if(!Array.isArray(cfg.destaques.itens)){
    cfg.destaques.itens = (Array.isArray(cfg.destaques.ids) ? cfg.destaques.ids : []).map(id=>({id:String(id)}));
  }
  return cfg;
}
const SCHEMA = [
  {id:"geral", tab:"paginas", rotulo:"Nome, logo e contato", campos:[
    {k:"nome", r:"Nome da loja", t:"text"},
    {k:"tagline", r:"Frase curta", t:"text"},
    {k:"title", r:"Título da página (SEO)", t:"text"},
    {k:"descricao", r:"Descrição (meta, SEO)", t:"textarea"},
    {k:"instagram", r:"Link do Instagram", t:"text"},
    {k:"zap", r:"WhatsApp (só números, com DDI)", t:"text", d:"Ex.: 5516991038587"},
    {k:"zap_tel", r:"WhatsApp (texto exibido)", t:"text", d:"Ex.: (16) 99103-8587"},
    {k:"prazo_producao", r:"Prazo exibido no modal", t:"text"},
    {k:"pixel_meta", r:"Pixel da Meta (só números)", t:"text", d:"ID em Gerenciador de Anúncios › Fontes de dados. Vazio = medição desligada."},
    {k:"ga4_id", r:"GA4 (ID de mensuração)", t:"text", d:"Ex.: G-ABC123XY. Vazio = medição desligada."}
  ]},
  {id:"menu", base:"", tab:"paginas", rotulo:"Menu do topo", array:"menu", arrayCampos:[
    {k:"t", r:"Texto (ex.: Catálogo)", t:"text"},
    {k:"href", r:"Link (ex.: #catalogo ou https://...)", t:"text"}
  ]},
  {id:"botoes", base:"", tab:"paginas", rotulo:"Estilo dos botões", campos:[
    {k:"botoes.formato", r:"Formato", t:"select", op:[{v:"padrao",r:"Padrão (combinando com o site)"},{v:"pill",r:"Arredondado (pílula)"},{v:"quadrado",r:"Quadrado"}]},
    {k:"botoes.caixa", r:"Texto", t:"select", op:[{v:"alta",r:"MAIÚSCULAS"},{v:"normal",r:"Normal"}]}
  ]},
  {id:"hero", tab:"paginas", rotulo:"Capa inicial", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título (aceita <br> e <em>)", t:"html"},
    {k:"lead", r:"Texto de apoio", t:"html"},
    {k:"cta1", r:"Botão 1", t:"text"},
    {k:"cta2", r:"Botão 2", t:"text"},
    {k:"nota", r:"Nota (frete)", t:"html"},
    {k:"fita1", r:"Selo - linha 1", t:"text"},
    {k:"fita2", r:"Selo - linha 2", t:"text"}
  ]},
  {id:"selos", base:"", tab:"paginas", rotulo:"Diferenciais (faixa de confiança)", array:"selos", arrayCampos:[
    {k:"t", r:"Título", t:"text"},
    {k:"s", r:"Detalhe", t:"text"},
    {k:"icone", r:"Ícone da biblioteca (opcional, ex.: icons/base-estrela.svg)", t:"text"}
  ]},
  {id:"destaques", tab:"paginas", rotulo:"Destaques", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"}
  ], array:"itens", arrayCampos:[
    {k:"id", r:"ID do produto (opcional)", t:"text", d:"Com produto, o botão adiciona à Minha Lista. Vazio = card editorial."},
    {k:"midia", r:"Imagem ou vídeo (caminho)", t:"text", d:"Ex.: img/foto.webp ou video/video.mp4. Para enviar arquivo, use o editor visual."},
    {k:"titulo", r:"Título", t:"text", d:"Vazio usa o nome do produto."},
    {k:"texto", r:"Texto", t:"html", d:"Vazio usa a descrição do produto."},
    {k:"preco", r:"Preço (texto)", t:"text", d:"Ex.: R$ 59,90. Vazio usa o preço do produto."},
    {k:"preco_nota", r:"Observação do preço", t:"text"},
    {k:"selo", r:"Selo", t:"text"},
    {k:"botao", r:"Texto do botão", t:"text"},
    {k:"link", r:"Link sem produto", t:"text", d:"Ex.: #catalogo ou URL completa."}
  ]},
  {id:"oficio", tab:"paginas", rotulo:"Sobre a loja", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"},
    {k:"citacao", r:"Citação", t:"html"},
    {k:"lead", r:"Texto", t:"html"},
    {k:"fe1", r:"Item 1", t:"html"},
    {k:"fe2", r:"Item 2", t:"html"},
    {k:"fe3", r:"Item 3", t:"html"},
    {k:"cta", r:"Botão", t:"text"}
  ]},
  {id:"catalogo", tab:"paginas", rotulo:"Catálogo", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"},
    {k:"lead", r:"Texto de apoio", t:"html"},
    {k:"busca_placeholder", r:"Exemplo dentro da busca (por segmento)", t:"text", d:"Ex.: doceria: “Buscar por bolo, doce ou festa…”"},
    {k:"prazo", r:"Aviso de prazo", t:"html"},
    {k:"nota", r:"Nota (sob encomenda)", t:"html"}
  ]},
  {id:"encomenda", tab:"paginas", rotulo:"Sob encomenda", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"},
    {k:"lead", r:"Texto", t:"html"},
    {k:"botao", r:"Botão", t:"text"}
  ], array:"passos", arrayCampos:[
    {k:"t", r:"Passo - título", t:"text"},
    {k:"s", r:"Passo - detalhe", t:"html"}
  ]},
  {id:"devocoes", tab:"paginas", rotulo:"Coleções (botões de filtro)", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"},
    {k:"lead", r:"Texto", t:"html"}
  ], array:"itens", arrayCampos:[
    {k:"t", r:"Coleção (vira botão ao ter produtos; sem produtos, vira selo)", t:"text"}
  ]},
  {id:"ocasioes", tab:"paginas", rotulo:"Ocasiões", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"}
  ], array:"itens", arrayCampos:[
    {k:"img", r:"Foto (arquivo em img/)", t:"text"},
    {k:"titulo", r:"Título", t:"text"},
    {k:"sub", r:"Subtítulo", t:"text"}
  ]},
  {id:"oracao", tab:"paginas", rotulo:"Frase de destaque", campos:[
    {k:"texto", r:"Texto da oração", t:"html"},
    {k:"autor", r:"Assinatura", t:"text"}
  ]},
  {id:"misterios", tab:"paginas", rotulo:"Como rezar", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"},
    {k:"lead", r:"Texto", t:"html"}
  ], array:"itens", arrayCampos:[
    {k:"dia", r:"Dias", t:"text"},
    {k:"titulo", r:"Título", t:"text"},
    {k:"texto", r:"Texto", t:"html"}
  ]},
  {id:"sobre", tab:"paginas", rotulo:"A história", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"},
    {k:"p1", r:"Parágrafo 1", t:"html"},
    {k:"p2", r:"Parágrafo 2", t:"html"},
    {k:"p3", r:"Parágrafo 3", t:"html"},
    {k:"cta", r:"Botão", t:"text"}
  ], array:"numeros", arrayCampos:[
    {k:"v", r:"Valor", t:"text"},
    {k:"s", r:"Legenda", t:"text"}
  ]},
  {id:"depoimentos", tab:"paginas", rotulo:"Avaliações de clientes", campos:[
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
  {id:"final", tab:"paginas", rotulo:"Convite final (WhatsApp)", campos:[
    {k:"chapeu", r:"Chamada pequena", t:"text"},
    {k:"titulo", r:"Título", t:"html"},
    {k:"lead", r:"Texto", t:"html"},
    {k:"cta1", r:"Botão 1", t:"text"},
    {k:"cta2", r:"Botão 2", t:"text"}
  ]},
  {id:"popup", base:"", tab:"paginas", rotulo:"Popup de captura", campos:[
    {k:"popup.ativo", r:"Exibir popup", t:"check", d:"Aparece 1x por aparelho no intervalo abaixo. Prévia: abra o site com ?previa-popup=1 no endereço."},
    {k:"popup.titulo", r:"Título", t:"text"},
    {k:"popup.texto", r:"Texto", t:"textarea"},
    {k:"popup.botao", r:"Texto do botão", t:"text"},
    {k:"popup.cupom", r:"Cupom exibido após enviar (opcional)", t:"text", d:"Ex.: BLACK10. Vazio = mostra só agradecimento."},
    {k:"popup.aviso", r:"Aviso de consentimento (LGPD)", t:"text"},
    {k:"popup.atraso", r:"Atraso para exibir (segundos)", t:"number"},
    {k:"popup.intervalo", r:"Não mostrar de novo por (dias)", t:"number"},
    {k:"popup.inicio", r:"Promoção: começa em (opcional)", t:"data", d:"Ex.: Black Friday 28/11. Vazio = sem data de início."},
    {k:"popup.fim", r:"Promoção: termina em (opcional)", t:"data", d:"Fora da janela o popup não aparece; dentro, mostra contagem regressiva."}
  ]},
  {id:"rodape", tab:"paginas", rotulo:"Rodapé", campos:[
    {k:"titulo", r:"Título", t:"text"},
    {k:"sobre", r:"Sobre", t:"html"},
    {k:"cat_titulo", r:"Coluna Catálogo", t:"text"},
    {k:"como_titulo", r:"Coluna Como comprar", t:"text"},
    {k:"nota_base", r:"Nota final", t:"html"}
  ]},
  {id:"carrinho", tab:"lista", rotulo:"A lista de pedidos", campos:[
    {k:"titulo", r:"Título da gaveta", t:"text"},
    {k:"resumo_vazio", r:"Resumo quando vazio", t:"text"},
    {k:"obs_rot", r:"Rótulo do campo de observação", t:"text"},
    {k:"obs_placeholder", r:"Exemplo do campo de observação", t:"text"},
    {k:"nome_rot", r:"Rótulo do campo de nome", t:"text"},
    {k:"nome_placeholder", r:"Exemplo do campo de nome", t:"text"},
    {k:"whats_rot", r:"Rótulo do campo de WhatsApp", t:"text"},
    {k:"whats_placeholder", r:"Exemplo do campo de WhatsApp", t:"text"},
    {k:"cep_rot", r:"Rótulo do campo de CEP", t:"text"},
    {k:"cep_placeholder", r:"Exemplo do campo de CEP", t:"text"},
    {k:"total_rot", r:"Rótulo do total", t:"text"},
    {k:"botao", r:"Botão de fechar pedido", t:"text"},
    {k:"msg_modelo", r:"Mensagem enviada no pedido", t:"textarea", d:"Use {loja}, {itens}, {total}, {combinar}, {observacao}, {cliente}, {entrega}, {nome}, {whatsapp} e {cep}. Mantenha {itens} e {total}. Em branco = texto padrão."},
    {k:"nota", r:"Nota final", t:"html"},
    {k:"nota_combinar", r:"Aviso de valor a combinar", t:"html"},
    {k:"vazio_titulo", r:"Título quando a lista está vazia", t:"text"},
    {k:"vazio_texto", r:"Texto quando a lista está vazia", t:"text"}
  ]},
  {id:"contato", tab:"lista", rotulo:"Contato da loja", campos:[
    {k:"geral.zap", r:"WhatsApp (só números, com DDI)", t:"text"},
    {k:"geral.zap_tel", r:"WhatsApp (texto exibido)", t:"text"},
    {k:"zap.msg_ola", r:"Mensagem dos botões de WhatsApp", t:"textarea", d:"Texto que o cliente envia ao tocar nos botões do site. Use {NOME} para o nome da loja."},
    {k:"zap.msg_encomenda", r:"Mensagem de encomenda personalizada", t:"textarea", d:"Texto do botão de encomenda. Use {NOME} para o nome da loja."}
  ]}
];

function obter(secao, caminho){
  const val = caminho.split(".").reduce((v,s)=> v==null ? undefined : v[s], CFG);
  return val===undefined||val===null ? "" : val;
}
function setCaminho(alvo, caminho, val){
  const partes = caminho.split(".");
  let v = alvo;
  for(let i=0;i<partes.length-1;i++){
    const s = partes[i];
    if(v[s]==null || typeof v[s]!=="object") v[s] = {};
    v = v[s];
  }
  v[partes[partes.length-1]] = val;
}

function campoHtml(campo, prefixo){
  const path = prefixo ? prefixo+"."+campo.k : campo.k;
  const v = obter(null, path);
  let inp;
  if(campo.t==="textarea" || campo.t==="html"){
    inp = `<textarea data-path="${path}" rows="${campo.t==="html"?4:3}">${escapeHtml(String(v))}</textarea>`;
  } else if(campo.t==="select"){
    inp = `<select data-path="${path}">${(campo.op||[]).map(o=>`<option value="${escapeHtml(o.v)}"${String(v)===String(o.v)?" selected":""}>${escapeHtml(o.r)}</option>`).join("")}</select>`;
  } else if(campo.t==="check"){
    inp = `<label class="check"><input type="checkbox" data-path="${path}"${v===true||v==="true"||v===1?" checked":""}> Mostrar na loja</label>`;
  } else if(campo.t==="data"){
    inp = `<input data-path="${path}" type="datetime-local" value="${escapeHtml(String(v||""))}">`;
  } else if(campo.t==="number"){
    inp = `<input data-path="${path}" data-num="1" type="number" step="0.01" value="${escapeHtml(String(v))}">`;
  } else {
    inp = `<input data-path="${path}" value="${escapeHtml(String(v))}">`;
  }
  return `<div class="campo ${campo.t==="html"?"inteiro":""}">
    <label>${campo.r}</label>${inp}
    ${campo.d?`<div class="dica">${campo.d}</div>`:""}
  </div>`;
}

function arrayHtml(campos, caminho, valor, rotulo){
  const lista = Array.isArray(valor) && valor.length ? valor : [{}];
  const linhas = lista.map((_,i)=>{
    const base = `${caminho}.${i}`;
    return `<div class="grupo-campos" data-linha style="border:1px solid var(--linha);border-radius:10px;padding:14px;margin-top:10px;grid-column:1/-1;position:relative">
      ${campos.map(c=>campoHtml(c, base)).join("")}
      <div style="grid-column:1/-1;text-align:right"><button type="button" class="btn-mini" data-move-linha="-1" aria-label="Subir linha">↑</button>
      <button type="button" class="btn-mini" data-move-linha="1" aria-label="Descer linha">↓</button>
      <button type="button" class="btn-perigo" data-rm-linha>Remover</button></div>
    </div>`;
  }).join("");
  return `<div class="inteiro"><b style="font-size:13px;color:var(--tinta-suave)">${rotulo}</b></div>` +
    `<div data-array="${caminho}" style="display:contents">${linhas}</div>` +
    `<div class="inteiro" style="margin-top:10px"><button type="button" class="btn-secundario" data-add-linha="1">＋ Adicionar</button></div>`;
}

/* presets de campanha do popup: preenchem os campos, é só salvar */
const POPUP_PRESETS = {
  boasvindas:{titulo:"Ganhe 10% na primeira peça 🤍",texto:"Deixe seu nome e WhatsApp que enviamos seu cupom de boas-vindas.",botao:"Quero meu cupom",cupom:"BEMVINDA10",aviso:"Ao enviar, você concorda em receber novidades no WhatsApp.",atraso:25,intervalo:7,inicio:"",fim:""},
  black:{titulo:"BLACK FRIDAY — até 30% OFF 🔥",texto:"Cadastre-se e receba o cupom secreto + aviso das ofertas antes de todo mundo.",botao:"Quero o cupom BLACK",cupom:"BLACK10",aviso:"Ao enviar, você concorda em receber as ofertas no WhatsApp.",atraso:12,intervalo:2,inicio:"",fim:""},
  queima:{titulo:"Promoção — últimas peças 🏷️",texto:"Deixe seu WhatsApp e garanta condições especiais nas últimas unidades.",botao:"Quero aproveitar",cupom:"",aviso:"Ao enviar, você concorda em receber novidades no WhatsApp.",atraso:18,intervalo:3,inicio:"",fim:""}
};
function ligarPresets(alvo){
  const bloco = alvo.querySelector('[data-secao="popup"]');
  if(!bloco || bloco.querySelector("[data-presets]")) return;
  const barra = bloco.querySelector(".barra-tools");
  if(!barra) return;
  const nav = document.createElement("div");
  nav.setAttribute("data-presets","");
  nav.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;flex-basis:100%;margin-bottom:4px";
  nav.innerHTML = `<span class="descricao-campo" style="flex-basis:100%">Preencher com modelo:</span>` +
    [["boasvindas","Boas-vindas"],["black","Black Friday"],["queima","Promoção"]]
      .map(([k,r])=>`<button type="button" class="btn-secundario" data-preset="${k}">${r}</button>`).join("");
  barra.prepend(nav);
  nav.querySelectorAll("[data-preset]").forEach(b=>b.addEventListener("click", ()=>{
    const p = POPUP_PRESETS[b.dataset.preset];
    if(!p) return;
    Object.entries(p).forEach(([k,v])=>{
      const inp = bloco.querySelector(`[data-path="popup.${k}"]`);
      if(!inp || inp.type==="checkbox") return;
      inp.value = v;
    });
    const at = bloco.querySelector('[data-path="popup.ativo"]');
    if(at && at.type==="checkbox") at.checked = true;
    bloco.dispatchEvent(new Event("input", {bubbles:true}));
    toast("Modelo aplicado. Confira as datas e salve.");
  }));
}
function reindexar(container){
  const base = container.dataset.array;
  [...container.querySelectorAll("[data-linha]")].forEach((linha,i)=>{
    linha.querySelectorAll("[data-path]").forEach(inp=>{
      const k = inp.dataset.path.split(".").pop();
      inp.dataset.path = `${base}.${i}.${k}`;
    });
  });
}
function ligarLinhas(alvo){
  alvo.querySelectorAll("[data-add-linha]").forEach(btn=>{
    if(btn.dataset.ligado) return;
    btn.dataset.ligado = "1";
    btn.addEventListener("click", ()=>{
      const bloco = btn.closest("[data-secao]");
      const box = bloco.querySelector("[data-array]");
      const modelo = box.querySelector("[data-linha]");
      if(!modelo) return;
      const nova = modelo.cloneNode(true);
      nova.querySelectorAll("input,textarea,select").forEach(el=>{ el.value = ""; });
      box.appendChild(nova);
      reindexar(box);
      bloco.dispatchEvent(new Event("input", {bubbles:true}));
    });
  });
  alvo.querySelectorAll("[data-rm-linha]").forEach(btn=>{
    if(btn.dataset.ligado) return;
    btn.dataset.ligado = "1";
    btn.addEventListener("click", ()=>{
      const bloco = btn.closest("[data-secao]");
      const box = bloco.querySelector("[data-array]");
      const linha = btn.closest("[data-linha]");
      if(box.querySelectorAll("[data-linha]").length<=1){
        linha.querySelectorAll("input,textarea,select").forEach(el=>{ el.value = ""; });
      } else {
        linha.remove();
      }
      reindexar(box);
      bloco.dispatchEvent(new Event("input", {bubbles:true}));
    });
  });
  alvo.querySelectorAll("[data-move-linha]").forEach(btn=>{
    if(btn.dataset.ligado) return;
    btn.dataset.ligado = "1";
    btn.addEventListener("click", ()=>{
      const bloco = btn.closest("[data-secao]");
      const box = bloco.querySelector("[data-array]");
      const linhas = [...box.querySelectorAll("[data-linha]")];
      const linha = btn.closest("[data-linha]");
      const i = linhas.indexOf(linha), j = i + parseInt(btn.dataset.moveLinha, 10);
      if(i<0 || j<0 || j>=linhas.length) return;
      if(j<i) box.insertBefore(linha, linhas[j]);
      else box.insertBefore(linha, linhas[j].nextSibling);
      reindexar(box);
      bloco.dispatchEvent(new Event("input", {bubbles:true}));
    });
  });
}

function escapeHtml(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function montarSecao(secao){
  /* base: prefixo dos caminhos (secao.id por padrão; "" = raiz; chaves com "." vão como estão) */
  const base = secao.base !== undefined ? secao.base : secao.id;
  const fk = k => k.includes(".") ? k : (base ? base+"."+k : k);
  let campos = (secao.campos||[]).map(c=>campoHtml(Object.assign({}, c, {k: fk(c.k)}), "")).join("");
  if(secao.array){
    const val = obter(null, fk(secao.array));
    campos += arrayHtml(secao.arrayCampos, fk(secao.array), val, "Repita os campos abaixo (uma linha por item)");
  }
  if(secao.array2){
    const val = obter(null, fk(secao.array2));
    campos += arrayHtml(secao.array2Campos, fk(secao.array2), val, "Números da faixa de prova social");
  }
  return `<div class="cartao-bloco" data-secao="${secao.id}">
    <h3>${secao.rotulo}</h3>
    <div class="grupo-campos">${campos}</div>
    <div class="barra-tools">
      <span class="descricao-campo">Campos com * aceitam HTML simples (&lt;b&gt;, &lt;em&gt;, &lt;br&gt;).</span>
      <button class="btn-primario" data-salvar="${secao.id}">Salvar ${secao.rotulo.toLowerCase()}</button>
    </div>
  </div>`;
}

async function carregarConteudo(containerId, tab){
  const alvo = $("#"+containerId);
  if(!CFG){
    try{ CFG = garantirItensDestaques(await api("/api/admin/config")); }catch(e){ return; }
  }
  const secoes = SCHEMA.filter(s=>s.tab===tab);
  alvo.innerHTML = (tab==="paginas" ? `<nav class="nav-secoes" aria-label="Ir para a seção">${secoes.map(s=>`<button type="button" data-ir-secao="${s.id}">${s.rotulo}</button>`).join("")}</nav>` : "") + secoes.map(montarSecao).join("");
  if(tab==="paginas"){
    alvo.querySelectorAll("[data-ir-secao]").forEach(b=>b.addEventListener("click", ()=>{
      const el = alvo.querySelector(`[data-secao="${b.dataset.irSecao}"]`);
      if(!el) return;
      el.scrollIntoView({behavior:"smooth", block:"start"});
      el.classList.add("destaque");
      setTimeout(()=>el.classList.remove("destaque"), 1600);
      alvo.querySelectorAll("[data-ir-secao]").forEach(x=>x.classList.toggle("on", x===b));
    }));
  }
  alvo.querySelectorAll("[data-salvar]").forEach(b=>b.addEventListener("click", ()=>salvarSecao(b.dataset.salvar)));
  ligarLinhas(alvo);
  ligarPresets(alvo);
  /* rascunho não-salvo: marca o botão do bloco ao digitar */
  alvo.querySelectorAll("[data-secao]").forEach(bloco=>{
    bloco.addEventListener("input", ()=>{
      const b = bloco.querySelector("[data-salvar]");
      if(b && !b.classList.contains("pendente")){
        b.classList.add("pendente");
        b.textContent = "● " + b.textContent.replace(/^●\s*/, "");
      }
    });
  });
  /* destaque simples ao editar (opcional) */
}

async function salvarSecao(id){
  const bloco = document.querySelector(`[data-secao="${id}"]`);
  const btn = bloco ? bloco.querySelector("[data-salvar]") : null;
  const rotulo = btn ? btn.textContent.replace(/^●\s*/, "") : "";
  if(btn){ btn.disabled = true; btn.textContent = "Salvando…"; }
  const novo = JSON.parse(JSON.stringify(CFG));
  bloco.querySelectorAll("[data-path]").forEach(inp=>{
    let v = inp.value;
    if(inp.type==="checkbox") v = inp.checked;
    else if(inp.dataset.num) v = (v==="" ? null : parseFloat(String(v).replace(",",".")));
    setCaminho(novo, inp.dataset.path, v);
  });
  /* compacta as listas desta seção: remove linhas totalmente vazias e normaliza p/ array */
  try{
    const sec = SCHEMA.find(s=>s.id===id);
    const base = sec && sec.base!==undefined ? sec.base : (sec ? sec.id : "");
    const fk = k => k.includes(".") ? k : (base ? base+"."+k : k);
    [sec && sec.array, sec && sec.array2].filter(Boolean).forEach(a=>{
      const path = fk(a);
      const partes = path.split(".");
      let pai = novo;
      for(let i=0;i<partes.length-1;i++){ pai = pai==null ? undefined : pai[partes[i]]; }
      const alvo = pai==null ? undefined : pai[partes[partes.length-1]];
      if(alvo && typeof alvo==="object"){
        const arr = Object.keys(alvo)
          .filter(k=>/^\d+$/.test(k)).sort((x,y)=>x-y).map(k=>alvo[k])
          .filter(linha=>linha && typeof linha==="object" && Object.values(linha).some(v=>String(v==null?"":v).trim()!==""));
        pai[partes[partes.length-1]] = arr;
      }
    });
  }catch(e){}
  if(id === "destaques" && novo.destaques){
    const itens = Array.isArray(novo.destaques.itens) ? novo.destaques.itens : [];
    novo.destaques.ids = itens.map(it=>String((it && it.id) || "").trim()).filter(Boolean);
  }
  try{
    await api("/api/admin/config", {method:"PUT", body:novo});
    CFG = garantirItensDestaques(await api("/api/admin/config"));
    const aba = bloco.closest(".aba-conteudo");
    if(aba) carregarConteudo(aba.id, aba.id.replace(/^aba-/,""));
    toast("Conteúdo salvo. O site já está atualizado.");
  }catch(e){
    toast("Erro ao salvar: "+e.message);
  }finally{
    if(btn){ btn.disabled = false; btn.classList.remove("pendente"); btn.textContent = rotulo; }
  }
}

/* ---------- painel ---------- */
async function carregarPainel(){
  const sec = $("#aba-painel");
  const [r, ind] = await Promise.all([
    api("/api/admin/resumo").catch(()=>null),
    api("/api/admin/indicadores?periodo=30d").catch(()=>null)
  ]);
  if(!r){ sec.innerHTML = `<div class="cartao-bloco"><h3>Início</h3><p style="color:var(--tinta-suave)">Não foi possível carregar o resumo.</p></div>`; return; }
  const k = (ind && ind.kpis) || {};
  const card = (v,l,extra) => `<div class="card-kpi"><b>${v}</b><span>${l}</span>${extra?`<small>${extra}</small>`:""}</div>`;
  let html = `<div class="grid-kpi">
    ${card(r.produtos||0, "produtos no catálogo")}
    ${card(k.pedidos||0, "pedidos nos últimos 30 dias")}
    ${card(k.concluidos||0, "concluídos", `${k.taxa_conclusao||0}% de conclusão`)}
    ${card(k.cancelados||0, "cancelados", `${k.taxa_cancelamento||0}% de cancelamento`)}
    ${card(reais(k.receita||0), "receita concluída (30 dias)")}
    ${card(reais(k.ticket_medio||0), "ticket médio")}
    ${card(r.clientes||0, "clientes identificados")}
    ${card(k.popup_capturas||0, "capturas no popup", `${k.popup_conversao||0}% converteram`)}
  </div>`;

  const alertas = [];
  if(r.pedidos_novos > 0) alertas.push(`<button type="button" class="alerta-item" data-ir="pedidos"><span class="alerta-texto"><b>${r.pedidos_novos}</b> pedido(s) novo(s) para responder</span><span class="alerta-seta">→</span></button>`);
  if(k.em_producao > 0) alertas.push(`<button type="button" class="alerta-item" data-ir="pedidos"><span class="alerta-texto"><b>${k.em_producao}</b> pedido(s) em produção</span><span class="alerta-seta">→</span></button>`);
  if(r.popup_novos > 0) alertas.push(`<button type="button" class="alerta-item" data-ir="clientes"><span class="alerta-texto"><b>${r.popup_novos}</b> contato(s) do popup sem retorno</span><span class="alerta-seta">→</span></button>`);
  if(alertas.length){
    html += `<div class="cartao-bloco alertas"><h3>Precisa de atenção</h3><div class="alertas-lista">${alertas.join("")}</div></div>`;
  }

  const top = (ind && ind.top_produtos || []).slice(0,5);
  if(top.length){
    const max = Math.max(1, top[0].qtd);
    html += `<div class="cartao-bloco"><h3>Mais vendidos (30 dias)</h3><div class="ranking">` +
      top.map((p,i)=>`<div class="rank-linha">
        <span class="rank-pos">${i+1}</span>
        <div class="rank-info"><b>${escapeHtml(p.nome)}</b><span>${p.qtd} ${p.qtd===1?"peça":"peças"} em ${p.pedidos} ${p.pedidos===1?"pedido":"pedidos"} · ${reais(p.receita)}</span></div>
        <div class="rank-bar"><i style="width:${Math.round(p.qtd/max*100)}%"></i></div>
      </div>`).join("") + `</div>
      <div class="barra-tools"><button type="button" class="btn-secundario" data-ir="vendidos">Ver relatórios completos</button></div></div>`;
  } else {
    html += `<div class="cartao-bloco"><h3>Mais vendidos</h3>
      <p style="color:var(--tinta-suave)">Ainda não há pedidos concluídos. Quando você marcar um pedido como concluído, ele entra no ranking e na receita.</p></div>`;
  }
  sec.innerHTML = html;
  $$("#aba-painel [data-ir]").forEach(b => b.addEventListener("click", () => irPara(b.dataset.ir)));
}

/* ---------- produtos ---------- */
let FILTRO_PROD = {q:"", cat:"todas"};
async function carregarProdutos(){
  const alvo = $("#aba-produtos");
  alvo.innerHTML = `<div class="esqueleto-linha"></div><div class="esqueleto-linha"></div><div class="esqueleto-linha"></div>`;
  try{
    PRODUTOS = await api("/api/admin/produtos");
    IMAGENS = await api("/api/admin/imagens");
  }catch(e){ alvo.innerHTML = `<div class="cartao-bloco"><h3>Produtos</h3><p style="color:var(--tinta-suave)">Não foi possível carregar. Recarregue a página.</p></div>`; return; }
  desenharProdutos();
}

function desenharProdutos(){
  const alvo = $("#aba-produtos");
  const cats = [...new Set(PRODUTOS.map(p=>p.cat).filter(Boolean))].sort();
  const q = semAcento(FILTRO_PROD.q.trim());
  const lista = PRODUTOS.filter(p=>{
    if(FILTRO_PROD.cat !== "todas" && p.cat !== FILTRO_PROD.cat) return false;
    if(!q) return true;
    return semAcento((p.nome||"")+" "+(p.desc||"")+" "+(p.tag||"")+" "+(p.id||"")+" "+(p.colecao||"")).includes(q);
  }).sort((a,b)=> ordemDe(a)-ordemDe(b));
  ULTIMA_LISTA = lista.map(p=>p.id);
  alvo.innerHTML = `<div class="barra-tools" style="justify-content:space-between">
    <div class="descricao-campo">${PRODUTOS.length} produtos · ${lista.length} exibidos · setas ↑↓ mudam a sequência da vitrine · as alterações aparecem no site na hora</div>
    <button class="btn-primario" id="novoProduto">+ Novo produto</button>
  </div>
  <div class="barra-busca" role="search">
    <input type="search" id="buscaProd" placeholder="Buscar por nome, etiqueta ou id…" value="${escapeHtml(FILTRO_PROD.q)}" aria-label="Buscar produtos">
    <select id="filtroCatProd" aria-label="Filtrar por linha">
      <option value="todas">Todas as linhas</option>
      ${cats.map(c=>`<option value="${escapeHtml(c)}"${FILTRO_PROD.cat===c?" selected":""}>${escapeHtml(c)}</option>`).join("")}
    </select>
  </div>
  ${lista.length ? `<table class="tabela"><thead><tr>
    <th></th><th title="Posição na vitrine (modo Destaques)">Pos.</th><th>Nome</th><th>Linha</th><th>Coleção</th><th>Preço</th><th>Etiqueta</th><th></th>
  </tr></thead><tbody>
  ${lista.map(p=>`<tr>
    <td data-label="Foto"><img class="foto" src="${fotoSrc(p.foto)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"></td>
    <td data-label="Posição"><b>${typeof p.ordem==="number"?p.ordem:"—"}</b></td>
    <td data-label="Nome" class="nome">${escapeHtml(p.nome)}</td>
    <td data-label="Linha"><span class="pilula">${escapeHtml(p.cat||"")}</span></td>
    <td data-label="Coleção">${p.colecao?escapeHtml(p.colecao):"<span style='color:var(--tinta-suave)'>—</span>"}</td>
    <td data-label="Preço">${typeof p.preco==="number" ? reais(p.preco) : "Sob consulta"}</td>
    <td data-label="Etiqueta">${p.tag?`<span class="badge">${escapeHtml(p.tag)}</span>`:""}</td>
    <td data-label="Ações"><div class="acoes">
      <button class="btn-mini" data-sobe="${p.id}" aria-label="Subir ${escapeHtml(p.nome)} na vitrine">↑</button>
      <button class="btn-mini" data-desce="${p.id}" aria-label="Descer ${escapeHtml(p.nome)} na vitrine">↓</button>
      <button class="btn-mini" data-edita="${p.id}">Editar</button>
      <button class="btn-perigo" data-apaga="${p.id}">Apagar</button>
    </div></td>
  </tr>`).join("")}
  </tbody></table>` : `<div class="cartao-bloco"><h3>Nenhum produto encontrado</h3><p style="color:var(--tinta-suave)">${FILTRO_PROD.q||FILTRO_PROD.cat!=="todas" ? "Ajuste a busca ou o filtro acima." : "Clique em “+ Novo produto” para cadastrar o primeiro."}</p></div>`}`;

  alvo.querySelectorAll("[data-edita]").forEach(b=>b.addEventListener("click", ()=>editarProduto(b.dataset.edita)));
  alvo.querySelectorAll("[data-apaga]").forEach(b=>b.addEventListener("click", ()=>apagarProduto(b.dataset.apaga)));
  alvo.querySelectorAll("[data-sobe]").forEach(b=>b.addEventListener("click", ()=>moverProduto(b.dataset.sobe, -1)));
  alvo.querySelectorAll("[data-desce]").forEach(b=>b.addEventListener("click", ()=>moverProduto(b.dataset.desce, 1)));
  $("#novoProduto").addEventListener("click", ()=>abrirModalProduto());
  const bp = $("#buscaProd");
  let t = null;
  bp.addEventListener("input", ()=>{ clearTimeout(t); t = setTimeout(()=>{ FILTRO_PROD.q = bp.value; desenharProdutos(); const n=$("#buscaProd"); n.focus(); n.setSelectionRange(n.value.length,n.value.length); }, 180); });
  $("#filtroCatProd").addEventListener("change", e=>{ FILTRO_PROD.cat = e.target.value; desenharProdutos(); });
}

function preencherSelectFoto(){
  const sel = $("#pFoto");
  sel.innerHTML = IMAGENS.map(f=>`<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join("");
}

function abrirModalProduto(id){
  EDITANDO_PRODUTO = id || null;
  const p = id ? PRODUTOS.find(x=>x.id===id) : null;
  $("#modProdutoTitulo").textContent = p ? "Editar produto" : "Novo produto";
  $("#pNome").value = p ? p.nome : "";
  /* datalist: 6 fixas + linhas já usadas nos produtos (lojista pode digitar nova) */
  try{
    const fixas = [["essencial","Essencial"],["classico","Clássica"],["premium","Premium"],["luxo","Luxo"],["infantil","Para os pequenos"],["carro","Para o carro"]];
    const usadas = [...new Set((PRODUTOS||[]).map(x=>(x.cat||"").trim()).filter(Boolean))].sort();
    const vistas = new Set();
    $("#listaCats").innerHTML = fixas.concat(usadas.filter(c=>!fixas.some(f=>f[0]===c)).map(c=>[c,c]))
      .filter(([v,l])=>{ if(vistas.has(v)) return false; vistas.add(v); return true; })
      .map(([v,l])=>`<option value="${escapeHtml(v)}">${escapeHtml(l)}</option>`).join("");
  }catch(e){}
  $("#pCat").value = p ? (p.cat||"essencial") : "essencial";
  /* coleção: seleção fechada a partir da lista mestra (Conteúdo do site › Coleções) */
  try{
    const mestra = [...new Set((((CFG&&CFG.devocoes||{}).itens||[]).map(x=>String((x&&x.t)||x||"").trim()).filter(Boolean)))];
    const atual = p ? String(p.colecao||"").trim() : "";
    const opcoes = ["", ...mestra.filter(c=>c!==atual)];
    if(atual && !opcoes.includes(atual)) opcoes.push(atual);
    $("#pColecao").innerHTML = `<option value="">— Sem coleção —</option>` +
      opcoes.filter(c=>c).map(c=>`<option value="${escapeHtml(c)}"${c===atual?" selected":""}>${escapeHtml(c)}</option>`).join("");
    if(!mestra.length && !atual) $("#pColecao").innerHTML = `<option value="">— Crie coleções em Conteúdo do site › Coleções —</option>`;
  }catch(e){}
  $("#pPreco").value = p && typeof p.preco==="number" ? p.preco : "";
  $("#pOrdem").value = p && typeof p.ordem==="number" ? p.ordem : (p ? "" : (Math.max(0,...(PRODUTOS||[]).map(x=>typeof x.ordem==="number"?x.ordem:0))+1));
  $("#pTag").value = p ? (p.tag||"") : "";
  $("#pSelo").value = p ? (p.selo||"") : "";
  $("#pVideo").value = p ? (p.video||"") : "";
  $("#pDesc").value = p ? (p.desc||"") : "";
  preencherSelectFoto();
  const foto = p ? p.foto : "";
  let val = "";
  if(foto){
    val = temExt(foto) ? foto : (IMAGENS.find(f=>baseDe(f)===foto) || foto);
  } else {
    val = IMAGENS[0] || "";
  }
  if(val) $("#pFoto").value = val;
  atualizarPrevFoto();
  $("#modProduto").hidden = false;
}

function atualizarPrevFoto(){
  const val = $("#pFoto").value;
  const img = $("#pFotoPrev");
  if(val){ img.src = fotoSrc(val); img.hidden = false; }
  else img.hidden = true;
}

$("#pFoto").addEventListener("change", atualizarPrevFoto);
$("#fechaProduto").addEventListener("click", ()=>{ $("#modProduto").hidden = true; });
$("#cancelarProduto").addEventListener("click", ()=>{ $("#modProduto").hidden = true; });
/* ESC fecha o modal de produto + clique no véu */
$("#modProduto").addEventListener("click", e=>{ if(e.target.id==="modProduto") $("#modProduto").hidden = true; });
$("#pUpload").addEventListener("change", async e=>{
  const arq = e.target.files[0];
  if(!arq) return;
  if(arq.size > 8*1024*1024){ toast("Imagem muito grande (máx. 8 MB)"); return; }
  e.target.disabled = true;
  toast("Enviando imagem…");
  const leitor = new FileReader();
  leitor.onload = async ()=>{
    try{
      const r = await api("/api/admin/upload", {method:"POST", body:{nome:arq.name, dados:leitor.result}});
      IMAGENS.push(r.arquivo);
      preencherSelectFoto();
      $("#pFoto").value = r.arquivo;
      atualizarPrevFoto();
      toast("Imagem enviada.");
    }catch(err){ toast("Erro no envio: "+err.message); }
    finally{ e.target.disabled = false; e.target.value = ""; }
  };
  leitor.readAsDataURL(arq);
});

$("#formProduto").addEventListener("submit", async e=>{
  e.preventDefault();
  const precoStr = $("#pPreco").value.trim().replace(",",".");
  const preco = precoStr ? parseFloat(precoStr) : null;
  const ordemStr = $("#pOrdem").value.trim().replace(",",".");
  const ordem = ordemStr !== "" && isFinite(parseFloat(ordemStr)) ? parseFloat(ordemStr) : null;
  /* linha aceita valor novo: normaliza p/ slug (minúsculas, sem espaços/acentos) */
  const catRaw = $("#pCat").value.trim().toLowerCase();
  const cat = (catRaw.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"") || "essencial").slice(0,30);
  const prod = {
    nome: $("#pNome").value.trim(),
    cat,
    colecao: $("#pColecao").value.trim() || null,
    preco: (preco!==null && isFinite(preco)) ? preco : null,
    ordem,
    tag: $("#pTag").value.trim() || null,
    selo: $("#pSelo").value.trim() || null,
    video: $("#pVideo").value.trim() || null,
    desc: $("#pDesc").value.trim(),
    foto: $("#pFoto").value
  };
  if(!prod.nome){ toast("Informe o nome do produto."); return; }
  try{
    if(EDITANDO_PRODUTO) await api("/api/admin/produtos/"+encodeURIComponent(EDITANDO_PRODUTO), {method:"PUT", body:prod});
    else await api("/api/admin/produtos", {method:"POST", body:prod});
    $("#modProduto").hidden = true;
    toast("Produto salvo.");
    carregarProdutos();
  }catch(err){ toast("Erro ao salvar: "+err.message); }
});

function editarProduto(id){ abrirModalProduto(id); }

/* sequência da vitrine: ↑↓ troca a posição com o vizinho (modo Destaques) */
const ordemDe = p => typeof p.ordem==="number" && isFinite(p.ordem) ? p.ordem : 9999;
let ULTIMA_LISTA = [];
async function moverProduto(id, dir){
  const vis = ULTIMA_LISTA.includes(id) ? [...ULTIMA_LISTA] : [...(PRODUTOS||[])].sort((a,b)=>ordemDe(a)-ordemDe(b)).map(p=>p.id);
  const i = vis.indexOf(id), j = i + dir;
  if(i<0 || j<0 || j>=vis.length) return;
  const nid = vis[j];
  /* ordem global atual + troca dos dois de lugar + numeração 1..N explícita */
  const seq = [...(PRODUTOS||[])].sort((a,b)=>ordemDe(a)-ordemDe(b)).map(p=>p.id);
  const ia = seq.indexOf(id), ib = seq.indexOf(nid);
  if(ia<0 || ib<0) return;
  const t = seq[ia]; seq[ia] = seq[ib]; seq[ib] = t;
  toast("Salvando sequência…");
  try{
    for(let k=0;k<seq.length;k++){
      const p = PRODUTOS.find(x=>x.id===seq[k]);
      if(!p) continue;
      const n = k+1;
      if(p.ordem===n) continue;
      const corpo = Object.assign({}, p, {ordem:n});
      await api("/api/admin/produtos/"+encodeURIComponent(p.id), {method:"PUT", body:corpo});
      p.ordem = n;
    }
    toast("Posição atualizada.");
    carregarProdutos();
  }catch(err){ toast("Erro ao mover: "+err.message); carregarProdutos(); }
}

async function apagarProduto(id){
  const p = PRODUTOS.find(x=>x.id===id);
  if(!confirm(`Apagar "${p?p.nome:""}"? Essa ação não pode ser desfeita.`)) return;
  try{
    await api("/api/admin/produtos/"+encodeURIComponent(id), {method:"DELETE"});
    toast("Produto apagado.");
    carregarProdutos();
  }catch(err){ toast("Erro: "+err.message); }
}

/* ---------- pedidos ---------- */
const STATUS_LABEL = {novo:"Novo", em_producao:"Em produção", concluido:"Concluído", cancelado:"Cancelado"};
const PAGAMENTO_LABEL = {pendente:"Pendente", pago:"Pago", parcial:"Parcial", reembolsado:"Reembolsado"};
const ENTREGA_LABEL = {"":"A combinar", retirada:"Retirada", envio:"Envio"};
let ORDENS = [];
let FILTRO_PED = {q:"", status:"todos", periodo:"todos"};
let RESUMO_CLI = {total:0, popup:0, popup_convertidos:0, popup_conversao:0};
let CLIENTES = [];
let MSG_SEM_ZAP = [];
let FILTRO_CLI = {q:"", segmento:"todos"};
let PERIODO_REL = "30d";
let SERIE_MODO = "receita";
let TOP_MODO = "qtd";

function statusDe(v){
  const s = String(v && typeof v === "object" ? v.status : (v || "novo")).toLowerCase();
  if(s === "atendido") return "concluido";
  return STATUS_LABEL[s] ? s : "novo";
}
function chipStatus(v){
  const s = statusDe(v);
  return `<span class="pilula status-${s}">${STATUS_LABEL[s]}</span>`;
}
function telDe(l){
  let d = String((l && l.whatsapp) || "").replace(/\D/g, "");
  if(d.length === 10 || d.length === 11) d = "55" + d;
  return d;
}
function quando(ts){
  const s = String(ts || "");
  if(!s) return "—";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : s;
}
function dataCurta(s){
  const d = String(s || "").slice(0,10);
  return d ? d.split("-").reverse().join("/") : "—";
}
function resumoItens(l){
  return ((l && l.itens) || []).map(i => `${i.q || 1}x ${i.nome || "Peça"}`).join(", ") || "—";
}
function cortePeriodo(p){
  if(!p || p === "todos") return "";
  const d = new Date();
  d.setHours(0,0,0,0);
  const dias = {"7d":6, "30d":29, "90d":89, "12m":364}[p] ?? 29;
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0,10);
}
function noPeriodo(ts, p){
  const c = cortePeriodo(p);
  return !c || String(ts || "").slice(0,10) >= c;
}
function proximoStatus(st){
  st = statusDe(st);
  if(st === "novo") return "em_producao";
  if(st === "em_producao") return "concluido";
  return "novo";
}
function rotuloAvanco(st){
  st = statusDe(st);
  if(st === "novo") return "Iniciar";
  if(st === "em_producao") return "Concluir";
  return "Reabrir";
}

async function carregarPedidos(){
  const alvo = $("#aba-pedidos");
  alvo.innerHTML = `<div class="esqueleto-linha"></div><div class="esqueleto-linha"></div><div class="esqueleto-linha"></div>`;
  try{
    const leads = await api("/api/admin/leads");
    LEADS = leads;
    ORDENS = leads.filter(l => l.tipo === "pedido").map(l => Object.assign({}, l, {status:statusDe(l)}));
  }catch(e){
    alvo.innerHTML = `<div class="cartao-bloco"><h3>Pedidos</h3><p style="color:var(--tinta-suave)">Não foi possível carregar os pedidos.</p></div>`;
    return;
  }
  atualizarBadges();
  desenharPedidos();
}

function desenharPedidos(){
  const alvo = $("#aba-pedidos");
  const conta = {todos:ORDENS.length, novo:0, em_producao:0, concluido:0, cancelado:0};
  ORDENS.forEach(l => { conta[statusDe(l)]++; });
  const q = semAcento(FILTRO_PED.q.trim());
  const lista = ORDENS.filter(l => {
    if(FILTRO_PED.status !== "todos" && statusDe(l) !== FILTRO_PED.status) return false;
    if(!noPeriodo(l.ts, FILTRO_PED.periodo)) return false;
    if(!q) return true;
    return semAcento((l.nome||"")+" "+(l.whatsapp||"")+" "+telDe(l)+" "+(l.origem||"")+" "+(l.obs||"")+" "+(l.cep||"")+" "+((l.itens||[]).map(i=>i.nome).join(" "))).includes(q);
  });

  const abas = ["todos","novo","em_producao","concluido","cancelado"].map(s =>
    `<button type="button" class="seg${FILTRO_PED.status===s?" on":""}" data-fstatus="${s}" aria-pressed="${FILTRO_PED.status===s}">${s==="todos"?"Todos":STATUS_LABEL[s]} <span>${conta[s]||0}</span></button>`
  ).join("");

  let html = `<div class="topo-lista">
    <div class="segmentado" role="tablist" aria-label="Filtrar pedidos por status">${abas}</div>
  </div>
  <div class="barra-busca" role="search">
    <input type="search" id="buscaPed" placeholder="Buscar por cliente, WhatsApp, peça ou observação…" value="${escapeHtml(FILTRO_PED.q)}" aria-label="Buscar pedidos">
    <select id="periodoPed" aria-label="Período dos pedidos">
      <option value="todos"${FILTRO_PED.periodo==="todos"?" selected":""}>Todo o período</option>
      <option value="7d"${FILTRO_PED.periodo==="7d"?" selected":""}>Últimos 7 dias</option>
      <option value="30d"${FILTRO_PED.periodo==="30d"?" selected":""}>Últimos 30 dias</option>
      <option value="90d"${FILTRO_PED.periodo==="90d"?" selected":""}>Últimos 90 dias</option>
      <option value="12m"${FILTRO_PED.periodo==="12m"?" selected":""}>Últimos 12 meses</option>
    </select>
  </div>
  <div class="resumo-lista descricao-campo">${lista.length} ${lista.length===1?"pedido":"pedidos"} no filtro · ${conta.novo} novos · ${conta.em_producao} em produção</div>`;

  if(!lista.length){
    html += `<div class="cartao-bloco vazio"><h3>Nenhum pedido encontrado</h3>
      <p style="color:var(--tinta-suave)">${ORDENS.length ? "Ajuste a busca, o status ou o período." : "Quando alguém fechar a lista ou pedir uma peça pelo site, o pedido aparece aqui com os dados preenchidos."}</p></div>`;
  } else {
    html += `<table class="tabela tabela-pedidos"><thead><tr>
      <th>Status</th><th>Data</th><th>Cliente</th><th>Peças</th><th>Total</th><th>Ações</th>
    </tr></thead><tbody>${lista.map(l => {
      const st = statusDe(l);
      const tel = telDe(l);
      const zap = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(`Olá, ${l.nome||"tudo bem"}! Aqui é da loja sobre o seu pedido.`)}` : "";
      return `<tr class="${st==="novo"?"destaque-novo":""}">
        <td data-label="Status">${chipStatus(st)}${st==="cancelado"&&l.motivo_cancelamento?`<div class="motivo-cancelado">${escapeHtml(l.motivo_cancelamento)}</div>`:""}</td>
        <td data-label="Data">${quando(l.ts)}</td>
        <td data-label="Cliente"><div class="contato-detalhes">
          ${l.nome?`<b style="color:var(--tinta)">${escapeHtml(l.nome)}</b> `:""}
          ${l.whatsapp?`<a href="https://wa.me/${tel}" target="_blank" rel="noopener">${escapeHtml(l.whatsapp)}</a>`:""}
          <div class="origem-linha">${escapeHtml(l.origem||"site")}</div>
          ${l.cep?`<div>CEP/cidade: ${escapeHtml(l.cep)}</div>`:""}
        </div></td>
        <td data-label="Peças"><div class="contato-itens">${escapeHtml(resumoItens(l))}</div></td>
        <td data-label="Total">${typeof l.total==="number" ? reais(l.total) : "A combinar"}</td>
        <td data-label="Ações"><div class="acoes">
          ${zap?`<a class="btn-zap-adm" href="${zap}" target="_blank" rel="noopener">WhatsApp</a>`:""}
          <button class="btn-mini" type="button" data-avancar="${escapeHtml(l.id)}">${rotuloAvanco(st)}</button>
          <button class="btn-mini" type="button" data-detalhe="${escapeHtml(l.id)}">Detalhes</button>
          ${st!=="cancelado"?`<button class="btn-perigo" type="button" data-cancelar="${escapeHtml(l.id)}">Cancelar</button>`:""}
        </div></td>
      </tr>`;
    }).join("")}</tbody></table>`;
  }
  alvo.innerHTML = html;

  alvo.querySelectorAll("[data-fstatus]").forEach(b => b.addEventListener("click", () => {
    FILTRO_PED.status = b.dataset.fstatus;
    desenharPedidos();
  }));
  const busca = $("#buscaPed");
  let timer = null;
  if(busca) busca.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      FILTRO_PED.q = busca.value;
      desenharPedidos();
      const n = $("#buscaPed");
      if(n){ n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
    }, 180);
  });
  const per = $("#periodoPed");
  if(per) per.addEventListener("change", e => { FILTRO_PED.periodo = e.target.value; desenharPedidos(); });
  alvo.querySelectorAll("[data-avancar]").forEach(b => b.addEventListener("click", () => avancarPedido(b.dataset.avancar)));
  alvo.querySelectorAll("[data-detalhe]").forEach(b => b.addEventListener("click", () => abrirPedido(b.dataset.detalhe)));
  alvo.querySelectorAll("[data-cancelar]").forEach(b => b.addEventListener("click", () => abrirPedido(b.dataset.cancelar, "cancelado")));
}

async function avancarPedido(id){
  const l = ORDENS.find(x => x.id === id);
  if(!l) return;
  const novo = proximoStatus(l.status);
  try{
    await api("/api/admin/leads/"+encodeURIComponent(id), {method:"PUT", body:{status:novo}});
    toast(`Pedido marcado como ${STATUS_LABEL[novo].toLowerCase()}.`);
    carregarPedidos();
  }catch(e){ toast("Erro ao atualizar: "+e.message); }
}

function abrirPedido(id, statusInicial){
  const l = ORDENS.find(x => x.id === id);
  if(!l) return;
  let st = statusInicial || statusDe(l);
  const tel = telDe(l);
  const itens = (l.itens || []).map(i =>
    `<li><span>${i.q || 1}x ${escapeHtml(i.nome || "Peça")}</span><b>${typeof i.preco==="number"?reais(i.preco*(i.q||1)):"a combinar"}</b></li>`
  ).join("") || "<li><span>Sem itens registrados</span></li>";
  const opcoesStatus = Object.keys(STATUS_LABEL).map(s =>
    `<option value="${s}"${s===st?" selected":""}>${STATUS_LABEL[s]}</option>`).join("");
  const opcoesPag = Object.keys(PAGAMENTO_LABEL).map(s =>
    `<option value="${s}"${s===(l.pagamento||"pendente")?" selected":""}>${PAGAMENTO_LABEL[s]}</option>`).join("");
  const opcoesEnt = Object.keys(ENTREGA_LABEL).map(s =>
    `<option value="${s}"${s===(l.entrega||"")?" selected":""}>${ENTREGA_LABEL[s]}</option>`).join("");

  const modal = document.createElement("div");
  modal.className = "mod";
  modal.id = "modPedido";
  modal.innerHTML = `<div class="mod-caixa larga" role="dialog" aria-modal="true" aria-labelledby="tituloPedido">
    <div class="mod-topo"><h3 id="tituloPedido">Pedido ${escapeHtml(l.id || "")}</h3><button class="fechar" type="button" data-fechar aria-label="Fechar">✕</button></div>
    <div class="detalhe-pedido">
      <div class="detalhe-info">
        <p class="detalhe-cliente"><b>${escapeHtml(l.nome || "Cliente sem nome")}</b>
          ${tel?`<a href="https://wa.me/${tel}" target="_blank" rel="noopener">${escapeHtml(l.whatsapp)}</a>`:""}</p>
        <p class="descricao-campo">${quando(l.ts)} · ${escapeHtml(l.origem || "site")}</p>
        ${l.cep?`<p class="descricao-campo">CEP/cidade: ${escapeHtml(l.cep)}</p>`:""}
        ${l.obs?`<p class="descricao-campo">Observação: ${escapeHtml(l.obs)}</p>`:""}
        <ul class="lista-itens-pedido">${itens}</ul>
        <p class="total-pedido">Total: <b>${typeof l.total==="number"?reais(l.total):"A combinar"}</b></p>
        <div class="timeline">
          <div><span>Criado</span><b>${quando(l.ts)}</b></div>
          ${l.status_ts?`<div><span>Última mudança</span><b>${quando(l.status_ts)}</b></div>`:""}
          ${l.concluido_ts?`<div><span>Concluído</span><b>${quando(l.concluido_ts)}</b></div>`:""}
          ${l.cancelado_ts?`<div><span>Cancelado</span><b>${quando(l.cancelado_ts)}</b></div>`:""}
        </div>
      </div>
      <form id="formPedido" class="form-pedido">
        <label for="pedStatus">Status</label>
        <select id="pedStatus">${opcoesStatus}</select>
        <label for="pedMotivo">Motivo do cancelamento <span class="descricao-campo">(obrigatório ao cancelar)</span></label>
        <textarea id="pedMotivo" rows="2" placeholder="Ex.: cliente desistiu, sem estoque…">${escapeHtml(l.motivo_cancelamento || "")}</textarea>
        <div class="grade-form">
          <div><label for="pedPagamento">Pagamento</label><select id="pedPagamento">${opcoesPag}</select></div>
          <div><label for="pedEntrega">Entrega</label><select id="pedEntrega">${opcoesEnt}</select></div>
        </div>
        <div class="acoes acoes-form">
          <button class="btn-primario" type="submit">Salvar</button>
          <button class="btn-secundario" type="button" data-fechar>Fechar</button>
          <button class="btn-perigo" type="button" data-apagar-pedido>Apagar</button>
        </div>
      </form>
    </div>
  </div>`;
  document.body.appendChild(modal);
  const fechar = () => modal.remove();
  modal.querySelectorAll("[data-fechar]").forEach(b => b.addEventListener("click", fechar));
  modal.addEventListener("click", e => { if(e.target === modal) fechar(); });
  const esc = e => { if(e.key === "Escape"){ fechar(); document.removeEventListener("keydown", esc); } };
  document.addEventListener("keydown", esc);

  $("#formPedido").addEventListener("submit", async e => {
    e.preventDefault();
    const novo = $("#pedStatus").value;
    const motivo = $("#pedMotivo").value.trim();
    if(novo === "cancelado" && !motivo){
      toast("Informe o motivo do cancelamento.");
      $("#pedMotivo").focus();
      return;
    }
    try{
      await api("/api/admin/leads/"+encodeURIComponent(l.id), {method:"PUT",
        body:{status:novo, motivo_cancelamento:motivo,
              pagamento:$("#pedPagamento").value, entrega:$("#pedEntrega").value}});
      toast("Pedido atualizado.");
      fechar();
      carregarPedidos();
    }catch(err){ toast("Erro: "+err.message); }
  });
  modal.querySelector("[data-apagar-pedido]").addEventListener("click", async () => {
    if(!confirm("Apagar este pedido? Essa ação não pode ser desfeita.")) return;
    try{
      await api("/api/admin/leads/"+encodeURIComponent(l.id), {method:"DELETE"});
      toast("Pedido apagado.");
      fechar();
      carregarPedidos();
    }catch(err){ toast("Erro: "+err.message); }
  });
  if(st === "cancelado"){ $("#pedMotivo").focus(); }
}

/* ---------- clientes ---------- */
async function carregarClientes(){
  const alvo = $("#aba-clientes");
  alvo.innerHTML = `<div class="esqueleto-linha"></div><div class="esqueleto-linha"></div>`;
  try{
    const r = await api("/api/admin/clientes");
    CLIENTES = r.clientes || [];
    MSG_SEM_ZAP = r.mensagens_sem_whatsapp || [];
    RESUMO_CLI = {total:r.total||0, popup:r.popup||0,
                  popup_convertidos:r.popup_convertidos||0,
                  popup_conversao:r.popup_conversao||0};
  }catch(e){
    alvo.innerHTML = `<div class="cartao-bloco"><h3>Clientes</h3><p style="color:var(--tinta-suave)">Não foi possível carregar os clientes.</p></div>`;
    return;
  }
  atualizarBadges();
  desenharClientes();
}

function desenharClientes(){
  const alvo = $("#aba-clientes");
  const q = semAcento(FILTRO_CLI.q.trim());
  const lista = CLIENTES.filter(c => {
    if(FILTRO_CLI.segmento === "popup" && !c.popup) return false;
    if(FILTRO_CLI.segmento === "com_pedidos" && !(c.pedidos > 0)) return false;
    if(FILTRO_CLI.segmento === "sem_pedidos" && c.pedidos > 0) return false;
    if(!q) return true;
    return semAcento([c.nome, c.whatsapp, c.whatsapp_original, c.notas,
      (c.origens||[]).join(" "), (c.tags||[]).join(" ")].join(" ")).includes(q);
  });
  const segs = [["todos","Todos"],["popup","Do popup"],["com_pedidos","Com pedidos"],["sem_pedidos","Sem pedidos"]]
    .map(([k,r]) => `<button type="button" class="seg${FILTRO_CLI.segmento===k?" on":""}" data-fseg="${k}" aria-pressed="${FILTRO_CLI.segmento===k}">${r}</button>`).join("");

  let html = `<div class="grid-kpi grid-kpi-clientes">
    <div class="card-kpi"><b>${RESUMO_CLI.total}</b><span>clientes identificados</span></div>
    <div class="card-kpi"><b>${RESUMO_CLI.popup}</b><span>vieram do popup</span></div>
    <div class="card-kpi"><b>${RESUMO_CLI.popup_convertidos}</b><span>popup virou pedido</span></div>
    <div class="card-kpi"><b>${RESUMO_CLI.popup_conversao}%</b><span>conversão do popup</span></div>
  </div>
  <div class="segmentado" role="tablist" aria-label="Filtrar clientes">${segs}</div>
  <div class="barra-busca" role="search">
    <input type="search" id="buscaCli" placeholder="Buscar por nome, WhatsApp, origem, tag ou nota…" value="${escapeHtml(FILTRO_CLI.q)}" aria-label="Buscar clientes">
  </div>
  <div class="resumo-lista descricao-campo">${lista.length} ${lista.length===1?"cliente":"clientes"} no filtro · clique para ver o histórico</div>`;

  if(!lista.length){
    html += `<div class="cartao-bloco vazio"><h3>Nenhum cliente encontrado</h3>
      <p style="color:var(--tinta-suave)">${CLIENTES.length?"Ajuste a busca ou o segmento.":"Os dados preenchidos no popup, na sacola e nos botões de WhatsApp aparecem aqui, agrupados por WhatsApp."}</p></div>`;
  } else {
    html += `<table class="tabela tabela-clientes"><thead><tr>
      <th>Cliente</th><th>Origem</th><th>Pedidos</th><th>Total gasto</th><th>Última interação</th><th>Tags</th><th>Ações</th>
    </tr></thead><tbody>${lista.map(c => {
      const tel = String(c.whatsapp || "").replace(/\D/g, "");
      const origens = (c.origens || []).map(o =>
        `<span class="origem-chip${String(o).toLowerCase().startsWith("popup")?" popup":""}">${escapeHtml(o)}</span>`).join("");
      const tags = (c.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("");
      return `<tr>
        <td data-label="Cliente"><div class="contato-detalhes">
          <b style="color:var(--tinta)">${escapeHtml(c.nome || "Sem nome")}</b>
          <div>${c.whatsapp?`<a href="https://wa.me/${tel}" target="_blank" rel="noopener">${escapeHtml(c.whatsapp_original || c.whatsapp)}</a>`:""}</div>
          ${c.notas?`<div class="nota-cliente">${escapeHtml(c.notas)}</div>`:""}
        </div></td>
        <td data-label="Origem"><div class="origens-lista">${origens || "—"}</div></td>
        <td data-label="Pedidos"><b>${c.pedidos||0}</b> <span class="descricao-campo">(${c.concluidos||0} concl.)</span></td>
        <td data-label="Total gasto">${reais(c.total_gasto||0)}</td>
        <td data-label="Última interação">${quando(c.ultima_interacao)}</td>
        <td data-label="Tags"><div class="tags-lista">${tags || "—"}</div></td>
        <td data-label="Ações"><div class="acoes">
          ${tel?`<a class="btn-zap-adm" href="https://wa.me/${tel}" target="_blank" rel="noopener">WhatsApp</a>`:""}
          <button class="btn-mini" type="button" data-cliente="${escapeHtml(c.whatsapp)}">Histórico</button>
        </div></td>
      </tr>`;
    }).join("")}</tbody></table>`;
  }

  if(MSG_SEM_ZAP.length){
    html += `<div class="cartao-bloco"><h3>Mensagens sem WhatsApp</h3>
      <p class="descricao-campo">Contatos que usaram os botões do site sem deixar o número. Você ainda pode ver a origem e a mensagem.</p>
      <div class="lista-mensagens">${MSG_SEM_ZAP.map(m => `
        <div class="mensagem-item">
          <div><b>${escapeHtml(m.nome || "Visitante")}</b><span>${quando(m.ts)} · ${escapeHtml(m.origem || "site")}</span>
          ${m.obs?`<p>${escapeHtml(m.obs)}</p>`:""}</div>
          <button class="btn-perigo" type="button" data-apagar-msg="${escapeHtml(m.id)}">Apagar</button>
        </div>`).join("")}</div></div>`;
  }
  alvo.innerHTML = html;

  alvo.querySelectorAll("[data-fseg]").forEach(b => b.addEventListener("click", () => {
    FILTRO_CLI.segmento = b.dataset.fseg;
    desenharClientes();
  }));
  const busca = $("#buscaCli");
  let timer = null;
  if(busca) busca.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      FILTRO_CLI.q = busca.value;
      desenharClientes();
      const n = $("#buscaCli");
      if(n){ n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
    }, 180);
  });
  alvo.querySelectorAll("[data-cliente]").forEach(b => b.addEventListener("click", () => abrirCliente(b.dataset.cliente)));
  alvo.querySelectorAll("[data-apagar-msg]").forEach(b => b.addEventListener("click", async () => {
    if(!confirm("Apagar esta mensagem?")) return;
    try{
      await api("/api/admin/leads/"+encodeURIComponent(b.dataset.apagarMsg), {method:"DELETE"});
      toast("Mensagem apagada.");
      carregarClientes();
    }catch(e){ toast("Erro: "+e.message); }
  }));
}

function abrirCliente(zap){
  const c = CLIENTES.find(x => String(x.whatsapp) === String(zap));
  if(!c) return;
  const tel = String(c.whatsapp || "").replace(/\D/g, "");
  const hist = (c.historico || []).map(h => `<li>
    <div><b>${h.tipo === "pedido" ? "Pedido" : "Contato"}</b> ${chipStatus(h.status)}
      <span class="descricao-campo">${quando(h.ts)} · ${escapeHtml(h.origem || "site")}</span></div>
    <div class="hist-info">${escapeHtml((h.itens || []).join(", ") || "—")}
      ${typeof h.total === "number" ? ` · <b>${reais(h.total)}</b>` : ""}</div>
  </li>`).join("") || "<li>Sem histórico registrado.</li>";

  const modal = document.createElement("div");
  modal.className = "mod";
  modal.id = "modCliente";
  modal.innerHTML = `<div class="mod-caixa larga" role="dialog" aria-modal="true" aria-labelledby="tituloCliente">
    <div class="mod-topo"><h3 id="tituloCliente">${escapeHtml(c.nome || "Cliente")}</h3><button class="fechar" type="button" data-fechar aria-label="Fechar">✕</button></div>
    <div class="detalhe-pedido">
      <div class="detalhe-info">
        <p class="detalhe-cliente">${c.whatsapp?`<a href="https://wa.me/${tel}" target="_blank" rel="noopener">${escapeHtml(c.whatsapp_original || c.whatsapp)}</a>`:""}</p>
        <p class="descricao-campo">Primeira interação: ${quando(c.primeira_interacao)} · Última: ${quando(c.ultima_interacao)}</p>
        <p class="descricao-campo">${c.pedidos||0} pedidos · ${c.concluidos||0} concluídos · ${c.cancelados||0} cancelados · ${reais(c.total_gasto||0)} em compras concluídas</p>
        <div class="origens-lista">${(c.origens||[]).map(o => `<span class="origem-chip${String(o).toLowerCase().startsWith("popup")?" popup":""}">${escapeHtml(o)}</span>`).join("") || "—"}</div>
        <h4 class="subtitulo-bloco">Histórico</h4>
        <ul class="historico-cliente">${hist}</ul>
      </div>
      <form id="formCliente" class="form-pedido">
        <label for="cliTags">Tags <span class="descricao-campo">(separadas por vírgula)</span></label>
        <input id="cliTags" value="${escapeHtml((c.tags||[]).join(", "))}" placeholder="VIP, atacado, aniversário…">
        <label for="cliNotas">Anotações</label>
        <textarea id="cliNotas" rows="5" placeholder="Preferências, combinados, histórico de conversa…">${escapeHtml(c.notas||"")}</textarea>
        <div class="acoes acoes-form">
          <button class="btn-primario" type="submit">Salvar</button>
          <button class="btn-secundario" type="button" data-fechar>Fechar</button>
        </div>
      </form>
    </div>
  </div>`;
  document.body.appendChild(modal);
  const fechar = () => modal.remove();
  modal.querySelectorAll("[data-fechar]").forEach(b => b.addEventListener("click", fechar));
  modal.addEventListener("click", e => { if(e.target === modal) fechar(); });
  const esc = e => { if(e.key === "Escape"){ fechar(); document.removeEventListener("keydown", esc); } };
  document.addEventListener("keydown", esc);
  $("#formCliente").addEventListener("submit", async e => {
    e.preventDefault();
    const tags = $("#cliTags").value.split(",").map(t => t.trim()).filter(Boolean);
    try{
      await api("/api/admin/clientes/"+encodeURIComponent(c.whatsapp), {method:"PUT",
        body:{tags, notas:$("#cliNotas").value}});
      toast("Cliente atualizado.");
      fechar();
      carregarClientes();
    }catch(err){ toast("Erro: "+err.message); }
  });
}

/* ---------- relatórios ---------- */
async function carregarRelatorios(){
  const alvo = $("#aba-vendidos");
  alvo.innerHTML = `<div class="esqueleto-linha"></div><div class="esqueleto-linha"></div><div class="esqueleto-linha"></div>`;
  let d;
  try{
    d = await api("/api/admin/indicadores?periodo="+encodeURIComponent(PERIODO_REL));
  }catch(e){
    alvo.innerHTML = `<div class="cartao-bloco"><h3>Relatórios</h3><p style="color:var(--tinta-suave)">Não foi possível carregar os indicadores.</p></div>`;
    return;
  }
  desenharRelatorios(d);
}

function desenharRelatorios(d){
  const alvo = $("#aba-vendidos");
  const k = d.kpis || {};
  const kpi = (v, l, extra) => `<div class="card-kpi"><b>${v}</b><span>${l}</span>${extra?`<small>${extra}</small>`:""}</div>`;
  const maxSerie = Math.max(1, ...(d.mensal||[]).map(m => SERIE_MODO === "receita" ? m.receita : m.pedidos));
  const barras = (d.mensal||[]).map(m => {
    const v = SERIE_MODO === "receita" ? m.receita : m.pedidos;
    const h = Math.max(2, Math.round((v / maxSerie) * 100));
    return `<div class="barra-mes" title="${m.label}: ${m.pedidos} pedidos · ${reais(m.receita)}">
      <div class="barra-mes-valor">${SERIE_MODO === "receita" ? (v ? reais(v) : "") : (v || "")}</div>
      <div class="barra-mes-col"><i style="height:${h}%"></i></div>
      <span>${m.label}</span></div>`;
  }).join("");
  const topProdutos = [...(d.top_produtos||[])].sort((a,b) =>
    TOP_MODO === "receita" ? (b.receita||0)-(a.receita||0) : (b.qtd||0)-(a.qtd||0)).slice(0,10);
  const maxTop = Math.max(1, ...topProdutos.map(p => Number(TOP_MODO === "receita" ? p.receita : p.qtd) || 0));
  const top = topProdutos.map((p,i) => {
    const v = TOP_MODO === "receita" ? p.receita : p.qtd;
    return `<tr>
      <td data-label="#"><span class="rank-pos">${i+1}</span></td>
      <td data-label="Produto"><b>${escapeHtml(p.nome || "Peça")}</b></td>
      <td data-label="Unidades">${p.qtd}</td>
      <td data-label="Pedidos">${p.pedidos}</td>
      <td data-label="Receita">${reais(p.receita)}</td>
      <td data-label="Participação"><div class="barra-mini"><i style="width:${Math.round(v/maxTop*100)}%"></i></div></td>
    </tr>`;
  }).join("");
  const maxStatus = Math.max(1, ...Object.values(d.status_atuais||{}));
  const statusLinhas = Object.keys(STATUS_LABEL).map(s => {
    const n = (d.status_atuais||{})[s] || 0;
    return `<div class="linha-barra"><span>${chipStatus(s)}</span><div class="barra-mini"><i style="width:${Math.round(n/maxStatus*100)}%"></i></div><b>${n}</b></div>`;
  }).join("");
  const maxOrig = Math.max(1, ...(d.origens||[]).map(o => o.pedidos));
  const origens = (d.origens||[]).map(o => `<div class="linha-barra"><span>${escapeHtml(o.origem)}</span><div class="barra-mini"><i style="width:${Math.round(o.pedidos/maxOrig*100)}%"></i></div><b>${o.pedidos}</b></div>`).join("") || `<p class="descricao-campo">Sem pedidos no período.</p>`;

  const periodoOpts = [["7d","7 dias"],["30d","30 dias"],["90d","90 dias"],["12m","12 meses"],["tudo","Tudo"]]
    .map(([v,r]) => `<option value="${v}"${PERIODO_REL===v?" selected":""}>${r}</option>`).join("");

  alvo.innerHTML = `<div class="barra-tools rel-topo">
      <div class="descricao-campo">Período: <b>${d.de?dataCurta(d.de):"início"}</b> a <b>${dataCurta(d.ate)}</b></div>
      <select id="periodoRel" aria-label="Período dos relatórios">${periodoOpts}</select>
    </div>
    <div class="grid-kpi">
      ${kpi(k.pedidos||0, "pedidos recebidos")}
      ${kpi(k.concluidos||0, "concluídos", `${k.taxa_conclusao||0}% de conclusão`)}
      ${kpi(k.cancelados||0, "cancelados", `${k.taxa_cancelamento||0}% de cancelamento`)}
      ${kpi(reais(k.receita||0), "receita concluída")}
      ${kpi(reais(k.ticket_medio||0), "ticket médio")}
      ${kpi(k.pecas_por_pedido||0, "peças por pedido", `${k.pecas||0} peças`)}
      ${kpi(k.em_producao||0, "em produção agora")}
      ${kpi(k.clientes_novos||0, "novos contatos")}
      ${kpi(k.popup_capturas||0, "capturas no popup", `${k.popup_convertidos||0} converteram · ${k.popup_conversao||0}%`)}
    </div>
    <div class="cartao-bloco">
      <div class="topo-bloco"><h3>Vendas por mês <span class="descricao-campo" style="font-weight:400">(últimos 12 meses)</span></h3>
        <div class="segmentado mini">
          <button type="button" class="seg${SERIE_MODO==="receita"?" on":""}" data-serie="receita">Receita</button>
          <button type="button" class="seg${SERIE_MODO==="pedidos"?" on":""}" data-serie="pedidos">Pedidos</button>
        </div></div>
      <div class="grafico-mensal">${barras || "<p class=\"descricao-campo\">Sem dados.</p>"}</div>
      <details class="tabela-detalhe"><summary>Ver tabela de vendas por mês</summary>
        <table class="tabela"><thead><tr><th>Mês</th><th>Pedidos concluídos</th><th>Receita</th></tr></thead><tbody>
          ${(d.mensal||[]).map(m => `<tr><td data-label="Mês">${m.label}</td><td data-label="Pedidos">${m.pedidos}</td><td data-label="Receita">${reais(m.receita)}</td></tr>`).join("")}
        </tbody></table>
      </details>
    </div>
    <div class="cartao-bloco">
      <div class="topo-bloco"><h3>Produtos mais vendidos</h3>
        <div class="segmentado mini">
          <button type="button" class="seg${TOP_MODO==="qtd"?" on":""}" data-top="qtd">Unidades</button>
          <button type="button" class="seg${TOP_MODO==="receita"?" on":""}" data-top="receita">Receita</button>
        </div></div>
      ${top ? `<table class="tabela"><thead><tr><th>#</th><th>Produto</th><th>Un.</th><th>Pedidos</th><th>Receita</th><th>Participação</th></tr></thead><tbody>${top}</tbody></table>` : `<p class="descricao-campo">Nenhum pedido concluído no período.</p>`}
    </div>
    <div class="grade-2">
      <div class="cartao-bloco"><h3>Pedidos por status (agora)</h3><div class="barras-lista">${statusLinhas}</div></div>
      <div class="cartao-bloco"><h3>Origem dos pedidos no período</h3><div class="barras-lista">${origens}</div></div>
    </div>`;

  $("#periodoRel").addEventListener("change", e => { PERIODO_REL = e.target.value; carregarRelatorios(); });
  alvo.querySelectorAll("[data-serie]").forEach(b => b.addEventListener("click", () => { SERIE_MODO = b.dataset.serie; desenharRelatorios(d); }));
  alvo.querySelectorAll("[data-top]").forEach(b => b.addEventListener("click", () => { TOP_MODO = b.dataset.top; desenharRelatorios(d); }));
}

/* ---------- identidade visual ---------- */
const CORES_PADRAO = {
  marfim:"#fbf5ee", areia:"#f3e9dc", papel:"#fffcf7", linha:"#e7d9c4",
  tinta:"#33291f", "tinta-suave":"#6f6050", ouro:"#b58a45", "ouro-claro":"#d0ae72",
  "ouro-fraco":"#f2e7d2", rosa:"#d39c9c", "rosa-claro":"#f3ddd9", salvia:"#93a68c", zap:"#1f8c5a"
};
const FONTES_PADRAO = {
  titulos:FONTES_PRESET.titulos[0],
  texto:FONTES_PRESET.texto[0]
};

async function carregarVisual(){
  const alvo = $("#aba-visual");
  if(!CFG) CFG = await api("/api/admin/config").catch(()=>null);
  if(!CFG) return;
  if(!CFG.visual) CFG.visual = {logo:"", cores:Object.assign({},CORES_PADRAO), fontes:Object.assign({},FONTES_PADRAO)};
  if(!IMAGENS.length) IMAGENS = await api("/api/admin/imagens").catch(()=>[]);
  ICONES = await api("/api/admin/icones").catch(()=>[]);
  const v = CFG.visual;
  const cores = Object.assign({}, CORES_PADRAO, v.cores||{});
  const fontes = Object.assign({}, FONTES_PADRAO, v.fontes||{});

  /* logo: encontra o arquivo correspondente no select (fotos ou ícones) */
  const logoVal = v.logo ? (temExt(v.logo) ? v.logo : (IMAGENS.find(f=>baseDe(f)===v.logo) || v.logo)) : "";
  const optSel = val => val===logoVal ? " selected" : "";
  const opcoesLogo = `<option value="">Usar a logo padrão (do site)</option>
    <optgroup label="Fotos">` +
    IMAGENS.map(f=>`<option value="${escapeHtml(f)}"${optSel(f)}>${escapeHtml(f)}</option>`).join("") +
    `</optgroup><optgroup label="Ícones">` +
    ICONES.map(f=>{ const val = "icons/"+f; return `<option value="${escapeHtml(val)}"${optSel(val)}>${escapeHtml(f)}</option>`; }).join("") +
    `</optgroup>`;

  const opcoesFontes = (preset, atual)=>{
    return preset.map(p=>`<option value="${escapeHtml(p.nome)}"${(atual&&atual.nome)===p.nome?" selected":""}>${escapeHtml(p.nome)}</option>`).join("");
  };

  alvo.innerHTML = `
    <div class="cartao-bloco"><h3>Temas prontos</h3>
      <p class="descricao-campo" style="margin-bottom:14px">Ponto de partida por segmento — aplica na prévia na hora; salve abaixo para valer. Dá para ajustar tudo depois.</p>
      <div id="gradeTemas" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">
        <p style="color:var(--tinta-suave)">Carregando temas…</p>
      </div>
    </div>
    <div class="cartao-bloco"><h3>Logo</h3>
      <div class="visual-logo">
        <img id="vLogoPrev" src="${v.logo?fotoSrc(v.logo):comLoja("img/logo.webp")}" alt="Prévia da logo">
        <div>
          <label for="vLogo">Escolher entre as imagens do site</label>
          <select id="vLogo">${opcoesLogo}</select>
          <label class="upload" for="vLogoUpload">Ou enviar uma imagem nova
            <input type="file" id="vLogoUpload" accept="image/webp,image/png,image/jpeg">
          </label>
          <div class="dica" style="font-size:12px;color:var(--tinta-suave)">A logo aparece no topo do site, na tela de login e no menu. Prefira PNG com fundo transparente ou quadrado.</div>
        </div>
      </div>
    </div>
    <div class="cartao-bloco"><h3>Biblioteca de ícones</h3>
      <p class="descricao-campo" style="margin-bottom:14px">Use nos selos (campo "Ícone") e na logo. Envie SVGs próprios — os <b>base-*</b> são o kit inicial.</p>
      <div id="gradeIcones" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px"></div>
      <div style="margin-top:14px">
        <label class="upload" for="vIconeUpload">Enviar ícone próprio (SVG, PNG, WebP ou JPG · máx. 2 MB)
          <input type="file" id="vIconeUpload" accept="image/svg+xml,image/png,image/webp,image/jpeg">
        </label>
      </div>
    </div>
    <div class="cartao-bloco"><h3>Cores</h3>
      <p class="descricao-campo" style="margin-bottom:14px">Valem para o site — o painel fica sempre no tema escuro. Confira em "Ver o site".</p>
      <div class="grupo-campos">
        ${CORES_INFO.map(c=>`
          <div class="campo cor-linha">
            <label>${c.r} <code>--${c.k}</code></label>
            <div class="cor-entrada">
              <input type="color" data-cor="${c.k}" value="${escapeHtml(cores[c.k]||"#000000")}">
              <input type="text" data-cor-hex="${c.k}" value="${escapeHtml(cores[c.k]||"")}" spellcheck="false">
            </div>
          </div>`).join("")}
      </div>
    </div>
    <div class="cartao-bloco"><h3>Fontes</h3>
      <p class="descricao-campo" style="margin-bottom:14px">Títulos usam a fonte serifada; textos usam a sans. As fontes vêm do Google Fonts.</p>
      <div class="grupo-campos">
        <div class="campo"><label>Fonte dos títulos</label>
          <select id="vFonteTitulos">${opcoesFontes(FONTES_PRESET.titulos, fontes.titulos)}</select>
        </div>
        <div class="campo"><label>Fonte dos textos</label>
          <select id="vFonteTexto">${opcoesFontes(FONTES_PRESET.texto, fontes.texto)}</select>
        </div>
      </div>
    </div>
    <div class="barra-tools">
      <span class="descricao-campo">As alterações valem para todo o site.</span>
      <button class="btn-primario" id="salvarVisual">Salvar identidade visual</button>
    </div>`;

  /* prévia da logo */
  const atPrev = ()=>{
    const val = $("#vLogo").value;
    $("#vLogoPrev").src = val ? fotoSrc(val) : comLoja("img/logo.webp");
  };
  $("#vLogo").addEventListener("change", atPrev);
  $("#vLogoUpload").addEventListener("change", async e=>{
    const arq = e.target.files[0];
    if(!arq) return;
    if(arq.size > 8*1024*1024){ toast("Imagem muito grande (máx. 8 MB)"); return; }
    e.target.disabled = true;
    toast("Enviando logo…");
    const leitor = new FileReader();
    leitor.onload = async ()=>{
      try{
        const r = await api("/api/admin/upload", {method:"POST", body:{nome:arq.name, dados:leitor.result}});
        IMAGENS.push(r.arquivo);
        const sel = $("#vLogo");
        const opt = document.createElement("option");
        opt.value = r.arquivo; opt.textContent = r.arquivo;
        sel.appendChild(opt);
        sel.value = r.arquivo;
        atPrev();
        toast("Imagem enviada.");
      }catch(err){ toast("Erro no envio: "+err.message); }
      finally{ e.target.disabled = false; e.target.value = ""; }
    };
    leitor.readAsDataURL(arq);
  });

  /* prévia das cores ao vivo (somente nos campos; o painel é sempre escuro) */
  CORES_INFO.forEach(c=>{
    const color = document.querySelector(`[data-cor="${c.k}"]`);
    const hex = document.querySelector(`[data-cor-hex="${c.k}"]`);
    color.addEventListener("input", ()=>{ hex.value = color.value; });
    hex.addEventListener("input", ()=>{
      let t = hex.value.trim();
      if(!t.startsWith("#")) t = "#"+t;
      if(/^#[0-9a-f]{6}$/i.test(t)){ color.value = t; }
    });
  });

  /* biblioteca de ícones */
  const desenharIcones = ()=>{
    const g = $("#gradeIcones");
    if(!g) return;
    g.innerHTML = ICONES.length ? ICONES.map(f=>{
      const base = f.startsWith("base-");
      return `<div style="border:1px solid var(--linha);border-radius:10px;padding:10px;text-align:center">
        <img src="${iconeSrc(f)}" alt="${escapeHtml(f)}" style="width:34px;height:34px;object-fit:contain">
        <div style="font-size:11px;color:var(--tinta-suave);word-break:break-all;margin:6px 0">${escapeHtml(f)}${base?' <span class="pilula">padrão</span>':""}</div>
        ${base?"":`<button class="btn-perigo" data-del-icone="${escapeHtml(f)}" style="font-size:12px">apagar</button>`}
      </div>`;
    }).join("") : `<p style="color:var(--tinta-suave)">Nenhum ícone. Envie o primeiro abaixo.</p>`;
    g.querySelectorAll("[data-del-icone]").forEach(b=>b.addEventListener("click", async ()=>{
      if(!confirm(`Apagar o ícone "${b.dataset.delIcone}"?`)) return;
      try{
        await api("/api/admin/icones/"+encodeURIComponent(b.dataset.delIcone), {method:"DELETE"});
        ICONES = await api("/api/admin/icones").catch(()=>[]);
        desenharIcones();
        toast("Ícone apagado.");
      }catch(err){ toast("Erro: "+err.message); }
    }));
  };
  desenharIcones();
  $("#vIconeUpload").addEventListener("change", async e=>{
    const arq = e.target.files[0];
    if(!arq) return;
    if(arq.size > 2*1024*1024){ toast("Ícone muito grande (máx. 2 MB)"); return; }
    const leitor = new FileReader();
    leitor.onload = async ()=>{
      try{
        const r = await api("/api/admin/upload-icone", {method:"POST", body:{nome:arq.name, dados:leitor.result}});
        ICONES = await api("/api/admin/icones").catch(()=>[]);
        desenharIcones();
        toast("Ícone enviado: "+r.arquivo);
      }catch(err){ toast("Erro no envio: "+err.message); }
    };
    leitor.readAsDataURL(arq);
    e.target.value = "";
  });

  function aplicarTema(t){
    const cores = t.cores || {};
    CORES_INFO.forEach(c=>{
      const v = cores[c.k];
      if(!v) return;
      const color = document.querySelector(`[data-cor="${c.k}"]`);
      const hex = document.querySelector(`[data-cor-hex="${c.k}"]`);
      if(color){ color.value = v; color.dispatchEvent(new Event("input", {bubbles:true})); }
      else if(hex){ hex.value = v; hex.dispatchEvent(new Event("input", {bubbles:true})); }
    });
    const ft = t.fontes || {};
    const porNome = (lista, nome)=> (lista||[]).find(x=>x.nome===nome);
    if(ft.titulos){
      const s = $("#vFonteTitulos");
      if(s && porNome(FONTES_PRESET.titulos, ft.titulos.nome)){
        s.value = ft.titulos.nome;
        s.dispatchEvent(new Event("change", {bubbles:true}));
      }
    }
    if(ft.texto){
      const s = $("#vFonteTexto");
      if(s && porNome(FONTES_PRESET.texto, ft.texto.nome)){
        s.value = ft.texto.nome;
        s.dispatchEvent(new Event("change", {bubbles:true}));
      }
    }
    toast(`Tema "${t.nome||t.id}" na prévia — confira e salve abaixo.`);
  }

  /* temas prontos: preenchem cores + fontes e disparam a prévia ao vivo */
  try{
    const tj = await api("/api/temas").catch(()=>({temas:[]}));
    const gt = $("#gradeTemas");
    if(gt){
      const temas = (tj && tj.temas) || [];
      gt.innerHTML = temas.length ? temas.map(t=>{
        const c = t.cores || {};
        const sw = ["marfim", "papel", "ouro"].map(k=>
          `<i style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${escapeHtml(c[k]||"#ccc")};border:1px solid var(--linha)}"></i>`).join("");
        return `<button class="btn-secundario" data-tema="${escapeHtml(t.id)}" style="text-align:left;display:grid;gap:8px">
          <span style="display:flex;gap:6px">${sw}</span>
          <b style="font-size:14px">${escapeHtml(t.nome||t.id)}</b>
          <span style="font-size:12px;color:var(--tinta-suave)">${escapeHtml(t.descricao||"")}</span>
        </button>`;
      }).join("") : `<p style="color:var(--tinta-suave)">Nenhum tema disponível.</p>`;
      gt.querySelectorAll("[data-tema]").forEach(b=>b.addEventListener("click", ()=>{
        const t = temas.find(x=>x.id===b.dataset.tema);
        if(t) aplicarTema(t);
      }));
    }
  }catch(e){}

  /* salvar */
  $("#salvarVisual").addEventListener("click", async ()=>{
    const coresNovas = {};
    CORES_INFO.forEach(c=>{
      const hex = document.querySelector(`[data-cor-hex="${c.k}"]`).value.trim();
      coresNovas[c.k] = /^#?[0-9a-f]{6}$/i.test(hex) ? (hex.startsWith("#")?hex:"#"+hex) : (document.querySelector(`[data-cor="${c.k}"]`).value || CORES_PADRAO[c.k]);
    });
    const titulos = FONTES_PRESET.titulos.find(x=>x.nome===$("#vFonteTitulos").value) || FONTES_PADRAO.titulos;
    const texto = FONTES_PRESET.texto.find(x=>x.nome===$("#vFonteTexto").value) || FONTES_PADRAO.texto;
    CFG.visual = {
      logo: $("#vLogo").value,
      cores: coresNovas,
      fontes: { titulos, texto }
    };
    try{
      CFG = await api("/api/admin/config", {method:"PUT", body:CFG});
      aplicarVisualAdmin();
      toast("Aparência salva.");
    }catch(err){ toast("Erro ao salvar: "+err.message); }
  });
}

/* ---------- configurações ---------- */
function carregarConfig(){
  $("#aba-config").innerHTML = `
    <div class="cartao-bloco"><h3>Senha do painel</h3>
      <form id="formSenha" class="grupo-campos">
        <div class="campo"><label>Senha atual</label><div class="campo-senha"><input type="password" id="sAtual" required><button type="button" class="ver-senha" data-ver="sAtual" aria-label="Mostrar senha" aria-pressed="false">👁</button></div></div>
        <div class="campo"><label>Nova senha</label><div class="campo-senha"><input type="password" id="sNova" minlength="6" required><button type="button" class="ver-senha" data-ver="sNova" aria-label="Mostrar senha" aria-pressed="false">👁</button></div></div>
        <div class="campo"><label>Confirmar nova senha</label><input type="password" id="sNova2" minlength="6" required></div>
        <div class="barra-tools" style="grid-column:1/-1"><button class="btn-primario" type="submit">Trocar senha</button></div>
      </form>
      <div class="descricao-campo" style="margin-top:14px">Se esta é a senha inicial, troque agora para garantir.</div>
    </div>
    <div class="cartao-bloco"><h3>Como rodar localmente</h3>
      <div class="descricao-campo">
        <p style="margin-bottom:8px">Para subir o site e o painel nesta máquina:</p>
        <p>1. Abra o terminal e entre na pasta do site (onde está o <code>server.py</code>).</p>
        <p>2. Inicie o servidor:</p>
        <pre style="background:var(--areia);border-radius:8px;padding:10px 12px;overflow:auto;font-size:13px;margin:6px 0">python3 server.py</pre>
        <p>3. Abra no navegador:</p>
        <p style="margin:6px 0">• Site: <b>http://localhost:8324</b></p>
        <p style="margin:6px 0">• Painel admin: <b>http://localhost:8324/admin.html</b></p>
        <p style="margin:8px 0">Para parar o servidor, pressione <b>Ctrl+C</b> no terminal.</p>
        <p>Para mudar a porta: <code>python3 server.py --port 9000</code>. Para expor na rede: <code>python3 server.py --host 0.0.0.0</code> (troque a senha antes).</p>
      </div>
    </div>
    <div class="cartao-bloco"><h3>Sobre o painel</h3>
      <div class="descricao-campo">
        <p style="margin-bottom:8px">Os dados ficam em arquivos na pasta do site:</p>
        <p>• <b>config.json</b> — textos e conteúdo das páginas</p>
        <p>• <b>js/catalog.json</b> — catálogo de produtos</p>
        <p>• <b>data/leads.json</b> — contatos e pedidos recebidos</p>
        <p style="margin-top:8px">Faça backup desses arquivos periodicamente. Para publicar o painel na internet você precisará de um servidor que rode Python.</p>
      </div>
    </div>`;
  $("#formSenha").addEventListener("submit", async e=>{
    e.preventDefault();
    if($("#sNova").value !== $("#sNova2").value){ toast("A nova senha não confere."); return; }
    try{
      await api("/api/trocar-senha", {method:"POST", body:{atual:$("#sAtual").value, nova:$("#sNova").value}});
      toast("Senha trocada com sucesso.");
      $("#sAtual").value=$("#sNova").value=$("#sNova2").value="";
    }catch(err){ toast("Erro: "+err.message); }
  });
}

/* ---------- início ---------- */
async function carregarIdentidadeLogin(){
  try{
    const c = await fetch(comLoja("config.json")).then(r=>r.ok?r.json():null);
    if(!c) return;
    const nome = (c.geral && c.geral.nome) || "";
    if(nome){
      const t = $("#tituloPainel"); if(t) t.textContent = nome;
      document.title = "Painel · " + nome;
    }
    const logo = c.visual && c.visual.logo;
    if(logo){
      const a = $("#logoLogin");
      if(a) a.src = fotoSrc(logo);
    }
  }catch(e){}
}
carregarIdentidadeLogin();
if(tok()) entrar();
else { $("#login").classList.add("on"); }

})();