-- Auto-update seller profile rating when reviews are added/changed/deleted
CREATE OR REPLACE FUNCTION public.recalc_seller_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_listing_id uuid;
  target_seller_id uuid;
  avg_rating numeric;
  review_count integer;
BEGIN
  target_listing_id := COALESCE(NEW.listing_id, OLD.listing_id);
  SELECT user_id INTO target_seller_id FROM public.listings WHERE id = target_listing_id;
  IF target_seller_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT ROUND(AVG(r.rating)::numeric, 2), COUNT(*)
  INTO avg_rating, review_count
  FROM public.reviews r
  JOIN public.listings l ON l.id = r.listing_id
  WHERE l.user_id = target_seller_id;

  UPDATE public.profiles
  SET rating = COALESCE(avg_rating, 0),
      total_reviews = COALESCE(review_count, 0)
  WHERE user_id = target_seller_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS reviews_recalc_seller_rating ON public.reviews;
CREATE TRIGGER reviews_recalc_seller_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.recalc_seller_rating();

-- Prevent duplicate reviews per (reviewer, listing)
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_reviewer_listing
ON public.reviews (reviewer_id, listing_id);