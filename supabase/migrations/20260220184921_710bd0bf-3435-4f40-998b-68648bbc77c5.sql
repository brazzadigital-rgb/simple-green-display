
-- Seller withdrawals table
CREATE TABLE public.seller_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  pix_key text NOT NULL DEFAULT '',
  notes text,
  status text NOT NULL DEFAULT 'requested',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers manage own withdrawals" ON public.seller_withdrawals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_withdrawals.seller_id AND s.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_withdrawals.seller_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Admins manage all withdrawals" ON public.seller_withdrawals
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seller materials table
CREATE TABLE public.seller_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  material_type text NOT NULL DEFAULT 'image',
  file_url text NOT NULL,
  caption text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers read active materials" ON public.seller_materials
  FOR SELECT USING (is_active = true AND public.has_role(auth.uid(), 'seller'));

CREATE POLICY "Admins manage materials" ON public.seller_materials
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seller link clicks table
CREATE TABLE public.seller_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  product_slug text,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device text,
  ip_hash text,
  converted boolean NOT NULL DEFAULT false,
  order_id uuid REFERENCES public.orders(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers read own clicks" ON public.seller_link_clicks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_link_clicks.seller_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Anyone can insert clicks" ON public.seller_link_clicks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins manage all clicks" ON public.seller_link_clicks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Add pix_key and social fields to sellers if not exists
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS pix_key text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';

-- Triggers for updated_at
CREATE TRIGGER update_seller_withdrawals_updated_at BEFORE UPDATE ON public.seller_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_seller_materials_updated_at BEFORE UPDATE ON public.seller_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
