-- Smart Deal GPS locations for approved shops.
-- Run once in Supabase SQL Editor as project owner.

alter table public.shops
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.shops
  drop constraint if exists shops_latitude_range_check,
  drop constraint if exists shops_longitude_range_check;

alter table public.shops
  add constraint shops_latitude_range_check
    check (latitude is null or latitude between -90 and 90),
  add constraint shops_longitude_range_check
    check (longitude is null or longitude between -180 and 180);

-- Owners can update only the two GPS columns; RLS restricts this to their approved shop.
grant update (latitude, longitude) on public.shops to authenticated;

drop policy if exists "Owners can update GPS for their approved shop" on public.shops;
create policy "Owners can update GPS for their approved shop"
on public.shops
for update
to authenticated
using (
  status = 'approved'
  and exists (
    select 1 from public.shop_owner_users
    where shop_owner_users.shop_id = shops.id
      and shop_owner_users.user_id = (select auth.uid())
  )
)
with check (
  status = 'approved'
  and exists (
    select 1 from public.shop_owner_users
    where shop_owner_users.shop_id = shops.id
      and shop_owner_users.user_id = (select auth.uid())
  )
);

-- Public view exposes coordinates only for approved shops.
create or replace view public.approved_shops
with (security_invoker = true)
as
select id, shop_name, area, products, created_at, latitude, longitude
from public.shops
where status = 'approved';

revoke all on public.approved_shops from public;
grant select on public.approved_shops to anon, authenticated;

notify pgrst, 'reload schema';
