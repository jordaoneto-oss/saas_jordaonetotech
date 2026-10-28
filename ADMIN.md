# Editor visual, Gestão e painel completo — Manual de acesso e uso

`/admin.html` redireciona para o editor visual (`editor.html`). A **Gestão** de pedidos, clientes e relatórios abre dentro do próprio editor, em um painel claro e integrado. O painel completo também continua disponível diretamente em `/admin-completo.html`.

## Sumário

1. [Como iniciar o servidor](#como-iniciar-o-servidor)
2. [Como acessar o painel](#como-acessar-o-painel)
3. [Senha](#senha)
4. [Editor visual](#editor-visual)
5. [Gestão integrada](#gestão-integrada)
6. [Pedidos](#pedidos)
7. [Clientes](#clientes)
8. [Relatórios](#relatórios)
9. [Painel completo](#painel-completo)
10. [Onde ficam os dados](#onde-ficam-os-dados)
11. [Backup](#backup)
12. [Publicar na internet](#publicar-na-internet)
13. [Problemas comuns](#problemas-comuns)

---

## Como iniciar o servidor

O site e o painel rodam por um servidor local em Python (não precisa instalar nada).

1. Abra o terminal.
2. Entre na pasta do site (onde está o arquivo `server.py`).
3. Inicie o servidor:

   ```bash
   python3 server.py
   ```

O servidor mostra as mensagens:

```
Painel admin: http://localhost:8324/editor.html
```

Para encerrar, pressione `Ctrl+C` no terminal.

### Opções do servidor

| Comando | O que faz |
|---|---|
| `python3 server.py` | Inicia na porta padrão 8324, só nesta máquina |
| `python3 server.py --port 9000` | Muda a porta |
| `python3 server.py --host 0.0.0.0` | Libera acesso na rede local (para testar no celular no mesmo Wi-Fi; troque a senha antes) |
| `python3 server.py --help` | Mostra as opções |

> Em produção o painel fica atrás de HTTPS e, no caso do superadmin, restrito por IP. Nunca exponha a porta direta na internet.

---

## Como acessar o painel

Com o servidor rodando, abra no navegador:

```
http://localhost:8324/admin.html
```

O `admin.html` apenas redireciona: sem parâmetros abre o **editor visual**; com `?reset` abre o painel completo para trocar a senha. Para abrir uma loja específica, use `?loja=<slug>`.

Para ir direto ao painel completo ou a uma aba:

```
http://localhost:8324/admin-completo.html?loja=teste-homolog&aba=pedidos
http://localhost:8324/admin-completo.html?loja=teste-homolog&aba=clientes
http://localhost:8324/admin-completo.html?loja=teste-homolog&aba=vendidos
```

No editor, o botão **Gestão** (barra superior) abre Pedidos, Clientes e Relatórios sem sair da edição. A sessão é compartilhada entre editor e painel completo; o iframe usa o modo `embed=1`, com tema claro. O painel aberto diretamente continua no tema escuro.

Se errar muitas vezes seguidas, aguarde 1 minuto (proteção contra tentativas).

---

## Senha

- A senha padrão é **`atelie123`** — troque na primeira entrada, em **Configurações → Senha do painel**.
- Mínimo de 6 caracteres; dá para ver o que digita no 👁.
- A senha fica gravada (em hash seguro) no arquivo `data/admin.json`.
- Esqueceu? Peça ao suporte um **link de redefinição** (vale 30 minutos, uso único).
- Trocar a senha encerra as outras sessões abertas por segurança.

---

## Editor visual

O editor é aberto em `/editor.html?loja=<slug>` (ou pelo `admin.html`). A barra lateral tem **Páginas**, **Design**, **Catálogo**, **Ajustes** e **Gestão**. O painel completo usa nomes equivalentes: **Conteúdo do site**, **Aparência**, **Produtos**, **Configurações** e as abas de gestão.

### Páginas (Conteúdo do site)

No painel **Páginas** há **atalhos fixos por seção** (Identidade, Menu, Botões, Capa...) — 1 clique rola até o bloco e o destaca. No painel completo, a mesma edição fica em **Conteúdo do site**.

Edita todos os textos do site, seção por seção (identidade, **menu do site**, **botões do site**, capa, selos, destaques, catálogo — incluindo o **texto de exemplo dentro da busca** —, encomenda, **coleções da vitrine**, ocasiões, oração, como rezar, história, depoimentos, chamada final e rodapé).

No **editor visual**, as seções com mídia também permitem trocar **imagem ou vídeo** direto no campo, com envio de arquivo:
- **Capa** e **Sob encomenda**: imagem/vídeo principal + imagem de capa do vídeo;
- **O ateliê** e **A história**: foto principal e secundária (aceitam imagem ou vídeo);
- **Ocasiões**: cada cartão aceita imagem ou vídeo;
- **Diferenciais**: cada selo tem imagem/ícone, título e detalhe próprios (imagem vazia usa o ícone padrão).
- **Destaques**: cada cartão aceita produto opcional, imagem ou vídeo, título, texto, preço, observação, selo, texto do botão e link. Sem produto, o botão vira link (“Ver catálogo”, por exemplo); com produto, continua adicionando à Minha Lista.

O **logo** fica em **Design → Logo**: escolha uma imagem da biblioteca, envie um novo arquivo (PNG/WebP/JPG até 8 MB) ou volte ao padrão do site.

- Cada bloco tem seu botão **Salvar**.
- Ao digitar, o botão ganha um **ponto laranja** (rascunho não salvo); o navegador avisa se você tentar sair antes de salvar.
- Campos marcados com "aceita HTML" aceitam formatação simples: `<b>negrito</b>`, `<em>itálico</em>`, `<br>` para quebrar linha.
- As alterações aparecem no site público imediatamente.
- **Listas** (selos, passos, coleções, depoimentos...): cada linha tem **↑ ↓** (reordenar) e **Remover**, e há botão **＋ Adicionar** no fim. Linhas vazias são descartadas ao salvar.

#### Menu do site

Edita os links do topo (texto + destino, ex.: `Catálogo` → `#catalogo`, ou link externo `https://...`).

#### Botões do site

Muda **todos** os botões de uma vez: **formato** (Padrão/Pílula/Quadrado) e **texto** (MAIÚSCULAS/Normal). As cores continuam em **Identidade visual** (`ouro` = botões principais, `zap` = WhatsApp) e cada texto de botão continua no seu bloco (Capa → Botão 1/2 etc.).

#### Coleções da vitrine

A lista de nomes é a **lista mestra de coleções**: o que tem produtos vira **botão com contagem** no site (filtra o catálogo ao clicar); o que não tem vira selo informativo. Use ↑ ↓ para ordenar os botões, ＋ para criar e Remover para excluir (salve no fim). Depois atribua a coleção em cada produto (painel **Catálogo** → campo **Coleção**).

#### Estilo da seção (aba Estilo do inspetor)

Cada seção do site tem uma aba **Estilo** com o mesmo conjunto de controles — a personalização é modular e vale para qualquer seção:

- **Fundo**: cor sólida, gradiente (com ângulo) ou imagem (com intensidade de escurecimento e posição).
- **Texto**: cor do texto e cor do texto secundário (legendas, resumos, apoio).
- **Formato**: borda (cor, largura e estilo), cantos arredondados, sombra, espaço acima/abaixo, largura do conteúdo e alinhamento.
- **Interação (hover e foco)**: cor de fundo, cor de texto, sombra, deslocamento e escala no hover; cor e largura do anel de foco.
- **Fonte da seção**: uma fonte para os títulos e outra para os textos, sem mexer na identidade global.
- **Ritmo**: presets de espaçamento (**Compacto**, **Confortável**, **Amplo**, **Painel**) que ajustam o espaço acima e abaixo de uma vez; os valores finos continuam disponíveis.
- **Ícone da seção**: escolha um ícone da biblioteca, o tamanho, a cor e a posição (acima do título, ao lado, à esquerda do bloco ou **esconder no site**).
- **Ícones fixos da seção**: o ornamento do cabeçalho e a estrela das avaliações podem ser trocados ou escondidos.
- **Componentes da seção**: cada bloco tem os mesmos controles (bloco de texto, botões, grade, card, cabeçalho, moldura, números...). Abra o componente e ajuste só ele. Nas grades há **Colunas da grade** (computador / tablet / celular); nos cards há **Ícone do componente**.
- **Reutilizar**: **Copiar o estilo** desta seção para outra, e **Restaurar o padrão** volta a seção (e seus componentes) ao estilo original.

Na aba **Páginas**, as seções com estilo próprio ganham um **ponto azul** — assim dá para ver, de relance, o que já foi customized.

Tudo é salvo em `config.json`, no bloco `estilo` (`secoes` por seção e `componentes` por componente), e aparece na prévia na hora.

### Catálogo (Produtos)

No editor, o painel **Catálogo** edita os produtos; no painel completo, a aba equivalente é **Produtos**. Gestão completa do catálogo, com **busca** (nome, descrição, etiqueta, coleção ou id) e **filtro por linha**:

- **Lista**: foto, **posição na vitrine**, nome, linha, **coleção**, preço e etiqueta — já na ordem em que aparecem no site.
- **Setas ↑ ↓**: trocam a posição do produto com o vizinho (vale no modo **Destaques** do site).
- **+ Novo produto**: cria um produto novo (já sugere a próxima posição).
- **Editar**: nome, linha, **coleção (da lista de Coleções)**, **posição na vitrine** (1 aparece primeiro), preço, etiqueta, selo do destaque, vídeo do destaque, descrição e foto.
- **Preço vazio** = "Sob consulta" (aparece sem preço no site).
- **Apagar**: remove o produto (pede confirmação).
- **Enviar foto**: usa as imagens de `img/` ou envia uma nova (webp, png ou jpg, até 8 MB; mostra "Enviando…" durante o upload). O site gera miniaturas leves sozinho.
- **Vídeo do destaque**: pode colar o caminho ou enviar um MP4/WebM de até 20 MB; o vídeo toca no card de destaques.

### Minha Lista (Finalizar compra)

No editor, selecione **Minha Lista** na prévia ou use o inspetor da sacola; no painel completo, a aba equivalente é **Finalizar compra**. Personaliza a sacola de pedidos do site (textos, botões e campos): títulos, botões, rótulos e exemplos dos campos (observação, nome, WhatsApp, CEP), avisos e textos de lista vazia — além do **WhatsApp do ateliê** usado em todos os botões.

Também é possível personalizar a **mensagem enviada no pedido** (campo “Mensagem enviada no pedido”). Use os marcadores `{loja}`, `{itens}`, `{total}`, `{combinar}`, `{observacao}`, `{cliente}`, `{entrega}`, `{nome}`, `{whatsapp}` e `{cep}`; mantenha `{itens}` e `{total}` para não perder os dados. Em branco = texto padrão. As mensagens dos botões de WhatsApp ficam em **Contato da loja** (`zap.msg_ola` e `zap.msg_encomenda`).

### Design (Aparência)

No editor, o painel **Design** cuida da identidade; no painel completo, a aba equivalente é **Aparência**.

- **Temas prontos**: Artesanal, Moderno e Noturno — 1 clique aplica cores e fontes na prévia; **Salve** para valer.
- **Logo**: escolha entre as imagens ou envie uma nova (PNG com fundo transparente de preferência).
- **Biblioteca de ícones**: SVGs próprios para usar nos selos.
- **Cores e fontes**: valem para o **site**. O painel completo aberto diretamente usa tema escuro; dentro da Gestão (modo embutido) o tema é claro, para leitura confortável. Confira o site em **Ver o site ↗**.

### Ajustes (Configurações)

No editor, o painel **Ajustes** reúne dados da loja, mensagens, popup e atalhos. No painel completo, use **Configurações** para trocar a senha.

- **Dados da loja**: nome, frase curta, WhatsApp (com DDI), Instagram, título e descrição de SEO;
- **Botões**: formato (padrão/pílula/quadrado) e texto (maiúsculas/normal);
- **Mensagens de WhatsApp**: `zap.msg_ola` e `zap.msg_encomenda`;
- **Popup de captura**: ativar, título, texto, botão e cupom; no painel completo, fica em **Conteúdo do site** e inclui atraso, intervalo, janela de promoção e aviso LGPD;
- **Mais opções**: atalhos para Pedidos, Clientes, Relatórios, painel completo e ver a loja.

---

## Gestão integrada

O botão **Gestão** na barra do editor abre um painel em tela cheia, com três abas:

| Aba | Para quê |
|---|---|
| **Pedidos** | Acompanhar, responder e mudar o status dos pedidos |
| **Clientes** | Ver histórico, origem, total gasto, tags e anotações |
| **Relatórios** | KPIs, vendas por mês, ranking, status e origem |

Detalhes de funcionamento:

- o painel usa um iframe same-origin de `admin-completo.html` com `?embed=1`; a sessão do editor é compartilhada, sem novo login;
- as abas **Pedidos**, **Clientes** e **Relatórios** do iframe são acionadas por `__adminIrPara(aba)`;
- **Voltar ao editor** ou **Esc** fecha a Gestão; se houver um modal aberto dentro do iframe, o primeiro **Esc** fecha o modal e o segundo fecha a Gestão;
- ao fechar, o iframe não é recarregado, preservando filtros e posição da lista;
- o tema claro vale apenas no modo embutido; `admin-completo.html` aberto direto continua escuro;
- em telas pequenas, a Gestão ocupa a tela inteira e os modais viram folhas roláveis.

A Gestão também pode ser aberta direto em uma aba:

```
/admin-completo.html?aba=pedidos&embed=1
/admin-completo.html?aba=clientes&embed=1
/admin-completo.html?aba=vendidos&embed=1
```

## Pedidos

A aba **Pedidos** reúne os pedidos fechados na sacola. Contatos feitos pelos botões de WhatsApp e pelo popup aparecem em **Clientes**.

**Filtros e busca**

- status: **Todos**, **Novo**, **Em produção**, **Concluído**, **Cancelado** (com contadores);
- período: todo o período, 7, 30, 90 dias ou 12 meses;
- busca por cliente, WhatsApp, peça, observação, CEP e origem.

**Na lista**

- status, data/hora, cliente com link de WhatsApp, origem, CEP/cidade, peças e total;
- pedidos novos ficam destacados; pedidos cancelados mostram o motivo;
- **WhatsApp** abre a conversa com uma saudação pronta;
- **Iniciar** (novo → em produção), **Concluir** (em produção → concluído) e **Reabrir** (concluído/cancelado → novo);
- **Cancelar** pede o motivo (obrigatório);
- **Detalhes** abre o pedido completo.

**No modal de detalhes**

- status, pagamento (pendente/pago/parcial/reembolsado) e entrega (a combinar/retirada/envio);
- motivo do cancelamento, quando houver;
- linha do tempo: criado, última mudança, concluído, cancelado;
- **Apagar** remove o pedido definitivamente (com confirmação).

O pedido também alimenta automaticamente os **Clientes** e os **Relatórios**. Pedidos antigos com status `atendido` são lidos como **Concluído**.

## Clientes

A aba **Clientes** agrupa os contatos pelo WhatsApp normalizado (DDD + número, com `55` quando necessário). O mesmo cliente pode ter várias origens e pedidos.

**Resumo**

- clientes identificados;
- quantos vieram do popup;
- quantos contatos do popup viraram pedido;
- taxa de conversão do popup.

**Filtros e busca**

- **Todos**, **Do popup**, **Com pedidos**, **Sem pedidos**;
- busca por nome, WhatsApp, origem, tag ou anotação.

**Na lista**

- nome, WhatsApp (link direto), origem (popup/sacola/produto/WhatsApp), pedidos totais e concluídos;
- **total gasto** considera apenas pedidos concluídos;
- última interação, tags e um resumo das anotações;
- **Histórico** abre o cliente com todos os pedidos/contatos, tags e anotações.

**No histórico**

- primeira e última interação;
- pedidos, concluídos, cancelados e total em compras concluídas;
- tags separadas por vírgula (ex.: `VIP, atacado, aniversário`);
- anotações livres (preferências, combinados, histórico de conversa).

Contatos que usaram botões do site mas não deixaram WhatsApp aparecem em **Mensagens sem WhatsApp**, com origem, data e mensagem; podem ser apagados individualmente.

## Relatórios

A aba **Relatórios** analisa o período escolhido: **7 dias**, **30 dias**, **90 dias**, **12 meses** ou **Tudo**.

**KPIs**

- pedidos recebidos, concluídos e cancelados;
- taxa de conclusão e de cancelamento;
- receita concluída, ticket médio, peças por pedido e total de peças;
- pedidos em produção agora;
- novos contatos;
- capturas no popup, quantos converteram e a taxa de conversão.

**Gráficos e rankings**

- **Vendas por mês** (últimos 12 meses), alternando entre **Receita** e **Pedidos**, com tabela detalhada opcional;
- **Produtos mais vendidos**: top 10, alternando entre **Unidades** e **Receita**, com pedidos, receita e participação;
- **Pedidos por status (agora)**: Novo, Em produção, Concluído e Cancelado;
- **Origem dos pedidos no período**.

As taxas de conclusão/cancelamento usam a data da mudança de status. Em recortes curtos, um pedido recebido antes do período pode entrar na conta se foi concluído/cancelado dentro dele.

## Painel completo

O painel completo (`admin-completo.html`) contém as mesmas abas e funções, com acesso direto por URL. Use quando quiser abrir **Pedidos**, **Clientes** ou **Relatórios** sem passar pelo editor, inclusive no celular.

Abas: **Início**, **Conteúdo do site**, **Produtos**, **Pedidos**, **Clientes**, **Relatórios**, **Finalizar compra**, **Aparência** e **Configurações**.

**Início** resume os últimos 30 dias: produtos no catálogo, pedidos recebidos, concluídos, cancelados, receita, ticket médio, clientes identificados, capturas do popup e conversão; mostra alertas de pedidos novos, pedidos em produção e contatos do popup sem retorno, além do top 5 mais vendidos com atalho para os relatórios.

- aberto direto: tema escuro;
- dentro da Gestão (`embed=1`): tema claro;
- a senha é a mesma do editor; a sessão é compartilhada no mesmo navegador;
- **Configurações → Senha do painel** troca a senha (mínimo 6 caracteres; encerra outras sessões);
- `?reset` (via `admin.html?reset`) abre o caminho de troca de senha.

---

## Onde ficam os dados

Tudo é arquivo simples (JSON), dentro da pasta da loja:

| Arquivo | Conteúdo |
|---|---|
| `config.json` | Textos e configurações do site (abas **Conteúdo do site** — incluindo menu, botões e coleções —, **Finalizar compra**, **Aparência** e popup) |
| `js/catalog.json` | Catálogo de produtos, com `ordem` (sequência) e `colecao` (aba **Produtos**) |
| `data/leads.json` | Pedidos e contatos recebidos (abas **Pedidos** e **Clientes**) |
| `data/clientes.json` | Tags e anotações por WhatsApp (aba **Clientes**; criado quando houver edição) |
| `data/admin.json` | Hash da senha do painel |
| `img/` | Fotos do site (as enviadas pelo painel vão para cá; `img/mini/` guarda as miniaturas geradas) |

Nenhum banco de dados é necessário — o servidor lê e grava esses arquivos a cada operação.

---

## Backup

Copie periodicamente para um drive/HD externo:

- `config.json`
- `js/catalog.json`
- `data/` (a pasta inteira)
- `img/` (para preservar fotos)

Para restaurar, coloque os arquivos de volta na mesma posição e reinicie o servidor. Em produção o backup é automático (veja o manual do operador).

---

## Publicar na internet

O painel funciona em qualquer servidor que rode Python:

1. Envie a pasta do site para o servidor.
2. Rode com `HOST=127.0.0.1` atrás de proxy reverso com HTTPS (Caddy/Nginx).
3. Troque a senha padrão, confira o `Cache-Control: no-store` nas páginas admin e restrinja o acesso (IP ou rede interna).

No projeto Super Loja, o caminho operacional é o release com travas:

```bash
./deploy/release-20261020-pedidos-clientes.sh 191.252.159.172
```

Ele valida a sintaxe, faz dry-run, publica código (nunca dados), propaga para as lojas e reinicia os serviços. As versões atuais de cache são `admin.css`/`admin.js` em `20261020-producao7`, `editor.js` em `20261020-admin8` e `editor.css` em `20261020-producao3`. Detalhes em `docs/RELEASE-20261020-PEDIDOS-CLIENTES.md`.

---

## Problemas comuns

| Sintoma | Solução |
|---|---|
| "Não é possível acessar" no navegador | O servidor não está rodando. Inicie com `python3 server.py`. |
| Site abre, painel não | Confirme `http://localhost:8324/admin.html` (com `/admin.html`). |
| Senha incorreta | Confira digitação (use o 👁). Se esqueceu, peça o link de redefinição ao suporte. |
| "Muitas tentativas" | Aguarde 1 minuto (rate-limit de 8/min). |
| "Sessão expirada" | O servidor reiniciou (sessões são temporárias) ou a senha foi trocada. Entre de novo. |
| Gestão abre em branco ou pede login | Confirme que editor e painel são do mesmo domínio (iframe same-origin) e que a sessão do editor está válida. Feche a Gestão e entre novamente no editor. |
| Gestão não abre | Recarregue com `Cmd+Shift+R`; confirme `admin-completo.html` na mesma pasta e que o popup não bloqueou o iframe. |
| Tema claro/escuro inesperado | A Gestão embutida (`embed=1`) é clara; `admin-completo.html` aberto direto é escuro. Isso é esperado. |
| Cliente não aparece em Clientes | O contato só entra com WhatsApp válido; mensagens sem número ficam em **Mensagens sem WhatsApp**. |
| Alteração não aparece no site | Recarregue com `Cmd+Shift+R`; no celular, feche e reabra a aba (o app guarda cache). `admin.js`/`app.js` nunca usam cache offline. |
| Foto não aparece | Use webp/png/jpg até 8 MB, enviada pelo painel (vai para `img/`). |
| Aviso ao sair da página | Há bloco com ponto laranja (não salvo). Salve antes de trocar de aba. |
