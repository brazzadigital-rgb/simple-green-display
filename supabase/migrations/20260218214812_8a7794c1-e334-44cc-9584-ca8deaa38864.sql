
-- Create storage bucket for store assets (logos, banners)
INSERT INTO storage.buckets (id, name, public) VALUES ('store-assets', 'store-assets', true);

-- Allow anyone to read store assets
CREATE POLICY "Public read store assets" ON storage.objects FOR SELECT USING (bucket_id = 'store-assets');

-- Admins can upload/update/delete store assets
CREATE POLICY "Admins upload store assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'store-assets' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update store assets" ON storage.objects FOR UPDATE USING (bucket_id = 'store-assets' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete store assets" ON storage.objects FOR DELETE USING (bucket_id = 'store-assets' AND has_role(auth.uid(), 'admin'::app_role));
