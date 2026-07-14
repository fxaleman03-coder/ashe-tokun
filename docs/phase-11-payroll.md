# Phase 11 Payroll & Pay Period Foundation

Phase 11 introduces the payroll period layer above Timekeeper without changing punch logic, timecard approval, or Payroll PDF generation.

## Architecture

Payroll sits above approved daily timecards:

1. Employee
2. Daily timecards
3. Pay period
4. Weekly payroll review
5. Future payroll export

The only new database structure prepared in this phase is `payroll_periods`. It defines period names, date ranges, cadence, status, approval metadata, and notes.

Phase 11.1B adds payroll period creation metadata:

- pay date
- optional location scope

No tax, deduction, wage, payment, or employee pay-rate tables are introduced.

## Workflow

The Admin Payroll dashboard reads payroll periods when the migration has been run. If the table is not available yet, the dashboard falls back to a current weekly period shell.

Approved Timekeeper timecards are aggregated by employee for the selected pay period:

- employee number
- employee name
- business title
- regular approved minutes
- overtime approved minutes
- total approved minutes
- approved timecard count
- pending timecard count placeholder

Payroll does not recalculate hours. It reuses Timekeeper-approved regular, overtime, and total values.

## Phase 11.1 Payroll Actions

Phase 11.1 adds payroll preparation snapshots without changing source Timekeeper records.

Generate Payroll:

- loads the selected payroll period
- blocks closed periods
- reads Timekeeper timecards within the period date range
- includes approved timecards by default
- groups approved timecards by employee
- creates or updates `payroll_period_employees`
- creates or updates `payroll_period_timecards`
- sets the period to `processing`
- writes payroll events and audit logs

Refresh Payroll Data:

- runs the same aggregation for `processing` or `reopened` periods
- preserves excluded employee rows
- preserves payroll notes
- blocks closed periods

Employee review actions:

- Review marks an employee payroll row as `reviewed`.
- Approve marks an employee payroll row as `approved`.
- Exclude marks an employee as `excluded` and requires a reason.
- Include restores the row to its readiness state based on current captured counts.

Period actions:

- Approve Period requires all employee rows to be `approved` or `excluded`.
- Close Period requires an approved period and marks the period immutable.
- Reopen Period requires a reason and moves approved or closed periods to `reopened`.

Every major action writes a `payroll_events` row. Mutation actions also write an `audit_logs` row with `entity_type = payroll`.

## Exports

Phase 11.1 adds server-side export routes:

- `/api/admin/payroll/[id]/export/csv`
- `/api/admin/payroll/[id]/export/xlsx`
- `/api/admin/payroll/[id]/pdf`
- `/api/admin/payroll/[id]/package`

CSV and Excel exports include employee number, employee name, business title, location, period dates, regular hours, overtime hours, total hours, and payroll status.

Payroll Period PDF includes the period summary, employee table, totals, and approval/close status.

Payroll Package ZIP includes:

- Payroll Period Summary PDF
- Payroll CSV
- Payroll Excel
- one official Payroll Timecard PDF per included captured timecard

Exports intentionally exclude UUIDs, attendance exceptions, break totals, PIN/session data, wages, taxes, deductions, and payment data.

## Permissions

New permissions:

- `payroll.view`
- `payroll.manage`
- `payroll.export`
- `payroll.approve`

Owner and Managing Partner receive the full payroll permission set. Store Manager receives operational payroll review, management, and approval access. Assistant Manager receives payroll view access. Accounting receives payroll view and export preparation access.

## Dashboard

`/admin/payroll` includes foundation cards for:

- Current Pay Period
- Employees
- Approved Timecards
- Pending Timecards
- Regular Hours
- Overtime Hours
- Total Payroll Hours
- Generate Payroll
- Export CSV
- Export Excel

Generate and export actions are placeholders only.

## Future Phases

Future payroll work should add:

- pay period creation and scheduling automation
- payroll locking
- payroll approval workflow
- employee pay rates
- tax and deduction integrations
- accounting export

The existing employee-level Payroll PDF remains unchanged and continues to be served from `/api/admin/timekeeper/[id]/pdf`.

## Known Limitations

- Payroll periods require manually running `supabase/migrations/phase-11-payroll-foundation.sql`.
- Phase 11.1 requires manually running `supabase/migrations/phase-11-1-payroll-actions.sql`.
- Phase 11.1B requires manually running `supabase/migrations/phase-11-1b-payroll-period-form.sql`.
- The dashboard and exports use approved Timekeeper data only.
- No payroll locking beyond closed-period mutation blocking is implemented in this phase.
- ZIP and XLSX generation are lightweight server-side implementations without external payroll-provider integrations.
