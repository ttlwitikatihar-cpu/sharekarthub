
-- Add shop_name to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shop_name text;
