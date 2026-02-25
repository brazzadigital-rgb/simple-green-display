
-- Table for internal customer notes (admin-only)
CREATE TABLE public.customer_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage customer notes"
ON public.customer_notes FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_customer_notes_updated_at
BEFORE UPDATE ON public.customer_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_customer_notes_user_id ON public.customer_notes(user_id);
