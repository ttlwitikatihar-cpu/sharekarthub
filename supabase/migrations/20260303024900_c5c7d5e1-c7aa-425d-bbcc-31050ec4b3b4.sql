
-- Ensure all required triggers exist (re-create if missing)

-- 1. Donation leaderboard trigger
DROP TRIGGER IF EXISTS trigger_increment_donations ON public.orders;
CREATE TRIGGER trigger_increment_donations
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_donations_on_complete();

-- 2. Order notification trigger
DROP TRIGGER IF EXISTS trigger_notify_on_order_change ON public.orders;
CREATE TRIGGER trigger_notify_on_order_change
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_order_change();

-- 3. Stock change notification trigger
DROP TRIGGER IF EXISTS trigger_notify_stock_change ON public.listings;
CREATE TRIGGER trigger_notify_stock_change
  AFTER UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_stock_change();

-- 4. Decrement listing quantity on new order
DROP TRIGGER IF EXISTS trigger_decrement_listing_quantity ON public.orders;
CREATE TRIGGER trigger_decrement_listing_quantity
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_listing_quantity();

-- 5. Updated_at triggers
DROP TRIGGER IF EXISTS trigger_update_listings_updated_at ON public.listings;
CREATE TRIGGER trigger_update_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_orders_updated_at ON public.orders;
CREATE TRIGGER trigger_update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
