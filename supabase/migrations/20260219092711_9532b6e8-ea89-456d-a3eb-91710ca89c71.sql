
-- Create promo_panels table for manageable promotional panels
CREATE TABLE public.promo_panels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  link text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_panels ENABLE ROW LEVEL SECURITY;

-- Anyone can read active panels
CREATE POLICY "Anyone can read active promo panels"
  ON public.promo_panels FOR SELECT
  USING (is_active = true);

-- Admins manage all panels
CREATE POLICY "Admins manage promo panels"
  ON public.promo_panels FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_promo_panels_updated_at
  BEFORE UPDATE ON public.promo_panels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Seed with current 3 panels (using placeholder URLs that admin will replace)
INSERT INTO public.promo_panels (alt_text, image_url, link, sort_order) VALUES
  ('Rastreie seu pedido', '', '/rastreamento', 0),
  ('Pague pelo cartão com segurança', '', null, 1),
  ('Siga nossas redes sociais', '', null, 2);
