CREATE OR REPLACE FUNCTION public.set_order_otps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_rental boolean;
BEGIN
  IF NEW.handover_otp IS NULL THEN
    NEW.handover_otp := lpad(((floor(random() * 900000) + 100000))::int::text, 6, '0');
  END IF;
  SELECT (category = 'rent' OR listing_type = 'rent') INTO is_rental FROM public.listings WHERE id = NEW.listing_id;
  IF COALESCE(is_rental, false) AND NEW.return_otp IS NULL THEN
    NEW.return_otp := lpad(((floor(random() * 900000) + 100000))::int::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$function$;