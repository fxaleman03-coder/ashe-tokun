-- Phase 10.5 Timekeeper, Attendance & Timecard foundation.
-- Do not execute automatically from the application.
-- Review and run manually after Phase 10.4 scheduling and staff auth exist.
--
-- Timekeeper records actual worked time. Scheduling records planned work time.
-- The systems are linked but separate. Punches, approved timecards, correction
-- chains, exceptions, and timekeeper events must be preserved historically.
-- This phase does not calculate wages, taxes, deductions, paychecks, or legal
-- overtime. Overtime columns are preparation fields only.

create table if not exists public.staff_timecards (
  id uuid primary key default gen_random_uuid(),
  staff_member_id uuid not null references public.staff_members(id) on delete restrict,
  work_date date not null,
  shift_id uuid references public.staff_shifts(id) on delete set null,
  location_id uuid references public.inventory_locations(id) on delete set null,
  status text not null default 'open',
  scheduled_start_time time,
  scheduled_end_time time,
  scheduled_break_minutes integer not null default 0,
  regular_minutes integer not null default 0,
  overtime_minutes integer not null default 0,
  unpaid_break_minutes integer not null default 0,
  exception_count integer not null default 0,
  employee_notes text,
  manager_notes text,
  submitted_at timestamptz,
  submitted_by_staff_id uuid references public.staff_members(id) on delete set null,
  approved_at timestamptz,
  approved_by_staff_id uuid references public.staff_members(id) on delete set null,
  reopened_at timestamptz,
  reopened_by_staff_id uuid references public.staff_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_timecards_status_check check (
    status in ('open', 'incomplete', 'pending_review', 'approved', 'reopened', 'archived')
  ),
  constraint staff_timecards_minutes_check check (
    scheduled_break_minutes >= 0
    and regular_minutes >= 0
    and overtime_minutes >= 0
    and unpaid_break_minutes >= 0
    and exception_count >= 0
  ),
  unique (staff_member_id, work_date)
);

create table if not exists public.staff_punches (
  id uuid primary key default gen_random_uuid(),
  timecard_id uuid not null references public.staff_timecards(id) on delete restrict,
  staff_member_id uuid not null references public.staff_members(id) on delete restrict,
  shift_id uuid references public.staff_shifts(id) on delete set null,
  location_id uuid references public.inventory_locations(id) on delete set null,
  punch_type text not null,
  punched_at timestamptz not null default now(),
  source text not null default 'staff_portal',
  created_by_staff_id uuid references public.staff_members(id) on delete set null,
  corrected_from_punch_id uuid references public.staff_punches(id) on delete set null,
  is_correction boolean not null default false,
  correction_reason text,
  device_name text,
  ip_address text,
  user_agent text,
  notes text,
  created_at timestamptz not null default now(),
  constraint staff_punches_type_check check (
    punch_type in (
      'clock_in',
      'break_out',
      'break_in',
      'clock_out',
      'manual_in',
      'manual_break_out',
      'manual_break_in',
      'manual_out'
    )
  ),
  constraint staff_punches_source_check check (
    source in ('staff_portal', 'admin', 'kiosk', 'system_correction')
  ),
  constraint staff_punches_correction_reason_check check (
    is_correction = false or correction_reason is not null
  )
);

create table if not exists public.staff_timecard_exceptions (
  id uuid primary key default gen_random_uuid(),
  timecard_id uuid not null references public.staff_timecards(id) on delete restrict,
  staff_member_id uuid not null references public.staff_members(id) on delete restrict,
  exception_type text not null,
  severity text not null default 'warning',
  status text not null default 'open',
  related_punch_id uuid references public.staff_punches(id) on delete set null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by_staff_id uuid references public.staff_members(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_timecard_exceptions_type_check check (
    exception_type in (
      'late_arrival',
      'early_arrival',
      'early_departure',
      'late_departure',
      'missed_clock_in',
      'missed_clock_out',
      'missed_break_out',
      'missed_break_in',
      'excessive_break',
      'short_break',
      'unscheduled_work',
      'outside_schedule',
      'overlapping_punch',
      'invalid_punch_sequence',
      'time_off_conflict',
      'no_scheduled_shift',
      'excessive_shift_duration'
    )
  ),
  constraint staff_timecard_exceptions_severity_check check (
    severity in ('info', 'warning', 'critical')
  ),
  constraint staff_timecard_exceptions_status_check check (
    status in ('open', 'resolved', 'dismissed')
  )
);

create table if not exists public.staff_timekeeper_events (
  id uuid primary key default gen_random_uuid(),
  timecard_id uuid references public.staff_timecards(id) on delete set null,
  punch_id uuid references public.staff_punches(id) on delete set null,
  staff_member_id uuid references public.staff_members(id) on delete set null,
  actor_staff_id uuid references public.staff_members(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists staff_timecards_staff_member_id_idx on public.staff_timecards(staff_member_id);
create index if not exists staff_timecards_work_date_idx on public.staff_timecards(work_date);
create index if not exists staff_timecards_status_idx on public.staff_timecards(status);
create index if not exists staff_timecards_shift_id_idx on public.staff_timecards(shift_id);
create index if not exists staff_timecards_location_id_idx on public.staff_timecards(location_id);
create index if not exists staff_timecards_approved_at_idx on public.staff_timecards(approved_at);

create index if not exists staff_punches_timecard_id_idx on public.staff_punches(timecard_id);
create index if not exists staff_punches_staff_member_id_idx on public.staff_punches(staff_member_id);
create index if not exists staff_punches_punched_at_idx on public.staff_punches(punched_at);
create index if not exists staff_punches_punch_type_idx on public.staff_punches(punch_type);
create index if not exists staff_punches_shift_id_idx on public.staff_punches(shift_id);
create index if not exists staff_punches_location_id_idx on public.staff_punches(location_id);

create index if not exists staff_timecard_exceptions_timecard_id_idx on public.staff_timecard_exceptions(timecard_id);
create index if not exists staff_timecard_exceptions_staff_member_id_idx on public.staff_timecard_exceptions(staff_member_id);
create index if not exists staff_timecard_exceptions_type_idx on public.staff_timecard_exceptions(exception_type);
create index if not exists staff_timecard_exceptions_status_idx on public.staff_timecard_exceptions(status);
create index if not exists staff_timecard_exceptions_created_at_idx on public.staff_timecard_exceptions(created_at);

create index if not exists staff_timekeeper_events_timecard_id_idx on public.staff_timekeeper_events(timecard_id);
create index if not exists staff_timekeeper_events_punch_id_idx on public.staff_timekeeper_events(punch_id);
create index if not exists staff_timekeeper_events_staff_member_id_idx on public.staff_timekeeper_events(staff_member_id);
create index if not exists staff_timekeeper_events_actor_staff_id_idx on public.staff_timekeeper_events(actor_staff_id);
create index if not exists staff_timekeeper_events_created_at_idx on public.staff_timekeeper_events(created_at);

drop trigger if exists set_staff_timecards_updated_at on public.staff_timecards;
create trigger set_staff_timecards_updated_at
before update on public.staff_timecards
for each row execute function public.set_updated_at();

drop trigger if exists set_staff_timecard_exceptions_updated_at
on public.staff_timecard_exceptions;
create trigger set_staff_timecard_exceptions_updated_at
before update on public.staff_timecard_exceptions
for each row execute function public.set_updated_at();
