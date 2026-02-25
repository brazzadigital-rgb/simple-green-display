
-- Seasonal Showcases (Vitrines por Temporada)
CREATE TABLE public.seasonal_showcases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- draft, scheduled, active, ended
  priority integer NOT NULL DEFAULT 0,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  -- Visual editorial
  section_title text, -- ex: "Presentes para quem você ama"
  section_subtitle text,
  enable_countdown boolean NOT NULL DEFAULT false,
  enable_campaign_badge boolean NOT NULL DEFAULT false,
  badge_text text, -- ex: "Especial Dia das Mães"
  badge_color text DEFAULT 'accent',
  badge_position text DEFAULT 'top-left',
  enable_promo_strip boolean NOT NULL DEFAULT false,
  promo_strip_text text,
  -- Banner da temporada
  banner_desktop_url text,
  banner_mobile_url text,
  banner_link text,
  banner_overlay_opacity integer DEFAULT 0,
  banner_text_position text DEFAULT 'center',
  banner_clean_mode boolean NOT NULL DEFAULT false,
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.seasonal_showcases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage seasonal showcases"
  ON public.seasonal_showcases FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active showcases"
  ON public.seasonal_showcases FOR SELECT
  USING (status IN ('active', 'scheduled'));

-- Collections within a showcase
CREATE TABLE public.showcase_collections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  showcase_id uuid NOT NULL REFERENCES public.seasonal_showcases(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  card_size text NOT NULL DEFAULT 'medium', -- large, medium, small
  UNIQUE(showcase_id, collection_id)
);

ALTER TABLE public.showcase_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage showcase collections"
  ON public.showcase_collections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read showcase collections"
  ON public.showcase_collections FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_seasonal_showcases_updated_at
  BEFORE UPDATE ON public.seasonal_showcases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
