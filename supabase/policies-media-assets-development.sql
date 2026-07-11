-- Development-only media_assets policies.
-- Replace after authentication and staff roles are implemented.
-- Do not use unrestricted anon writes in production.
-- Do not execute automatically from the application.

alter table public.media_assets enable row level security;

drop policy if exists "Public can read active media assets" on public.media_assets;

create policy "Public can read active media assets"
on public.media_assets
for select
to anon
using (active = true);

drop policy if exists "Anon can insert media assets" on public.media_assets;
drop policy if exists "Temporary admin can insert media assets" on public.media_assets;

create policy "Anon can insert media assets"
on public.media_assets
for insert
to anon
with check (true);

drop policy if exists "Anon can update media assets" on public.media_assets;
drop policy if exists "Temporary admin can update media assets" on public.media_assets;

create policy "Anon can update media assets"
on public.media_assets
for update
to anon
using (true)
with check (true);
