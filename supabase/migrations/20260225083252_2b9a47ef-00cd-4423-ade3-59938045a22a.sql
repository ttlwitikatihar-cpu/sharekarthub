
-- Replace the overly permissive insert policy with a restricted one
DROP POLICY "System can insert notifications" ON public.notifications;

-- Only allow inserts from authenticated users for their own notifications (triggers use SECURITY DEFINER so bypass RLS)
CREATE POLICY "No direct inserts on notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (false);
