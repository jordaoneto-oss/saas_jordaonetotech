# Homologação Completa — Katalog Whitelabel Multi-Segmento

**Especialista UX + Web**  •  Versão de homologação que integra todas as funcionalidades do Katalog (catálogo, PDV, estoque, tabelas de preço, força de vendas, financeiro, checkout integrado, KDS, QR Code, WhatsApp, domínio próprio, app offline) em uma arquitetura de 3 camadas (Super Admin / Network Admin / Loja) com design neutro multi-segmento.

---

## 1. Funcionalidades integradas (baseado em www.katalog.com.br)

| Módulo | Função no Katalog | Status na homologação | Onde acessar |
|---|---|---|---|
| **Catálogo / Cardápio** | Modo híbrido: grid visual ou lista compacta; busca; filtro por categoria | ✅ Template neutro (`data-segment`) com troca por token CSS | `homolog-loja-whitelabel.html` → Catálogo |
| **PDV** | Venda no balcão, carrinho, impressão de comanda, baixa de estoque | ✅ Link funcional para `admin-completo.html` (módulo pedido) | `homolog-completo-katalog.html` → PDV |
| **Estoque** | Controle por produto, variação, complemento; baixa automática; alertas de mínimo | ✅ Referenciado no `Network Admin` (KPIs de estoque) e disponível no `admin-completo.html` | `admin-completo.html` |
| **Tabela de preço por cliente** | Percentual ou preço fixo por produto; vínculo direto com cliente | ✅ Mencionada no `Super Admin` (planos) e `Network Admin` (revenda); funcional no backend (`server.py`) | `saas-admin.html` / `admin-completo.html` |
| **Força de vendas externa** | App offline com sincronização automática; cadastro de clientes em campo; scanner; assinatura digital; PDF por WhatsApp | ✅ Referenciado na documentação; link para app (Play Store / App Store) | `homolog-completo-katalog.html` → App |
| **Financeiro** | Relatórios consolidados, faturamento mensal, planos, pagamento (PIX) | ✅ Super Admin (`homolog-super-admin.html`) com KPIs de faturamento; Network Admin com receita estimada | `homolog-super-admin.html` |
| **Checkout integrado** | PIX, cartão de crédito, boleto via GálagoPay; pagamento direto pelo catálogo | ✅ Simulado em `homolog-loja-whitelabel.html` (botão Zap → checkout); funcional no `index.html` (lojas reais) | `index.html` / `editor.html` |
| **QR Code por mesa** | Pedido direto pelo celular do cliente; comanda impressa; pagamento integrado | ✅ Referenciado no hero da loja whitelabel; funcional no módulo de mesas do `admin-completo.html` | `admin-completo.html` |
| **WhatsApp automático** | Notificações de pedido; status em tempo real para cliente e lojista | ✅ Referenciado na documentação; funcional no backend (`saas-admin.html`) | `saas-admin.html` |
| **KDS (Módulo Cozinha)** | Kanban: Novos → Confirmados → Preparando → Pronto; timer; alerta sonoro; modo tela cheia | ✅ Referenciado; funcional no `admin-completo.html` (módulo cozinha) | `admin-completo.html` |
| **Impressão de comanda** | Impressoras térmicas 80mm e laser; PDF direto do painel | ✅ Referenciado; funcional no `admin-completo.html` | `admin-completo.html` |
| **Domínio próprio** | Subdomínio ou domínio raiz; SSL automático; logo e cores customizadas | ✅ Configurado no `Network Admin` (`catalogopro.com.br`); script `ligar_dominio.py` disponível | `docs/ROTEIRO-KINGHOST-VPS.md` |
| **App Mobile** | Catálogo offline, scanner de código de barras, cadastro de clientes, balanço de estoque, assinatura digital | ✅ Referenciado na documentação com links para Play Store / App Store; disponível como PWA (`sw.js`, `manifest.webmanifest`) | `sw.js` / `manifest.webmanifest` |

---

## 2. Arquitetura de 3 Camadas (Homologação Completa)

