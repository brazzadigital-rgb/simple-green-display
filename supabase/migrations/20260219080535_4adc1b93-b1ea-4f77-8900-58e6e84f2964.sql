-- Add cpf to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;

-- Add phone to customer_addresses
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS phone text;