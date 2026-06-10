
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.profiles ORDER BY created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_profiles(_user_ids uuid[])
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.profiles WHERE user_id = ANY(_user_ids);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_get_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_profiles(uuid[]) TO authenticated;

-- Admin: read OTPs as needed (e.g., to assist disputes) via get_order_otp already supports admin.
