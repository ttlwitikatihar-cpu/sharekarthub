
-- 1. Increment donations_count when a donate order is completed
CREATE OR REPLACE FUNCTION public.increment_donations_on_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Check if this order is for a donate listing
    IF EXISTS (SELECT 1 FROM public.listings WHERE id = NEW.listing_id AND category = 'donate') THEN
      UPDATE public.profiles
      SET donations_count = COALESCE(donations_count, 0) + 1,
          reward_points = COALESCE(reward_points, 0) + 10
      WHERE user_id = NEW.seller_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_order_complete_donations
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.increment_donations_on_complete();

-- 2. Update notify_stock_change to warn when stock is running low (<=3)
CREATE OR REPLACE FUNCTION public.notify_stock_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Item just went out of stock
  IF NEW.status = 'out_of_stock' AND OLD.status != 'out_of_stock' THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.user_id, 'Out of Stock', 'Your listing "' || NEW.title || '" is now out of stock.', 'warning');
  END IF;

  -- Stock running low (quantity <= 3 and was previously higher)
  IF NEW.quantity <= 3 AND NEW.quantity > 0 AND OLD.quantity > 3 AND NEW.status = 'active' THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.user_id, 'Low Stock Alert', 'Your listing "' || NEW.title || '" has only ' || NEW.quantity || ' left. Consider refilling stock.', 'warning');
  END IF;

  -- Item back in stock
  IF OLD.status = 'out_of_stock' AND NEW.status = 'active' THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.user_id, 'Back in Stock', 'Your listing "' || NEW.title || '" is back in stock.', 'success');
  END IF;

  RETURN NEW;
END;
$function$;
