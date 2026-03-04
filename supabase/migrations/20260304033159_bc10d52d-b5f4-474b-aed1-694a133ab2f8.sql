
-- Fix: drop and recreate triggers that may already exist
DROP TRIGGER IF EXISTS trigger_increment_donations ON public.orders;
CREATE TRIGGER trigger_increment_donations
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.increment_donations_on_complete();

DROP TRIGGER IF EXISTS trigger_decrement_stock ON public.orders;
CREATE TRIGGER trigger_decrement_stock
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.decrement_listing_quantity();

DROP TRIGGER IF EXISTS trigger_notify_stock ON public.listings;
CREATE TRIGGER trigger_notify_stock
AFTER UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.notify_stock_change();

DROP TRIGGER IF EXISTS trigger_order_notifications ON public.orders;
CREATE TRIGGER trigger_order_notifications
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_change();

DROP TRIGGER IF EXISTS trigger_update_listings_timestamp ON public.listings;
CREATE TRIGGER trigger_update_listings_timestamp
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_orders_timestamp ON public.orders;
CREATE TRIGGER trigger_update_orders_timestamp
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_profiles_timestamp ON public.profiles;
CREATE TRIGGER trigger_update_profiles_timestamp
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_conversations_timestamp ON public.conversations;
CREATE TRIGGER trigger_update_conversations_timestamp
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Allow admins to update profiles (for banning etc)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update orders
DROP POLICY IF EXISTS "Order participants can update" ON public.orders;
CREATE POLICY "Order participants can update"
ON public.orders FOR UPDATE
USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role));
