
-- Banners table for hero and promotional banners
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  location TEXT NOT NULL DEFAULT 'hero', -- 'hero' | 'bottom'
  desktop_image_url TEXT,
  mobile_image_url TEXT,
  link TEXT,
  overlay_opacity INTEGER NOT NULL DEFAULT 0, -- 0-80
  show_text BOOLEAN NOT NULL DEFAULT true,
  content_position TEXT NOT NULL DEFAULT 'center', -- 'left' | 'center' | 'right'
  height TEXT DEFAULT 'adaptive', -- px value or 'adaptive'
  subtitle TEXT,
  cta_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  border_radius TEXT DEFAULT '0',
  full_width BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active banners" ON public.banners FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage banners" ON public.banners FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed appearance settings into store_settings (upsert to avoid dupes)
INSERT INTO public.store_settings (key, value) VALUES
  ('logo_url', ''),
  ('logo_mobile_url', ''),
  ('favicon_url', ''),
  ('color_primary', '18 100% 50%'),
  ('color_secondary', '0 0% 92%'),
  ('color_buttons', '18 100% 50%'),
  ('color_background', '0 0% 97%'),
  ('color_text', '0 0% 5%'),
  ('color_promotions', '0 84% 60%'),
  ('font_headings', 'Rajdhani'),
  ('font_body', 'Inter'),
  ('font_weight', '700'),
  ('font_size_base', '16'),
  ('topbar_link_text', 'Rastrear Pedido'),
  ('topbar_link_url', '/conta/pedidos'),
  ('topbar_bg_color', '0 0% 5%')
ON CONFLICT (key) DO NOTHING;
