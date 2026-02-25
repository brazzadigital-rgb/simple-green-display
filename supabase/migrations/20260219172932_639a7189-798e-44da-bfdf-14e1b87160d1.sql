
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _address jsonb;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, cpf)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'cpf', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Auto-create address if provided in metadata
  _address := NEW.raw_user_meta_data->'address';
  IF _address IS NOT NULL AND (_address->>'zip_code') IS NOT NULL AND (_address->>'street') IS NOT NULL AND (_address->>'number') IS NOT NULL THEN
    INSERT INTO public.customer_addresses (
      user_id, label, recipient_name, phone,
      zip_code, street, number, complement,
      neighborhood, city, state, is_default
    ) VALUES (
      NEW.id,
      'Casa',
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'phone', ''),
      _address->>'zip_code',
      _address->>'street',
      _address->>'number',
      NULLIF(_address->>'complement', ''),
      COALESCE(_address->>'neighborhood', ''),
      COALESCE(_address->>'city', ''),
      COALESCE(_address->>'state', ''),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$;
