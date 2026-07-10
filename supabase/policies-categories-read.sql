alter table public.categories enable row level security;

drop policy if exists "Public can read active categories" on public.categories;

create policy "Public can read active categories"
on public.categories
for select
to anon
using (active = true);
