-- Phase 10.3 Enterprise Roles & Permissions Engine.
-- Do not execute automatically from the application.
-- Review and run manually only after Phase 10.1 and Phase 10.2 staff tables exist.
--
-- ASHE TOKUN is the retail company. AJAKO ORIGINALS and EDIBERE CREATION are
-- vendors/suppliers/manufacturers in ASHE TOKUN commerce context only.
-- This migration intentionally does not create production departments,
-- manufacturing roles, AJAKO employees, or EDIBERE employees.

alter table public.staff_members
drop constraint if exists staff_members_role_check;

alter table public.staff_members
add constraint staff_members_role_check check (
  role in (
    'owner',
    'manager',
    'cashier',
    'inventory',
    'fulfillment',
    'customer_service',
    'accounting',
    'marketing_ecommerce'
  )
);

create table if not exists public.staff_permission_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  permission_key text not null,
  granted boolean not null,
  changed_by_staff_id uuid references public.staff_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_member_id, permission_key)
);

create index if not exists staff_permission_assignments_staff_member_id_idx
on public.staff_permission_assignments(staff_member_id);

create index if not exists staff_permission_assignments_permission_key_idx
on public.staff_permission_assignments(permission_key);

create index if not exists staff_permission_assignments_changed_by_staff_id_idx
on public.staff_permission_assignments(changed_by_staff_id);

drop trigger if exists set_staff_permission_assignments_updated_at
on public.staff_permission_assignments;

create trigger set_staff_permission_assignments_updated_at
before update on public.staff_permission_assignments
for each row execute function public.set_updated_at();

-- Permission catalogs and role templates live in application code for this
-- phase. Rows in staff_permission_assignments are explicit employee overrides:
-- granted = true adds a permission beyond the role template.
-- granted = false revokes a permission from the role template.

-- Recommended production RLS direction:
-- - Owners can manage all staff permissions.
-- - Managers can manage non-Owner employee permissions only where delegated.
-- - Staff can read only the minimal permissions needed for their own session.
-- - Permission audit logs must remain append-only.
