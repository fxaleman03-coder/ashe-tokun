# Phase 10.4 Employee Scheduling

ASHE TOKUN scheduling belongs to ASHE TOKUN staff operations. AJAKO ORIGINALS
and EDIBERE CREATION remain vendors, suppliers, manufacturers, or brands in the
commerce platform. This phase does not create production departments or
manufacturing schedules.

## Architecture

Scheduling is built around:

- `staff_schedule_periods`: schedule date ranges and lifecycle state
- `staff_shifts`: employee shift assignments
- `staff_availability`: recurring weekly availability
- `staff_time_off_requests`: staff time-off requests and review state
- `staff_schedule_events`: append-only scheduling audit events

The app reads live Supabase data when configured and returns empty states safely
when scheduling tables are unavailable or empty.

## Permissions

New permissions use the centralized permission engine:

- `schedule.view_own`
- `schedule.view_team`
- `schedule.view_all`
- `schedule.create`
- `schedule.edit`
- `schedule.publish`
- `schedule.archive`
- `schedule.manage_availability`
- `schedule.manage_time_off`
- `schedule.approve_time_off`
- `schedule.override_conflicts`

Routes and mutations check permissions server-side. Sidebar visibility is only a
convenience layer.

## Schedule Lifecycle

- Draft: editable by authorized scheduling staff.
- Published: visible to staff and changes are audited.
- Archived: read-only historical record.

Published and archived schedules should not be permanently deleted.

## Shift Conflict Rules

The repository and mutation layer detect:

- overlapping active shifts
- approved time off
- outside availability
- inactive or archived employee assignments
- excessive shift length warnings

The SQL migration also adds database-level validation for active staff,
overlaps, period date ranges, and approved time-off blocks.

## Availability

Availability is recurring weekly availability with optional effective dates and
notes. Staff self-service can edit only the authenticated employee’s
availability unless broader scheduling permissions are granted.

## Time Off

Staff can submit and cancel pending requests. Authorized reviewers can approve
or deny requests. Approved time off blocks new shifts unless a future override
workflow is intentionally applied.

## Audit

Significant actions write schedule events:

- schedule created, updated, published, archived
- shift created, updated, cancelled, reassigned
- availability updated
- time off requested, approved, denied

Do not log PINs, session tokens, or sensitive security data in metadata.

## Historical Retention

Historical schedules, shifts, and approved time-off records remain readable even
after an employee leaves. Employee numbers remain permanent and are not reused.

## Known Limitations

Not included in Phase 10.4:

- clock in / clock out
- overtime calculation
- payroll calculation
- PTO balances
- automatic shift swap marketplace
- SMS/email notifications
- labor forecasting
- biometric verification

## Phase 10.5 Handoff

Time clock and attendance data should be implemented separately in Phase 10.5
and should reference schedule shifts without turning schedules into payroll
records.
