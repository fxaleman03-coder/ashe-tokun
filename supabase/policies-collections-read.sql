alter table public.collections enable row level security;

drop policy if exists "Public can read active collections" on public.collections;

create policy "Public can read active collections"
on public.collections
for select
to anon
using (active = true);
