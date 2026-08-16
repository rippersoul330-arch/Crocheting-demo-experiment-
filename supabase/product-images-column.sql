-- Add a gallery of image URLs to products (run in Supabase -> SQL Editor).
-- The first URL in `images` is the main photo. `image_url` is kept in sync
-- with images[0] for backward compatibility.
alter table public.products add column if not exists images text[] default '{}';
