/* Biblioteca de ícones (traces) compartilhada pelo editor e pelo site.
   Uso: <svg viewBox="0 0 24 24"> + window.ICONES[chave] + </svg>
   Todos os traços usam stroke (preencha com fill:none; stroke:currentColor). */
"use strict";
window.ICONES = {
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
  sol:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17 17l1.5 1.5M19 5l-1.5 1.5M6.5 17L5 19"/>',
  lua:'<path d="M20 14a8 8 0 1 1-10-10 7 7 0 0 0 10 10z"/>',
  bandeira:'<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5z"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  dinheiro:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/>'
};
