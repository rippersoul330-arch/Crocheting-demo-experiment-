-- =====================================================================
--  Loop & Ivy — Supabase schema
--  Run this in your Supabase project:  Dashboard → SQL Editor → New query
--  → paste this whole file → Run.
--
--  It is idempotent-ish: safe to re-run (uses IF NOT EXISTS / drops policies
--  before recreating them). It creates the tables, security rules, an
--  auto-updated timestamp, a storage bucket for product photos, and seeds
--  your 12 starter products.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0.  Extensions & helpers
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";           -- for gen_random_uuid()

-- keeps an `updated_at` column fresh on every UPDATE
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;


-- ---------------------------------------------------------------------
-- 1.  PRODUCTS
--     Prices are stored in integer cents to avoid floating-point money.
--     `theme` is JSON (bg/yarn/accent) so the site can still render the
--     hand-drawn SVG art until you upload real photos into image_url.
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  slug          text unique not null,
  name          text not null,
  category      text not null,               -- blankets | sweaters | bags | accessories | home | baby | amigurumi
  motif         text,                         -- drives the SVG art (blanket/sweater/bag/hat/toy/plant/coaster/scarf/cushion/booties)
  theme         jsonb,                        -- { "bg": "#c07a52", "yarn": "#f4e7d6", "accent": "#8f4c2e" }
  blurb         text,
  materials     text[] default '{}',          -- bullet list shown on the product
  price_cents   integer not null check (price_cents >= 0),
  compare_at_cents integer check (compare_at_cents >= 0),  -- the "old"/was price
  tag           text,                         -- Bestseller | New | Sale | Handmade | "Set of 4" ...
  rating        numeric(2,1) default 5.0 check (rating >= 0 and rating <= 5),
  review_count  integer default 0 check (review_count >= 0),
  image_url     text,                         -- optional: URL of a real product photo
  featured      boolean not null default false,
  sort_order    integer not null default 0,   -- controls ordering on the shop grid
  stock         integer,                      -- null = made to order (unlimited)
  active        boolean not null default true -- hidden from the store when false
);

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated
  before update on public.products
  for each row execute function public.set_updated_at();

create index if not exists idx_products_active_sort on public.products (active, sort_order);
create index if not exists idx_products_category      on public.products (category);


-- ---------------------------------------------------------------------
-- 2.  CUSTOM ORDER REQUESTS  (the Custom Orders / commissions form)
-- ---------------------------------------------------------------------
create table if not exists public.custom_requests (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null,
  email        text not null,
  project_type text,
  budget       text,
  details      text not null,
  status       text not null default 'new'   -- new | quoted | in_progress | done | declined
);
create index if not exists idx_custom_requests_created on public.custom_requests (created_at desc);


-- ---------------------------------------------------------------------
-- 3.  NEWSLETTER SUBSCRIBERS
-- ---------------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email      text not null unique
);


-- ---------------------------------------------------------------------
-- 4.  ORDERS + ORDER ITEMS
--     A checkout writes one `orders` row plus one `order_items` row per
--     product. Item price/name are snapshotted so historical orders stay
--     correct even if a product later changes.
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  customer_name  text not null,
  customer_email text not null,
  shipping       jsonb,                        -- { address, city, postcode, country, ... }
  subtotal_cents integer not null default 0,
  shipping_cents integer not null default 0,
  total_cents    integer not null default 0,
  currency       text not null default 'usd',
  status         text not null default 'pending', -- pending | paid | shipped | cancelled | refunded
  stripe_session_id text,                       -- filled in once Stripe is wired up
  notes          text
);

drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated
  before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  product_id       uuid references public.products(id) on delete set null,
  product_name     text not null,               -- snapshot
  unit_price_cents integer not null,            -- snapshot
  quantity         integer not null default 1 check (quantity > 0)
);
create index if not exists idx_order_items_order on public.order_items (order_id);


-- =====================================================================
--  5.  ROW LEVEL SECURITY (RLS)
--  Rule of thumb:
--    • The public site uses the ANON key → can only do what these policies allow.
--    • You (signed in via Supabase Auth) are "authenticated" → full manage access.
-- =====================================================================
alter table public.products               enable row level security;
alter table public.custom_requests        enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;

