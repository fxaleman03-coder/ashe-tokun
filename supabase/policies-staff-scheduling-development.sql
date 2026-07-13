-- Development-only staff scheduling policies.
-- Employee schedules and time-off records are sensitive staff information.
-- Replace with authenticated staff claims and role-based RLS before production.
-- Do not use unrestricted anon scheduling access in production.
-- Do not execute automatically from the application.

alter table public.staff_availability enable row level security;
alter table public.staff_time_off_requests enable row level security;
alter table public.staff_schedule_periods enable row level security;
alter table public.staff_shifts enable row level security;
alter table public.staff_schedule_events enable row level security;

drop policy if exists "Anon can read staff availability for scheduling development"
on public.staff_availability;
create policy "Anon can read staff availability for scheduling development"
on public.staff_availability
for select
to anon
using (true);

drop policy if exists "Anon can write staff availability for scheduling development"
on public.staff_availability;
create policy "Anon can write staff availability for scheduling development"
on public.staff_availability
for all
to anon
using (true)
with check (true);

drop policy if exists "Anon can read time off for scheduling development"
on public.staff_time_off_requests;
create policy "Anon can read time off for scheduling development"
on public.staff_time_off_requests
for select
to anon
using (true);

drop policy if exists "Anon can write time off for scheduling development"
on public.staff_time_off_requests;
create policy "Anon can write time off for scheduling development"
on public.staff_time_off_requests
for all
to anon
using (true)
with check (true);

drop policy if exists "Anon can read schedule periods for scheduling development"
on public.staff_schedule_periods;
create policy "Anon can read schedule periods for scheduling development"
on public.staff_schedule_periods
for select
to anon
using (true);

drop policy if exists "Anon can write schedule periods for scheduling development"
on public.staff_schedule_periods;
create policy "Anon can write schedule periods for scheduling development"
on public.staff_schedule_periods
for all
to anon
using (true)
with check (true);

drop policy if exists "Anon can read staff shifts for scheduling development"
on public.staff_shifts;
create policy "Anon can read staff shifts for scheduling development"
on public.staff_shifts
for select
to anon
using (true);

drop policy if exists "Anon can write staff shifts for scheduling development"
on public.staff_shifts;
create policy "Anon can write staff shifts for scheduling development"
on public.staff_shifts
for all
to anon
using (true)
with check (true);

drop policy if exists "Anon can read schedule events for scheduling development"
on public.staff_schedule_events;
create policy "Anon can read schedule events for scheduling development"
on public.staff_schedule_events
for select
to anon
using (true);

drop policy if exists "Anon can insert schedule events for scheduling development"
on public.staff_schedule_events;
create policy "Anon can insert schedule events for scheduling development"
on public.staff_schedule_events
for insert
to anon
with check (true);

-- Preferred production architecture:
-- - staff can read their own published shifts, availability, and requests.
-- - managers/owners can read broader scheduling scopes through server checks.
-- - scheduling mutations should remain server-side with permission guards.
-- - schedule events should be append-only.
