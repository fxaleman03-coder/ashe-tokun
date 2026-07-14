# Launch Readiness Phase B Technical Cleanup

## Executive Summary

Phase B performed the first safe cleanup pass from
`docs/launch-readiness-phase-a.md`. Cleanup was limited to confirmed obsolete
artifacts, macOS metadata, unused starter assets, and temporary diagnostics.

No business logic was changed. No SQL was executed. No Supabase data, products,
employees, customers, orders, inventory, schedules, timecards, payroll, settings,
permissions, or authentication behavior was modified.

## Files Deleted

| Path | Why Safe To Delete | Zero Usage Confirmation |
| --- | --- | --- |
| `.DS_Store` | macOS metadata only | matched metadata filename pattern |
| `app/.DS_Store` | macOS metadata only | matched metadata filename pattern |
| `Logo/.DS_Store` | macOS metadata only | matched metadata filename pattern |
| `public/.DS_Store` | macOS metadata only | matched metadata filename pattern |
| `public/products/.DS_Store` | macOS metadata only | matched metadata filename pattern |
| `public/products/ajako-originals/.DS_Store` | macOS metadata only | matched metadata filename pattern |
| `public/products/ajako-originals/keychains/.DS_Store` | macOS metadata only | matched metadata filename pattern |
| `public/products/ajako-originals/opele/.DS_Store` | macOS metadata only | matched metadata filename pattern |
| `public/products/ide/.DS_Store` | macOS metadata only | matched metadata filename pattern |
| `public/file.svg` | default Next starter asset | `rg` found only Phase A documentation references |
| `public/globe.svg` | default Next starter asset | `rg` found only Phase A documentation references |
| `public/next.svg` | default Next starter asset | `rg` found only Phase A documentation references |
| `public/vercel.svg` | default Next starter asset | `rg` found only Phase A documentation references |
| `public/window.svg` | default Next starter asset | `rg` found only Phase A documentation references |

## Files Modified

- `.gitignore`
- `app/admin/scheduling/[id]/page.tsx`
- `lib/data/payrollMutations.ts`
- `docs/launch-readiness-deferred-features.md`
- `docs/launch-readiness-phase-b-technical-cleanup.md`
- `docs/macos-development-storage-cleanup.md`

## Empty Directories Removed

| Path | Why Safe To Remove | Confirmation |
| --- | --- | --- |
| `app/admin/timekeeper/[id]/print` | legacy HTML timecard print route folder was empty | no files existed in folder, no live links to `/admin/timekeeper/[id]/print`, and `/api/admin/timekeeper/[id]/pdf` remains unchanged |

## Dead Components Removed

None. No component was conclusively proven dead in this pass.

## Dead Utilities Removed

None. Active helper consolidation is deferred to Phase C because broad utility
cleanup would risk behavior changes.

## Legacy Routes Removed

- Removed the empty legacy HTML timecard print route folder:
  `app/admin/timekeeper/[id]/print`.

The active payroll timecard PDF route remains:

- `/api/admin/timekeeper/[id]/pdf`

## CSS Removed

None. Staff Schedule print CSS remains active and scoped through
`.staff-schedule-page` and `#staff-schedule-print`.

## Diagnostics Removed

- Removed temporary scheduling detail read diagnostics from
  `app/admin/scheduling/[id]/page.tsx`.
- Removed temporary payroll period creation payload diagnostics from
  `lib/data/payrollMutations.ts`.

Production-safe failure diagnostics in repositories and migration/bootstrap
script summary logs were retained.

## Dependencies Removed

None. Static usage confirmed current dependencies are used by application code,
scripts, build tooling, PDF generation, Supabase, authentication, or Tailwind.

## Environment Updates

No environment variables were removed. `.env.example` already documents active
variables found through `process.env` references, and `.env.local` was not read
or modified.

## Translation Cleanup

No translation keys were removed. Existing deferred Yoruba review comments and
dynamic translation keys remain because they are active language-system work,
not dead legacy code.

## Documentation Cleanup

Created:

- `docs/launch-readiness-deferred-features.md`
- `docs/launch-readiness-phase-b-technical-cleanup.md`
- `docs/macos-development-storage-cleanup.md`

Historical phase documents were retained for audit value.

## Deferred Cleanup Items

- Replace development RLS policies with production authenticated policies.
- Add production route and API permission audit.
- Move high-risk multi-table writes behind transaction-safe boundaries.
- Split large components and mutation files.
- Consolidate admin localization.
- Optimize large public images.
- Remove empty legacy media folders only after media path verification.
- Self-host Google fonts or document build network requirements.

## Regression Risks

- Asset deletions were limited to default starter SVGs with zero runtime
  references.
- Route deletion was limited to an empty folder with no page file.
- Diagnostic removal does not affect scheduling or payroll mutation behavior.
- Staff Schedule print CSS was intentionally preserved.

## Verification Results

- Deleted route/assets reference search: pass.
- macOS metadata search: pass, no `.DS_Store`, `._*`, `.AppleDouble`, or
  `.LSOverride` files remain in the project tree.
- Temporary diagnostic search: pass for removed scheduling and payroll markers.
- `npm prune`: attempted twice. Both `npm prune` and
  `npm prune --no-audit --no-fund` hung with no output and were stopped with
  exit code 130; no dependency removals were applied.
- `npm run lint`: pass.
- `npm run build`: initial sandbox run failed only because Google Fonts could
  not be fetched. Rerun with network access passed.

## Recommended Phase C Refactoring Priorities

1. Split the largest admin components by workflow and form section.
2. Split scheduling, payroll, timekeeper, and staff mutation files.
3. Create a single admin route/navigation/permission registry.
4. Add production-safe transaction/RPC boundaries for commerce workflows.
5. Convert remaining admin hardcoded strings to translation keys.
6. Replace development RLS policy files with production-authenticated policies.
