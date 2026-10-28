# HML Whitelabel — Arquitetura de Homologação Multi-Segmento

**Especialista UX + Web**  •  Versão de homologação para venda B2B de plataformas catálogicas (revenda / white label).

---

## 1. Visão de Produto (Katalog-inspired)

O catálogo digital do Katalog (www.katalog.com.br) opera como uma **plataforma multi-segmento** com:
- Catálogo visual + cardápio compacto (híbrido)
- PDV, estoque, tabelas por cliente, KDS, força de vendas, checkout integrado
- Revenda white label: subdomínio próprio, logo, cores, painel isolado → cliente nunca vê "Katalog"

Para vender para vários segmentos (restaurante, moda, pet, papelaria, utilidades, bem-estar, docês, etc.), a plataforma precisa de **3 camadas de homologação**:

| Camada | Nome | Público-alvo | Função |	
|---|---|---|---|
| 1 | **Super Admin** | Time técnico / revendedora master | Criar tenants (revendas), definir segmentos, gerenciar planos e preços, auditar todas as lojas | 	
| 2 | **Network Admin** | Revenda / administrador da rede de lojas | Gerenciar lojas filiais dentro do seu tenant, customizar marca, definir preços de revenda, acessar relatórios consolidados | 	
| 3 | **Loja (Catálogo)** | Cliente final (lojista + consumidor) | Catálogo digital multimodal, PDV, pedidos, pagamento, domínio próprio | 	

---

## 2. Princípios de UX (inspirados no Katalog + Primer)

- **Design System Neutro**: tokens de cor (`--ds-brand`, `--ds-accent`, `--ds-paper`, `--ds-ink`) permitem trocar segmento apenas mudando a variável CSS → mesmo layout, identidade diferente.
- **1 primário por tela**: hierarquia clara (Primary → Zap → Outline → Ghost → Danger).
- **Segmento via token**: `data-segment="moda"` + `data-theme="dark"` muda cores e fontes, não quebra grid.
- **Mobile-first**: toolbar, cards, tabela tok, grid de produtos responsivos.
- **Acessibilidade**: `aria-label` em todas as seções, contraste WCAG AA, foco visível.
- **Dark mode automático**: respeita `prefers-color-scheme`; toggle manual via botão.

---

## 3. Arquitetura de Dados (estrutura sugerida)

```json
{
  "super_admin": {
    "tenants": ["revenda-a", "revenda-b"],
    "planos": ["basico", "profissional", "enterprise"],
    "segmentos": ["restaurante", "moda", "pet", "papelaria", "utilidades", "bem-estar", "doces"]
  },
  "tenant_revenda-a": {
    "marca": "Catálogo Pro",
    "dominio": "catalogopro.com.br",
    "lojas": ["loja-01", "loja-02"],
    "precos_revenda": {"basico": 35.0, "profissional": 60.0, "enterprise": 85.0},
    "segmentos_ativos": ["restaurante", "moda"]
  },
  "loja-01": {
    "slug": "padaria-do-joao",
    "segmento": "restaurante",
    "tema": "light",
    "template": "generico-hml",
    "produtos": 42,
    "pedidos_mes": 320
  }
}
```

---

## 4. Design System — Tokens (CSS)

```css
:root{
  --ds-brand:#e63946;      /* muda por segmento */
  --ds-brand-ink:#fff;     /* texto sobre brand */
  --ds-accent:#ffb703;     /* destaque secundário */
  --ds-paper:#f8f9fa;      /* fundo principal */
  --ds-surface:#ffffff;    /* cards / painéis */
  --ds-ink:#1d3557;        /* texto principal */
  --ds-muted:#6c757d;      /* metadados */
  --ds-line:#dee2e6;       /* bordas suaves */
  --ds-radius-sm:6px;
  --ds-radius-md:12px;
  --ds-radius-lg:18px;
  --ds-font-display:"Instrument Serif", Georgia, serif;
  --ds-font-body:"Inter", ui-sans-serif, system-ui, sans-serif;
}
```

Cada segmento apenas redefine `--ds-brand` e `--ds-accent` (ex: moda = `#4361ee` / `#3a0ca3`; pet = `#2a9d8f` / `#264653`).

---

## 5. Arquivos de Homologação Criados

| Arquivo | Camada | Função |
|---|---|---|
| `homolog-super-admin.html` | 1 — Super Admin | Painel de controle da plataforma: tenants, planos, segmentos, uso, faturamento |
| `homolog-network-admin.html` | 2 — Network Admin | Painel da revenda: lojas vinculadas, marca própria, preços de revenda, relatórios |
| `homolog-loja-whitelabel.html` | 3 — Loja | Catálogo multi-segmento com seletor de segmento, catálogo demo, checkout |
| `hml-whitelabel.md` | Doc | Este arquivo (arquitetura + UX) |

---

## 6. Fluxo de Homologação Sugerido (para venda)

1. **Demonstração Super Admin** (10 min): mostrar criação de um tenant, ativação de segmentos e definição de preços de revenda.
2. **Simulação Network Admin** (10 min): revenda entra, vê logomarca própria, cria 2 lojas de teste (restaurante + moda).
3. **Validação de Loja** (10 min): cada loja alterna segmento (`?segmento=restaurante` vs `?segmento=moda`) sem quebrar layout; mostra catálogo, pedido e checkout.
4. **Prova de White Label** (5 min): subdomínio `/revenda` com CSS custom, logo, cores — cliente final não vê "Katalog" nem "Super Admin".

---

*Criado como base de homologação para plataforma B2B whitelabel multi-segmento, inspirado no design system neutro do Katalog (https://www.katalog.com.br) e estruturado para escalar por revendas.*
