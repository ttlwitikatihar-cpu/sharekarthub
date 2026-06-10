
-- 1) Storage: listing-images scoped to user folder
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own listing images" ON storage.objects;

CREATE POLICY "Users can upload own listing images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own listing images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own listing images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2) Messages: only sender can update
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Senders can update own messages"
ON public.messages FOR UPDATE TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- 3) Reviews: require completed order
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
CREATE POLICY "Buyers with completed orders can review"
ON public.reviews FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.listing_id = reviews.listing_id
      AND o.buyer_id = auth.uid()
      AND o.status = 'completed'
  )
);

-- 4) Profiles: hide sensitive PII columns from API roles
REVOKE SELECT (phone, address, city, state, pincode, id_type, id_number, kyc_document_url)
  ON public.profiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_profile_private(_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  phone text,
  address text,
  city text,
  state text,
  pincode text,
  id_type text,
  id_number text,
  kyc_document_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  IF auth.uid() <> _user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT p.user_id, p.phone, p.address, p.city, p.state, p.pincode,
         p.id_type, p.id_number, p.kyc_document_url
  FROM public.profiles p
  WHERE p.user_id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_profile_private(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_private(uuid) TO authenticated;

-- 5) Orders: hide OTPs and verify server-side
REVOKE SELECT (handover_otp, return_otp) ON public.orders FROM anon, authenticated;

-- RPC: seller gets handover OTP, buyer gets return OTP
CREATE OR REPLACE FUNCTION public.get_order_otp(_order_id uuid, _which text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF _which = 'handover' AND auth.uid() = o.seller_id THEN
    RETURN o.handover_otp;
  ELSIF _which = 'return' AND auth.uid() = o.buyer_id THEN
    RETURN o.return_otp;
  ELSIF public.has_role(auth.uid(), 'admin') THEN
    IF _which = 'handover' THEN RETURN o.handover_otp; ELSE RETURN o.return_otp; END IF;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_order_otp(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_otp(uuid, text) TO authenticated;

-- RPC: verify handover OTP (called by buyer)
CREATE OR REPLACE FUNCTION public.verify_handover_otp(_order_id uuid, _otp text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF auth.uid() <> o.buyer_id THEN RETURN false; END IF;
  IF o.handover_otp IS NULL OR o.handover_otp <> _otp THEN RETURN false; END IF;
  UPDATE public.orders
    SET handover_confirmed = true,
        status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
        updated_at = now()
    WHERE id = _order_id;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.verify_handover_otp(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_handover_otp(uuid, text) TO authenticated;

-- RPC: verify return OTP (called by seller)
CREATE OR REPLACE FUNCTION public.verify_return_otp(_order_id uuid, _otp text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF auth.uid() <> o.seller_id THEN RETURN false; END IF;
  IF o.return_otp IS NULL OR o.return_otp <> _otp THEN RETURN false; END IF;
  UPDATE public.orders
    SET return_confirmed = true,
        status = 'completed',
        updated_at = now()
    WHERE id = _order_id;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.verify_return_otp(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_return_otp(uuid, text) TO authenticated;

-- 6) Trigger: auto-generate cryptographically secure OTPs server-side
CREATE OR REPLACE FUNCTION public.set_order_otps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_rental boolean;
BEGIN
  IF NEW.handover_otp IS NULL THEN
    NEW.handover_otp := lpad(((get_byte(gen_random_bytes(4),0)::bigint*16777216
                              + get_byte(gen_random_bytes(4),1)::bigint*65536
                              + get_byte(gen_random_bytes(4),2)::bigint*256
                              + get_byte(gen_random_bytes(4),3)::bigint) % 900000 + 100000)::text, 6, '0');
  END IF;
  SELECT (category = 'rent' OR listing_type = 'rent') INTO is_rental FROM public.listings WHERE id = NEW.listing_id;
  IF COALESCE(is_rental, false) AND NEW.return_otp IS NULL THEN
    NEW.return_otp := lpad(((get_byte(gen_random_bytes(4),0)::bigint*16777216
                            + get_byte(gen_random_bytes(4),1)::bigint*65536
                            + get_byte(gen_random_bytes(4),2)::bigint*256
                            + get_byte(gen_random_bytes(4),3)::bigint) % 900000 + 100000)::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_otps ON public.orders;
CREATE TRIGGER trg_set_order_otps
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_otps();
