alter table public.brands enable row level security;

drop policy if exists "Public can read active brands" on public.brands;

create policy "Public can read active brands"
on public.brands
for select
to anon
using (active = true);