-- ---- PRODUCTS: anyone can read active products; only you can write ----
drop policy if exists "products public read"  on public.products;
create policy "products public read" on public.products
  for select using (active = true);

drop policy if exists "products admin manage" on public.products;
create policy "products admin manage" on public.products
  for all to authenticated using (true) with check (true);

-- ---- CUSTOM REQUESTS: anyone can submit; only you can read/manage ----
drop policy if exists "custom insert anon" on public.custom_requests;
create policy "custom insert anon" on public.custom_requests
  for insert to anon, authenticated with check (true);

drop policy if exists "custom admin read" on public.custom_requests;
create policy "custom admin read" on public.custom_requests
  for select to authenticated using (true);

drop policy if exists "custom admin update" on public.custom_requests;
create policy "custom admin update" on public.custom_requests
  for update to authenticated using (true) with check (true);

-- ---- NEWSLETTER: anyone can subscribe; only you can read ----
drop policy if exists "newsletter insert anon" on public.newsletter_subscribers;
create policy "newsletter insert anon" on public.newsletter_subscribers
  for insert to anon, authenticated with check (true);

drop policy if exists "newsletter admin read" on public.newsletter_subscribers;
create policy "newsletter admin read" on public.newsletter_subscribers
  for select to authenticated using (true);

-- ---- ORDERS: anyone can create an order; only you can read/manage ----
--  (When you add Stripe, prefer creating orders from a trusted Edge
--   Function with the service-role key and tightening this further.)
drop policy if exists "orders insert anon" on public.orders;
create policy "orders insert anon" on public.orders
  for insert to anon, authenticated with check (true);

drop policy if exists "orders admin read" on public.orders;
create policy "orders admin read" on public.orders
  for select to authenticated using (true);

drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders
  for update to authenticated using (true) with check (true);

drop policy if exists "order_items insert anon" on public.order_items;
create policy "order_items insert anon" on public.order_items
  for insert to anon, authenticated with check (true);

drop policy if exists "order_items admin read" on public.order_items;
create policy "order_items admin read" on public.order_items
  for select to authenticated using (true);


-- =====================================================================
--  6.  STORAGE BUCKET for product photos (public read)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product images admin write" on storage.objects;
create policy "product images admin write" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images');

drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images');

drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images');


-- =====================================================================
--  7.  SEED DATA — your 12 starter products
--      (mirrors assets/js/products.js so the live site looks identical)
-- =====================================================================
insert into public.products
  (slug, name, category, motif, theme, blurb, materials, price_cents, compare_at_cents, tag, rating, review_count, featured, sort_order)
