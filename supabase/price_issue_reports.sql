-- Customer-submitted price issue reports
create table if not exists public.price_issue_reports (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  shop_name text not null,
  product_name text not null,
  category text not null,
  unit text not null,
  displayed_price numeric(12,2) not null check (displayed_price >= 0),
  report_reason text not null check (length(trim(report_reason)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending','reviewed')),
  created_at timestamptz not null default now()
);
alter table public.price_issue_reports enable row level security;
grant insert on public.price_issue_reports to anon, authenticated;
grant select, update on public.price_issue_reports to authenticated;
drop policy if exists "Customers can submit price reports" on public.price_issue_reports;
create policy "Customers can submit price reports" on public.price_issue_reports
for insert to anon, authenticated with check (status = 'pending' and length(trim(report_reason)) between 1 and 500);
drop policy if exists "Admins can read price reports" on public.price_issue_reports;
create policy "Admins can read price reports" on public.price_issue_reports
for select to authenticated using (exists (select 1 from public.admin_users where user_id = auth.uid()));
drop policy if exists "Admins can update price reports" on public.price_issue_reports;
create policy "Admins can update price reports" on public.price_issue_reports
for update to authenticated using (exists (select 1 from public.admin_users where user_id = auth.uid())) with check (exists (select 1 from public.admin_users where user_id = auth.uid()));
