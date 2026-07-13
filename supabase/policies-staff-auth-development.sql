-- Development-only Staff authentication policies.
-- The app uses the server-only Supabase service role for staff authentication
-- and staff mutations. Do not expose SUPABASE_SERVICE_ROLE_KEY to the browser.
--
-- These policies do not grant anon access to pin_hash, session_token_hash, or
-- authentication internals. Replace with authenticated staff role RLS before
-- production.
-- Do not execute automatically from the application.

alter table public.staff_members enable row level security;
alter table public.staff_sessions enable row level security;
alter table public.staff_auth_events enable row level security;

drop policy if exists "Deny anon staff member reads" on public.staff_members;
create policy "Deny anon staff member reads"
on public.staff_members
for select
to anon
using (false);

drop policy if exists "Deny anon staff member writes" on public.staff_members;
create policy "Deny anon staff member writes"
on public.staff_members
for all
to anon
using (false)
with check (false);

drop policy if exists "Deny anon staff session reads" on public.staff_sessions;
create policy "Deny anon staff session reads"
on public.staff_sessions
for select
to anon
using (false);

drop policy if exists "Deny anon staff session writes" on public.staff_sessions;
create policy "Deny anon staff session writes"
on public.staff_sessions
for all
to anon
using (false)
with check (false);

drop policy if exists "Deny anon staff auth event reads" on public.staff_auth_events;
create policy "Deny anon staff auth event reads"
on public.staff_auth_events
for select
to anon
using (false);

drop policy if exists "Deny anon staff auth event writes" on public.staff_auth_events;
create policy "Deny anon staff auth event writes"
on public.staff_auth_events
for all
to anon
using (false)
with check (false);
