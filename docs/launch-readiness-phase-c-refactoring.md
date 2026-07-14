# Launch Readiness Phase C Controlled Refactoring

## Executive Summary

Phase C started the controlled architectural refactoring work identified in
`docs/launch-readiness-phase-a.md` and
`docs/launch-readiness-phase-b-technical-cleanup.md`.

The implemented refactor was intentionally narrow: payroll mutation support code
was split into cohesive server-only modules while preserving every public server
action exported from `lib/data/payrollMutations.ts`.

No SQL was executed. No schema, Supabase data, permissions, authentication,
business calculations, UI design, or route behavior was changed.

## Large File Analysis

| File | Responsibilities Observed | Phase C Decision |
| --- | --- | --- |
| `lib/staff/staffActions.ts` | login/logout/change PIN, staff profile lifecycle, PIN reset, session revocation, deactivation/reactivation/archive, permission update/clone, audit helpers | Deferred. High security coupling; should be split with auth/profile/permission regression tests. |
| `lib/data/schedulingMutations.ts` | schedule periods, shifts, conflict checks, staff eligibility, availability, time off, copy/duplicate schedule, event writing | Deferred. Scheduling behavior is active and sensitive; split after workflow fixtures exist. |
| `lib/data/payrollMutations.ts` | period creation, generation/refresh aggregation, employee review/approval/exclusion, period approval/close/reopen, event/audit writing, validation/revalidation helpers | Refactored. Shared support code extracted; public action facade preserved. |
| `components/admin/EditProductForm.tsx` | Product Studio field groups, media selection, pricing/inventory/status logic, save state | Deferred. UI split requires visual regression checks. |
| `components/admin/ProductCreationWizard.tsx` | wizard state, SKU preview, product/media linking, form sections, validation, Supabase create flow | Deferred. Product creation behavior is broad; split by step after tests. |
| `components/admin/AdminPOS.tsx` | product search, cart, discounts, payment capture, customer selection, sale completion | Deferred. POS behavior is protected for launch. |
| `components/admin/ShipmentCreationWizard.tsx` | order selection, fulfillment mode, package/carrier inputs, address snapshots, review, shipment creation | Deferred. Shipping creation behavior is protected for launch. |

## Files Split

`lib/data/payrollMutations.ts` was split internally into:

- `lib/payroll/mutations/audit.ts`
- `lib/payroll/mutations/employeeAggregation.ts`
- `lib/payroll/mutations/shared.ts`

## Files Simplified

- `lib/data/payrollMutations.ts`

The file remains the public server-action facade for existing imports:

- `writePayrollEvent`
- `createPayrollPeriod`
- `generatePayrollPeriod`
- `refreshPayrollPeriod`
- `reviewPayrollEmployee`
- `approvePayrollEmployee`
- `excludePayrollEmployee`
- `includePayrollEmployee`
- `approvePayrollPeriod`
- `closePayrollPeriod`
- `reopenPayrollPeriod`

## Modules Extracted

### `lib/payroll/mutations/audit.ts`

Purpose:

- payroll event type catalog
- payroll event insert helper
- payroll audit insert helper

Behavior preserved:

- same `payroll_events` insert payload
- same `audit_logs` insert payload
- same optional metadata behavior

### `lib/payroll/mutations/employeeAggregation.ts`

Purpose:

- employee payroll status derivation
- approved/pending/incomplete timecard counting
- payroll employee row payload construction
- payroll timecard snapshot upsert type

Behavior preserved:

- excluded employees stay excluded
- ready/incomplete/pending status rules are unchanged
- regular/overtime/total minute aggregation is unchanged
- review and approval fields are reset or preserved the same way as before

### `lib/payroll/mutations/shared.ts`

Purpose:

- safe Supabase error formatting wrapper
- text normalization
- ISO date validation
- payroll period type validation
- payroll route revalidation
- permission actor loading
- payroll period mutation loading/closed-period guard

Behavior preserved:

- same validation patterns
- same revalidated paths
- same permission guard calls
- same closed-period error behavior

## Public APIs Preserved

No caller imports were changed. Existing app/components/API routes still import
from `@/lib/data/payrollMutations`.

The extracted modules are internal support modules. They do not replace the
existing public mutation entrypoint.

## Largest File Reductions

| File | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| `lib/data/payrollMutations.ts` | 802 lines | 622 lines | 180 lines |

The extracted support modules total 229 lines and are organized by concern
rather than by public action.

## Refactoring Rationale

Payroll was selected first because it had clear internal boundaries and lower UI
regression risk than the large admin components. The refactor removes helper
noise from the public server-action facade while keeping the business workflow
linear and readable.

This approach allows later Phase C work to continue in small slices:

1. split payroll generation/period status workflows further if needed
2. split scheduling helpers after scheduling fixtures exist
3. split staff actions after security regression coverage exists
4. split large UI components with screenshot or browser checks

## Architecture Improvements

- Payroll mutation support code is now grouped by audit/event writing,
  aggregation, and shared mutation infrastructure.
- Server-only boundaries are explicit in extracted modules through
  `import "server-only"`.
- Existing server actions remain stable for components and route handlers.
- Payroll aggregation helpers can now be tested or reviewed independently.

## Remaining Technical Debt

- `lib/staff/staffActions.ts` still combines auth/session/profile/permission
  workflows.
- `lib/data/schedulingMutations.ts` still combines schedule, shift,
  availability, and time-off workflows.
- Large admin components still need UI-safe section extraction.
- POS, shipping, product studio, and product wizard refactors should wait for
  stronger interaction tests.
- Payroll generation and employee status updates could be split further, but
  only after this first extraction proves stable.

## Regression Risks

- The main risk is accidental import or type drift in server-only payroll code.
  This is mitigated by preserving the original public `payrollMutations` facade.
- No database payload shapes were intentionally changed.
- No PDF/export routes were intentionally changed.
- No UI components were intentionally changed.

## Verification Results

- `npm run lint`: pass.
- `npm run build`: initial sandbox run failed only because Google Fonts could
  not be fetched. Rerun with network access passed after TypeScript surfaced one
  missing type import, which was fixed.
- SQL executed: no.
- Schema changes: no.
- Supabase data changes: no.
- UI redesign: no.
- Business logic changes: no intentional changes; payroll payloads, status
  rules, event/audit writes, route revalidation, and exported action names were
  preserved.

## Recommendations For Future Work

1. Add workflow-level tests or fixtures for payroll generation and approval.
2. Split scheduling mutations into period, shift, availability, and time-off
   modules.
3. Split staff actions into auth/session, profile lifecycle, PIN/session admin,
   and permission management modules.
4. Extract Product Studio sections after visual regression checks are available.
5. Extract POS checkout panels only after sale completion behavior is covered.
6. Keep all public imports stable during each refactor slice.
