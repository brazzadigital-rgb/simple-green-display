
-- Trigger: when a seller record is inserted, auto-add 'seller' role
CREATE OR REPLACE FUNCTION public.auto_add_seller_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'seller')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_add_seller_role
  AFTER INSERT ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_seller_role();
