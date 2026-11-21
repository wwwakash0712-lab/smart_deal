-- Smart Deal: customer shop ratings and moderated reviews
-- Run this once in Supabase SQL Editor as the project owner.

create table if not exists public.shop_reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_name text not null check (length(trim(customer_name)) between 2 and 60),
  rating integer not null check (rating between 1 and 5),
  review text not null check (length(trim(review)) between 5 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists shop_reviews_shop_status_created_idx
on public.shop_reviews(shop_id, status, created_at desc);

alter table public.shop_reviews enable row level security;

revoke all on table public.shop_reviews from anon, authenticated;
grant select, insert on table public.shop_reviews to anon;
grant select, insert, update on table public.shop_reviews to authenticated;

drop policy if exists "Customers can read approved reviews for approved shops" on public.shop_reviews;
create policy "Customers can read approved reviews for approved shops"
on public.shop_reviews
for select
to anon, authenticated
using (
  status = 'approved'
  and exists (
    select 1 from public.shops
    where shops.id = shop_reviews.shop_id
      and shops.status = 'approved'
  )
);

drop policy if exists "Customers can submit pending reviews" on public.shop_reviews;
create policy "Customers can submit pending reviews"
on public.shop_reviews
for insert
to anon, authenticated
with check (
  status = 'pending'
  and length(trim(customer_name)) between 2 and 60
  and rating between 1 and 5
  and length(trim(review)) between 5 and 500
  and exists (
    select 1 from public.shops
    where shops.id = shop_reviews.shop_id
      and shops.status = 'approved'
  )
);

drop policy if exists "Admins can read all shop reviews" on public.shop_reviews;
create policy "Admins can read all shop reviews"
on public.shop_reviews
for select
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can moderate shop reviews" on public.shop_reviews;
create policy "Admins can moderate shop reviews"
on public.shop_reviews
for update
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
)
with check (
  status in ('approved', 'rejected')
  and exists (
    select 1 from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

notify pgrst, 'reload schema';
