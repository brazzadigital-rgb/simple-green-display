
-- Allow owner to manage plans (CRUD)
CREATE POLICY "Owner manages plans"
ON public.plans
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- Allow owner to read profiles (to see admin users)
CREATE POLICY "Owner reads all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

-- Allow owner to read user_roles (to see who is admin)
CREATE POLICY "Owner reads user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));
