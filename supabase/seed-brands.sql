insert into public.brands (name, slug, description, active)
values
  (
    'AJAKO ORIGINALS',
    'ajako-originals',
    'In-house handcrafted spiritual goods.',
    true
  ),
  (
    'ODIBERE CREATIONS',
    'odibere-creations',
    'Traditional handcrafted beadwork.',
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  active = true,
  updated_at = now();
