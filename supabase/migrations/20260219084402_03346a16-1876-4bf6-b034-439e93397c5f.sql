
-- Add shipping columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_method_name text,
  ADD COLUMN IF NOT EXISTS shipping_service_code text,
  ADD COLUMN IF NOT EXISTS shipping_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_days integer,
  ADD COLUMN IF NOT EXISTS shipping_provider text,
  ADD COLUMN IF NOT EXISTS shipment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tracking_code text,
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS melhor_envio_order_id text,
  ADD COLUMN IF NOT EXISTS label_url text,
  ADD COLUMN IF NOT EXISTS invoice_number text;

-- Add dimensions to products (for shipping calc)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shipping_weight numeric,
  ADD COLUMN IF NOT EXISTS shipping_width numeric,
  ADD COLUMN IF NOT EXISTS shipping_height numeric,
  ADD COLUMN IF NOT EXISTS shipping_length numeric;

-- Shipping quotes table (cache)
CREATE TABLE IF NOT EXISTS public.shipping_quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text,
  user_id uuid,
  customer_cep text NOT NULL,
  items_hash text NOT NULL,
  quotes_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '20 minutes')
);

ALTER TABLE public.shipping_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read their own quotes"
  ON public.shipping_quotes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create quotes"
  ON public.shipping_quotes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Cleanup expired quotes"
  ON public.shipping_quotes FOR DELETE
  USING (expires_at < now());

-- Tracking events table
CREATE TABLE IF NOT EXISTS public.tracking_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  description text,
  location text,
  event_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own tracking events"
  ON public.tracking_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = tracking_events.order_id AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage tracking events"
  ON public.tracking_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Public tracking policy (by order_number lookup - handled in edge function)
CREATE POLICY "Public read tracking by order"
  ON public.tracking_events FOR SELECT
  USING (true);

-- Index for faster tracking lookups
CREATE INDEX IF NOT EXISTS idx_tracking_events_order_id ON public.tracking_events(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_code ON public.orders(tracking_code) WHERE tracking_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_hash ON public.shipping_quotes(items_hash, customer_cep);
