-- =====================================================================
-- Loop & Ivy — Product reviews
-- ---------------------------------------------------------------------
-- Adds a `reviews` table so real buyers can leave a star rating + comment
-- on a product. Reviews are keyed by the product SLUG (the id the
-- storefront uses). Run this AFTER schema.sql (and marketplace.sql if you
-- want admin moderation via is_admin()).
--
-- This script is additive and safe to re-run.
-- =====================================================================

create extension if not exists "pgcrypto";

create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  product_slug  text not null,
  reviewer_name text not null,
  rating        integer not null check (rating between 1 and 5),
  comment       text,
  user_id       uuid,                       -- set when a signed-in buyer reviews
  approved      boolean not null default true,  -- flip default to false to moderate first
  created_at    timestamptz not null default now()
);

create index if not exists idx_reviews_product_slug on public.reviews (product_slug);
create index if not exists idx_reviews_created on public.reviews (created_at desc);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.reviews enable row level security;

-- Anyone can read approved reviews (needed to display them on the shop).
drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read" on public.reviews
  for select using (approved = true);

-- Anyone (guest or signed-in) can post a review. Basic validation is
-- enforced in the check so junk rows can't be inserted.
drop policy if exists "reviews insert anon" on public.reviews;
create policy "reviews insert anon" on public.reviews
  for insert to anon, authenticated
  with check (
    rating between 1 and 5
    and char_length(reviewer_name) between 1 and 80
    and (comment is null or char_length(comment) <= 2000)
  );

-- ---------------------------------------------------------------------
-- Admin moderation (optional — requires public.is_admin() from marketplace.sql)
-- If you did NOT run marketplace.sql, delete the three policies below.
-- They let a super-admin read every review (approved or not), approve /
-- edit, and delete reviews.
-- ---------------------------------------------------------------------
drop policy if exists "reviews admin read" on public.reviews;
create policy "reviews admin read" on public.reviews
  for select to authenticated using (public.is_admin());

drop policy if exists "reviews admin update" on public.reviews;
create policy "reviews admin update" on public.reviews
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "reviews admin delete" on public.reviews;
create policy "reviews admin delete" on public.reviews
  for delete to authenticated using (public.is_admin());

-- Done. Buyers can now leave reviews from the product quick-view.
