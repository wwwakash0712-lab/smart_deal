-- Smart Deal: shop owner accounts and live product prices
-- Run this in Supabase SQL Editor as the project owner.

create table if not exists public.shop_owner_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  shop_id uuid not null unique references public.shops(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.shop_owner_users enable row level security;

grant select on table public.shop_owner_users to authenticated;

drop policy if exists "Owners can read their own shop assignment" on public.shop_owner_users;
create policy "Owners can read their own shop assignment"
on public.shop_owner_users
for select
to authenticated
using (user_id = (select auth.uid()));

-- Let an assigned owner read only their own approved shop details.
drop policy if exists "Owners can read their assigned shop" on public.shops;
create policy "Owners can read their assigned shop"
on public.shops
for select
to authenticated
using (
  exists (
    select 1
    from public.shop_owner_users
    where shop_owner_users.shop_id = shops.id
      and shop_owner_users.user_id = (select auth.uid())
  )
);

create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_name text not null check (length(trim(product_name)) > 0),
  category text not null default 'Other',
  unit text not null check (length(trim(unit)) > 0),
  price numeric(10,2) not null check (price > 0),
  updated_at timestamptz not null default now()
);

create index if not exists shop_products_shop_id_idx
on public.shop_products(shop_id);

alter table public.shop_products enable row level security;

revoke all on table public.shop_products from anon, authenticated;
grant select on table public.shop_products to anon, authenticated;
grant insert, update, delete on table public.shop_products to authenticated;

drop policy if exists "Public can read prices from approved shops" on public.shop_products;
create policy "Public can read prices from approved shops"
on public.shop_products
for select
to anon, authenticated
using (
  exists (
    select 1 from public.shops
    where shops.id = shop_products.shop_id
      and shops.status = 'approved'
  )
);

drop policy if exists "Assigned owners can add prices to their shop" on public.shop_products;
create policy "Assigned owners can add prices to their shop"
on public.shop_products
for insert
to authenticated
with check (
  exists (
    select 1 from public.shop_owner_users
    join public.shops on shops.id = shop_owner_users.shop_id
    where shop_owner_users.user_id = (select auth.uid())
      and shop_owner_users.shop_id = shop_products.shop_id
      and shops.status = 'approved'
  )
);

drop policy if exists "Assigned owners can update prices in their shop" on public.shop_products;
create policy "Assigned owners can update prices in their shop"
on public.shop_products
for update
to authenticated
using (
  exists (
    select 1 from public.shop_owner_users
    join public.shops on shops.id = shop_owner_users.shop_id
    where shop_owner_users.user_id = (select auth.uid())
      and shop_owner_users.shop_id = shop_products.shop_id
      and shops.status = 'approved'
  )
)
with check (
  exists (
    select 1 from public.shop_owner_users
    join public.shops on shops.id = shop_owner_users.shop_id
    where shop_owner_users.user_id = (select auth.uid())
      and shop_owner_users.shop_id = shop_products.shop_id
      and shops.status = 'approved'
  )
);

drop policy if exists "Assigned owners can delete prices in their shop" on public.shop_products;
create policy "Assigned owners can delete prices in their shop"
on public.shop_products
for delete
to authenticated
using (
  exists (
    select 1 from public.shop_owner_users
    where shop_owner_users.user_id = (select auth.uid())
      and shop_owner_users.shop_id = shop_products.shop_id
  )
);

-- Public view contains product prices and public shop name/area only.
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
  shop_products.updated_at,
  shops.shop_name,
  shops.area
from public.shop_products
join public.shops on shops.id = shop_products.shop_id
where shops.status = 'approved';

revoke all on public.public_shop_prices from public;
grant select on public.public_shop_prices to anon, authenticated;

notify pgrst, 'reload schema';

-- OWNER ACCOUNT SETUP:
-- 1. Create the owner account in Supabase Authentication > Users > Add user.
-- 2. Copy that user's UUID and the approved shop's UUID.
-- 3. Run this separately, replacing both values:
-- insert into public.shop_owner_users (user_id, shop_id)
-- values ('AUTH_USER_UUID', 'APPROVED_SHOP_UUID');
