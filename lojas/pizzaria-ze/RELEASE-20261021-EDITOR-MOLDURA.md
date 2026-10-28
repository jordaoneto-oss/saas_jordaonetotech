# Release 2026-10-21 — Editor sem demonstração + tamanho das mídias

> **Status: validado localmente (Fase 0 OK), pronto para deploy.** O deploy está pendente porque o SSH para `root@191.252.159.172` retorna `Permission denied (publickey,password)`.

## Como executar o deploy

```bash
cd "/Users/josecarlosjordaodasilvaneto/Library/Mobile Documents/com~apple~CloudDocs/Documents/DOCUMENTOS/Saas - Site_JU" && ./deploy/release-20261021-editor-moldura.sh 191.252.159.172
```

Fases (cada uma pede confirmação):

1. **Fase 0** — validação local: `node --check`, `py_compile`, JSON, login do editor sem demonstração, regras de `[hidden]` na `.moldura` e no `.pop-count`, propagação local, teste de regressão no Chrome headless (mede a altura dos quadros da capa e da Sob encomenda) e backup em `backups/pre-release-20261021-editor-moldura-*`.
2. **Fase 1** — dry-run na VPS, somente leitura.
3. **Fase 2** — publica código + restart (segundos de indisponibilidade).
4. **Fase 3** — verifica arquivos nas lojas e status `200` das páginas.

Pré-requisito: SSH como `root@191.252.159.172` (chave ou senha) funcionando.

## Escopo

**Editor — login sem modo demonstração**

- a tela de login não mostra mais o botão **Explorar em modo demonstração**, o divisor "ou" nem a nota "No modo demonstração as alterações ficam salvas apenas neste navegador";
- a nota de ajuda do editor deixa de indicar "Use o modo demonstração para testar sem alterar os dados reais";
- o atalho `editor.html?demo=1` deixa de abrir o editor (não havia link para ele no produto);
- a trava de leitura do editor (`state.demo`) **continua no código** como proteção: nenhum campo de conteúdo é liberado sem senha. Remover esse código morto é opcional e não está neste release.

**Site — tamanho das imagens da capa e da seção Sob encomenda**

Causa: em `.moldura` (quadro da capa e quadro da Sob encomenda) a regra do autor `.moldura video,.moldura>img{...display:block}` vencia o `[hidden]{display:none}` do navegador. A `<img hidden>` continuava ocupando uma caixa 3/4 inteira, empilhada abaixo do vídeo.

- antes: os dois quadros mediam **1020px** (vídeo 496px + imagem oculta 496px);
- depois: os dois medem **524px**, com **um** quadro 3/4 em vídeo e em imagem;
- o mesmo padrão foi corrigido em `.pop-count` (contador do popup de captura), que também aparecia com `hidden`;
- nenhuma imagem foi redimensionada ou recomprimida: o quadro continua 3/4 com `object-fit: cover`.

**Cache**

- `css/style.css` do site: `?v=20261021-moldura1`;
- `editor.js`: `?v=20261021-editor1`;
- PWA: bumped automaticamente por `scripts/atualizar_todas.py` no deploy.

## O que NÃO entra

- Sem migração de dados: `config.json`, `js/catalog.json`, `data/`, `img/` e `video/` intactos.
- Sem mudança no layout dos quadros (continuam 3/4, para manter o enquadramento dos santinhos).
- Sem remoção do código de leitura do editor (`state.demo`).
- Sem mudança no painel completo (`admin-completo.html`) e no super admin.

## Arquivos tocados

- `editor.html` (login sem demonstração, nota de ajuda, versão do `editor.js`);
- `editor.js` (sem `entrarDemo`, sem listener de `#btnDemo`, sem entrada por `?demo=1`);
- `css/style.css` (regras `[hidden]` da `.moldura` e do `.pop-count`);
- `index.html` (versão do CSS);
- `deploy/release-20261021-editor-moldura.sh`;
- clones em `lojas/*/` via `scripts/atualizar_todas.py`.

Versões de cache: `css/style.css` `20261021-moldura1`; `editor.js` `20261021-editor1`; `editor.css` `20261020-producao3` (sem mudança).

## Validação local

- Fase 0 do release: OK.
- Chrome headless na página real: `hero.midia` e `encomenda.midia` com **524px**, `img display: none`, `video display: block`.
- Comparativo com o CSS antigo: **1020px** com a imagem oculta visível — erro reproduzido e corrigido.
- Cenário "imagem no lugar do vídeo": quadro continua 524px (imagem 372×496, 3/4), igual ao vídeo.
- Editor: `node --check editor.js` OK; `grep` confirma ausência de `btnDemo`, `entrarDemo` e `autoDemo`.
- Homologação local: `http://localhost:8324/` e `/editor.html` respondendo `200` com o CSS novo.

## Pós-deploy (Ctrl+Shift+R)

1. Abra `/editor.html?loja=<slug>`: o login mostra apenas a senha e o botão **Entrar**.
2. Entre no editor e abra **Capa inicial**: a mídia ocupa **um** quadro 3/4.
3. Na seção **Sob encomenda**: idem, com a mesma altura da capa.
4. Troque a capa para uma imagem: o quadro mantém o tamanho (não dobra).
5. Abra o popup de captura: o contador de itens não aparece vazio.
6. Repita em uma loja existente e em uma loja nova criada depois do deploy.
7. Feche e reabra a aba para o PWA recarregar o CSS novo.

## Rollback

- Código: backup local `backups/pre-release-20261021-editor-moldura-*` e `backups/pre-update-*/<slug>.tar.gz` na VPS.
- Dados: nenhuma migração.
- Vigília: `journalctl -u superloja -u 'loja-*'`.
