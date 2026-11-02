/* Fase 3 — Banners e vitrines (5.1-5.5) */
const BANNERS = [
  {id:1, titulo:"Nova Coleção Outono", desktop_url:"img/banner-desktop.webp", mobile_url:"img/banner-mobile.webp", alt_text:"Banner promocional nova coleção de outono", target_url:"#catalogo", agendado_de:null, agendado_ate:null, ordem:1, ativo:true},
  {id:2, titulo:"Lançamentos", desktop_url:"img/banner-lancamentos.webp", mobile_url:"img/banner-mobile-lanc.webp", alt_text:"Lançamentos", target_url:"#catalogo", agendado_de:"2026-10-01", agendado_ate:"2026-12-31", ordem:2, ativo:true}
];
function listarBanners(){
  const alvo=document.getElementById('listaBanners');
  if(!alvo) return;
  alvo.innerHTML=BANNERS.map(b=>`<div class="banner-card">
    <img src="${b.desktop_url}" alt="${b.alt_text}" loading="lazy">
    <div class="banner-meta"><span class="title">${b.titulo}</span><span class="schedule">${b.agendado_de||'--'} até ${b.agendado_ate||'--'} · ordem ${b.ordem}</span></div>
    <div class="banner-actions">
      <button onclick="editarBanner(${b.id})">Editar</button>
      <button onclick="removerBanner(${b.id})">Remover</button>
      <button onclick="duplicarBanner(${b.id})">Duplicar</button>
    </div>
  </div>`).join('');
}
function editarBanner(id){alert('Editar banner '+id+' (preserva conteúdo). Nenhum checkout próprio implementado.');}
function removerBanner(id){if(!confirm('Remover banner '+id+'?')) return; alert('Removido (demo)');}
function duplicarBanner(id){alert('Duplicado banner '+id);}
