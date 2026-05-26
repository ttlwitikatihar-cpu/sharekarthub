
-- 1) Fix public bucket listing: narrow SELECT policy so anon can only access via direct URL/known path, not enumerate
DROP POLICY IF EXISTS "Anyone can view listing images" ON storage.objects;
-- Public bucket already serves files via public CDN URL without needing a SELECT policy on storage.objects.
-- Keep a restricted policy only for authenticated owners to manage their own files.
CREATE POLICY "Owners can view own listing images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2) Revoke EXECUTE on SECURITY DEFINER functions from public/anon/authenticated.
-- These functions are only used by triggers or invoked via RLS policies (has_role) and should not be callable via PostgREST.
REVOKE EXECUTE ON FUNCTION public.decrement_listing_quantity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_order_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_donations_on_complete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_stock_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_seller_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_expired_orders() FROM PUBLIC, anon, authenticated;
-- has_role is used inside RLS policies (runs as the policy owner), so revoking EXECUTE from anon/authenticated is safe.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
