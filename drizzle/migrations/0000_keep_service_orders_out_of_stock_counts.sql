CREATE OR REPLACE FUNCTION public.decrement_listing_quantity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  listing_kind text;
BEGIN
  SELECT listing_type INTO listing_kind
  FROM public.listings
  WHERE id = NEW.listing_id;

  IF listing_kind = 'service' THEN
    RETURN NEW;
  END IF;

  UPDATE public.listings
  SET quantity = quantity - NEW.quantity,
      status = CASE WHEN quantity - NEW.quantity <= 0 THEN 'out_of_stock' ELSE status END
  WHERE id = NEW.listing_id AND quantity >= NEW.quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not enough stock available';
  END IF;

  RETURN NEW;
END;
$function$;

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

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, message, type, order_id)
    VALUES (NEW.seller_id, 'New Order', 'You received a new order for "' || COALESCE(listing_title, 'an item') || '".', 'order', NEW.id);

    INSERT INTO public.notifications (user_id, title, message, type, order_id)
    VALUES (NEW.buyer_id, 'Order Placed', 'Your order for "' || COALESCE(listing_title, 'an item') || '" has been placed.', 'order', NEW.id);
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.handover_confirmed = true AND OLD.handover_confirmed = false THEN
      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (NEW.seller_id, 'Handover Confirmed', 'Item "' || COALESCE(listing_title, '') || '" handover has been verified.', 'success', NEW.id);
      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (NEW.buyer_id, 'Handover Confirmed', 'Item "' || COALESCE(listing_title, '') || '" handover has been verified.', 'success', NEW.id);
    END IF;

    IF NEW.return_confirmed = true AND OLD.return_confirmed = false THEN
      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (NEW.seller_id, 'Return Confirmed', 'Item "' || COALESCE(listing_title, '') || '" has been returned.', 'success', NEW.id);
      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (NEW.buyer_id, 'Return Confirmed', 'Item "' || COALESCE(listing_title, '') || '" has been returned.', 'success', NEW.id);
    END IF;

    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      UPDATE public.listings
      SET quantity = quantity + NEW.quantity,
          status = CASE WHEN status = 'out_of_stock' THEN 'active' ELSE status END
      WHERE id = NEW.listing_id AND listing_type <> 'service';

      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (NEW.buyer_id, 'Order Cancelled', 'Order for "' || COALESCE(listing_title, '') || '" has been cancelled.', 'destructive', NEW.id);
      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (NEW.seller_id, 'Order Cancelled', 'Order for "' || COALESCE(listing_title, '') || '" has been cancelled.', 'destructive', NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_expired_orders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  expired_count integer;
  expired_order RECORD;
BEGIN
  FOR expired_order IN
    SELECT id, buyer_id, seller_id, listing_id
    FROM public.orders
    WHERE status = 'pending'
      AND created_at < now() - interval '48 hours'
  LOOP
    UPDATE public.orders SET status = 'cancelled', updated_at = now() WHERE id = expired_order.id;

    UPDATE public.listings SET quantity = quantity + 1,
      status = CASE WHEN status = 'out_of_stock' THEN 'active' ELSE status END
    WHERE id = expired_order.listing_id AND listing_type <> 'service';

    INSERT INTO public.notifications (user_id, title, message, type, order_id)
    VALUES (expired_order.buyer_id, 'Order Expired', 'Your pending order has been automatically cancelled after 48 hours.', 'warning', expired_order.id);

    INSERT INTO public.notifications (user_id, title, message, type, order_id)
    VALUES (expired_order.seller_id, 'Order Expired', 'A pending order has been automatically cancelled after 48 hours.', 'warning', expired_order.id);
  END LOOP;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$function$;