
-- First drop old constraint
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_category_check;

-- Update existing data to new categories
UPDATE public.listings SET category = 'sell' WHERE category IN ('sale', 'service', 'other');

-- Now add new constraint
ALTER TABLE public.listings ADD CONSTRAINT listings_category_check CHECK (category IN ('sell', 'rent', 'donate'));

-- Add listing_type column (product or service)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'product';
ALTER TABLE public.listings ADD CONSTRAINT listings_type_check CHECK (listing_type IN ('product', 'service'));
