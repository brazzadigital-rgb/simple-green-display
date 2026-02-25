
-- Payment gateway configurations (credentials stored securely)
CREATE TABLE public.payment_gateway_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL, -- mercadopago, asaas, pagseguro, stripe
  is_active boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox', -- sandbox, production
  config jsonb NOT NULL DEFAULT '{}'::jsonb, -- non-sensitive config (max_installments, methods, etc.)
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider)
);

ALTER TABLE public.payment_gateway_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage gateway configs" ON public.payment_gateway_configs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Payment transactions
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  provider text NOT NULL, -- mercadopago, asaas, pagseguro, stripe
  method text NOT NULL DEFAULT 'pix', -- pix, card, boleto, manual
  status text NOT NULL DEFAULT 'pending', -- pending, paid, failed, refunded, canceled, expired
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  provider_payment_id text,
  provider_reference text,
  qr_code text,
  qr_code_image_url text,
  boleto_url text,
  checkout_url text,
  card_last4 text,
  fees numeric DEFAULT 0,
  paid_at timestamptz,
  expires_at timestamptz,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage transactions" ON public.payment_transactions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own transactions" ON public.payment_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = payment_transactions.order_id AND orders.user_id = auth.uid()
    )
  );

-- Webhook events for auditing
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  success boolean DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read webhook events" ON public.webhook_events
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add payment fields to orders if not present
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_provider text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.payment_transactions(id);

-- Payment gateway secrets (encrypted storage for API keys)
CREATE TABLE public.payment_gateway_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  secret_key text NOT NULL, -- key name like 'api_key', 'access_token', 'webhook_secret'
  secret_value text NOT NULL DEFAULT '', -- encrypted value
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, secret_key)
);

ALTER TABLE public.payment_gateway_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage gateway secrets" ON public.payment_gateway_secrets
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers
CREATE TRIGGER update_payment_gateway_configs_updated_at
  BEFORE UPDATE ON public.payment_gateway_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_payment_gateway_secrets_updated_at
  BEFORE UPDATE ON public.payment_gateway_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed default gateway configs
INSERT INTO public.payment_gateway_configs (provider, is_active, is_default, sort_order, config) VALUES
  ('asaas', false, true, 0, '{"methods": {"pix": true, "card": true, "boleto": true}, "max_installments": 12, "pix_expiration_minutes": 30}'::jsonb),
  ('mercadopago', false, false, 1, '{"methods": {"pix": true, "card": true, "boleto": true}, "max_installments": 12}'::jsonb),
  ('pagseguro', false, false, 2, '{"methods": {"pix": true, "card": true, "boleto": true}, "max_installments": 12}'::jsonb),
  ('stripe', false, false, 3, '{"methods": {"card": true, "pix": false, "boleto": false}, "capture_method": "automatic"}'::jsonb);
