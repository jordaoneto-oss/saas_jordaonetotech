# Navegação no site — Guia

Guia de navegação e funcionamento do site público da loja.

## Sumário

1. [Como abrir o site](#como-abrir-o-site)
2. [Estrutura da página](#estrutura-da-página)
3. [O menu do topo](#o-menu-do-topo)
4. [Catálogo: busca, filtros e ordenação](#catálogo-busca-filtros-e-ordenação)
5. [Ficha da peça (modal)](#ficha-da-peça-modal)
6. [Minha lista (a gaveta de pedidos)](#minha-lista-a-gaveta-de-pedidos)
7. [Fechar o pedido no WhatsApp](#fechar-o-pedido-no-whatsapp)
8. [Popup de captura](#popup-de-captura)
9. [Barra fixa de checkout](#barra-fixa-de-checkout)
10. [Avisos e toasts](#avisos-e-toasts)
11. [Acessibilidade](#acessibilidade)
12. [App / instalação e modo offline (PWA)](#app--instalação-e-modo-offline-pwa)
13. [Compartilhamento por link](#compartilhamento-por-link)
14. [Multi-lojas (?loja=)](#multi-lojas-loja)
15. [Arquivos do site](#arquivos-do-site)

---

## Como abrir o site

Com o servidor rodando (`python3 server.py` na pasta do projeto), abra:

```
http://localhost:8324/
```

Para o visitante final, o endereço público será o domínio próprio (ex.: `https://ateliesantoterco.com.br`) ou o subdomínio da plataforma (ex.: `https://doces-da-ana.app.jordaonetotech.com.br`).

---

## Estrutura da página

O site é uma única página dividida em seções, de cima para baixo:

| Seção | O que mostra |
|---|---|
| **Topo** | Logo centralizado + botões de menu e "Minha lista" (no celular: logo em cima, botões à direita) |
| **Capa (hero)** | Chamada principal, botões "Ver o catálogo" e "Quero personalizar", imagem ou vídeo editável e faixa de prova social (números da loja) |
| **Selos** | 4 diferenciais com imagem/ícone, título e detalhe editáveis |
| **Destaques** | Cartões com imagem ou vídeo, título, texto, preço, selo e botão editáveis; produto e link opcionais |
| **O ofício / editorial** | Como a loja trabalha, com duas fotos ou vídeos editáveis |
| **Catálogo** | Todas as peças, com busca, filtros e ordenação |
| **Encomenda / personalizado** | Como pedir sob medida, em passos, com imagem/vídeo editável e botão de WhatsApp |
| **Devoções / coleções** | Botões por coleção (com contagem, filtram o catálogo e rolam até a peça) + selos informativos |
| **Ocasiões** | Vitrines temáticas com foto ou vídeo editável |
| **Oração / destaque** | Citação em cartão |
| **Como rezar / informativo** | Cartões de conteúdo |
| **Sobre / história** | Sobre a loja, números e duas fotos ou vídeos editáveis |
| **Depoimentos** | Avaliações e faixa de prova social |
| **Chamada final** | Botão "Falar no WhatsApp" |
| **Rodapé** | Sobre, links, "Como comprar", WhatsApp e Instagram |

Textos, ordem e conteúdo variam por loja e por tema — a tabela acima reflete a loja modelo.

---

## O menu do topo

Editável no painel (**Páginas → Menu do site**: texto + destino por item). No desktop: logo centralizado, links de navegação à esquerda e ações à direita. No celular: botão "hambúrguer" abre o menu em lista.

À direita fica o botão da **Minha lista** com o contador de peças escolhidas (0, 1, 2...).

---

## Catálogo: busca, filtros e ordenação

Toda a navegação do catálogo acontece sem recarregar a página.

- **Busca**: o texto de exemplo é personalizável por loja (o dono edita em Produtos/Páginas). O campo tem botão "x" para limpar e não trava o teclado (resposta com micro-atraso).
- **Filtros**: por linha/categoria, cada um com a **contagem de peças**. Só uma dimensão por vez: escolher **coleção** limpa linha+busca; escolher linha ou digitar busca solta a coleção.
- **Ordenação**: **Destaques** (sequência definida no painel, Produtos → setas ↑↓/Posição; sem número, ordem de cadastro), Lançamentos primeiro, Menor preço ou Maior preço.
- Um aviso mostra quantas peças foram encontradas (na coleção, com botão **limpar ✕**).
- Cada peça mostra: foto otimizada, nome, descrição curta, preço (ou "Sob consulta") e o botão **Adicionar**.
- Busca sem resultado oferece **"Perguntar no WhatsApp"** já com o termo digitado.

A busca e o filtro ficam no endereço da página (sem perder a loja atual), então dá para **compartilhar o link** de uma seleção. Veja [Compartilhamento por link](#compartilhamento-por-link).

### Performance

- Fotos da lista são **miniaturas leves** (a foto cheia só abre na ficha da peça, com zoom por toque);
- vídeos abaixo da dobra só tocam quando aparecem na tela;
- textos e estilos chegam **comprimidos (gzip)**.

---

## Ficha da peça (modal)

Ao clicar na foto da peça, abre uma janela com:

- foto em alta (toque para **zoom**), etiqueta, nome;
- preço ou "Sob consulta";
- descrição completa;
- **personalização**: campos definidos pela loja (ex.: devoção com sugestões, cor, nome a gravar, prazo);
- botão **Adicionar à lista** e botão **Encomendar no WhatsApp** (abre direto com a peça preenchida).

No celular a ficha rola como página normal até os botões. Fecha com "X", `Esc` ou clicando fora; o foco volta para a foto de origem.

---

## Minha lista (a gaveta de pedidos)

Abrir por: botão da sacola no topo, barra fixa de checkout (no celular) ou "Ver lista" no aviso de confirmação.

Dentro da gaveta, em 3 blocos:

1. **Suas peças** — foto, nome, personalização, preço, quantidade (+/−), **editar** e remover;
2. **Personalização e entrega (opcional)** — sanfona fechada: observação geral, nome, WhatsApp e CEP/cidade;
3. **Rodapé fixo** — Total estimado (com "+" se houver valor a combinar) e **Fechar pedido no WhatsApp**, sempre visíveis.

Sem peças, a gaveta mostra atalho de volta ao catálogo. A lista é salva no navegador (`localStorage`): fechar a aba e voltar mantém as peças (válido por loja).

---

## Fechar o pedido no WhatsApp

1. Com peças na lista, toque em **Fechar pedido no WhatsApp** (ou na barra fixa, no celular).
2. O WhatsApp abre com a mensagem pronta: peças com quantidade/preço/personalização, total estimado, dados preenchidos e pedido de confirmação de disponibilidade, prazo e frete. O lojista pode personalizar esse texto no editor visual (**Páginas → Minha Lista → Mensagem no WhatsApp**) usando marcadores como `{itens}`, `{total}` e `{cliente}`; sem personalização, vale o texto padrão.
3. Se a lista estiver vazia, a página rola até o catálogo em vez de abrir o WhatsApp.

Ao tocar no botão, o pedido também é **registrado no painel**: aparece em **Pedidos** (status, pagamento, entrega e WhatsApp), alimenta **Clientes** (histórico e total gasto) e entra nos **Relatórios** (KPIs, ranking e origem). A loja pode abrir a Gestão pelo botão **Gestão** no editor ou por `admin-completo.html?aba=pedidos`.

---

## Popup de captura

Quando ativado em **Ajustes → Popup** (editor) ou **Conteúdo do site → Popup** (painel completo), o site exibe um popup para captar nome + WhatsApp:

- aparece depois de um atraso configurável e, por padrão, **1 vez por aparelho** a cada 7 dias;
- pode ter janela de promoção (início/fim) e contagem regressiva; fora da janela não aparece;
- o envio grava um contato com origem `popup: <título>` e aparece em **Clientes** e **Relatórios**;
- o cupom configurado é mostrado após o envio; o aviso de consentimento (LGPD) é opcional;
- para testar sem esperar, abra o site com `?previa-popup=1`;
- desativado por padrão; sem configuração, não interfere na navegação.

---

## Barra fixa de checkout

No celular, quando há peças na lista, aparece uma barra fixa embaixo com "N peças · valor" e o botão **Fechar pedido** — leva direto para a gaveta. Ela some de verdade quando a lista esvazia (e o botão flutuante de WhatsApp volta).

---

## Botões do site

Formato (padrão/pílula/quadrado) e caixa do texto (MAIÚSCULAS/normal) valem para todos os botões e são definidos no painel (**Páginas → Botões do site**); cores em Identidade visual.

---

## Avisos e toasts

- **Toast** (embaixo): "Peça adicionada à sua lista." com botão **Ver lista**, ou "Personalização atualizada.".
- **Prazo de produção** aparece no catálogo e na ficha da peça.
- Página com JavaScript desativado mostra aviso para ativar o JS.

---

## Acessibilidade

- `Esc` fecha modal/gaveta/menu (a gaveta prende o foco do teclado enquanto aberta).
- Foco visível ao navegar com teclado; filtros anunciam seleção (`aria-pressed`); resumos com `aria-live`.
- Alvos de toque ≥ 44px; campos com 16px (sem zoom automático no iOS); respiro da notch.
- Vídeos pausam fora da tela e respeitam "reduzir movimento" (que também desliga autoplay e animações).
- Link "Pular para o conteúdo" no início.

---

## App / instalação e modo offline (PWA)

O site é um **PWA**:

- no celular: "Adicionar à tela inicial" instala como um app;
- CSS/JS/imagens usam cache versionado (cada atualização do site gera uma versão nova — se algo parecer antigo, feche e reabra a aba);
- catálogo e textos vêm sempre da internet: edições do painel aparecem sem atualizar o app.

---

## Compartilhamento por link

Filtros e busca aparecem na URL (ex.: `?cat=premium&q=fatima`, `?col=Santa+Rita`). Útil para campanhas: mande o link já com a seleção pronta.

---

## Multi-lojas (?loja=)

Na plataforma, a mesma instalação atende várias lojas: `?loja=<slug>`, subdomínio (`<slug>.app.jordaonetotech.com.br`) ou domínio próprio selecionam a loja — cada uma com textos, catálogo, sacola e login separados.

---

## Arquivos do site

| Arquivo | Função |
|---|---|
| `index.html` | Página do site (com SEO dinâmico por loja e cards de Twitter/Open Graph) |
| `css/style.css` | Estilos visuais (inclui regras por tema via variáveis) |
| `js/app.js` | Comportamento: catálogo, lista, modal, busca, WhatsApp |
| `js/catalog.json` | Produtos (editável pelo admin), com `ordem` (sequência) e `colecao` |
| `config.json` | Textos e configurações (editável pelo admin), incluindo `menu`, `botoes` e coleções |
| `sw.js` e `manifest.webmanifest` | App offline (PWA) e ícones |
| `img/` e `img/mini/` | Fotos e miniaturas leves geradas |
| `video/` | Vídeos (hero toca de imediato; demais, ao rolar) |
| `admin.html` | Redireciona para o editor visual (preserva `?loja=`; `?reset=` abre o painel completo) |
| `editor.html` + `editor.js` + `editor.css` | Editor visual da loja (admin padrão) |
| `admin-completo.html` + `admin.css` + `admin.js` | Painel completo (Pedidos, Clientes, Relatórios, senha); aceita `?aba=pedidos`, `?aba=clientes` ou `?aba=vendidos` e `embed=1` — veja `ADMIN.md` |
| `saas/tenants.json`, `saas/lojas.json`, `saas/temas.json` | Registro de lojas/tenants e temas visuais da plataforma |
