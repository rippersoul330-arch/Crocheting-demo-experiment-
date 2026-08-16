-- Update the 12 demo products to realistic INR prices (paise = rupees x 100).
-- Run in Supabase -> SQL Editor. Safe to re-run.
update public.products set price_cents = 450000, compare_at_cents = 580000 where slug = 'hearth-granny-throw';
update public.products set price_cents = 380000, compare_at_cents = null   where slug = 'meadow-oversized-cardigan';
update public.products set price_cents = 160000, compare_at_cents = null   where slug = 'market-day-tote';
update public.products set price_cents = 90000,  compare_at_cents = null   where slug = 'storm-cloud-beanie';
update public.products set price_cents = 85000,  compare_at_cents = null   where slug = 'willow-hanging-planter';
update public.products set price_cents = 110000, compare_at_cents = null   where slug = 'honey-bear-amigurumi';
update public.products set price_cents = 240000, compare_at_cents = null   where slug = 'dawn-ripple-baby-blanket';
update public.products set price_cents = 140000, compare_at_cents = null   where slug = 'terracotta-cushion-cover';
update public.products set price_cents = 70000,  compare_at_cents = null   where slug = 'coastal-doily-coasters';
update public.products set price_cents = 150000, compare_at_cents = 190000 where slug = 'fireside-chunky-scarf';
update public.products set price_cents = 200000, compare_at_cents = null   where slug = 'juniper-crossbody-bag';
update public.products set price_cents = 75000,  compare_at_cents = null   where slug = 'cloud-nine-baby-booties';
