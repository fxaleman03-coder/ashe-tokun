-- Phase 10.1 Staff Command Center foundation.
-- Do not execute automatically from the application.
-- This prepares staff member records for future PIN authentication.
-- Do not seed staff users or store sample PINs.

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  employee_number text not null unique,
  first_name text not null,
  last_name text not null,
  display_name text,
  pin_hash text not null,
  role text not null,
  active boolean not null default true,
  assigned_location_id uuid references public.inventory_locations(id) on delete set null,
  failed_login_attempts integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_members_role_check check (
    role in (
      'owner',
      'manager',
      'cashier',
      'inventory',
      'fulfillment',
      'customer_service'
    )
  ),
  constraint staff_members_failed_login_attempts_check check (
    failed_login_attempts >= 0
  )
);

create index if not exists staff_members_employee_number_idx
on public.staff_members(employee_number);

create index if not exists staff_members_role_idx
on public.staff_members(role);

create index if not exists staff_members_active_idx
on public.staff_members(active);

create index if not exists staff_members_assigned_location_id_idx
on public.staff_members(assigned_location_id);

drop trigger if exists set_staff_members_updated_at on public.staff_members;

create trigger set_staff_members_updated_at
before update on public.staff_members
for each row execute function public.set_updated_at();
