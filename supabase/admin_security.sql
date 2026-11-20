-- Smart Deal: secure admin access and shop approval workflow
-- Run this in Supabase SQL Editor as the project owner.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Admins can only read their own membership record.
drop policy if exists "Admins can read their own admin record" on public.admin_users;
create policy "Admins can read their own admin record"
on public.admin_users
for select
to authenticated
using (user_id = (select auth.uid()));

-- Keep shop records private from anonymous visitors.
-- Anonymous visitors can submit registrations, but cannot read or modify them.
revoke all on table public.shops from anon, authenticated;
grant insert on table public.shops to anon;
grant select on table public.shops to authenticated;

drop policy if exists "Admins can read shop registrations" on public.shops;
create policy "Admins can read shop registrations"
on public.shops
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

-- Do not grant direct UPDATE permission to browser clients.
-- This function is the only browser-callable route for changing approval status.
create or replace function public.admin_review_shop(p_shop_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid shop status';
  end if;

  update public.shops
  set status = p_status
  where id = p_shop_id and status = 'pending';

  if not found then
    raise exception 'Pending shop not found';
  end if;
end;
$$;

revoke all on function public.admin_review_shop(uuid, text) from public;
grant execute on function public.admin_review_shop(uuid, text) to authenticated;

-- After creating your admin user in Supabase Authentication > Users,
-- copy that user's UUID and run this separately:
-- insert into public.admin_users (user_id)
-- values ('PASTE_ADMIN_USER_UUID_HERE');
