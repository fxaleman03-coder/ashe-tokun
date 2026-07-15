-- Phase 9.5A official name correction.
-- Do not execute automatically from the application.
-- This updates system seed/reference rows only; review before running.

update public.brands
set
  name = 'EDIBERE CREATION',
  slug = 'edibere-creation',
  description = 'Official artisan partner for traditional handcrafted beadwork.',
  updated_at = now()
where slug = 'odibere-creations'
   or upper(name) in ('ODIBERE CREATIONS', 'ADEIBERE');

update public.collections
set
  name = 'EDIBERE Creation',
  slug = 'edibere-creation',
  updated_at = now()
where slug = 'odibere-creations'
   or upper(name) in ('ODIBERE CREATIONS', 'ODIBERE CREATIONS', 'ADEIBERE');

update public.inventory_locations
set
  name = 'EDIBERE Workshop',
  code = 'EDIBERE-WORKSHOP',
  description = 'EDIBERE CREATION workshop and beadwork holding location.',
  updated_at = now()
where code = 'ODIBERE-WORKSHOP'
   or upper(name) in ('ODIBERE WORKSHOP', 'ADEIBERE WORKSHOP');
