
-- Add referral_code to sellers
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Create index for fast referral lookup
CREATE INDEX IF NOT EXISTS idx_sellers_referral_code ON public.sellers(referral_code);

-- Add seller_id tracking to orders (already exists, but ensure referral_code field)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS referral_code text;

-- Function to auto-generate referral code from seller name
CREATE OR REPLACE FUNCTION public.generate_seller_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 4);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_seller_referral_code
  BEFORE INSERT ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_seller_referral_code();

-- Function to auto-create commission when order is created with a seller
CREATE OR REPLACE FUNCTION public.auto_create_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seller_id uuid;
  _commission_rate numeric;
BEGIN
  -- Determine seller: from seller_id or referral_code
  _seller_id := NEW.seller_id;
  
  IF _seller_id IS NULL AND NEW.referral_code IS NOT NULL THEN
    SELECT id INTO _seller_id FROM public.sellers WHERE referral_code = NEW.referral_code AND status = 'active';
    IF _seller_id IS NOT NULL THEN
      NEW.seller_id := _seller_id;
    END IF;
  END IF;
  
  IF _seller_id IS NOT NULL THEN
    SELECT COALESCE(commission_rate, 0) INTO _commission_rate FROM public.sellers WHERE id = _seller_id;
    
    INSERT INTO public.commissions (seller_id, order_id, sale_amount, commission_rate, commission_amount, payment_status)
    VALUES (
      _seller_id,
      NEW.id,
      NEW.total,
      _commission_rate,
      NEW.total * (_commission_rate / 100),
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_commission
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_commission();

-- Add 'seller' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seller';

-- Allow sellers to read their own orders
CREATE POLICY "Sellers read linked orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sellers s 
      WHERE s.id = orders.seller_id 
      AND s.user_id = auth.uid()
    )
  );
