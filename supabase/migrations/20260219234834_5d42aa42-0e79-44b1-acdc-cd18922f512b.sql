
-- =============================================
-- Tracking Sessions Table
-- =============================================
CREATE TABLE public.tracking_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  user_id UUID NULL,
  session_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  landing_page TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  fbclid TEXT,
  gclid TEXT,
  ttclid TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tracking sessions"
  ON public.tracking_sessions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert tracking sessions"
  ON public.tracking_sessions FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_tracking_sessions_visitor ON public.tracking_sessions(visitor_id);
CREATE INDEX idx_tracking_sessions_user ON public.tracking_sessions(user_id);

-- =============================================
-- Add UTM columns to orders table
-- =============================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS fbclid TEXT,
  ADD COLUMN IF NOT EXISTS gclid TEXT,
  ADD COLUMN IF NOT EXISTS landing_page TEXT,
  ADD COLUMN IF NOT EXISTS tracking_first_touch_json JSONB,
  ADD COLUMN IF NOT EXISTS tracking_last_touch_json JSONB;
