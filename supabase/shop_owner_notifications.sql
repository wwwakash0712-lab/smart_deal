-- Notifications sent by Smart Deal admins to shop owners about reported prices.
create table if not exists public.shop_owner_notifications (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  report_id uuid not null unique references public.price_issue_reports(id) on delete cascade,
  message text not null check (length(trim(message)) between 1 and 1000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.shop_owner_notifications enable row level security;
grant select, update on public.shop_owner_notifications to authenticated;
grant insert on public.shop_owner_notifications to authenticated;

drop policy if exists "Shop owners can read their notifications" on public.shop_owner_notifications;
create policy "Shop owners can read their notifications"
on public.shop_owner_notifications for select to authenticated
using (exists (
  select 1 from public.shop_owner_users
  where shop_owner_users.user_id = auth.uid()
    and shop_owner_users.shop_id = shop_owner_notifications.shop_id
));

drop policy if exists "Shop owners can mark their notifications read" on public.shop_owner_notifications;
create policy "Shop owners can mark their notifications read"
on public.shop_owner_notifications for update to authenticated
using (exists (
  select 1 from public.shop_owner_users
  where shop_owner_users.user_id = auth.uid()
    and shop_owner_users.shop_id = shop_owner_notifications.shop_id
))
with check (exists (
  select 1 from public.shop_owner_users
  where shop_owner_users.user_id = auth.uid()
    and shop_owner_users.shop_id = shop_owner_notifications.shop_id
));

drop policy if exists "Admins can send shop owner notifications" on public.shop_owner_notifications;
create policy "Admins can send shop owner notifications"
on public.shop_owner_notifications for insert to authenticated
with check (exists (
  select 1 from public.admin_users
  where admin_users.user_id = auth.uid()
));



-- Allow admins to view notification records so the dashboard can show
-- whether each price report has already been sent to its shop owner.
grant select on public.shop_owner_notifications to authenticated;
drop policy if exists "Admins can view shop owner notifications" on public.shop_owner_notifications;
create policy "Admins can view shop owner notifications"
on public.shop_owner_notifications for select to authenticated
using (exists (
  select 1 from public.admin_users
  where admin_users.user_id = auth.uid()
));
