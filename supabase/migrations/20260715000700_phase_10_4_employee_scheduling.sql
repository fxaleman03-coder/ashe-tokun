-- Phase 10.4 Employee Scheduling.
-- Do not execute automatically from the application.
-- Scheduling belongs to ASHE TOKUN staff operations only.
-- AJAKO ORIGINALS and EDIBERE CREATION remain vendors/suppliers/manufacturers,
-- not ASHE TOKUN departments or employee groups.
-- Time clock, payroll, PTO balances, training, and labor forecasting are
-- intentionally deferred to later phases.

create table if not exists public.staff_availability (
  id uuid primary key default gen_random_uuid(),
  staff_member_id uuid not null references public.staff_members(id) on delete restrict,
  weekday integer not null,
  available boolean not null default true,
  start_time time,
  end_time time,
  notes text,
  effective_from date,
  effective_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_availability_weekday_check check (weekday between 0 and 6),
  constraint staff_availability_time_check check (
    not available
    or start_time is null
    or end_time is null
    or end_time > start_time
  ),
  constraint staff_availability_effective_dates_check check (
    effective_until is null
    or effective_from is null
    or effective_until >= effective_from
  ),
  unique (
    staff_member_id,
    weekday,
    available,
    start_time,
    end_time,
    effective_from,
    effective_until
  )
);

create table if not exists public.staff_time_off_requests (
  id uuid primary key default gen_random_uuid(),
  staff_member_id uuid not null references public.staff_members(id) on delete restrict,
  request_type text not null,
  start_date date not null,
  end_date date not null,
  partial_day boolean not null default false,
  start_time time,
  end_time time,
  reason text,
  status text not null default 'pending',
  reviewed_by_staff_id uuid references public.staff_members(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_time_off_requests_type_check check (
    request_type in (
      'vacation',
      'sick',
      'personal',
      'unpaid',
      'bereavement',
      'jury_duty',
      'other'
    )
  ),
  constraint staff_time_off_requests_status_check check (
    status in ('pending', 'approved', 'denied', 'cancelled')
  ),
  constraint staff_time_off_requests_dates_check check (end_date >= start_date),
  constraint staff_time_off_requests_partial_time_check check (
    not partial_day
    or start_time is null
    or end_time is null
    or end_time > start_time
  )
);

create table if not exists public.staff_schedule_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft',
  location_id uuid references public.inventory_locations(id) on delete set null,
  notes text,
  published_at timestamptz,
  published_by_staff_id uuid references public.staff_members(id) on delete set null,
  created_by_staff_id uuid references public.staff_members(id) on delete set null,
  updated_by_staff_id uuid references public.staff_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_schedule_periods_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint staff_schedule_periods_dates_check check (end_date >= start_date)
);

create table if not exists public.staff_shifts (
  id uuid primary key default gen_random_uuid(),
  schedule_period_id uuid not null references public.staff_schedule_periods(id) on delete restrict,
  staff_member_id uuid not null references public.staff_members(id) on delete restrict,
  location_id uuid references public.inventory_locations(id) on delete set null,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  unpaid_break_minutes integer not null default 0,
  role_label text,
  department_label text,
  notes text,
  status text not null default 'scheduled',
  created_by_staff_id uuid references public.staff_members(id) on delete set null,
  updated_by_staff_id uuid references public.staff_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_shifts_status_check check (
    status in ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show')
  ),
  constraint staff_shifts_time_check check (end_time > start_time),
  constraint staff_shifts_break_check check (unpaid_break_minutes >= 0)
);

