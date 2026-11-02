# Plano de implementação — Especificação 2.0 (incremental)

## Fase 1 — Design System + Schema + Editor (3.1, 3.6)
- Tokens visuais centralizados (css/design-tokens.css)
- Schema de componentes JSON (js/components-schema.json)
- Editor atualizado: barra superior, painéis laterais (páginas/seções/biblioteca), área central, viewport (editor-v2.html incremental)
- Auto-save, desfazer/refazer, histórico preservados

## Fase 2 — Temas e modelos (4.1-4.8)
- 6 segmentos x 3 variações = 18 combos (já há vitrine/editorial/boutique — expandir)
- Componentes compartilhados, troca preservando catálogo

## Fase 3 — Catálogo, banners, vitrines (5.1-5.5)
- Cadastro de produtos/variações/imagens (já existe — refinar)
- Banners desktop/mobile, carrossel, vitrine por regra
- Import/export CSV

## Fase 4 — Navegação, busca, carrinho (6.1-6.4, 7.1)
- Menus, busca/filtros, página de produto
- Carrinho: adicionar, alterar Qtd, remover, subtotal
- NÃO confirmar pagamento — checkout externo

## Fase 5 — Cupons e checkout externo (7.2-7.3)
- Módulo Marketing > Cupons (código, tipo, valor, elegibilidade, validade)
- Validação backend; não confiar no frontend
- Integração configurável por URL/API documentada (não inventar endpoints)

## Fase 6 — SaaS, multi-tenant (2.1-2.5, 9.1-9.4)
- Painel central (contas, lojas, planos, limites)
- Painel lojista (seletor de loja, editor, catálogo, domínios)
- Papéis/permissões verificadas no servidor
- Isolamento: tenant_id/store_id em todas as consultas

## Fase 7 — Domínios, qualidade, lançamento (10, 14, 15)
- Subdomínio + domínio próprio, SSL, DNS
- Performance, acessibilidade, SEO (canonical, sitemap, OG)
- Onboarding assistido, checklist de publicação

## Fora do escopo (obrigatório — 0.2, 20.6-20.8)
- Checkout financeiro próprio
- Pagamentos próprios (PIX, boleto, cartão)
- Confirmação própria de pedido
- CRM completo/automação avançada
- Geração por IA
- NF-e/NFC-e
- Frete nativo/transportadora
- ERP/marketplace