values
  ('hearth-granny-throw','Hearth Granny Throw','blankets','blanket',
   '{"bg":"#c07a52","yarn":"#f4e7d6","accent":"#8f4c2e"}',
   'A generous granny-square throw in hand-dyed wool, warm enough to live under all winter.',
   array['Hand-dyed merino & lambswool','130 x 170 cm','Made to order in 2-3 weeks','Plant-dyed, plastic-free'],
   18900, 23500, 'Bestseller', 4.9, 214, true, 1),

  ('meadow-oversized-cardigan','Meadow Oversized Cardigan','sweaters','sweater',
   '{"bg":"#7f8c6d","yarn":"#eef1e3","accent":"#57633f"}',
   'A slouchy, open-front cardigan with balloon sleeves in soft organic cotton.',
   array['100% organic cotton','Relaxed unisex fit','Sizes XS-XXL','Hand-crocheted, one at a time'],
   16800, null, 'New', 4.8, 96, true, 2),

  ('market-day-tote','Market Day Tote','bags','bag',
   '{"bg":"#c69b4e","yarn":"#f6ecd6","accent":"#8f6a26"}',
   'A roomy, structured tote with a snug weave that holds its shape and your whole market haul.',
   array['Recycled cotton cord','Reinforced base','38 x 40 cm','Interior pocket'],
   7400, null, 'Bestseller', 4.9, 341, true, 3),

  ('storm-cloud-beanie','Storm Cloud Beanie','accessories','hat',
   '{"bg":"#6f7f88","yarn":"#e6eef1","accent":"#455860"}',
   'A ribbed slouch beanie topped with a hand-tied pom, in heathered alpaca blend.',
   array['Baby alpaca blend','Fleece-lined band','One size, stretch fit'],
   4200, null, null, 4.7, 128, false, 4),

  ('willow-hanging-planter','Willow Hanging Planter','home','plant',
   '{"bg":"#5f7256","yarn":"#e8efdf","accent":"#3c4c34"}',
   'A macrame-meets-crochet hanger that cradles your favourite trailing plant.',
   array['Natural jute & cotton','Fits 12-16 cm pots','Adjustable drop','Pot & plant not included'],
   3800, null, 'New', 4.8, 67, false, 5),

  ('honey-bear-amigurumi','Honey Bear Amigurumi','amigurumi','toy',
   '{"bg":"#c69b4e","yarn":"#f6ecd6","accent":"#8f6a26"}',
   'A weighted little bear with embroidered features and jointed arms - a keepsake from day one.',
   array['Organic cotton, safety-tested','22 cm tall','Machine-washable','CE toy-safety certified'],
   4600, null, 'Handmade', 5.0, 189, false, 6),

  ('dawn-ripple-baby-blanket','Dawn Ripple Baby Blanket','baby','blanket',
   '{"bg":"#d3a486","yarn":"#f6eae0","accent":"#a86a4c"}',
   'A feather-soft ripple blanket in gentle pastels - the pram blanket that becomes an heirloom.',
   array['OEKO-TEX baby cotton','80 x 100 cm','Hypoallergenic','Gift-wrapped free'],
   8800, null, 'Bestseller', 4.9, 152, true, 7),

  ('terracotta-cushion-cover','Terracotta Cushion Cover','home','cushion',
   '{"bg":"#c67b7b","yarn":"#f6e3e3","accent":"#984f4f"}',
   'A textured bobble-stitch cushion cover that adds warmth to any sofa or reading nook.',
   array['Chunky recycled cotton','45 x 45 cm','Hidden button back','Insert not included'],
   5800, null, null, 4.6, 74, false, 8),

  ('coastal-doily-coasters','Coastal Doily Coasters','home','coaster',
   '{"bg":"#6b7f96","yarn":"#e6edf4","accent":"#43566b"}',
   'A set of four lacy coasters that dress up the table and soak up the rings.',
   array['Waxed cotton thread','Set of 4, 11 cm','Wipe clean','Lie perfectly flat'],
   2800, null, 'Set of 4', 4.7, 58, false, 9),

  ('fireside-chunky-scarf','Fireside Chunky Scarf','accessories','scarf',
   '{"bg":"#c07a52","yarn":"#f4e7d6","accent":"#8f4c2e"}',
   'An extra-long, extra-chunky scarf you can loop three times and still have length to spare.',
   array['Wool-alpaca blend','24 x 200 cm','Fringed ends','Naturally water-repellent'],
   6400, 7900, 'Sale', 4.8, 133, false, 10),

  ('juniper-crossbody-bag','Juniper Crossbody Bag','bags','bag',
   '{"bg":"#5f7256","yarn":"#e8efdf","accent":"#3c4c34"}',
   'A tidy crossbody in a tight moss-stitch weave with an adjustable leather strap.',
   array['Cotton & vegetable-tanned leather','Magnetic closure','24 x 18 cm','Lined interior'],
   8200, null, 'New', 4.9, 41, false, 11),

  ('cloud-nine-baby-booties','Cloud Nine Baby Booties','baby','booties',
   '{"bg":"#8b6a7d","yarn":"#f2e6ee","accent":"#5f4453"}',
   'The softest first shoes - tiny crocheted booties with a stay-on ankle tie.',
   array['Organic merino','0-12 month sizes','Non-slip sole option','Comes gift-boxed'],
   3200, null, 'Handmade', 5.0, 97, false, 12)
on conflict (slug) do nothing;

-- Done! Next: Dashboard → Table Editor to see your rows,
-- and Project Settings → API to grab your Project URL + anon key.
