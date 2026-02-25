
-- Junction table: users <-> custom_roles
CREATE TABLE public.user_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  custom_role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, custom_role_id)
);

ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage user custom roles"
  ON public.user_custom_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own custom roles"
  ON public.user_custom_roles FOR SELECT
  USING (auth.uid() = user_id);
