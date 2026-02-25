
-- Fix RLS policies to be PERMISSIVE for public read access

-- products: drop restrictive, add permissive
DROP POLICY IF EXISTS "Anyone can read active products" ON products;
CREATE POLICY "Anyone can read active products" ON products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins read all products" ON products;
CREATE POLICY "Admins read all products" ON products FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- collections
DROP POLICY IF EXISTS "Anyone can read active collections" ON collections;
CREATE POLICY "Anyone can read active collections" ON collections FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins read all collections" ON collections;
CREATE POLICY "Admins read all collections" ON collections FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- home_sections
DROP POLICY IF EXISTS "Anyone can read active sections" ON home_sections;
CREATE POLICY "Anyone can read active sections" ON home_sections FOR SELECT USING (is_active = true);

-- product_images
DROP POLICY IF EXISTS "Anyone can read product images" ON product_images;
CREATE POLICY "Anyone can read product images" ON product_images FOR SELECT USING (true);

-- product_variants
DROP POLICY IF EXISTS "Anyone can read variants" ON product_variants;
CREATE POLICY "Anyone can read variants" ON product_variants FOR SELECT USING (true);

-- store_settings
DROP POLICY IF EXISTS "Anyone can read store settings" ON store_settings;
CREATE POLICY "Anyone can read store settings" ON store_settings FOR SELECT USING (true);

-- product_badges
DROP POLICY IF EXISTS "Anyone can read active badges" ON product_badges;
CREATE POLICY "Anyone can read active badges" ON product_badges FOR SELECT USING (is_active = true);

-- coupons
DROP POLICY IF EXISTS "Anyone can read active coupons" ON coupons;
CREATE POLICY "Anyone can read active coupons" ON coupons FOR SELECT USING (is_active = true);

-- collection_products
DROP POLICY IF EXISTS "Anyone can read collection products" ON collection_products;
CREATE POLICY "Anyone can read collection products" ON collection_products FOR SELECT USING (true);

-- reviews
DROP POLICY IF EXISTS "Anyone can read approved reviews" ON reviews;
CREATE POLICY "Anyone can read approved reviews" ON reviews FOR SELECT USING (is_approved = true);
