
-- =============================================
-- MÓDULO FINANCEIRO - TABELAS E POLÍTICAS
-- =============================================

-- 1. Tabela de Reembolsos / Chargebacks
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  refund_type TEXT NOT NULL DEFAULT 'full',
  method TEXT DEFAULT 'pix',
  status TEXT NOT NULL DEFAULT 'requested',
  is_chargeback BOOLEAN NOT NULL DEFAULT false,
  chargeback_fee NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage refunds" ON public.refunds
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Tabela de Transações Financeiras (Conciliação)
CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  gateway TEXT NOT NULL DEFAULT 'manual',
  transaction_id TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  fees NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  payment_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage financial transactions" ON public.financial_transactions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Tabela de Fluxo de Caixa (Lançamentos)
CREATE TABLE public.cashflow_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL DEFAULT 'income',
  category TEXT NOT NULL DEFAULT 'vendas',
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  is_automatic BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cashflow_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage cashflow entries" ON public.cashflow_entries
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_cashflow_entries_updated_at
  BEFORE UPDATE ON public.cashflow_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Campos adicionais de custo nos produtos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS packaging_cost NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS customization_cost NUMERIC DEFAULT 0;
