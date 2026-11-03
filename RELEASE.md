# Release — Correção do editor de seções (2026-11-02)

## Arquivos modificados (servidos)
- `editor.js` / `editor.html` / `editor.css`
- `admin.js` / `admin-completo.html`
- `public/editor.js` (removido código morto `toolbar-formato`)

## Correções aplicadas
1. **Sobreposição / layout do editor**
   - Removido `.toolbar-formato` morto (`editor.css` linha 398 + `editor.js`).
   - `overflow:hidden` no `.editor`; listas (`.section-list`, `.array-list`, `.prod-list`) com `min-width:0` para evitar corte dos botões de ordem/olho.
   - `.nome-edit` não estoura mais a linha; `.sec-main` com `overflow:hidden`.
   - `.stage` alinhado ao topo (`justify-content:flex-start`) — evita conteúdo cortado ao selecionar seção.
   - `.inspector` com `z-index` corrigido; `scrollTop` preservado ao trocar seção no painel.
   - Breakpoints `560px` e `380px` adicionados; `.inspector` em mobile (`left:var(--rail)`) não sobrepõe mais a navegação do rail.

2. **API / fluxo de carregamento**
   - `carregarDados()` agora exige resposta de `/api/admin/config` antes de abrir o editor — evita editor vazio se o token expirar.
   - `selecionar()` reseta aba do inspetor para "Conteúdo" apenas quando a seção muda; `renderPanel()` preserva rolagem.
   - `Esc` e `Ctrl+S` corrigidos (`ligarTeclado`).

3. **Categoria — dropdown + criar/excluir**
   - `editor.html` / `editor.js`: campo da categoria virou `<select>` com botões `＋ Nova` e `🗑`.
   - `admin-completo.html` / `admin.js`: mesma estrutura aplicada no painel de administração.
   - Categorias fixas (`essencial`, `premium`, etc.) + derivadas dos produtos; extras persistem em `localStorage` (`cats_extras`).
   - Excluir categoria com produtos vinculados confirma e move-os para `essencial`.

4. **Limpeza de código morto**
   - `initToolbar()` removida de todos os `editor.js` (`editor.js`, `lojas/pizzaria-ze/editor.js`, `public/editor.js`).
   - `aplicarFormato()` removida.
   - Nenhuma referência a `.toolbar-formato` ou `initToolbar` permanece no código servido.

## Comandos sugeridos para commit
```bash
git add admin-completo.html admin.js editor.css editor.html editor.js public/editor.js
git status
git commit -m "fix(editor): corrige sobreposição, layout e APIs no editor das seções; adiciona dropdown de categoria com criar/excluir; remove toolbar-formato morto"
```

## Verificação
- `node --check editor.js` passa.
- Servidor (`localhost:8324`) entrega arquivos com `v=20261102-layout` (`editor.js` / `editor.css`).
- Capturas de desktop (1440), meio (1024) e mobile (390) confirmam alinhamento correto do painel, canvas, inspetor e seção sem sobreposição.
