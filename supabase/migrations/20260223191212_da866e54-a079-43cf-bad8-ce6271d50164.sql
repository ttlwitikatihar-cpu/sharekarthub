-- Add quantity column to listings
ALTER TABLE public.listings ADD COLUMN quantity integer NOT NULL DEFAULT 1;

-- Create function to decrement quantity on order creation
CREATE OR REPLACE FUNCTION public.decrement_listing_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.listings
  SET quantity = quantity - 1,
      status = CASE WHEN quantity - 1 <= 0 THEN 'out_of_stock' ELSE status END
  WHERE id = NEW.listing_id AND quantity > 0;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item is out of stock';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-decrement on order insert
CREATE TRIGGER decrement_quantity_on_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.decrement_listing_quantity();