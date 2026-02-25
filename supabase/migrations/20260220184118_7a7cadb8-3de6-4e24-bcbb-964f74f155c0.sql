
-- Allow authenticated users to insert sellers (for self-registration)
CREATE POLICY "Authenticated users can register as seller"
ON public.sellers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Drop the duplicate and create a broader read policy
DROP POLICY IF EXISTS "Anyone can check seller by email" ON public.sellers;
