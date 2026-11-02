# saas-editor-tenant

Aplicação backend e front-end para editor visual multi-tenant, com autenticação JWT, integração com plataforma central e com Medusa.

## Scripts

- `npm install`
- `npm run dev`
- `npm run dev:server`
- `npm run dev:web`
- `npm run build`
- `npm run test`

## Estrutura

- `src/` — backend Express e serviços
- `frontend/src/` — interface do editor visual
- `tests/` — testes automatizados

## Endpoints principais

- `GET /health`
- `GET /api/v1/stores/me/settings`
- `GET /api/v1/stores/products`
- `POST /api/v1/stores/pages`
- `POST /api/v1/stores/publish`
