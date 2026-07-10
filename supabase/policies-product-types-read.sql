alter table public.product_types enable row level security;

drop policy if exists "Public can read active product types" on public.product_types;

create policy "Public can read active product types"
on public.product_types
for select
to anon
using (active = true);
