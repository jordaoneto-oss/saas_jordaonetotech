/* Fase 4 — Carrinho de catálogo (7.1) — não confirma pagamento */
let carrinho=[];
function adicionarAoCarrinho(produtoId,qtd=1,variacao=''){
  const item=carrinho.find(i=>i.produtoId===produtoId&&i.variacao===variacao);
  if(item){item.qtd+=qtd;} else {carrinho.push({produtoId, nome:('Prod '+produtoId), variacao, qtd, precoUnit:59.9});}
  atualizarCarrinhoUI();
  alert('Adicionado ao carrinho (Fase 4). Subtotal local calculado. Nenhum checkout próprio.');
}
function atualizarCarrinhoUI(){
  const el=document.getElementById('carrinhoUI'); if(!el) return;
  const subtotal=carrinho.reduce((s,i)=>s+(i.qtd*i.precoUnit),0);
  el.innerHTML='<h3>Carrinho</h3><ul>'+carrinho.map(i=>'<li>'+i.nome+' · '+i.qtd+'un · R$ '+(i.qtd*i.precoUnit).toFixed(2)+'</li>').join('')+'</ul><p><b>Subtotal: R$ '+subtotal.toFixed(2)+'</b> <span style="color:#64748b;font-size:12px;">(confirmado pelo checkout externo)</span></p>';
}
function alterarQtd(id,delta){
  const i=carrinho.find(x=>x.produtoId===id); if(i){i.qtd=Math.max(1,i.qtd+delta); atualizarCarrinhoUI();}
}
function removerDoCarrinho(id){carrinho=carrinho.filter(i=>i.produtoId!==id); atualizarCarrinhoUI();}
