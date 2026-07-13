-- Phase 10.4D Executive Leadership Restructure.
-- Do not execute automatically from the application.
-- Review and run manually after Phase 10.3 permissions are in place.
--
-- ASHE TOKUN has business leadership titles that are separate from system
-- security roles. AJAKO ORIGINALS and EDIBERE CREATION remain vendors,
-- suppliers, or manufacturers in this retail system. They are not internal
-- ASHE TOKUN departments and this migration does not create manufacturing
-- roles or employees.
--
-- This migration prepares the schema only. It intentionally does not update
-- existing staff records, employee numbers, PINs, sessions, or audit history.

alter table public.staff_members
add column if not exists business_title text;

alter table public.staff_members
drop constraint if exists staff_members_role_check;

alter table public.staff_members
add constraint staff_members_role_check check (
  role in (
    'owner',
    'managing_partner',
    'store_manager',
    'assistant_manager',
    'manager',
    'cashier',
    'inventory',
    'fulfillment',
    'customer_service',
    'accounting',
    'marketing_ecommerce'
  )
);

-- Recommended manual staff updates after review:
-- - 0001 Eduardo Gomez: business_title = 'Owner', role = 'owner'
-- - 0002 Felix Aleman: business_title = 'Managing Partner',
--   role = 'managing_partner'
--
-- Do not perform those updates automatically from application code.