### Camada 1 — Super Admin (`saas-admin.html` + `homolog-super-admin.html`)
- **Tenants (revendas)**: criar, editar, suspender, aprovar
- **Planos**: Básico (R$ 39,90), Profissional (R$ 69,90), Enterprise (R$ 99,90) — com preços de revenda (wholesale) definidos por tenant
- **Segmentos**: ativar/desativar segmentos (restaurante, moda, pet, papelaria, utilidades, bem-estar, doces, neutro)
- **KPIs**: tenants ativos, lojas vinculadas, pedidos/mês, faturamento mensal, uptime
- **Relatórios**: consolidados por rede e por loja
- **Segurança**: `SAAS_ADMIN_TOKEN`, `.env.prod`, `Caddyfile` com restrição de IP (`--admin-ip`)

### Camada 2 — Network Admin (`admin-completo.html` + `homolog-network-admin.html`)
- **Identidade da revenda**: logo, cores (`--ds-brand`, `--ds-accent`), fonte de título (`--ds-font-display`)
- **Domínio próprio**: subdomínios automáticos (`loja.revenda.com.br`); domínio raiz via `ligar_dominio.py`
- **Lojas vinculadas**: criar, editar slug, definir segmento, plano, status (ativo/pendente)
- **Preços de revenda**: margem controlada pelo super admin; revenda define preço final ao cliente
- **Marca própria**: cliente final nunca vê "Katalog"; painel isolado
- **Relatórios de rede**: pedidos consolidados por loja, receita estimada, crescimento semanal

### Camada 3 — Loja (`index.html` / `editor.html` + `homolog-loja-whitelabel.html`)
- **Catálogo digital**: modo catálogo (grid) + modo cardápio (lista compacta) + híbrido (cliente escolhe)
- **Busca e filtro**: por texto e por categoria; funciona offline (PWA)
- **Produtos**: fotos, preços, categorias, variações (tamanho/cor), complementos
- **Carrinho / Pedido**: adicionar ao carrinho, finalizar pedido, pagamento via PIX/cartão/boleto (simulado na homologação, funcional no backend)
- **Checkout**: integrado; comanda impressa automaticamente; notificação WhatsApp
- **PDV**: venda no balcão; baixa automática de estoque; impressão de comanda térmica
- **Clientes**: cadastro (CPF/CNPJ), endereço com busca CEP, histórico de pedidos, tabela de preço personalizada
- **Estoque**: controle por produto, variação e complemento; alertas de mínimo; baixa automática
- **QR Code por mesa**: escaneia → faz pedido → paga; pedido chega direto na cozinha (KDS)
- **KDS (Cozinha)**: kanban em tempo real; timer; alertas sonoros; modo tela cheia
- **Força de vendas (App)**: venda externa; funciona offline; sincroniza automaticamente; scanner; assinatura digital

---

## 3. Design System — Tokens Neutros (CSS)

Todos os arquivos utilizam o mesmo sistema de tokens, permitindo trocar de segmento apenas redefinindo variáveis CSS:

```css
:root{
  --ds-brand:#e63946;      /* cor primária — muda por segmento */
  --ds-brand-ink:#fff;     /* texto sobre brand */
  --ds-accent:#ffb703;     /* destaque secundário */
  --ds-paper:#f8f9fa;      /* fundo */
  --ds-surface:#fff;       /* cards/painéis */
  --ds-ink:#1d3557;        /* texto principal */
  --ds-muted:#6c757d;      /* metadados */
  --ds-line:#dee2e6;       /* bordas */
  --ds-font-display:"Instrument Serif",Georgia,serif;  /* títulos */
  --ds-font-body:Inter,ui-sans-serif,system-ui,sans-serif;  /* corpo */
}
```

**Segmentos disponíveis:** neutro, restaurante, moda, pet, papelaria, utilidades, bem-estar, doces.

---

## 4. Arquivos criados / atualizados para homologação completa

| Arquivo | Camada / Função |
|---|---|
| `homolog-completo-katalog.md` | Este arquivo — documentação arquitetural completa |
| `homolog-super-admin.html` | Super Admin — tenants, planos, segmentos, KPIs, faturamento |
| `homolog-network-admin.html` | Network Admin — marca própria, lojas, preços de revenda, domínios |
| `homolog-loja-whitelabel.html` | Loja — catálogo multi-segmento, modos híbridos, checkout |
| `hml-whitelabel.md` | Arquitetura original de homologação neutra |

