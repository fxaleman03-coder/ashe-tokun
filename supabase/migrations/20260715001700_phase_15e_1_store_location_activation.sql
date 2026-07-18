-- Phase 15E.1 Store Location Activation.
-- Do not execute automatically from the application.
--
-- This is a configuration-only correction. It preserves the existing
-- RETAIL-FLOOR location ID and code used by POS and inventory records while
-- presenting the location as Store in the Admin transfer workflow.
-- No inventory quantities, movements, orders, or POS logic are changed.

update public.inventory_locations
set
  name = 'Store',
  description = 'ASHE TOKUN store sales floor inventory location.',
  location_type = 'retail_floor',
  active = true,
  updated_at = now()
where code = 'RETAIL-FLOOR';
