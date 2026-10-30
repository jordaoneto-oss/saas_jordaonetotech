# Modelos de loja HML — Vitrine, Editorial e Boutique

Três seeds de loja virtual para homologação, no mesmo formato modular do editor atual
(seções + blocos + tema). O lojista escolhe o modelo na criação do tenant e personaliza
tudo depois no editor: ordem das seções, visibilidade, textos, cores, fontes, formato dos
botões e prévia responsiva.

| Modelo | ID | Tema sugerido | Foco | Segmento |
|---|---|---|---|---|
| **Vitrine Express** | `vitrine-hml` | `vitrine` | Conversão rápida, catálogo e carrinho | varejo / moda / acessórios |
| **Editorial Casa** | `editorial-hml` | `editorial` | Storytelling, coleções e curadoria | casa / lifestyle / marcas autorais |
| **Boutique Noir** | `boutique-hml` | `boutique` | Premium, concierge e edições limitadas | joias / beleza / presentes |

Página de entrada: **`homolog-templates.html`** (galeria com comparativo e checklist).
Prévias: `homolog-template-vitrine.html`, `homolog-template-editorial.html`,
`homolog-template-boutique.html`.

---

## 1. O que cada modelo entrega

Cada diretório em `saas/templates/<id>/` contém um seed completo:

```
saas/templates/vitrine-hml/
├── config.json            # textos, tema, seções, presets, módulos legados
├── catalog.json           # 8 produtos de exemplo
├── meta.json              # nome, descrição, segmento, tema, versão, status
├── tokens.json            # tokens de cor/tipografia para handoff
├── manifest.webmanifest   # PWA
└── img/                   # logo, ícones e placeholder neutros
```

### Estrutura de seções

| ID | Módulo | Vitrine | Editorial | Boutique |
|---|---|:---:|:---:|:---:|
| `hero` | Capa | ✓ | ✓ | ✓ |
| `selos` | Diferenciais | ✓ | ✓ | ✓ |
| `devocoes` | Coleções / ambientes | — | ✓ | — |
| `destaques` | Produtos em evidência | ✓ | ✓ | ✓ |
| `oficio` | Sobre / ateliê | ✓ | ✓ | ✓ |
| `oracao` | Frase de destaque | — | ✓ | — |
| `catalogo` | Catálogo com busca e filtros | ✓ | ✓ | ✓ |
| `encomenda` | Atendimento / passos | — | — | ✓ |
| `depoimentos` | Avaliações + números | ✓ | ✓ | ✓ |
| `final` | Convite para o WhatsApp | ✓ | ✓ | ✓ |
| `rodape` | Rodapé | ✓ | ✓ | ✓ |

A ordem fica em `layout.secoes` e a visibilidade em `visivel`:

```json
"layout": {
  "secoes": [
    { "id": "hero", "visivel": true },
    { "id": "catalogo", "visivel": true },
    { "id": "rodape", "visivel": true }
  ]
}
```

Ocultar uma seção **não apaga** o conteúdo: o editor só marca `visivel: false`.
Reordenar é mover o objeto na lista.

### Presets de cor

Cada modelo traz três presets prontos em `config.presets`:

- **Vitrine**: Índigo, Coral, Grafite
- **Editorial**: Terracota, Oliva, Papel
- **Boutique**: Noir, Champagne, Esmeralda

O preset inicial é o primeiro da lista e também está aplicado em `visual.cores`.

### Tokens de tema

`visual.cores` usa os mesmos nomes do editor atual (`marfim`, `areia`, `papel`, `linha`,
`tinta`, `tinta-suave`, `ouro`, `ouro-claro`, `ouro-fraco`, `rosa`, `rosa-claro`,
`salvia`, `zap`). `visual.fontes` define `titulos` e `texto` com `nome`, `link` (Google
Fonts) e `familia`.

Extras usados pela prévia HML e ignorados com segurança pela loja real:
`visual.raio`, `visual.container`, `template`, `header`, `anuncio`, `presets`.

### Catálogo

`catalog.json` é uma lista de produtos:

```json
{
  "id": "camiseta-essencial",
  "nome": "Camiseta essencial algodão",
  "cat": "Moda",
  "tag": "Moda",
  "preco": 89.9,
  "desc": "Algodão penteado 30.1, caimento reto e gola reforçada.",
  "foto": "",
  "badge": "Mais vendido",
  "selo": "Mais vendido",
  "cor": ["#e7e2d8", "#c9c0b2"],
  "icone": "camiseta"
}
```

`foto` nasce vazia de propósito: o lojista envia as imagens no painel. `cor` e `icone`
são extras da prévia HML (arte CSS quando não há foto).

---

## 2. Prévia e personalização

Abra `homolog-templates.html` e escolha um modelo, ou vá direto a uma página de prévia.
O painel lateral tem três abas:

1. **Seções** — arrastar para reordenar, setas para subir/descer, olho para ocultar.
2. **Conteúdo** — formulário por seção (capa, selos, coleções, depoimentos, rodapé…).
3. **Tema** — presets, cor individual, fontes de título/texto, raio e container.

