-- Smart Deal: keep a record whenever a shop adds or changes a product price.
create table if not exists public.shop_price_history (
  id uuid primary key default gen_random_uuid(),
  shop_product_id uuid references public.shop_products(id) on delete set null,
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_name text not null,
  unit text not null,
  price numeric(10,2) not null check (price > 0),
  recorded_at timestamptz not null default now()
);

create index if not exists shop_price_history_shop_product_idx
on public.shop_price_history(shop_id, product_name, unit, recorded_at);

alter table public.shop_price_history enable row level security;
revoke all on public.shop_price_history from anon, authenticated;
grant select on public.shop_price_history to anon, authenticated;

drop policy if exists "Public can read history for approved shops" on public.shop_price_history;
create policy "Public can read history for approved shops"
on public.shop_price_history for select to anon, authenticated
using (exists (
  select 1 from public.shops
  where shops.id = shop_price_history.shop_id
    and shops.status = 'approved'
));

create or replace function public.record_shop_price_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.shop_price_history (shop_product_id, shop_id, product_name, unit, price)
    values (new.id, new.shop_id, new.product_name, new.unit, new.price);
  elsif new.price is distinct from old.price then
    insert into public.shop_price_history (shop_product_id, shop_id, product_name, unit, price)
    values (new.id, new.shop_id, new.product_name, new.unit, new.price);
  end if;
  return new;
end;
$$;

drop trigger if exists shop_products_record_price_history on public.shop_products;
create trigger shop_products_record_price_history
after insert or update of price on public.shop_products
for each row execute function public.record_shop_price_history();

-- Add a starting snapshot for products that already exist before this feature.
insert into public.shop_price_history (shop_product_id, shop_id, product_name, unit, price, recorded_at)
select p.id, p.shop_id, p.product_name, p.unit, p.price, p.updated_at
from public.shop_products p
where not exists (
  select 1 from public.shop_price_history h where h.shop_product_id = p.id
);

create or replace view public.public_price_history
with (security_invoker = true)
as
select
  h.id,
  h.shop_product_id,
  h.shop_id,
  h.product_name,
  h.unit,
  h.price,
  h.recorded_at,
  s.shop_name,
  s.area
from public.shop_price_history h
join public.shops s on s.id = h.shop_id
where s.status = 'approved';

revoke all on public.public_price_history from public;
grant select on public.public_price_history to anon, authenticated;

notify pgrst, 'reload schema';
