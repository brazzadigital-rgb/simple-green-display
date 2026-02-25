
-- Add missing columns to orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS shipping_service text NULL,
  ADD COLUMN IF NOT EXISTS shipped_at timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS billing_address jsonb NULL,
  ADD COLUMN IF NOT EXISTS notes_admin text NULL,
  ADD COLUMN IF NOT EXISTS notes_customer text NULL;

-- Create order_events table for audit trail
CREATE TABLE public.order_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  created_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage order events"
  ON public.order_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can read events for their own orders
CREATE POLICY "Users read own order events"
  ON public.order_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_events.order_id AND orders.user_id = auth.uid()
  ));

-- Create index for performance
CREATE INDEX idx_order_events_order_id ON public.order_events(order_id);
CREATE INDEX idx_order_events_created_at ON public.order_events(created_at DESC);
