
-- Add metadata column to cart_items for storing grouped variant selections
ALTER TABLE public.cart_items ADD COLUMN metadata_json jsonb DEFAULT '{}'::jsonb;

-- Add variants detail column to order_items for price breakdown display
ALTER TABLE public.order_items ADD COLUMN variants_detail_json jsonb DEFAULT NULL;
