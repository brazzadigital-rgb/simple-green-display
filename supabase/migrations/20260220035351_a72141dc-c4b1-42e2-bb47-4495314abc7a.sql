
-- Plans table
CREATE TABLE public.plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  highlight_badge text,
  description text,
  monthly_price numeric NOT NULL DEFAULT 0,
  semiannual_price numeric NOT NULL DEFAULT 0,
  annual_price numeric NOT NULL DEFAULT 0,
  features_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage plans" ON public.plans FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read active plans" ON public.plans FOR SELECT USING (is_active = true);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  billing_cycle text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamp with time zone NOT NULL DEFAULT now(),
  current_period_end timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Seed default plans
INSERT INTO public.plans (name, highlight_badge, description, monthly_price, semiannual_price, annual_price, features_json, sort_order) VALUES
('Basic', NULL, 'Ideal para quem está começando sua loja online.', 49.90, 249.90, 449.90, '["Até 50 produtos","1 usuário admin","Relatórios básicos","Suporte por email","Checkout padrão"]'::jsonb, 0),
('Premium', 'Mais Popular', 'Para lojas em crescimento que precisam de mais recursos.', 99.90, 499.90, 899.90, '["Produtos ilimitados","3 usuários admin","Relatórios avançados","Suporte prioritário","Checkout personalizado","Cupons e promoções","Integrações de pagamento"]'::jsonb, 1),
('Master', NULL, 'Controle total para operações profissionais.', 199.90, 999.90, 1799.90, '["Tudo do Premium","Usuários ilimitados","API completa","Suporte dedicado","Multi-loja","Comissões e vendedores","White-label"]'::jsonb, 2);

-- Triggers
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
