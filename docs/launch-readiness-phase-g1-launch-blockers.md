# Launch Readiness Phase G.1: Launch Blocker Remediation

Date: July 14, 2026

Scope: remediate only the production-facing launch blockers identified in `docs/launch-readiness-phase-g-functional-qa.md`.

No SQL was executed. No migrations were applied. No schema was modified. No Supabase data was modified. Phase E production RLS was not applied. Phase F.4 RPCs were not activated. No business rules or calculations were changed.

## Files Modified

- `app/admin/analytics/page.tsx`
- `app/admin/categories/page.tsx`
- `app/admin/database/page.tsx`
- `app/admin/settings/page.tsx`
- `components/Hero.tsx`
- `components/Navbar.tsx`
- `components/admin/AdminPayrollDashboard.tsx`
- `components/admin/AdminSidebar.tsx`
- `components/admin/CatalogViews.tsx`
- `components/admin/EditProductForm.tsx`
- `components/admin/ProductCreationWizard.tsx`
- `components/home/TraditionCard.tsx`
- `components/home/TraditionsSection.tsx`
- `lib/catalog.ts`
- `lib/data/shippingOriginsRepository.ts`
- `lib/staff/permissions.ts`
- `lib/translations/en.ts`
- `lib/translations/es.ts`
- `lib/translations/index.ts`

## Files Created

- `docs/launch-readiness-phase-g1-launch-blockers.md`

## Launch Blockers Resolved

### Homepage Hero CTAs

Resolved.

- Primary CTA now links to `/shop`.
- Secondary CTA now links to `/#traditions`.
- No `href="#"` remains in application source.

### Tradition Card CTAs

Resolved.

- `TraditionCard` now accepts a real `href`.
- The homepage traditions section now has `id="traditions"`.
- Visible tradition cards route to existing storefront category pages:
  - `/shop/category/opele`
  - `/shop/category/elekes`
  - `/shop/category/iruke`
  - `/shop/category/ide`

### Public Navigation

Resolved.

- Public nav no longer points to nonexistent `/about` or `/contact` routes.
- Public nav now points to existing production routes:
  - `/`
  - `/shop`
  - `/#traditions`
  - `/shop/category/ide`
- English and Spanish nav labels were updated to match the routes.

### Admin Sidebar Legacy Status Message

Resolved.

- Removed stale copy claiming authentication and database access were not connected.
- Sidebar now accurately states that staff authentication and Supabase-backed operations are connected, while production RLS and transactional RPC activation remain launch-hardening gates.

### Analytics Page

Resolved.

- Analytics now displays a clear `Coming Soon` state.
- No fake analytics actions are shown.
- Sidebar label is now `Analytics (Soon)` so navigation does not imply the module is fully active.

### Settings Page

Resolved.

- Settings now describes the current launch scope honestly.
- Static store settings are marked read-only.
- The real Shipping Origins management route remains available.

### Payroll Dashboard Filters

Resolved.

- Payroll filter cards now say `Coming Soon`.
- Each filter card explicitly says the filter control is not enabled yet.
- They no longer appear to be working controls.

### Yoruba Production Language Option

Resolved.

- Yoruba remains in the translation system.
- `lib/translations/yo.ts` remains intact.
- `LanguageProvider` still supports the `yo` translation key internally.
- The production language selector now exposes only English and Spanish until Yoruba copy review is complete.

### Visible Placeholder Wording

Resolved for production-facing launch blocker text.

Cleaned visible wording in:

- product margin helper text
- product description/cost/SEO field hints
- category parent fallback
- catalog visibility label
- shipping-origin fallback notes
- payroll permission description
- database product SKU label
- Product Wizard unavailable vendor creation card

## Navigation Audit

### Public Navigation

Status: pass.

- No `href="#"` links remain.
- No public navbar links point to missing `/about` or `/contact` routes.
- Hero and tradition CTAs route to existing pages or anchors.

### Admin Navigation

Status: pass with deferred labels.

- Analytics is visible but marked `Analytics (Soon)`.
- Settings routes remain visible and honest about read-only/current launch scope.
- Sidebar status copy no longer misstates auth/database connectivity.

## Dead-Link Audit

Search performed:

```bash
rg -n "href=\"#|href='#[^']*'" app components lib --glob '!**/*.md'
```

Result:

- No matches.

## Placeholder Audit

Search performed:

```bash
rg -n "Placeholder|placeholder|TODO|Mock|mock|Sample|sample|Demo|demo|Temporary|temporary|Coming Soon|coming soon" app components lib --glob '!**/*.md'
```

Remaining matches fall into these categories:

- normal HTML `placeholder` attributes for form inputs
- internal translation type keys such as `detailsPlaceholder`
- staff temporary PIN workflow terminology
- Yoruba translation review comments; Yoruba is hidden from production language selectors
- explicit `Coming Soon` labels for intentionally deferred Analytics and Payroll filters
- internal fallback image variable names

No remaining `TODO`, `Mock`, `mock`, `Demo`, or `demo` matches were found in application source.

## Remaining Deferred Items

These remain intentionally deferred and should not be mistaken for completed production functionality:

- Phase F.4A backup/checkpoint, RPC execution, RPC verification, and Server Action switch-over
- Phase E production RLS/storage hardening execution
- Analytics reporting dashboards
- Payroll dashboard filters
- Account Settings and Activity Log pages from the user menu
- Yoruba production copy review
- legacy browser-capable `lib/storage/mediaStorage.ts` retirement

## Production Readiness Score

Current score: **68 / 100**

Rationale:

- Production-facing dead links and misleading placeholder/status copy were remediated.
- Route protection and server-action migration remain in good shape from prior phases.
- The major remaining readiness blockers are backend hardening gates: transactional RPC activation, backup-gated migration verification, production RLS/storage hardening, and controlled role-by-role manual QA.

## Recommendation

Do not launch production yet.

Recommended next gate:

1. Confirm a safe development Supabase backup/export checkpoint.
2. Resume Phase F.4A RPC activation in development.
3. Verify POS, returns, and shipping rollback/idempotency behavior.
4. Re-review Phase E production RLS/storage migrations after RPC activation.
5. Run controlled authenticated manual QA with fixture data.
