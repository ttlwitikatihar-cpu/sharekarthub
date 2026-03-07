
-- User activity tracking table
CREATE TABLE public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  details text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Users can insert their own activity
CREATE POLICY "Users can insert own activity" ON public.user_activity
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can view own activity  
CREATE POLICY "Users can view own activity" ON public.user_activity
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Admins can view all activity
CREATE POLICY "Admins can view all activity" ON public.user_activity
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix donation trigger to use listing_type instead of category for donate detection
CREATE OR REPLACE FUNCTION public.increment_donations_on_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    IF EXISTS (SELECT 1 FROM public.listings WHERE id = NEW.listing_id AND (category = 'donate' OR listing_type = 'donate')) THEN
      UPDATE public.profiles
      SET donations_count = COALESCE(donations_count, 0) + 1,
          reward_points = COALESCE(reward_points, 0) + 10
      WHERE user_id = NEW.seller_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_order_complete_donations ON public.orders;
CREATE TRIGGER on_order_complete_donations
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_donations_on_complete();
