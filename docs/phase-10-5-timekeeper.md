# Phase 10.5 Timekeeper, Attendance & Timecard Foundation

Phase 10.5 adds secure attendance tracking for ASHE TOKUN staff.

## Scope

- Staff can clock in, start break, end break, and clock out.
- Staff can view their own current timecard and history.
- Managers with Timekeeper permissions can review timecards.
- Managers can add missed punches with required correction reasons.
- Managers can approve, reopen, resolve, or dismiss exceptions.
- Timecard PDFs are available from the admin timecard detail view.

## Out of Scope

- Payroll processing
- Wage calculations
- Taxes
- Deductions
- Paychecks
- Training or certifications
- Biometric, facial-recognition, or GPS tracking

## Architecture

Scheduling records planned work. Timekeeper records actual worked time.

Timekeeper tables:

- `staff_timecards`
- `staff_punches`
- `staff_timecard_exceptions`
- `staff_timekeeper_events`

Every punch and manager action writes a timekeeper event. Attendance actions also write audit log rows where appropriate.

## Permissions

Timekeeper permissions are grouped under `timekeeper.*`.

Important permissions:

- `timekeeper.clock_self`
- `timekeeper.view_own`
- `timekeeper.view_all`
- `timekeeper.correct_punch`
- `timekeeper.add_missed_punch`
- `timekeeper.review_timecard`
- `timekeeper.approve_timecard`
- `timekeeper.reopen_timecard`
- `timekeeper.resolve_exception`
- `timekeeper.export`

Owner and Managing Partner receive operational Timekeeper authority through role templates. Staff receive self-service clock and own-timecard permissions by role.

## Payroll Timecard PDF

The official print method for payroll timecards is the server-generated PDF
endpoint:

- `/api/admin/timekeeper/[id]/pdf`

The PDF route requires an authenticated staff session and the
`timekeeper.view_all` permission. It uses the normalized Timekeeper repository
data used by the admin detail page, including the current saved
`staff_members.business_title`.

Payroll Timecard PDFs contain payable hours only:

- Regular Hours
- Overtime Hours
- Total Hours Worked
- Approval status and manager notes
- Punch Timeline as supporting evidence

Break punches remain visible in the Punch Timeline, but break totals are not
printed in the payroll summary. Breaks are used internally by Timekeeper
calculations to reduce payable time.

Attendance exceptions are excluded from Payroll Timecard PDFs. Exception
history remains available in the Admin Timekeeper screens. A separate
Attendance Audit Report is deferred for a future phase.

Browser HTML printing has been removed for Timecards because Safari can render
blank previews when print CSS interacts with complex application layouts.

Staff Schedule printing is unchanged and continues to use the existing schedule
print workflow.

PDFs intentionally omit credentials, PIN data, session details, IP addresses,
user agents, UUIDs, sidebars, browser controls, and admin navigation.

## Configuration

Environment variables:

- `BUSINESS_TIME_ZONE`
- `TIMEKEEPER_LATE_GRACE_MINUTES`
- `TIMEKEEPER_EARLY_CLOCK_IN_MINUTES`
- `TIMEKEEPER_BREAK_GRACE_MINUTES`
- `TIMEKEEPER_MAX_SHIFT_HOURS`
- `TIMEKEEPER_DEFAULT_UNPAID_BREAK_MINUTES`
- `TIMEKEEPER_WEEK_START_DAY`
- `TIMEKEEPER_REQUIRE_PUBLISHED_SHIFT`

Database timestamps remain UTC. Work dates and display formatting use the configured business timezone, defaulting to `America/New_York`.

## Activation

Run manually in Supabase SQL Editor:

1. `supabase/migrations/phase-10-5-timekeeper.sql`
2. `supabase/policies-timekeeper-development.sql`
3. Restart localhost.
4. Verify `/staff/timekeeper`.
5. Verify `/admin/timekeeper`.

Development policies are not production RLS.
