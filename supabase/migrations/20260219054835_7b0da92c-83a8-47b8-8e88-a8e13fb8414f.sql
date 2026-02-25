
-- Add new columns to products table (without removing any existing data)
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_bestseller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_start_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS promo_end_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS max_installments integer DEFAULT 12,
  ADD COLUMN IF NOT EXISTS installments_interest boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pix_discount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_price numeric,
  ADD COLUMN IF NOT EXISTS reseller_price numeric,
  ADD COLUMN IF NOT EXISTS min_stock_alert integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS allow_backorder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_location text,
  ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS height numeric,
  ADD COLUMN IF NOT EXISTS width numeric,
  ADD COLUMN IF NOT EXISTS length numeric,
  ADD COLUMN IF NOT EXISTS free_shipping boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extra_prep_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS hide_price boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quote_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_subscription boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS related_product_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS upsell_product_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS crosssell_product_ids uuid[] DEFAULT '{}';

-- Create product_custom_fields table for personalization tab
CREATE TABLE IF NOT EXISTS public.product_custom_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  options text[] DEFAULT '{}',
  max_length integer,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage product custom fields"
  ON public.product_custom_fields FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read product custom fields"
  ON public.product_custom_fields FOR SELECT
  USING (true);

-- Add subcategories support (link products to multiple collections)
CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  UNIQUE(product_id, collection_id)
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage product categories"
  ON public.product_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read product categories"
  ON public.product_categories FOR SELECT
  USING (true);
