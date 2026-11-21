-- Smart Deal: product stock availability
-- Run once in Supabase SQL Editor as project owner.

alter table public.shop_products
  add column if not exists stock_status text not null default 'in_stock';

alter table public.shop_products
  drop constraint if exists shop_products_stock_status_check;

alter table public.shop_products
  add constraint shop_products_stock_status_check
  check (stock_status in ('in_stock', 'low_stock', 'out_of_stock'));

create or replace view public.public_shop_prices
with (security_invoker = true)
as
select
  shop_products.id,
  shop_products.shop_id,
  shop_products.product_name,
  shop_products.category,
  shop_products.unit,
  shop_products.price,
  shop_products.stock_status,
  shop_products.updated_at,
  shops.shop_name,
  shops.area
from public.shop_products
join public.shops on shops.id = shop_products.shop_id
where shops.status = 'approved';

revoke all on public.public_shop_prices from public;
grant select on public.public_shop_prices to anon, authenticated;

notify pgrst, 'reload schema';
