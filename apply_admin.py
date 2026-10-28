#!/usr/bin/env python3
"""Adiciona atributos data-t/data-t-html/data-ph/data-href no index.html
para o conteúdo ser editável pelo painel admin (config.json)."""
import io

PATH = "index.html"
with io.open(PATH, encoding="utf-8") as f:
    html = f.read()

# (antigo, novo) — cada antigo deve ser único
R = [
    # ---- título / meta ----
    ('<title>Ateliê Santo Terço — Terços artesanais feitos à mão, com fé</title>',
     '<title data-t="geral.title">Ateliê Santo Terço — Terços artesanais feitos à mão, com fé</title>'),
    ('<meta name="description" content="',
     '<meta name="description" data-t="geral.descricao" content="'),
    # ---- marca ----
    ('<span>\n        <b>Ateliê Santo Terço</b>\n        <span>Terços feitos à mão</span>\n      </span>',
     '<span>\n        <b data-t="geral.nome">Ateliê Santo Terço</b>\n        <span data-t="geral.tagline">Terços feitos à mão</span>\n      </span>'),
    # ---- hero ----
    ('<p class="chapeu">Terços artesanais · feitos com fé</p>',
     '<p class="chapeu" data-t="hero.chapeu">Terços artesanais · feitos com fé</p>'),
    ('<h1>Cada peça é feita',
     '<h1 data-t-html="hero.titulo">Cada peça é feita'),
    ('<p class="lead">Terços e dezenas montados conta por conta, em cristal,',
     '<p class="lead" data-t-html="hero.lead">Terços e dezenas montados conta por conta, em cristal,'),
    ('<a href="#catalogo" class="btn btn-ouro">Ver o catálogo</a>',
     '<a href="#catalogo" class="btn btn-ouro" data-t="hero.cta1">Ver o catálogo</a>'),
    ('<a href="#encomenda" class="btn btn-linha">Quero personalizar</a>',
     '<a href="#encomenda" class="btn btn-linha" data-t="hero.cta2">Quero personalizar</a>'),
    ('</svg>\n          Enviamos para todo o Brasil, com pedido e pagamento pelo WhatsApp\n        </p>',
     '</svg>\n          <span data-t-html="hero.nota">Enviamos para todo o Brasil, com pedido e pagamento pelo WhatsApp</span>\n        </p>'),
    ('<b>Peça única</b>', '<b data-t="hero.fita1">Peça única</b>'),
    ('<span>montada uma a uma</span>', '<span data-t="hero.fita2">montada uma a uma</span>'),
    # ---- selos ----
    ('<b>Feito à mão</b>', '<b data-t="selos.0.t">Feito à mão</b>'),
    ('<span>Conta por conta, aqui</span>', '<span data-t="selos.0.s">Conta por conta, aqui</span>'),
    ('<b>Personalizamos</b>', '<b data-t="selos.1.t">Personalizamos</b>'),
    ('<span>Nome, devoção e cor</span>', '<span data-t="selos.1.s">Nome, devoção e cor</span>'),
    ('<b>Sob encomenda</b>', '<b data-t="selos.2.t">Sob encomenda</b>'),
    ('<span>Feita depois do seu sim</span>', '<span data-t="selos.2.s">Feita depois do seu sim</span>'),
    ('<b>Envio nacional</b>', '<b data-t="selos.3.t">Envio nacional</b>'),
    ('<span>Para todo o Brasil</span>', '<span data-t="selos.3.s">Para todo o Brasil</span>'),
    # ---- destaques ----
    ('<p class="chapeu">Em destaque</p>', '<p class="chapeu" data-t="destaques.chapeu">Em destaque</p>'),
    ('<h2 class="titulo">As peças', '<h2 class="titulo" data-t-html="destaques.titulo">As peças'),
    # ---- ofício ----
    ('<p class="chapeu">O ateliê</p>', '<p class="chapeu" data-t="oficio.chapeu">O ateliê</p>'),
    ('<h2 class="titulo">Não sai de máquina.', '<h2 class="titulo" data-t-html="oficio.titulo">Não sai de máquina.'),
    ('<p class="citacao">"Todo trabalho artesanal',
     '<p class="citacao" data-t-html="oficio.citacao">"Todo trabalho artesanal'),
    ('<p class="lead">Cada terço é montado aqui, uma conta de cada vez:',
     '<p class="lead" data-t-html="oficio.lead">Cada terço é montado aqui, uma conta de cada vez:'),
    ('<span><b>Materiais que duram</b>', '<span data-t-html="oficio.fe1"><b>Materiais que duram</b>'),
    ('<span><b>Acabamento de semi-joia</b>', '<span data-t-html="oficio.fe2"><b>Acabamento de semi-joia</b>'),
    ('<span><b>Do jeito que você pediu</b>', '<span data-t-html="oficio.fe3"><b>Do jeito que você pediu</b>'),
    ('<a href="#catalogo" class="btn btn-ouro">Conhecer as peças</a>',
     '<a href="#catalogo" class="btn btn-ouro" data-t="oficio.cta">Conhecer as peças</a>'),
    # ---- catálogo ----
    ('<p class="chapeu">Catálogo</p>', '<p class="chapeu" data-t="catalogo.chapeu">Catálogo</p>'),
    ('<h2 class="titulo">Escolha a sua,', '<h2 class="titulo" data-t-html="catalogo.titulo">Escolha a sua,'),
    ('<p class="lead" style="margin-top:20px">As peças são organizadas por linha:',
     '<p class="lead" style="margin-top:20px" data-t-html="catalogo.lead">As peças são organizadas por linha:'),
    ('<path d="M12 7v5l3 2"/></svg>\n        Produção de 3 a 7 dias úteis depois do seu sim, mais o prazo dos Correios.',
     '<path d="M12 7v5l3 2"/></svg>\n        <span data-t-html="catalogo.prazo">Produção de 3 a 7 dias úteis depois do seu sim, mais o prazo dos Correios.</span>'),
    ('<p class="nota-catalogo">Não achou o seu santo?',
     '<p class="nota-catalogo" data-t-html="catalogo.nota">Não achou o seu santo?'),
    # ---- encomenda ----
    ('<p class="chapeu">Sob encomenda</p>', '<p class="chapeu" data-t="encomenda.chapeu">Sob encomenda</p>'),
    ('<h2 class="titulo">O seu santo, a sua cor,', '<h2 class="titulo" data-t-html="encomenda.titulo">O seu santo, a sua cor,'),
    ('<p class="lead" style="margin-top:20px">Ter um terço personalizado',
     '<p class="lead" style="margin-top:20px" data-t-html="encomenda.lead">Ter um terço personalizado'),
    ('<b>Você conta a ideia</b>', '<b data-t="encomenda.passos.0.t">Você conta a ideia</b>'),
    ('<span>Um santo de devoção, uma cor, uma data.', '<span data-t-html="encomenda.passos.0.s">Um santo de devoção, uma cor, uma data.'),
    ('<b>A gente combina os detalhes</b>', '<b data-t="encomenda.passos.1.t">A gente combina os detalhes</b>'),
    ('<span>Tipo de conta, acabamento do metal,', '<span data-t-html="encomenda.passos.1.s">Tipo de conta, acabamento do metal,'),
    ('<b>A peça é montada</b>', '<b data-t="encomenda.passos.2.t">A peça é montada</b>'),
    ('<span>Uma a uma, à mão.', '<span data-t-html="encomenda.passos.2.s">Uma a uma, à mão.'),
    ('<b>Chega na sua casa</b>', '<b data-t="encomenda.passos.3.t">Chega na sua casa</b>'),
    ('<span>Enviamos para todo o Brasil, embalado para presentear.</span>',
     '<span data-t-html="encomenda.passos.3.s">Enviamos para todo o Brasil, embalado para presentear.</span>'),
    ('</svg>\n          Encomendar pelo WhatsApp\n        </a>',
     '</svg>\n          <span data-t="encomenda.botao">Encomendar pelo WhatsApp</span>\n        </a>'),
    # ---- devoções ----
    ('<p class="chapeu">Devoções</p>', '<p class="chapeu" data-t="devocoes.chapeu">Devoções</p>'),
    ('<h2 class="titulo">Os santos que já', '<h2 class="titulo" data-t-html="devocoes.titulo">Os santos que já'),
    ('<p class="lead" style="margin-top:20px">Cada um destes já virou terço',
     '<p class="lead" style="margin-top:20px" data-t-html="devocoes.lead">Cada um destes já virou terço'),
    # ---- ocasiões ----
    ('<p class="chapeu">Para quando</p>', '<p class="chapeu" data-t="ocasioes.chapeu">Para quando</p>'),
    ('<h2 class="titulo">Os dias que a família', '<h2 class="titulo" data-t-html="ocasioes.titulo">Os dias que a família'),
    # ---- oração ----
    ('<p>"Segure o terço com fé.', '<p data-t-html="oracao.texto">"Segure o terço com fé.'),
    ('<cite>Ateliê Santo Terço</cite>', '<cite data-t="oracao.autor">Ateliê Santo Terço</cite>'),
    # ---- mistérios ----
    ('<p class="chapeu">A oração de cada dia</p>', '<p class="chapeu" data-t="misterios.chapeu">A oração de cada dia</p>'),
    ('<h2 class="titulo">Os mistérios,', '<h2 class="titulo" data-t-html="misterios.titulo">Os mistérios,'),
    ('<p class="lead" style="margin-top:18px">Se você está começando a rezar',
     '<p class="lead" style="margin-top:18px" data-t-html="misterios.lead">Se você está começando a rezar'),
    # ---- sobre ----
    ('<p class="chapeu">A história</p>', '<p class="chapeu" data-t="sobre.chapeu">A história</p>'),
    ('<h2 class="titulo">Começou com um terço', '<h2 class="titulo" data-t-html="sobre.titulo">Começou com um terço'),
    ('<p class="lead" style="margin-top:20px">O primeiro terço foi para uso pessoal.',
     '<p class="lead" style="margin-top:20px" data-t-html="sobre.p1">O primeiro terço foi para uso pessoal.'),
    ('<p class="lead" style="margin-top:16px">Com o tempo veio a percepção',
     '<p class="lead" style="margin-top:16px" data-t-html="sobre.p2">Com o tempo veio a percepção'),
    ('<p class="lead" style="margin-top:16px">Hoje as encomendas saem daqui',
     '<p class="lead" style="margin-top:16px" data-t-html="sobre.p3">Hoje as encomendas saem daqui'),
    ('<a class="btn btn-ouro" href="https://www.instagram.com/atelie_santotercoo/" target="_blank" rel="noopener">Ver o dia a dia no Instagram</a>',
     '<a class="btn btn-ouro" data-href="geral.instagram" data-t="sobre.cta" href="https://www.instagram.com/atelie_santotercoo/" target="_blank" rel="noopener">Ver o dia a dia no Instagram</a>'),
    ('<a href="https://www.instagram.com/atelie_santotercoo/" target="_blank" rel="noopener" aria-label="Instagram do Ateliê Santo Terço">',
     '<a data-href="geral.instagram" href="https://www.instagram.com/atelie_santotercoo/" target="_blank" rel="noopener" aria-label="Instagram do Ateliê Santo Terço">'),
    # ---- depoimentos ----
    ('<p class="chapeu">Quem já levou</p>', '<p class="chapeu" data-t="depoimentos.chapeu">Quem já levou</p>'),
    ('<h2 class="titulo">Devoções que viraram', '<h2 class="titulo" data-t-html="depoimentos.titulo">Devoções que viraram'),
    ('<p class="lead" style="margin-top:20px">O que mais me emociona é receber fotos',
     '<p class="lead" style="margin-top:20px" data-t-html="depoimentos.lead">O que mais me emociona é receber fotos'),
    ('<p>"Encomendei o terço da minha filha com o nome dela',
     '<p data-t-html="depoimentos.lista.0.texto">"Encomendei o terço da minha filha com o nome dela'),
    ('<b>Maria</b><span>Terço infantil com nome</span>',
     '<b data-t="depoimentos.lista.0.nome">Maria</b><span data-t="depoimentos.lista.0.contexto">Terço infantil com nome</span>'),
    ('<p>"O terço de Santa Rita chegou perfeito',
     '<p data-t-html="depoimentos.lista.1.texto">"O terço de Santa Rita chegou perfeito'),
    ('<b>Fernanda</b><span>Terço de Santa Rita</span>',
     '<b data-t="depoimentos.lista.1.nome">Fernanda</b><span data-t="depoimentos.lista.1.contexto">Terço de Santa Rita</span>'),
    ('<p>"O terço da noiva emocionou a minha irmã',
     '<p data-t-html="depoimentos.lista.2.texto">"O terço da noiva emocionou a minha irmã'),
    ('<b>Ana Paula</b><span>Terço de noiva</span>',
     '<b data-t="depoimentos.lista.2.nome">Ana Paula</b><span data-t="depoimentos.lista.2.contexto">Terço de noiva</span>'),
    ('<b>500+</b><span>terços enviados</span>',
     '<b data-t="depoimentos.faixa.0.t">500+</b><span data-t="depoimentos.faixa.0.s">terços enviados</span>'),
    ('<b>26</b><span>estados alcançados</span>',
     '<b data-t="depoimentos.faixa.1.t">26</b><span data-t="depoimentos.faixa.1.s">estados alcançados</span>'),
    ('<b>100%</b><span>feito à mão</span>',
     '<b data-t="depoimentos.faixa.2.t">100%</b><span data-t="depoimentos.faixa.2.s">feito à mão</span>'),
    # ---- chamada final ----
    ('<p class="chapeu rv">Fale com o ateliê</p>', '<p class="chapeu rv" data-t="final.chapeu">Fale com o ateliê</p>'),
    ('<h2 class="titulo rv">Qual devoção', '<h2 class="titulo rv" data-t-html="final.titulo">Qual devoção'),
    ('<p class="lead centro rv" style="margin-top:22px">Chame no WhatsApp',
     '<p class="lead centro rv" style="margin-top:22px" data-t-html="final.lead">Chame no WhatsApp'),
    ('</svg>\n          Falar no WhatsApp\n        </a>',
     '</svg>\n          <span data-t="final.cta1">Falar no WhatsApp</span>\n        </a>'),
    ('<a class="btn btn-linha" href="#catalogo">Voltar ao catálogo</a>',
     '<a class="btn btn-linha" href="#catalogo" data-t="final.cta2">Voltar ao catálogo</a>'),
    # ---- rodapé ----
    ('<h4>Ateliê Santo Terço</h4>', '<h4 data-t="rodape.titulo">Ateliê Santo Terço</h4>'),
    ('<p>Terços artesanais feitos com fé. Cada peça é montada à mão,',
     '<p data-t-html="rodape.sobre">Terços artesanais feitos com fé. Cada peça é montada à mão,'),
    ('<h4>Catálogo</h4>', '<h4 data-t="rodape.cat_titulo">Catálogo</h4>'),
    ('<h4>Como comprar</h4>', '<h4 data-t="rodape.como_titulo">Como comprar</h4>'),
    ('<a id="zapRodape2" href="#" target="_blank" rel="noopener">WhatsApp (16) 99103-8587</a>',
     '<a id="zapRodape2" href="#" target="_blank" rel="noopener"><span data-t="geral.zap_tel">WhatsApp (16) 99103-8587</span></a>'),
    ('<span>Peças artesanais: pequenas variações fazem parte do feito à mão.</span>',
     '<span data-t-html="rodape.nota_base">Peças artesanais: pequenas variações fazem parte do feito à mão.</span>'),
    # ---- carrinho ----
    ('<h3>Minha lista</h3>', '<h3 data-t="carrinho.titulo">Minha lista</h3>'),
    ('<label class="obs-rot" for="obs">Cor, devoção ou nome para gravar</label>\n    <textarea class="obs" id="obs" placeholder="Ex.: o de Santa Rita em tom rosa, com o nome Helena gravado"></textarea>\n    <label class="obs-rot" for="cep">CEP ou cidade para estimar o frete (opcional)</label>',
     '<label class="obs-rot" for="obs" data-t="carrinho.obs_rot">Cor, devoção ou nome para gravar</label>\n    <textarea class="obs" id="obs" data-ph="carrinho.obs_placeholder" placeholder="Ex.: o de Santa Rita em tom rosa, com o nome Helena gravado"></textarea>\n    <label class="obs-rot" for="nomeCliente" data-t="carrinho.nome_rot">Seu nome (opcional)</label>\n    <input class="cep" id="nomeCliente" data-ph="carrinho.nome_placeholder" placeholder="Ex.: Maria Helena" autocomplete="name">\n    <label class="obs-rot" for="whatsCliente" data-t="carrinho.whats_rot">Seu WhatsApp (opcional)</label>\n    <input class="cep" id="whatsCliente" data-ph="carrinho.whats_placeholder" placeholder="Ex.: (16) 99999-9999" inputmode="tel" autocomplete="tel">\n    <label class="obs-rot" for="cep" data-t="carrinho.cep_rot">CEP ou cidade para estimar o frete (opcional)</label>'),
    ('<input class="cep" id="cep" inputmode="numeric" placeholder="Ex.: 14800-000 ou Araraquara - SP">',
     '<input class="cep" id="cep" inputmode="numeric" data-ph="carrinho.cep_placeholder" placeholder="Ex.: 14800-000 ou Araraquara - SP">'),
    ('<div class="total"><span>Total estimado</span><b id="total">R$ 0,00</b></div>',
     '<div class="total"><span data-t="carrinho.total_rot">Total estimado</span><b id="total">R$ 0,00</b></div>'),
    ('<p class="gaveta-nota" id="notaCombinar" hidden style="text-align:left;margin:-8px 0 14px">Há peças com valor a combinar na sua lista — o orçamento delas sai na conversa.</p>',
     '<p class="gaveta-nota" id="notaCombinar" hidden style="text-align:left;margin:-8px 0 14px" data-t-html="carrinho.nota_combinar">Há peças com valor a combinar na sua lista — o orçamento delas sai na conversa.</p>'),
    ('</svg>\n      Fechar pedido no WhatsApp\n    </a>',
     '</svg>\n      <span data-t="carrinho.botao">Fechar pedido no WhatsApp</span>\n    </a>'),
    ('<p class="gaveta-nota">Nada é cobrado aqui.',
     '<p class="gaveta-nota" data-t-html="carrinho.nota">Nada é cobrado aqui.'),
]

falhas = []
for antigo, novo in R:
    n = html.count(antigo)
    if n == 1:
        html = html.replace(antigo, novo)
    else:
        falhas.append((n, antigo[:70]))

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

if falhas:
    print("ATENÇÃO: " + str(len(falhas)) + " substituições falharam (0 ou múltiplas ocorrências):")
    for n, a in falhas:
        print(f"  [{n}x] {a}")
else:
    print("OK: todas as " + str(len(R)) + " substituições aplicadas.")