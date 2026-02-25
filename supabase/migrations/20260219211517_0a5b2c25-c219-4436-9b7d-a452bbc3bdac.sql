
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can read wishlist items" ON public.wishlist_items;
