-- Development-only Timekeeper policies.
-- Time and attendance data is sensitive employee information.
-- Production requires authenticated server-side access, least privilege,
-- audit controls, secure retention, and role-based RLS.
-- Do not use unrestricted anon attendance access in production.
-- Do not execute automatically from the application.

alter table public.staff_timecards enable row level security;
alter table public.staff_punches enable row level security;
alter table public.staff_timecard_exceptions enable row level security;
alter table public.staff_timekeeper_events enable row level security;

drop policy if exists "Anon can read timecards for development"
on public.staff_timecards;
create policy "Anon can read timecards for development"
on public.staff_timecards
for select
to anon
using (true);

drop policy if exists "Anon can write timecards for development"
on public.staff_timecards;
create policy "Anon can write timecards for development"
on public.staff_timecards
for all
to anon
using (true)
with check (true);

drop policy if exists "Anon can read punches for development"
on public.staff_punches;
create policy "Anon can read punches for development"
on public.staff_punches
for select
to anon
using (true);

drop policy if exists "Anon can insert punches for development"
on public.staff_punches;
create policy "Anon can insert punches for development"
on public.staff_punches
for insert
to anon
with check (true);

drop policy if exists "Anon can read timecard exceptions for development"
on public.staff_timecard_exceptions;
create policy "Anon can read timecard exceptions for development"
on public.staff_timecard_exceptions
for select
to anon
using (true);

drop policy if exists "Anon can write timecard exceptions for development"
on public.staff_timecard_exceptions;
create policy "Anon can write timecard exceptions for development"
on public.staff_timecard_exceptions
for all
to anon
using (true)
with check (true);

drop policy if exists "Anon can read timekeeper events for development"
on public.staff_timekeeper_events;
create policy "Anon can read timekeeper events for development"
on public.staff_timekeeper_events
for select
to anon
using (true);

drop policy if exists "Anon can insert timekeeper events for development"
on public.staff_timekeeper_events;
create policy "Anon can insert timekeeper events for development"
on public.staff_timekeeper_events
for insert
to anon
with check (true);

-- Preferred production architecture:
-- - Timekeeper mutations use server-side service client.
-- - Staff read only their own data through protected server routes.
-- - Managers read broader data through server permission enforcement.
-- - Original punches, approved timecards, correction chains, and audit events
--   remain append-oriented and protected from destructive access.
