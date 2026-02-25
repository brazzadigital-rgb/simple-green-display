
-- =============================================
-- E-COMMERCE PREMIUM — FASE 1: SCHEMA COMPLETO
-- =============================================

-- 1) ENUM de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2) Tabela de profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Tabela de roles (separada!)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- 4) Função has_role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5) Trigger para criar profile + role automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6) updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- COLLECTIONS
-- =============================================
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- PRODUCTS
-- =============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  compare_at_price NUMERIC(10,2),
  cost_price NUMERIC(10,2),
  sku TEXT,
  barcode TEXT,
  stock INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  weight NUMERIC(8,3),
  sold_count INT NOT NULL DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- PRODUCT IMAGES
-- =============================================
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PRODUCT VARIANTS
-- =============================================
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  price NUMERIC(10,2),
  compare_at_price NUMERIC(10,2),
  stock INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- COLLECTION <-> PRODUCTS (M:N)
-- =============================================
CREATE TABLE public.collection_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE(collection_id, product_id)
);

-- =============================================
-- PRODUCT BADGES (banners promocionais por produto)
-- =============================================
CREATE TABLE public.product_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  badge_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'image'
  title TEXT,
  text TEXT,
  image_url TEXT,
  link TEXT,
  style TEXT NOT NULL DEFAULT 'urgency', -- 'urgency' | 'premium'
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- STORE SETTINGS (key-value para toggles globais)
-- =============================================
CREATE TABLE public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- HOME SECTIONS (seções modulares da home)
-- =============================================
CREATE TABLE public.home_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type TEXT NOT NULL,
  title TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_home_sections_updated_at
  BEFORE UPDATE ON public.home_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- CART
-- =============================================
CREATE TABLE public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES public.carts(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ORDERS
-- =============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  shipping_address JSONB,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- COUPONS
-- =============================================
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed'
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_order_value NUMERIC(10,2),
  max_uses INT,
  used_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- FAVORITES (wishlist)
-- =============================================
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- =============================================
-- REVIEWS
-- =============================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  rating INT NOT NULL DEFAULT 5,
  title TEXT,
  comment TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- RLS POLICIES
-- =============================================

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- collections (public read, admin write)
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active collections" ON public.collections FOR SELECT USING (is_active = true);
CREATE POLICY "Admins read all collections" ON public.collections FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage collections" ON public.collections FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- products (public read active, admin full)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins read all products" ON public.products FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- product_images (public read, admin write)
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Admins manage product images" ON public.product_images FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- product_variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Admins manage variants" ON public.product_variants FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- collection_products
ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read collection products" ON public.collection_products FOR SELECT USING (true);
CREATE POLICY "Admins manage collection products" ON public.collection_products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- product_badges
ALTER TABLE public.product_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active badges" ON public.product_badges FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage badges" ON public.product_badges FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- store_settings (public read, admin write)
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read store settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage store settings" ON public.store_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- home_sections (public read active, admin full)
ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active sections" ON public.home_sections FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage home sections" ON public.home_sections FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- carts
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cart" ON public.carts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins read all carts" ON public.carts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- cart_items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cart items" ON public.cart_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid())
);

-- orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- coupons (public read active, admin full)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active coupons" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read approved reviews" ON public.reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users create own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage reviews" ON public.reviews FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- SEED: Store Settings padrão
-- =============================================
INSERT INTO public.store_settings (key, value) VALUES
  ('store_name', 'Minha Loja Premium'),
  ('topbar_enabled', 'true'),
  ('topbar_text', '🚚 Frete grátis para compras acima de R$ 199'),
  ('newsletter_enabled', 'true'),
  ('drawer_cart_enabled', 'true'),
  ('wishlist_enabled', 'true'),
  ('reviews_enabled', 'true'),
  ('sold_count_enabled', 'true'),
  ('verified_badge_enabled', 'true'),
  ('sku_enabled', 'true'),
  ('black_friday_enabled', 'false'),
  ('black_friday_text', '🔥 PRÉ-BLACK FRIDAY — Descontos de até 70%!'),
  ('clearance_enabled', 'false'),
  ('christmas_enabled', 'false'),
  ('pix_enabled', 'true'),
  ('pix_discount_percent', '5'),
  ('installments_enabled', 'true'),
  ('max_installments', '12'),
  ('payment_badges_enabled', 'true'),
  ('stock_warning_enabled', 'true'),
  ('stock_warning_threshold', '3'),
  ('stock_status_enabled', 'true'),
  ('whatsapp_enabled', 'true'),
  ('whatsapp_number', '5511999999999'),
  ('whatsapp_message', 'Olá! Tenho interesse no produto: {product} - {price}'),
  ('shipping_enabled', 'true'),
  ('free_shipping_min_value', '199'),
  ('free_shipping_text', 'Frete grátis para todo o Brasil'),
  ('shipping_default_days', '7'),
  ('sold_by_enabled', 'true'),
  ('sold_by_name', 'Minha Loja Premium');

-- Seed: Home Sections padrão
INSERT INTO public.home_sections (section_type, title, config, is_active, sort_order) VALUES
  ('topbar', 'Top Bar', '{"text": "🚚 Frete grátis acima de R$ 199"}', true, 0),
  ('hero', 'Hero Banner', '{"layout": "full_width", "title": "Nova Coleção", "subtitle": "Descubra as últimas tendências", "cta_text": "Ver Coleção", "cta_link": "/colecoes", "image_url": ""}', true, 1),
  ('featured_products', 'Produtos em Destaque', '{"limit": 8}', true, 2),
  ('banner_mosaic', 'Mosaico de Banners', '{"banners": []}', true, 3),
  ('featured_collections', 'Coleções em Destaque', '{"limit": 4}', true, 4),
  ('benefits', 'Benefícios', '{"items": [{"icon": "truck", "title": "Frete Grátis", "text": "Acima de R$ 199"}, {"icon": "shield", "title": "Compra Segura", "text": "Ambiente protegido"}, {"icon": "credit-card", "title": "Parcele em 12x", "text": "Sem juros"}, {"icon": "percent", "title": "5% OFF no Pix", "text": "Desconto à vista"}]}', true, 5),
  ('testimonials', 'Depoimentos', '{"items": []}', true, 6),
  ('newsletter', 'Newsletter', '{"title": "Receba nossas novidades", "subtitle": "Cadastre-se e ganhe 10% de desconto"}', true, 7);
