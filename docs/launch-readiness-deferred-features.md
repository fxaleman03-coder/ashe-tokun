# Launch Readiness Deferred Features

This list captures cleanup candidates that were intentionally not removed during
Launch Readiness Phase B because they are active limitations, historical records,
or future work rather than proven dead code.

## Deferred To Later Refactoring

- Split large admin components such as `EditProductForm`,
  `ProductCreationWizard`, `AdminPOS`, and `ShipmentCreationWizard`.
- Split large mutation files such as `staffActions`, `schedulingMutations`,
  `payrollMutations`, and `timekeeperMutations`.
- Consolidate repeated admin form/table UI patterns.
- Create a shared admin route/navigation/permission registry.
- Continue admin localization after the storefront and staff language system.
- Replace hardcoded `USE_SUPABASE` with environment-driven configuration.
- Self-host or vendor Google fonts to avoid restricted-network build failures.
- Optimize large public brand and product images.
- Consolidate duplicate date, duration, and formatting helpers after tests cover
  scheduling, timekeeper, payroll, shipping, and POS flows.

## Must Remain For Historical Or Operational Value

- Supabase migrations and policy files, including development-only policies,
  remain as manual execution records until production replacements exist.
- Phase documentation remains as implementation history unless it becomes a
  true duplicate with no audit value.
- Placeholder labels in active forms and intentionally disabled future actions
  remain where they explain a deferred workflow.
- Production-safe repository error diagnostics remain where they report failed
  reads or writes without logging secrets.

## Requires Functional Verification Before Cleanup

- Empty legacy product/category media folders under `public/products`.
- Duplicate-looking product images, especially Opele product images.
- Translation keys accessed dynamically through the language system.
- Any component not found by simple static import search.
- Any dependency used by build tooling, scripts, PDF generation, export routes,
  Supabase access, or authentication.

