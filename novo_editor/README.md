# novo_editor — Versão Híbrida (Editor Atual + Estrutura saas-editor-tenant)

Estrutura híbrida baseada no projeto atual (`editor.html`/`editor.js`) e na arquitetura do repo `saas-editor-tenant` (React + TypeScript + Vite + PuckEditor).

## Estrutura

### Raiz (funcional — editor atual, compatível com tenants)
- `index.html` — versão híbrida do `editor.html`
- `editor.js` — versão híbrida do `editor.js` (com `!important` nas formatações e compatível com `sanitizarHtml`)
- `editor.css` — estilos atuais

### Frontend moderno (referência do repo)
- `frontend/src/App.tsx` — aplicação React
- `frontend/src/components/PuckEditor.tsx` — editor visual por blocks
- `frontend/src/main.tsx`
- `index.html` (frontend)
- `package.json`

### Backend / Middleware (referência)
- `src/app.ts`
- `src/index.ts`
- `src/config.ts`
- `src/middleware/tenant.ts`
- `src/routes/store.ts`
- `src/services/medusa.ts`
- `src/services/platformIntegration.ts`
- `src/types/tenant.ts`

### Tests
- `tests/auth.integration.test.ts`
- `tests/tenant.middleware.test.ts`
- `tests/platformIntegration.test.ts`

## Como testar nos tenants

1. O `editor.js` na raiz já salva no `state.cfg` (formato atual) e aplica `!important` para sobrepor o tema.
2. O `frontend/` pode ser usado como uma nova interface futura — para integrá-lo, seria necessário criar um adapter entre o `PuckEditor` (blocks) e o `state.cfg` atual.
3. A pasta `src/` pode ser usada como referência para criar uma API alternativa ao `server.py`.

## Dependências

```bash
npm install
npm run build  # gera dist/ do frontend
```
