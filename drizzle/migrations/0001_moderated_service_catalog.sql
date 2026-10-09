CREATE TABLE public.service_catalog (
 slug text PRIMARY KEY,
 label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 120),
 parent_slug text REFERENCES public.service_catalog(slug),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_catalog TO anon, authenticated;
GRANT ALL ON public.service_catalog TO service_role;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catalog is public" ON public.service_catalog FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX service_catalog_parent_idx ON public.service_catalog(parent_slug);
CREATE TABLE public.service_name_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_category text NOT NULL,
 source_value text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 target_category text REFERENCES public.service_catalog(slug),
 target_service text REFERENCES public.service_catalog(slug),
 reviewed_by uuid,
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source_category, source_value)
);
GRANT SELECT ON public.service_name_reviews TO authenticated;
GRANT ALL ON public.service_name_reviews TO service_role;
ALTER TABLE public.service_name_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read name reviews" ON public.service_name_reviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX service_name_reviews_status_idx ON public.service_name_reviews(status, created_at DESC);
CREATE OR REPLACE FUNCTION public.capture_other_service_name() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.listing_type = 'service' AND NEW.service_subcategory LIKE 'custom:%' THEN
  INSERT INTO public.service_name_reviews(source_category,source_value) VALUES(coalesce(NEW.service_category,'other-services'),NEW.service_subcategory) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_other_service_name() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER capture_other_service_name AFTER INSERT OR UPDATE OF service_category,service_subcategory ON public.listings FOR EACH ROW EXECUTE FUNCTION public.capture_other_service_name();
INSERT INTO public.service_name_reviews(source_category,source_value) SELECT DISTINCT coalesce(service_category,'other-services'),service_subcategory FROM public.listings WHERE listing_type='service' AND service_subcategory LIKE 'custom:%' ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.review_other_service_name(_id uuid, _action text, _category text DEFAULT NULL, _service text DEFAULT NULL, _new_category text DEFAULT NULL, _new_service text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.service_name_reviews; c text; s text;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 SELECT * INTO r FROM public.service_name_reviews WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR r.status <> 'pending' THEN RAISE EXCEPTION 'Entry is no longer pending'; END IF;
 IF _action='reject' THEN
  UPDATE public.service_name_reviews SET status='rejected',reviewed_by=auth.uid(),reviewed_at=now() WHERE id=_id;
 ELSIF _action='approve' THEN
  c := _category;
  IF nullif(trim(_new_category),'') IS NOT NULL THEN
   c := 'approved-category-' || gen_random_uuid()::text;
   INSERT INTO public.service_catalog(slug,label) VALUES(c,trim(_new_category));
   INSERT INTO public.service_catalog(slug,label,parent_slug) VALUES(c || '-other','Other',c);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.service_catalog WHERE slug=c AND parent_slug IS NULL) THEN RAISE EXCEPTION 'Choose a valid category'; END IF;
  s := _service;
  IF nullif(trim(_new_service),'') IS NOT NULL THEN
   s := 'approved-service-' || gen_random_uuid()::text;
   INSERT INTO public.service_catalog(slug,label,parent_slug) VALUES(s,trim(_new_service),c);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.service_catalog WHERE slug=s AND parent_slug=c AND label <> 'Other') THEN RAISE EXCEPTION 'Choose a valid service in this category'; END IF;
  UPDATE public.listings SET service_category=c,service_subcategory=s WHERE listing_type='service' AND coalesce(service_category,'other-services')=r.source_category AND service_subcategory=r.source_value;
  UPDATE public.service_name_reviews SET status='approved',target_category=c,target_service=s,reviewed_by=auth.uid(),reviewed_at=now() WHERE id=_id;
 ELSE RAISE EXCEPTION 'Invalid review action'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.review_other_service_name(uuid,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_other_service_name(uuid,text,text,text,text,text) TO authenticated,service_role;