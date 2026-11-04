ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings;
CREATE POLICY "Listings are viewable by everyone" ON public.listings
  FOR SELECT
  USING (
    (is_hidden = false AND status IN ('active', 'out_of_stock'))
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );