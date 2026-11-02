/* Fase 5 — Cupons (7.2) e checkout externo (7.3) */
const CUPONS = [
  {id:1, codigo:"BEMVINDO10", tipo:"percentual", valor:10, pedido_minimo:0, desconto_maximo:null, aplicacao:"loja_toda", restricoes:[], limite_uso:100, limite_por_cliente:1, inicio:"2026-10-01", expiracao:"2026-12-31", status:"ativo"},
  {id:2, codigo:"FRETEFREE", tipo:"fixo", valor:15, pedido_minimo:50, desconto_maximo:null, aplicacao:"loja_toda", restricoes:[], limite_uso:50, limite_por_cliente:2, inicio:"2026-10-01", expiracao:"2026-11-30", status:"agendado"}
];
function listarCupons(){
  const alvo=document.getElementById('listaCupons'); if(!alvo) return;
  alvo.innerHTML=CUPONS.map(c=>'<tr><td>'+c.codigo+'</td><td>'+c.tipo+'</td><td>'+c.valor+(c.tipo==="percentual"?"%":" R$")+'</td><td>'+c.aplicacao+'</td><td>'+c.status+'</td></tr>').join('');
}
function validarCupomLocal(codigo, subtotal){
  const c=CUPONS.find(x=>x.codigo.toLowerCase()===codigo.toLowerCase()&&x.status==="ativo");
  if(!c){return {valido:false, motivo:"Cupom não encontrado ou inativo."};}
  const agora=new Date(); const ini=new Date(c.inicio); const exp=c.expiracao?new Date(c.expiracao):null;
  if(agora<ini){return {valido:false, motivo:"Cupom ainda não iniciado."};}
  if(exp&&agora>exp){return {valido:false, motivo:"Cupom expirado."};}
  if(subtotal<c.pedido_minimo){return {valido:false, motivo:"Pedido mínimo: R$ "+c.pedido_minimo};}
  const desconto=c.tipo==="percentual"?Math.min((subtotal*c.valor/100),c.desconto_maximo||Infinity):Math.min(c.valor,subtotal);
  return {valido:true, desconto:desconto.toFixed(2), cupom:c};
}
/* Checkout externo: contrato por URL/API documentada pelo fornecedor */
function configurarCheckoutExterno(config){
  const cfg={provider:name||"externo", url_base:config.url_base||"", parametros:config.parametros||{}, modo:config.modo||"url", api_endpoint:config.api_endpoint||"", status:config.status||"pendente"};
  alert('Checkout configurado: '+cfg.provider+'. Nenhum pagamento processado pela plataforma.');
}
