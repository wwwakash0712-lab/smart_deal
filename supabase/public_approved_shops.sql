-- Public, privacy-safe directory of approved Smart Deal shops.
-- Exposes only shop name, area and products; never exposes owner name, mobile or street address.

drop policy if exists "Public can read approved shops" on public.shops;
create policy "Public can read approved shops"
on public.shops
for select
to anon
using (status = 'approved');

grant select (id, shop_name, area, products, created_at, status)
on public.shops to anon;

create or replace view public.approved_shops
with (security_invoker = true)
as
select id, shop_name, area, products, created_at
from public.shops
where status = 'approved';

revoke all on public.approved_shops from public;
grant select on public.approved_shops to anon, authenticated;
