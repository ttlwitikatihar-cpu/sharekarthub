
-- Add stock notification trigger: notify seller when out of stock, notify buyers when back in stock
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
  
  -- Item back in stock
  IF OLD.status = 'out_of_stock' AND NEW.status = 'active' THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.user_id, 'Back in Stock', 'Your listing "' || NEW.title || '" is back in stock.', 'success');
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_listing_stock_change
  AFTER UPDATE ON public.listings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_stock_change();

-- Also add "other" to category check
ALTER TABLE public.listings DROP CONSTRAINT listings_category_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_category_check 
  CHECK (category = ANY (ARRAY['rent','sale','donate','service','other']));
