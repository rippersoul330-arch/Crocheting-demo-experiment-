-- Payment columns for orders (run in Supabase SQL Editor).
-- Links a Razorpay order/payment to our order row so the webhook can mark it paid.
alter table public.orders add column if not exists razorpay_order_id   text;
alter table public.orders add column if not exists razorpay_payment_id text;
create index if not exists idx_orders_rzp on public.orders (razorpay_order_id);