create table if not exists public.staff_schedule_events (
  id uuid primary key default gen_random_uuid(),
  schedule_period_id uuid references public.staff_schedule_periods(id) on delete set null,
  shift_id uuid references public.staff_shifts(id) on delete set null,
  staff_member_id uuid references public.staff_members(id) on delete set null,
  actor_staff_id uuid references public.staff_members(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint staff_schedule_events_type_check check (
    event_type in (
      'schedule_created',
      'schedule_updated',
      'schedule_published',
      'schedule_archived',
      'shift_created',
      'shift_updated',
      'shift_cancelled',
      'shift_reassigned',
      'availability_updated',
      'time_off_requested',
      'time_off_approved',
      'time_off_denied'
    )
  )
);

create index if not exists staff_availability_staff_member_id_idx
on public.staff_availability(staff_member_id);
create index if not exists staff_availability_weekday_idx
on public.staff_availability(weekday);
create index if not exists staff_availability_effective_from_idx
on public.staff_availability(effective_from);
create index if not exists staff_availability_effective_until_idx
on public.staff_availability(effective_until);

create index if not exists staff_time_off_requests_staff_member_id_idx
on public.staff_time_off_requests(staff_member_id);
create index if not exists staff_time_off_requests_status_idx
on public.staff_time_off_requests(status);
create index if not exists staff_time_off_requests_start_date_idx
on public.staff_time_off_requests(start_date);
create index if not exists staff_time_off_requests_end_date_idx
on public.staff_time_off_requests(end_date);

create index if not exists staff_schedule_periods_start_date_idx
on public.staff_schedule_periods(start_date);
create index if not exists staff_schedule_periods_end_date_idx
on public.staff_schedule_periods(end_date);
create index if not exists staff_schedule_periods_status_idx
on public.staff_schedule_periods(status);
create index if not exists staff_schedule_periods_location_id_idx
on public.staff_schedule_periods(location_id);

create index if not exists staff_shifts_schedule_period_id_idx
on public.staff_shifts(schedule_period_id);
create index if not exists staff_shifts_staff_member_id_idx
on public.staff_shifts(staff_member_id);
create index if not exists staff_shifts_shift_date_idx
on public.staff_shifts(shift_date);
create index if not exists staff_shifts_location_id_idx
on public.staff_shifts(location_id);
create index if not exists staff_shifts_status_idx
on public.staff_shifts(status);

create index if not exists staff_schedule_events_schedule_period_id_idx
on public.staff_schedule_events(schedule_period_id);
create index if not exists staff_schedule_events_shift_id_idx
on public.staff_schedule_events(shift_id);
create index if not exists staff_schedule_events_staff_member_id_idx
on public.staff_schedule_events(staff_member_id);
create index if not exists staff_schedule_events_actor_staff_id_idx
on public.staff_schedule_events(actor_staff_id);
create index if not exists staff_schedule_events_created_at_idx
on public.staff_schedule_events(created_at);

create or replace function public.validate_staff_shift()
returns trigger
language plpgsql
as $$
declare
  period_row public.staff_schedule_periods%rowtype;
  staff_row public.staff_members%rowtype;
  overlap_exists boolean;
  time_off_exists boolean;
begin
  select * into period_row
  from public.staff_schedule_periods
  where id = new.schedule_period_id;

  if not found then
    raise exception 'Schedule period not found.';
  end if;

  if period_row.status = 'archived' then
    raise exception 'Archived schedules are read-only.';
  end if;

  if new.shift_date < period_row.start_date or new.shift_date > period_row.end_date then
    raise exception 'Shift date must be inside the schedule period.';
  end if;

  select * into staff_row
  from public.staff_members
  where id = new.staff_member_id;

  if not found then
    raise exception 'Staff member not found.';
  end if;

  if not staff_row.active or staff_row.employment_status <> 'active' then
    raise exception 'Inactive or archived staff cannot receive new shifts.';
  end if;

  select exists (
    select 1
    from public.staff_shifts existing
    where existing.staff_member_id = new.staff_member_id
      and existing.shift_date = new.shift_date
      and existing.status in ('scheduled', 'confirmed')
      and existing.id <> coalesce(new.id, gen_random_uuid())
      and new.start_time < existing.end_time
      and new.end_time > existing.start_time
  ) into overlap_exists;

  if overlap_exists and new.status in ('scheduled', 'confirmed') then
    raise exception 'Overlapping active shift exists for this employee.';
  end if;

  select exists (
    select 1
    from public.staff_time_off_requests request
    where request.staff_member_id = new.staff_member_id
      and request.status = 'approved'
      and new.shift_date between request.start_date and request.end_date
      and (
        not request.partial_day
        or request.start_time is null
        or request.end_time is null
        or new.start_time < request.end_time
        and new.end_time > request.start_time
      )
  ) into time_off_exists;

  if time_off_exists and new.status in ('scheduled', 'confirmed') then
    raise exception 'Approved time off blocks this shift.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_staff_shift_before_write
on public.staff_shifts;

create trigger validate_staff_shift_before_write
before insert or update on public.staff_shifts
for each row execute function public.validate_staff_shift();

drop trigger if exists set_staff_availability_updated_at on public.staff_availability;
create trigger set_staff_availability_updated_at
before update on public.staff_availability
for each row execute function public.set_updated_at();

drop trigger if exists set_staff_time_off_requests_updated_at on public.staff_time_off_requests;
create trigger set_staff_time_off_requests_updated_at
before update on public.staff_time_off_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_staff_schedule_periods_updated_at on public.staff_schedule_periods;
create trigger set_staff_schedule_periods_updated_at
before update on public.staff_schedule_periods
for each row execute function public.set_updated_at();

drop trigger if exists set_staff_shifts_updated_at on public.staff_shifts;
create trigger set_staff_shifts_updated_at
before update on public.staff_shifts
for each row execute function public.set_updated_at();

-- No schedules, shifts, availability, or time-off records are seeded in this phase.
