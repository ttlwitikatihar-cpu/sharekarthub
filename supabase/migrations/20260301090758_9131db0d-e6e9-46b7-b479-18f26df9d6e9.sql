
-- 1. Update notify_on_order_change to restore stock on cancellation
CREATE OR REPLACE FUNCTION public.notify_on_order_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  listing_title TEXT;
BEGIN
  SELECT title INTO listing_title FROM public.listings WHERE id = NEW.listing_id;
  
  -- New order placed
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, message, type, order_id)
    VALUES (NEW.seller_id, 'New Order', 'You received a new order for "' || COALESCE(listing_title, 'an item') || '".', 'order', NEW.id);
    
    INSERT INTO public.notifications (user_id, title, message, type, order_id)
    VALUES (NEW.buyer_id, 'Order Placed', 'Your order for "' || COALESCE(listing_title, 'an item') || '" has been placed.', 'order', NEW.id);
  END IF;
  
  -- Status changes
  IF TG_OP = 'UPDATE' THEN
    -- Handover confirmed
    IF NEW.handover_confirmed = true AND OLD.handover_confirmed = false THEN
      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (NEW.seller_id, 'Handover Confirmed', 'Item "' || COALESCE(listing_title, '') || '" handover has been verified.', 'success', NEW.id);
      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (NEW.buyer_id, 'Handover Confirmed', 'Item "' || COALESCE(listing_title, '') || '" handover has been verified.', 'success', NEW.id);
    END IF;
    
    -- Return confirmed
    IF NEW.return_confirmed = true AND OLD.return_confirmed = false THEN
      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (NEW.seller_id, 'Return Confirmed', 'Item "' || COALESCE(listing_title, '') || '" has been returned.', 'success', NEW.id);
      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (NEW.buyer_id, 'Return Confirmed', 'Item "' || COALESCE(listing_title, '') || '" has been returned.', 'success', NEW.id);
    END IF;
    
    -- Cancelled - RESTORE STOCK
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      -- Restore listing quantity
      UPDATE public.listings
      SET quantity = quantity + NEW.quantity,
          status = CASE WHEN status = 'out_of_stock' THEN 'active' ELSE status END
      WHERE id = NEW.listing_id;

      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (NEW.buyer_id, 'Order Cancelled', 'Order for "' || COALESCE(listing_title, '') || '" has been cancelled.', 'destructive', NEW.id);
      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (NEW.seller_id, 'Order Cancelled', 'Order for "' || COALESCE(listing_title, '') || '" has been cancelled.', 'destructive', NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Update listings RLS to show out_of_stock items
DROP POLICY IF EXISTS "Active listings are viewable by everyone" ON public.listings;
CREATE POLICY "Listings are viewable by everyone" ON public.listings FOR SELECT
USING (status IN ('active', 'out_of_stock') OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
