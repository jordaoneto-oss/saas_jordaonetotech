/* Biblioteca de fontes (Google Fonts) compartilhada pelo editor e pelo site.
   O config guarda só o NOME da fonte; a família e o link são resolvidos aqui. */
"use strict";
window.FONTES = [
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
window.fontePorNome = function(nome){
  return (window.FONTES || []).find(f => f.nome === nome) || null;
};
window.linkFonte = function(f){
  return "https://fonts.googleapis.com/css2?family=" + f.gf + "&display=swap";
};
