-- Phase 11.1 Payroll Actions, Export, and Period Snapshot Foundation.
-- Do not execute automatically from the application.
-- Review and run manually after Phase 11 payroll_periods exists.
--
-- This phase stores payroll preparation snapshots only. It does not calculate
-- wages, taxes, deductions, payments, legal overtime, or accounting exports.

alter table public.payroll_periods
drop constraint if exists payroll_periods_status_check;

alter table public.payroll_periods
add constraint payroll_periods_status_check check (
  status in ('draft', 'processing', 'approved', 'closed', 'reopened')
);

alter table public.payroll_periods
add column if not exists closed_by_staff_id uuid references public.staff_members(id) on delete set null;

alter table public.payroll_periods
add column if not exists closed_at timestamptz;

create table if not exists public.payroll_period_employees (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references public.payroll_periods(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id) on delete restrict,
  status text not null default 'pending',
  regular_minutes integer not null default 0,
  overtime_minutes integer not null default 0,
  total_minutes integer not null default 0,
  approved_timecard_count integer not null default 0,
  pending_timecard_count integer not null default 0,
  incomplete_timecard_count integer not null default 0,
  payroll_notes text,
  reviewed_by_staff_id uuid references public.staff_members(id) on delete set null,
  reviewed_at timestamptz,
  approved_by_staff_id uuid references public.staff_members(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payroll_period_employees_status_check check (
    status in ('pending', 'incomplete', 'ready', 'reviewed', 'approved', 'excluded')
  ),
  constraint payroll_period_employees_minutes_check check (
    regular_minutes >= 0
    and overtime_minutes >= 0
    and total_minutes = regular_minutes + overtime_minutes
    and approved_timecard_count >= 0
    and pending_timecard_count >= 0
    and incomplete_timecard_count >= 0
  ),
  unique (payroll_period_id, staff_member_id)
);

create index if not exists payroll_period_employees_period_id_idx
on public.payroll_period_employees(payroll_period_id);

create index if not exists payroll_period_employees_staff_member_id_idx
on public.payroll_period_employees(staff_member_id);

create index if not exists payroll_period_employees_status_idx
on public.payroll_period_employees(status);

create index if not exists payroll_period_employees_approved_at_idx
on public.payroll_period_employees(approved_at);

drop trigger if exists set_payroll_period_employees_updated_at
on public.payroll_period_employees;

create trigger set_payroll_period_employees_updated_at
before update on public.payroll_period_employees
for each row execute function public.set_updated_at();

create table if not exists public.payroll_period_timecards (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references public.payroll_periods(id) on delete cascade,
  payroll_period_employee_id uuid not null references public.payroll_period_employees(id) on delete cascade,
  timecard_id uuid not null references public.staff_timecards(id) on delete restrict,
  work_date date not null,
  regular_minutes integer not null default 0,
  overtime_minutes integer not null default 0,
  total_minutes integer not null default 0,
  included boolean not null default true,
  exclusion_reason text,
  captured_timecard_status text not null,
  captured_approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payroll_period_timecards_minutes_check check (
    regular_minutes >= 0
    and overtime_minutes >= 0
    and total_minutes = regular_minutes + overtime_minutes
  ),
  unique (payroll_period_id, timecard_id)
);

create index if not exists payroll_period_timecards_period_id_idx
on public.payroll_period_timecards(payroll_period_id);

create index if not exists payroll_period_timecards_employee_id_idx
on public.payroll_period_timecards(payroll_period_employee_id);

create index if not exists payroll_period_timecards_timecard_id_idx
on public.payroll_period_timecards(timecard_id);

create index if not exists payroll_period_timecards_work_date_idx
on public.payroll_period_timecards(work_date);

create index if not exists payroll_period_timecards_included_idx
on public.payroll_period_timecards(included);

create table if not exists public.payroll_events (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid references public.payroll_periods(id) on delete set null,
  payroll_period_employee_id uuid references public.payroll_period_employees(id) on delete set null,
  actor_staff_id uuid references public.staff_members(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payroll_events_period_id_idx
on public.payroll_events(payroll_period_id);

create index if not exists payroll_events_employee_id_idx
on public.payroll_events(payroll_period_employee_id);

create index if not exists payroll_events_actor_staff_id_idx
on public.payroll_events(actor_staff_id);

create index if not exists payroll_events_event_type_idx
on public.payroll_events(event_type);

create index if not exists payroll_events_created_at_idx
on public.payroll_events(created_at);
