
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  order_id UUID REFERENCES public.orders(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow service role / triggers to insert
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Function to auto-cancel expired orders and notify
CREATE OR REPLACE FUNCTION public.cancel_expired_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    
    -- Restore stock
    UPDATE public.listings SET quantity = quantity + 1,
      status = CASE WHEN status = 'out_of_stock' THEN 'active' ELSE status END
    WHERE id = expired_order.listing_id;
    
    -- Notify buyer
    INSERT INTO public.notifications (user_id, title, message, type, order_id)
    VALUES (expired_order.buyer_id, 'Order Expired', 'Your pending order has been automatically cancelled after 48 hours.', 'warning', expired_order.id);
    
    -- Notify seller
    INSERT INTO public.notifications (user_id, title, message, type, order_id)
    VALUES (expired_order.seller_id, 'Order Expired', 'A pending order has been automatically cancelled after 48 hours.', 'warning', expired_order.id);
  END LOOP;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Trigger function to create notifications on order events
CREATE OR REPLACE FUNCTION public.notify_on_order_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    
    -- Cancelled
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (NEW.buyer_id, 'Order Cancelled', 'Order for "' || COALESCE(listing_title, '') || '" has been cancelled.', 'destructive', NEW.id);
      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (NEW.seller_id, 'Order Cancelled', 'Order for "' || COALESCE(listing_title, '') || '" has been cancelled.', 'destructive', NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_order_changes
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_order_change();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