**Módulos funcionais já existentes no projeto (não substituídos, apenas referenciados):**

- `saas-admin.html` (Super Admin funcional — gestão completa)
- `admin-completo.html` (Admin da loja — pedidos, clientes, estoque, KDS, relatórios)
- `index.html` (Catálogo funcional com PWA, checkout, QR Code)
- `editor.html` / `editor.js` / `editor.css` (Editor de conteúdo, produtos, temas)
- `server.py` (API — pedidos, clientes, estoque, autenticação, upload)
- `apply_admin.py` (Sincronização de lojas)
- `scripts/atualizar_todas.py` (Propagação de código para todas as lojas)
- `deploy/publicar.sh` (Script de deploy por SSH para VPS)
- `sw.js` / `manifest.webmanifest` (PWA — offline, cache, instalação)
- `docs/ROTEIRO-KINGHOST-VPS.md` (Deploy completo para VPS KingHost)
- `docs/OPERADOR.md` (Manual do operador — backup, deploy, unidades, firewall)

---

## 5. Fluxo de Homologação Completa (para vendas B2B)

1. **Acesso ao Super Admin** (`homolog-super-admin.html`)
   - Login com `SAAS_ADMIN_TOKEN` (simulado)
   - Criar tenant (revenda) → definir nome, domínio, segmento
   - Definir preço de revenda (wholesale vs retail)

2. **Acesso ao Network Admin** (`homolog-network-admin.html`)
   - Configurar marca (logo, cores CSS, fonte)
   - Ativar domínio (`catalogopro.com.br`)
   - Criar loja vinculada (slug, segmento, plano)
   - Ver KPIs de rede (pedidos, receita)

3. **Acesso à Loja** (`homolog-loja-whitelabel.html` / `index.html`)
   - Trocar segmento (`?segmento=restaurante` / `moda` / `pet` / etc.)
   - Navegar no catálogo (modo visual / cardápio / híbrido)
   - Adicionar produto ao carrinho
   - Finalizar pedido (simulado na homologação; funcional no `index.html`)
   - Ver QR Code por mesa (referenciado)
   - Acessar painel do cliente (`admin.html`) para gestão completa

4. **Validação White Label**
   - Cliente final acessa `https://loja.revenda.com.br`
   - Não vê "Katalog" nem "Super Admin"
   - Vê logo, cores e domínio da revenda
   - Painel de gestão (`/admin.html`) isolado

---

## 6. Como subir para a VPS KingHost (resumo)

Se a VPS KingHost (`191.252.159.172`) estiver com SSH funcionando (`docs/RELEASE-*` ainda relatam `Permission denied`), o deploy completo usa:

```bash
# Mac (pasta do projeto)
rsync -avz --exclude 'backups/' --exclude '.DS_Store' ./ root@191.252.159.172:/srv/superloja/

# VPS
chown -R www-data:www-data /srv/superloja
cp deploy/superloja.env.example /srv/superloja/.env.prod
# configurar .env.prod (SAAS_ADMIN_TOKEN, SEED_ADMIN_PASS, BASE_DOMAIN, MAIN_URL, PUBLIC_IP)
chmod 600 /srv/superloja/.env.prod
python3 deploy/gerar-units.py
sudo cp deploy/superloja.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now superloja
python3 scripts/gerar_caddy.py --base seudominio.com.br --email voce@email.com --admin-ip SEU-IP-DE-CASA --principal-dominio seudominio.com.br
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo caddy fmt --overwrite /etc/caddy/Caddyfile && sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
sudo ufw allow 80,443/tcp && sudo ufw allow OpenSSH && sudo ufw --force enable
```

Para subir **apenas os arquivos de homologação** (sem tocar no backend):
```bash
mkdir -p /srv/superloja/homolog
rsync -avz ./homolog-*.html ./hml-whitelabel.md root@191.252.159.172:/srv/superloja/homolog/
```

---

*Criado por especialista em desenvolvimento web e UX para plataforma B2B whitelabel multi-segmento, inspirada no design system neutro do Katalog (https://www.katalog.com.br) e estruturada para escalar por revendas.*
