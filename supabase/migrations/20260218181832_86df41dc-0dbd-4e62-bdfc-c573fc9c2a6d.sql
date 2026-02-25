
-- Fix RLS: Drop RESTRICTIVE policies and recreate as PERMISSIVE for public read access
-- The original CREATE POLICY defaults to PERMISSIVE, but let's make sure by dropping and recreating

-- PRODUCTS: drop admin SELECT and public SELECT, recreate as permissive
DROP POLICY IF EXISTS "Anyone can read active products" ON public.products;
DROP POLICY IF EXISTS "Admins read all products" ON public.products;
DROP POLICY IF EXISTS "Admins manage products" ON public.products;

CREATE POLICY "Anyone can read active products" ON public.products FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins read all products" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- COLLECTIONS
DROP POLICY IF EXISTS "Anyone can read active collections" ON public.collections;
DROP POLICY IF EXISTS "Admins read all collections" ON public.collections;
DROP POLICY IF EXISTS "Admins manage collections" ON public.collections;

CREATE POLICY "Anyone can read active collections" ON public.collections FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins read all collections" ON public.collections FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert collections" ON public.collections FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update collections" ON public.collections FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete collections" ON public.collections FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PRODUCT_IMAGES
DROP POLICY IF EXISTS "Anyone can read product images" ON public.product_images;
DROP POLICY IF EXISTS "Admins manage product images" ON public.product_images;

CREATE POLICY "Anyone can read product images" ON public.product_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert product images" ON public.product_images FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update product images" ON public.product_images FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete product images" ON public.product_images FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PRODUCT_VARIANTS
DROP POLICY IF EXISTS "Anyone can read variants" ON public.product_variants;
DROP POLICY IF EXISTS "Admins manage variants" ON public.product_variants;

CREATE POLICY "Anyone can read variants" ON public.product_variants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert variants" ON public.product_variants FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update variants" ON public.product_variants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete variants" ON public.product_variants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- COLLECTION_PRODUCTS
DROP POLICY IF EXISTS "Anyone can read collection products" ON public.collection_products;
DROP POLICY IF EXISTS "Admins manage collection products" ON public.collection_products;

CREATE POLICY "Anyone can read collection products" ON public.collection_products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert collection products" ON public.collection_products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update collection products" ON public.collection_products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete collection products" ON public.collection_products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PRODUCT_BADGES
DROP POLICY IF EXISTS "Anyone can read active badges" ON public.product_badges;
DROP POLICY IF EXISTS "Admins manage badges" ON public.product_badges;

CREATE POLICY "Anyone can read active badges" ON public.product_badges FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins insert badges" ON public.product_badges FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update badges" ON public.product_badges FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete badges" ON public.product_badges FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- STORE_SETTINGS
DROP POLICY IF EXISTS "Anyone can read store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admins manage store settings" ON public.store_settings;

CREATE POLICY "Anyone can read store settings" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert store settings" ON public.store_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update store settings" ON public.store_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete store settings" ON public.store_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- HOME_SECTIONS
DROP POLICY IF EXISTS "Anyone can read active sections" ON public.home_sections;
DROP POLICY IF EXISTS "Admins manage home sections" ON public.home_sections;

CREATE POLICY "Anyone can read active sections" ON public.home_sections FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins insert home sections" ON public.home_sections FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update home sections" ON public.home_sections FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete home sections" ON public.home_sections FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- COUPONS
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;

CREATE POLICY "Anyone can read active coupons" ON public.coupons FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins insert coupons" ON public.coupons FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update coupons" ON public.coupons FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete coupons" ON public.coupons FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- CARTS: allow anon session-based carts too
DROP POLICY IF EXISTS "Users manage own cart" ON public.carts;
DROP POLICY IF EXISTS "Admins read all carts" ON public.carts;

CREATE POLICY "Users manage own cart" ON public.carts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all carts" ON public.carts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- CART_ITEMS
DROP POLICY IF EXISTS "Users manage own cart items" ON public.cart_items;

CREATE POLICY "Users manage own cart items" ON public.cart_items FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.carts WHERE id = cart_items.cart_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.carts WHERE id = cart_items.cart_id AND user_id = auth.uid()));

-- ORDERS
DROP POLICY IF EXISTS "Users read own orders" ON public.orders;
DROP POLICY IF EXISTS "Users create own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins manage all orders" ON public.orders;

CREATE POLICY "Users read own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all orders" ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ORDER_ITEMS
DROP POLICY IF EXISTS "Users read own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins manage order items" ON public.order_items;

CREATE POLICY "Users read own order items" ON public.order_items FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = auth.uid()));
CREATE POLICY "Users insert own order items" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = auth.uid()));
CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- FAVORITES
DROP POLICY IF EXISTS "Users manage own favorites" ON public.favorites;

CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- REVIEWS
DROP POLICY IF EXISTS "Anyone can read approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users create own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins manage reviews" ON public.reviews;

CREATE POLICY "Anyone can read approved reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (is_approved = true);
CREATE POLICY "Users create own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage reviews" ON public.reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PROFILES
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add customer_addresses table for checkout
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL DEFAULT 'Casa',
  recipient_name TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own addresses" ON public.customer_addresses FOR ALL TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_customer_addresses_updated_at
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
