

# 🛒 E-Commerce Premium — Plano de Implementação

Este é um projeto grande e será implementado em **fases incrementais**. Vamos usar **Lovable Cloud (Supabase)** como backend, com paleta **Preto + Branco + Dourado** e checkout **simulado** (sem gateway real por enquanto).

---

## Fase 1 — Fundação: Banco de Dados + Autenticação + Admin Básico

### Banco de Dados (Lovable Cloud)
- Tabelas: `profiles`, `user_roles`, `products`, `product_images`, `product_variants`, `collections`, `collection_products`, `store_settings`, `home_sections`, `product_badges`
- Tabelas de compra: `cart`, `cart_items`, `orders`, `order_items`, `coupons`, `favorites`, `reviews`
- RLS em todas as tabelas com função `has_role()` para admin
- `store_settings` como key-value para todos os toggles globais

### Autenticação
- Login/cadastro com email (cliente e admin)
- Tabela `user_roles` separada com enum `admin`/`user`
- Proteção de rotas admin via verificação server-side

### Admin Básico
- Layout com sidebar premium (glass effect, hover animations)
- Dashboard com métricas placeholder
- CRUD de Produtos (nome, descrição, preço, preço promocional, estoque, SKU, imagens, variantes)
- CRUD de Coleções/Categorias
- Tela de Configurações da Loja com todos os toggles globais

---

## Fase 2 — Loja: Layout Premium + Home Modular + Página de Produto

### Design System Premium
- Paleta preto/branco/dourado com variáveis CSS
- Header com glass/blur ao scroll, mega menu desktop, menu mobile
- Top bar configurável
- Footer completo
- Animações: reveal on scroll, hover elevação, transições suaves
- Skeleton loading em todos os componentes

### Home Modular
- Seções renderizadas dinamicamente a partir de `home_sections`
- Hero banner, carrossel de ofertas, mosaico de banners, coleções em destaque, produtos em destaque, benefícios, depoimentos, newsletter
- Cada seção com toggle on/off e ordem configurável no admin

### Página de Produto (Prioridade Máxima)
- Galeria com miniaturas à esquerda
- Coluna direita: breadcrumb, badges, título, SKU, estoque, "vendido e enviado por"
- Banners promocionais empilháveis (Black Friday, Natal, custom) com toggles
- Preço + preço riscado + parcelamento + chip Pix
- Aviso de estoque baixo com ponto vermelho
- Bloco frete/CEP com simulação simplificada
- Botões: Comprar Agora, Adicionar ao Carrinho, WhatsApp
- Acordeões: descrição, pagamento seguro, trocas, FAQ
- Produtos recomendados

---

## Fase 3 — Carrinho, Checkout e Área do Cliente

### Carrinho
- Drawer cart lateral com animação elegante (abre ao adicionar)
- Página de carrinho completa
- Cupom de desconto, cálculo de frete, total com economia
- Seção upsell "Você também pode gostar"

### Checkout
- Etapas: Identificação → Endereço → Entrega → Pagamento
- Pix (com desconto configurável), Cartão (parcelamento), Manual
- Design limpo e focado em conversão

### Área do Cliente
- Meus pedidos (lista + detalhe com status)
- Endereços salvos
- Favoritos/Wishlist
- Recomprar pedido

---

## Fase 4 — Admin Avançado + Páginas Secundárias

### Admin Completo
- Gestão de Pedidos (lista, status, detalhes)
- Gestão de Clientes
- Cupons (CRUD com regras)
- Editor de Banners e Seções da Home (drag-and-drop de ordem, edição de textos/imagens)
- Relatórios básicos (vendas, produtos mais vendidos)

### Páginas Públicas
- Busca com filtros
- Página de Coleção (grid + filtros laterais)
- FAQ, Contato, Políticas (frete/troca/privacidade)
- Blog/Artigos (opcional)

---

## Resumo Técnico
- **Frontend**: React + Tailwind + shadcn/ui + Framer Motion para animações
- **Backend**: Lovable Cloud (Supabase) — banco, auth, storage, edge functions
- **Paleta**: Preto + Branco + Dourado
- **Mobile-first**: CTA fixo, menu responsivo, drawer cart
- **Checkout**: Simulado (sem gateway real)

