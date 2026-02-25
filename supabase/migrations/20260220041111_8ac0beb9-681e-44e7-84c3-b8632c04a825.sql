
-- Owner subscription (single store - one active row)
CREATE TABLE public.owner_subscription (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.plans(id),
  billing_cycle text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  auto_renew boolean NOT NULL DEFAULT true,
  gateway text NOT NULL DEFAULT 'efi',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_subscription ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages subscription" ON public.owner_subscription
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins can read owner subscription" ON public.owner_subscription
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Owner invoices
CREATE TABLE public.owner_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.owner_subscription(id),
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  due_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  paid_at timestamptz,
  gateway text NOT NULL DEFAULT 'efi',
  gateway_charge_id text,
  payment_method text DEFAULT 'pix',
  pix_qrcode text,
  pix_copy_paste text,
  invoice_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages invoices" ON public.owner_invoices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins can read owner invoices" ON public.owner_invoices
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Owner audit logs
CREATE TABLE public.owner_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL DEFAULT 'owner',
  action text NOT NULL,
  meta_json jsonb DEFAULT '{}',
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages audit logs" ON public.owner_audit_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- Owner settings (key-value for Efi credentials etc)
CREATE TABLE public.owner_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages settings" ON public.owner_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- Triggers for updated_at
CREATE TRIGGER update_owner_subscription_updated_at
  BEFORE UPDATE ON public.owner_subscription
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_owner_settings_updated_at
  BEFORE UPDATE ON public.owner_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to check if system is suspended
CREATE OR REPLACE FUNCTION public.is_system_suspended()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.owner_subscription
    WHERE status = 'suspended'
    LIMIT 1
  )
$$;
