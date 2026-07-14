-- Phase 11.1B Payroll Period Creation Form Support.
-- Do not execute automatically from the application.
-- Review and run manually after Phase 11 payroll_periods exists.
--
-- This adds form metadata only. It does not create payroll rows, wages,
-- taxes, deductions, payments, or accounting exports.

alter table public.payroll_periods
add column if not exists pay_date date;

alter table public.payroll_periods
add column if not exists location_id uuid references public.inventory_locations(id) on delete set null;

create index if not exists payroll_periods_pay_date_idx
on public.payroll_periods(pay_date);

create index if not exists payroll_periods_location_id_idx
on public.payroll_periods(location_id);
