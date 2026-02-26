
-- Fix status check constraint to include 'out_of_stock'
ALTER TABLE public.listings DROP CONSTRAINT listings_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_status_check 
  CHECK (status = ANY (ARRAY['active','rented','sold','donated','inactive','flagged','out_of_stock']));

-- Fix category check constraint to include 'service'
ALTER TABLE public.listings DROP CONSTRAINT listings_category_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_category_check 
  CHECK (category = ANY (ARRAY['rent','sale','donate','service']));

-- Add quantity column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

-- Update decrement function to handle multiple quantities
CREATE OR REPLACE FUNCTION public.decrement_listing_quantity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
