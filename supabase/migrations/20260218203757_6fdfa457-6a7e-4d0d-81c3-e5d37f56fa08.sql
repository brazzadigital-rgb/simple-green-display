
-- =============================================
-- 1. FORNECEDORES (Suppliers)
-- =============================================
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_name text NOT NULL,
  legal_name text,
  document text,
  email text,
  phone text,
  whatsapp text,
  address jsonb DEFAULT '{}'::jsonb,
  contact_person text,
  status text NOT NULL DEFAULT 'active',
  shipping_days integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage suppliers" ON public.suppliers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 2. VENDEDORES (Sellers)
-- =============================================
CREATE TABLE public.sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  document text,
  avatar_url text,
  status text NOT NULL DEFAULT 'active',
  monthly_goal numeric DEFAULT 0,
  commission_rate numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sellers" ON public.sellers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers read own data" ON public.sellers
  FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER update_sellers_updated_at
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 3. CUSTOM ROLES (Funções personalizadas)
-- =============================================
CREATE TABLE public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage custom roles" ON public.custom_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_custom_roles_updated_at
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 4. ROLE PERMISSIONS (Permissões por função)
-- =============================================
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, module)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage role permissions" ON public.role_permissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 5. COMISSÕES (Commissions)
-- =============================================
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  sale_amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage commissions" ON public.commissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers read own commissions" ON public.commissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = commissions.seller_id AND s.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 6. Vincular produto a fornecedor (coluna optional)
-- =============================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- =============================================
-- 7. Vincular pedido a vendedor (coluna optional)
-- =============================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;

-- =============================================
-- 8. Seed de funções padrão
-- =============================================
INSERT INTO public.custom_roles (name, description, is_system) VALUES
  ('Administrador', 'Acesso total ao sistema', true),
  ('Gerente', 'Acesso a gestão exceto configurações críticas', true),
  ('Vendedor', 'Acesso a vendas e clientes próprios', true),
  ('Operador', 'Acesso operacional a pedidos e estoque', true),
  ('Financeiro', 'Acesso a relatórios e comissões', true),
  ('Fornecedor', 'Acesso externo a pedidos relacionados', true);
