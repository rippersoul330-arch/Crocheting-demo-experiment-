-- =====================================================================
--  Loop & Ivy — Marketplace upgrade
--  Turns the single-seller shop into a multi-seller marketplace.
--
--  Run this in Supabase → SQL Editor AFTER schema.sql. It is additive and
--  idempotent-ish (safe to re-run).
--
--  What it does:
--   • Adds a `sellers` profile table (one row per signed-up seller).
--   • Adds `seller_id` to products so each product belongs to a seller.
--   • Adds an is_admin() helper + `is_admin` flag so YOU stay a super-admin.
--   • Rewrites Row Level Security so a seller can only manage THEIR OWN
--     products, while admins manage everything and the public reads what's
--     active. Platform submissions (orders/requests/subscribers) become
--     admin-only to read.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SELLERS profile (id == the auth user's id)
-- ---------------------------------------------------------------------
create table if not exists public.sellers (
  id            uuid primary key references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  shop_name     text not null,
  bio           text,
  location      text,
  contact_email text,
  avatar_url    text,
  is_admin      boolean not null default false,  -- platform owner/moderators
  approved      boolean not null default true    -- set false if you want to gate new shops
);

drop trigger if exists trg_sellers_updated on public.sellers;
create trigger trg_sellers_updated
  before update on public.sellers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Link products to a seller (null = "house" product managed by admin)
-- ---------------------------------------------------------------------
alter table public.products
  add column if not exists seller_id uuid references public.sellers(id) on delete cascade;

create index if not exists idx_products_seller on public.products (seller_id);

-- ---------------------------------------------------------------------
-- 3. Admin check (SECURITY DEFINER so it can read sellers without RLS
--    recursion). Returns true if the current user is a flagged admin.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.sellers s
    where s.id = auth.uid() and s.is_admin = true
  );
$$;

-- =====================================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================================
alter table public.sellers enable row level security;

-- SELLERS: shop profiles are publicly readable (to show "by <shop>");
-- a user manages only their own row; admins manage all.
drop policy if exists "sellers public read" on public.sellers;
create policy "sellers public read" on public.sellers
  for select using (true);

drop policy if exists "sellers manage own" on public.sellers;
create policy "sellers manage own" on public.sellers
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "sellers admin manage" on public.sellers;
create policy "sellers admin manage" on public.sellers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- PRODUCTS: replace the old "any authenticated user can manage everything"
-- policy with per-seller ownership + admin override. Public read unchanged.
drop policy if exists "products admin manage" on public.products;

drop policy if exists "products seller manage own" on public.products;
create policy "products seller manage own" on public.products
  for all to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

drop policy if exists "products admin manage all" on public.products;
create policy "products admin manage all" on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Platform submissions become admin-only to READ (inserts stay public so
-- the storefront forms keep working). This stops one seller from reading
-- another's orders / enquiries / subscribers.
drop policy if exists "custom admin read" on public.custom_requests;
create policy "custom admin read" on public.custom_requests
  for select to authenticated using (public.is_admin());

drop policy if exists "custom admin update" on public.custom_requests;
create policy "custom admin update" on public.custom_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "newsletter admin read" on public.newsletter_subscribers;
create policy "newsletter admin read" on public.newsletter_subscribers
  for select to authenticated using (public.is_admin());

drop policy if exists "orders admin read" on public.orders;
create policy "orders admin read" on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_items admin read" on public.order_items;
create policy "order_items admin read" on public.order_items
  for select to authenticated using (public.is_admin());

-- =====================================================================
-- 5. ONE-TIME OWNER SETUP  (edit the email, then run just this block)
-- ---------------------------------------------------------------------
-- Make yourself the super-admin. Replace the email with the one you use
-- to sign in to the admin dashboard, then run:
--
--   insert into public.sellers (id, shop_name, is_admin)
--   select id, 'Loop & Ivy (house)', true
--   from auth.users
--   where email = 'YOUR_OWNER_EMAIL_HERE'
--   on conflict (id) do update set is_admin = true;
--
-- (Optional) Assign the 12 seeded products to your house account so they
-- show a maker name and you manage them as a normal shop:
--
--   update public.products
--   set seller_id = (select id from public.sellers where is_admin = true limit 1)
--   where seller_id is null;
-- =====================================================================
