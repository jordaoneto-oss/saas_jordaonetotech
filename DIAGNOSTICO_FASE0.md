# Fase 0 — Diagnóstico e proteção (Especificação 2.0, item 20.1)

**Data:** 2026-10-31
**Status:** Concluído — arquivo criado, backup preservado
**Backups:** backups/ (diretório existente); editor.js preservado (85KB); editor.html preservado (15KB)

## Stack identificada
- Frontend: HTML/CSS/JS estático (editor.html, editor.js 85KB, editor.css 36KB)
- Backend: server.py (Python), rotas de API, auth via sessão
- Deploy: Cloudflare Workers (wrangler.toml), subdomínio saas-jordaonetech.jordao.workers.dev
- Persistência: DB (sqlite/postgres via server.py); storage de mídia (img/ + js/); localStorage no editor
- Multi-tenant: já parcialmente implementado (tenants/, stores/ no backend)

## Editor atual (versão homologação restaurada)
- editor.html: login (login-brand + modal de produto + help) + script editor.js
- editor.js: renderiza páginas, seções, produtos, banners; suporte a drag/drop, undo/redo, autosave
- Funcionalidades preservadas: textos, fotos, produtos, cores, fontes, salvamento, publicação, preview
- Problemas corrigidos no histórico: login (validarLogin), customizador modular (templates-hml), catálogo (adicionarProduto), gestão (pedidos/clientes/relatórios)

## Conflitos com especificação 2.0
1. Layout do editor não segue 3.1 (barra superior, painéis laterais, área central + viewport)
2. Design System (tokens visuais, tipografia, sombras) não centralizado — cores espalhadas em CSS
3. Schema de componentes (3.6) não declarado — cada seção é HTML direto
4. Multi-tenant: backend tem tenants/stores; editor não isola contexto de loja por sessão
5. Carrinho (7.1) não implementado — somente catálogo
6. Cupons (7.2) e checkout externo (7.3) não implementados
7. Seu histórico: não há IA nesta versão (confere 0.2, 1.12)
8. Não há checkout financeiro próprio (confere 0.2, 7.4) — NÃO implementar

## Regra obrigatória respeitada
- Não substituir o editor existente por paralelo (20.2) — evoluir editor.js
- Não remover páginas/arquivos sem mapear (20.3) — todos preservados
- Reutilizar banco, auth, storage (20.4) — server.py mantido
- Não tecnologia nova sem justificativa (20.5)
- Entregar incrementos pequenos (20.10)
- Documentar conflito (20.16) — este arquivo
