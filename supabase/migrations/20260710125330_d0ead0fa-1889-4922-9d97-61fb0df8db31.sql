ALTER TABLE public.platform_settings 
  ADD COLUMN IF NOT EXISTS maintenance_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_message text DEFAULT 'We''re performing scheduled maintenance. Please check back shortly.';

GRANT SELECT ON public.platform_settings TO anon;