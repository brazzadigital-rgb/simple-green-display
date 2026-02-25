
-- Wishlists table
CREATE TABLE public.wishlists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NULL,
  session_id text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Wishlist items table
CREATE TABLE public.wishlist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wishlist_id uuid NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid NULL REFERENCES public.product_variants(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(wishlist_id, product_id, variant_id)
);

-- Indexes
CREATE INDEX idx_wishlists_user_id ON public.wishlists(user_id);
CREATE INDEX idx_wishlists_session_id ON public.wishlists(session_id);
CREATE INDEX idx_wishlist_items_wishlist_id ON public.wishlist_items(wishlist_id);
CREATE INDEX idx_wishlist_items_product_id ON public.wishlist_items(product_id);

-- Update trigger
CREATE TRIGGER update_wishlists_updated_at
  BEFORE UPDATE ON public.wishlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- Wishlists policies
CREATE POLICY "Users manage own wishlists"
  ON public.wishlists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can create session wishlists"
  ON public.wishlists FOR INSERT
  WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);

CREATE POLICY "Anyone can read session wishlists"
  ON public.wishlists FOR SELECT
  USING (session_id IS NOT NULL AND user_id IS NULL);

-- Wishlist items policies
CREATE POLICY "Users manage own wishlist items"
  ON public.wishlist_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.wishlists w
    WHERE w.id = wishlist_items.wishlist_id AND w.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.wishlists w
    WHERE w.id = wishlist_items.wishlist_id AND w.user_id = auth.uid()
  ));

CREATE POLICY "Anyone can manage session wishlist items"
  ON public.wishlist_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.wishlists w
    WHERE w.id = wishlist_items.wishlist_id AND w.user_id IS NULL AND w.session_id IS NOT NULL
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.wishlists w
    WHERE w.id = wishlist_items.wishlist_id AND w.user_id IS NULL AND w.session_id IS NOT NULL
  ));

CREATE POLICY "Anyone can read wishlist items"
  ON public.wishlist_items FOR SELECT
  USING (true);
