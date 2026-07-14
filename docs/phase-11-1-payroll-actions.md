# Phase 11.1 Payroll Actions, Export, and Package Foundation

Phase 11.1 turns Payroll from a read-only foundation into a controlled payroll preparation workflow.

## Scope

Included:

- Generate Payroll
- Refresh Payroll Data
- employee review, approval, exclusion, and inclusion
- period approval, close, and reopen
- CSV export
- Excel export
- Payroll Period PDF
- Payroll Package ZIP
- payroll events and audit logs

Excluded:

- wages
- hourly rates
- salaries
- taxes
- deductions
- direct deposit
- paychecks
- payroll provider API integrations
- legal overtime determination
- PTO balances
- automatic payroll transmission
- employee payroll self-service

## Migration

Run manually only:

1. `supabase/migrations/phase-11-payroll-foundation.sql`
2. `supabase/migrations/phase-11-1-payroll-actions.sql`

The Phase 11.1 migration adds:

- `payroll_period_employees`
- `payroll_period_timecards`
- `payroll_events`
- `closed_by_staff_id` and `closed_at` on `payroll_periods`
- `reopened` as a payroll period status

Phase 11.1B adds:

- `pay_date` on `payroll_periods`
- `location_id` on `payroll_periods`
- indexes for pay date and location filtering

Run `supabase/migrations/phase-11-1b-payroll-period-form.sql` before using `/admin/payroll/new`.

## Create Payroll Period

`/admin/payroll/new` requires `payroll.manage`.

The form creates a draft payroll period with:

- period name
- period type
- start date
- end date
- pay date
- optional location scope
- notes

Creating a payroll period does not generate payroll rows. Generate Payroll must be run manually after the period is created.

No data is seeded.

## Generate Payroll

`generatePayrollPeriod(periodId)` requires `payroll.manage`.

The mutation:

- validates the period exists
- blocks closed periods
- only runs on draft periods
- reads Timekeeper timecards inside the period date range
- snapshots approved timecards only
- counts pending and incomplete timecards
- creates or updates employee summary rows
- creates or updates timecard snapshot rows
- changes the period to `processing`
- writes `payroll_generated`

Source timecards and punches are never modified.

## Refresh Payroll Data

`refreshPayrollPeriod(periodId)` requires `payroll.manage`.

Refresh is allowed for `processing` and `reopened` periods. It updates payroll snapshots while preserving excluded employee rows and payroll notes.

## Employee Review

Employee actions:

- `reviewPayrollEmployee`
- `approvePayrollEmployee`
- `excludePayrollEmployee`
- `includePayrollEmployee`

Approval is blocked if incomplete timecards remain. Exclusion requires a reason.

## Period Status

Supported statuses:

- `draft`
- `processing`
- `approved`
- `closed`
- `reopened`

Approval requires every employee row to be approved or excluded. Closing requires an approved period. Reopening requires a reason.

## Exports

CSV:

- UTF-8 CSV
- safe filename
- decimal hours
- no UUIDs or sensitive session data

Excel:

- `.xlsx` workbook
- `Payroll` sheet
- frozen top row
- decimal hours

PDF:

- official payroll period summary
- employee hours table
- totals
- approval and close metadata

Package:

- ZIP file
- period PDF
- CSV
- Excel
- official Payroll Timecard PDFs for included captured timecards

## Permissions

New Phase 11.1 permissions:

- `payroll.close`
- `payroll.reopen`
- `payroll.generate_package`

Existing payroll permissions:

- `payroll.view`
- `payroll.manage`
- `payroll.export`
- `payroll.approve`

Owner and Managing Partner receive full payroll permissions. Accounting receives payroll management, export, approval, close, reopen, and package permissions. Store Manager receives payroll review/approval access without close authority unless explicitly assigned.

## Known Limitations

- Pay periods must already exist; this phase does not auto-create payroll periods.
- There is no wage, tax, deduction, or payment calculation.
- Payroll package generation uses current server-side PDFs and lightweight ZIP/XLSX generation.
- There is no payroll provider integration.
- There is no employee self-service payroll portal.