Barra superior: desktop / tablet / celular, **Salvar**, **Exportar** (JSON), **Restaurar**
e **Ver loja** (`?standalone=1`, sem o chrome do editor).

Persistência local:

- configuração: `localStorage["hml-tpl:<id>"]`
- carrinho: `localStorage["hml-cart:<id>"]`
- checklist da galeria: `localStorage["hml-tpl-checklist"]`

Restaurar limpa apenas a configuração. O carrinho é independente.

### Como a prévia é responsiva

A loja é renderizada dentro de um frame com **container queries**. O frame muda de
largura (`is-desktop`, `is-tablet`, `is-mobile`) e a loja reage ao container, não à
viewport. O carrinho lateral usa `position: fixed` dentro de `.cx-device`
(`transform: translateZ(0)`), então fica contido na prévia em vez de cobrir a tela toda.

---

## 3. Criar um tenant com o modelo

### Pelo painel SaaS

Em `saas-admin.html` → **Lojas** → **Nova loja**, escolha:

- **Modelo**: `vitrine-hml`, `editorial-hml` ou `boutique-hml`
- **Tema**: `vitrine`, `editorial` ou `boutique` (o formulário sugere o tema do modelo)

O `server.py` clona o código, lê `saas/templates/<modelo>/`, troca nome/WhatsApp,
copia `catalog.json`, ajusta o manifesto e aplica o tema escolhido (com fallback para o
tema do `meta.json`).

### Pela API local

```http
POST /api/saas/lojas
Authorization: Bearer <token>

{
  "slug": "minha-loja",
  "nome": "Minha Loja",
  "zap": "5511999999999",
  "template": "vitrine-hml",
  "tema": "vitrine"
}
```

### No worker (produção)

`GET /api/saas/templates` lista os modelos com `nome`, `descricao`, `segmento`, `tema`,
`versao` e `status`. `GET /api/temas` lista os presets, incluindo `vitrine`, `editorial`
e `boutique`.

---

## 4. Temas registrados

`saas/temas.json` e `/api/temas` agora incluem:

| ID | Nome | Uso |
|---|---|---|
| `artesanal` | Artesanal | padrão histórico |
| `moderno` | Moderno | claro e minimalista |
| `noturno` | Noturno | escuro premium |
| `vitrine` | Vitrine | índigo + âmbar, Manrope/Inter |
| `editorial` | Editorial | terracota + creme, Fraunces/DM Sans |
| `boutique` | Boutique | preto + dourado, Cormorant/Inter |

Os três novos temas usam exatamente as cores e fontes do seed correspondente.

---

## 5. Regerar os arquivos

Os seeds e a prévia são gerados por script — não edite `js/templates-hml-data.js` à mão.

```bash
node scripts/build-templates-hml.mjs   # seeds + js/templates-hml-data.js
node scripts/build-hml-pages.mjs       # 3 prévias + homolog-templates.html
npm run build                          # sincroniza public/
```

Arquivos gerados:

- `saas/templates/{vitrine,editorial,boutique}-hml/*`
- `js/templates-hml-data.js`
- `homolog-template-{vitrine,editorial,boutique}.html`
- `homolog-templates.html`

Arquivos escritos à mão:

- `js/templates-hml.js` — renderizador da loja + personalizador
- `css/templates-hml.css` — estilos da loja e do editor

---

## 6. Checklist de aceite (HML)

- [ ] Abrir os 3 modelos e conferir capa, catálogo, carrinho e checkout no WhatsApp.
- [ ] Reordenar seções por arrastar e por setas; ocultar e reexibir pelo olho.
- [ ] Editar textos de capa, selos, destaques, coleções, depoimentos e rodapé.
- [ ] Aplicar os 3 presets e trocar fontes de título/texto em cada modelo.
- [ ] Validar prévia em desktop, tablet e celular, incluindo o carrinho lateral.
- [ ] Salvar, recarregar e confirmar persistência.
- [ ] Exportar JSON, restaurar o original e conferir que o reset limpa só a configuração.
- [ ] Criar um tenant de teste com cada modelo e abrir a loja publicada.
- [ ] Conferir busca, filtro por categoria, ordenação e estado vazio do catálogo.
- [ ] Rodar `npm run build` e confirmar páginas e assets em `public/`.

A mesma lista está interativa em `homolog-templates.html#checklist`.

---

## 7. Limitações conhecidas

- As imagens dos seeds são neutras (logo, placeholder e ícones). Fotos reais entram pelo
  painel da loja.
- `cor`, `icone`, `template`, `header`, `anuncio`, `presets`, `visual.raio` e
  `visual.container` são extensões da prévia HML; a loja real ignora chaves que não
  conhece.
- O personalizador salva no navegador. Para levar a configuração a um tenant, use
  **Exportar** e aplique o JSON no seed/tenant correspondente.
