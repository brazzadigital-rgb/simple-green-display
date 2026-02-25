
-- Fix overly permissive INSERT policy on notifications
-- Replace with authenticated-only insert
DROP POLICY "System inserts notifications" ON public.notifications;

CREATE POLICY "Authenticated users insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
