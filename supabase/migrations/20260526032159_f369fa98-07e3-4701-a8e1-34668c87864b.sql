
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_enabled boolean NOT NULL DEFAULT false,
  rent_commission_rate numeric NOT NULL DEFAULT 0.10,
  sell_commission_rate numeric NOT NULL DEFAULT 0.05,
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert platform settings"
  ON public.platform_settings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.platform_settings (commission_enabled) VALUES (false)
  ON CONFLICT (singleton) DO NOTHING;
