-- Add lat/lng to listings for geolocation-based sorting
ALTER TABLE public.listings ADD COLUMN latitude double precision;
ALTER TABLE public.listings ADD COLUMN longitude double precision;

-- Add KYC fields to profiles for address verification
ALTER TABLE public.profiles ADD COLUMN address text;
ALTER TABLE public.profiles ADD COLUMN city text;
ALTER TABLE public.profiles ADD COLUMN state text;
ALTER TABLE public.profiles ADD COLUMN pincode text;
ALTER TABLE public.profiles ADD COLUMN id_type text;
ALTER TABLE public.profiles ADD COLUMN id_number text;
ALTER TABLE public.profiles ADD COLUMN kyc_document_url text;
ALTER TABLE public.profiles ADD COLUMN kyc_submitted_at timestamp with time zone;

-- Create storage bucket for KYC documents (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);

-- Only authenticated users can upload their own KYC docs
CREATE POLICY "Users can upload own KYC docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own KYC docs
CREATE POLICY "Users can view own KYC docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can view all KYC docs
CREATE POLICY "Admins can view all KYC docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));