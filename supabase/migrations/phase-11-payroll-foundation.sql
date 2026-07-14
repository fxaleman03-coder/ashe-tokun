-- Phase 11 Payroll & Pay Period Foundation.
-- Do not execute automatically from the application.
-- Review and run manually only after Timekeeper is active.
--
-- This phase creates payroll periods only. It intentionally does not create
-- pay rates, taxes, deductions, payments, wage calculations, or accounting
-- exports.

create table if not exists public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  period_name text not null,
  period_type text not null default 'weekly',
  start_date date not null,
  end_date date not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_staff_id uuid references public.staff_members(id) on delete set null,
  approved_by_staff_id uuid references public.staff_members(id) on delete set null,
  approved_at timestamptz,
  notes text,
  constraint payroll_periods_type_check check (
    period_type in ('weekly', 'bi_weekly', 'semi_monthly', 'monthly')
  ),
  constraint payroll_periods_status_check check (
    status in ('draft', 'processing', 'approved', 'closed')
  ),
  constraint payroll_periods_date_check check (end_date >= start_date)
);

create index if not exists payroll_periods_start_date_idx
on public.payroll_periods(start_date);

create index if not exists payroll_periods_end_date_idx
on public.payroll_periods(end_date);

create index if not exists payroll_periods_status_idx
on public.payroll_periods(status);

create index if not exists payroll_periods_period_type_idx
on public.payroll_periods(period_type);

drop trigger if exists set_payroll_periods_updated_at on public.payroll_periods;

create trigger set_payroll_periods_updated_at
before update on public.payroll_periods
for each row execute function public.set_updated_at();
