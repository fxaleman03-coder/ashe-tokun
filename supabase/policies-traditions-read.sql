alter table public.traditions enable row level security;

drop policy if exists "Public can read active traditions" on public.traditions;

create policy "Public can read active traditions"
on public.traditions
for select
to anon
using (active = true);
