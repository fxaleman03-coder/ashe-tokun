# Phase 10.4A Scheduling Audit

ASHE TOKUN Employee Scheduling was audited as a retail staff operations module. This audit does not introduce time clock, payroll, training, notifications, or manufacturing workflows.

No SQL was executed. No schedules, shifts, staff records, availability rows, or time-off requests were created or deleted during this audit.

## Database Schema Audit

Reviewed:

- `public.staff_schedule_periods`
- `public.staff_shifts`
- `public.staff_availability`
- `public.staff_time_off_requests`
- `public.staff_schedule_events`

Confirmed `public.staff_shifts` columns:

- `id`
- `schedule_period_id`
- `staff_member_id`
- `location_id`
- `shift_date`
- `start_time`
- `end_time`
- `unpaid_break_minutes`
- `role_label`
- `department_label`
- `notes`
- `status`
- `created_by_staff_id`
- `updated_by_staff_id`
- `created_at`
- `updated_at`

Confirmed constraints:

- Shift status is limited to `scheduled`, `confirmed`, `cancelled`, `completed`, `no_show`.
- Shift end time must be after start time.
- Break minutes must be non-negative.
- Shift trigger validates schedule period existence, archived schedule protection, date inside schedule period, active staff eligibility, overlapping active shifts, and approved time-off conflicts.
- Availability weekday is limited to 0-6.
- Time-off dates must have `end_date >= start_date`.

## Critical Issues

### Scheduling board read zero after successful insert

Severity: Critical

Workflow reviewed: Add Shift, Schedule Detail, Weekly Schedule Board, Print Schedule.

Root cause: `lib/data/schedulingRepository.ts` read scheduling data with the public anon Supabase client while embedding `staff_members` and `inventory_locations` relationships. Staff authentication policies intentionally deny anon reads from `staff_members`, so the shift row could insert successfully through the service-role mutation while the board read returned zero rows or failed silently.

Files affected:

- `lib/data/schedulingRepository.ts`
- `app/admin/scheduling/[id]/page.tsx`
- `components/admin/WeeklyScheduleBoard.tsx`
- `components/admin/PrintableStaffSchedule.tsx`

Fix applied:

- Scheduling repository is now server-only.
- Scheduling reads use `createSupabaseServiceClient()` first, falling back only when unavailable.
- Scheduling routes are marked `dynamic = "force-dynamic"` so live reads are not served from stale route payloads.
- Board and print now receive the same service-backed shifts.

Verification:

- Static code path reviewed.
- `npm run lint` passed.
- `npm run build` passed.

## High Issues

### Optional form fields could be lost before mutation

Severity: High

Workflow reviewed: Add Shift, Create Schedule, Availability, Time-Off Request.

Root cause: Several client components read values from `FormData` inside `startTransition`. In practice, required fields still arrived, but optional text fields such as `notes`, `department_label`, and similar fields could be unreliable across asynchronous action boundaries.

Files affected:

- `components/admin/ShiftForm.tsx`
- `components/admin/SchedulePeriodForm.tsx`
- `components/admin/StaffAvailabilityManager.tsx`
- `components/staff/StaffTimeOffRequestForm.tsx`
- `lib/data/schedulingMutations.ts`

Fix applied:

- Form payloads are now captured synchronously before entering `startTransition`.
- Shift mutation inserts exact database columns, including `location_id`, `role_label`, `department_label`, and `notes`.
- Shift insert verifies the returned row with `.select(...).single()`.
- Errors return structured `fieldErrors`, `conflicts`, and safe Supabase details where applicable.

Verification:

- Static form-to-mutation mapping reviewed.
- `npm run lint` passed.
- `npm run build` passed.

### Print Schedule blocked because board believed shifts were empty

Severity: High

Workflow reviewed: Print Schedule.

Root cause: Print availability was derived from the board's `activeShifts`. Because repository reads returned zero, the print button was disabled or did nothing.

Files affected:

- `components/admin/WeeklyScheduleBoard.tsx`
- `components/admin/PrintableStaffSchedule.tsx`
- `app/globals.css`

Fix applied:

- Read path fixed through service-backed repository.
- Print button still blocks truly empty active schedules.
- Printable schedule uses the same active shift statuses: `scheduled` and `confirmed`.
- Print container is isolated with `#staff-schedule-print`.

Verification:

- Static print path reviewed.
- `npm run lint` passed.
- `npm run build` passed.

## Medium Issues

### Schedule detail pages could rely on ambiguous cache behavior

Severity: Medium

Workflow reviewed: Admin scheduling routes and staff self-service routes.

Root cause: The pages are authenticated, server-rendered, and live data backed. Some routes did not explicitly declare dynamic rendering.

Files affected:

- `app/admin/scheduling/page.tsx`
- `app/admin/scheduling/new/page.tsx`
- `app/admin/scheduling/[id]/page.tsx`
- `app/admin/scheduling/availability/page.tsx`
- `app/admin/scheduling/time-off/page.tsx`
- `app/staff/schedule/page.tsx`
- `app/staff/availability/page.tsx`
- `app/staff/time-off/page.tsx`

Fix applied:

- Added `export const dynamic = "force-dynamic"` to scheduling routes.
- Existing `revalidatePath()` and `router.refresh()` behavior remains in place.

Verification:

- `npm run build` confirms dynamic routes compile.

### Board did not display saved notes or labels clearly

Severity: Medium

Workflow reviewed: Weekly Schedule Board.

Root cause: Shift cards displayed the word `Notes` when notes existed rather than rendering the saved note text. Role and department labels were also not visible on shift cards.

Files affected:

- `components/admin/WeeklyScheduleBoard.tsx`

Fix applied:

- Shift cards now show actual notes.
- Shift cards now show role label and department label when present.

Verification:

- Static render path reviewed.
- `npm run lint` passed.
- `npm run build` passed.

## Low Issues

### Time display formatting needed a consistent boundary

Severity: Low

Workflow reviewed: Admin board, staff schedule, printable schedule, time inputs.

Root cause: Database time values are canonical 24-hour `time` values, while UI should present display-only 12-hour AM/PM text. Earlier fixes added the shared time helper but the audit confirmed it should remain the single formatting boundary.

Files affected:

- `lib/utils/schedulingTime.ts`
- `components/admin/WeeklyScheduleBoard.tsx`
- `components/admin/PrintableStaffSchedule.tsx`
- `components/staff/StaffScheduleView.tsx`

Fix applied:

- Inputs use canonical `HH:mm`.
- Mutations submit `HH:mm:ss` for database writes.
- UI and print use `formatTimeForDisplay()` for 12-hour display.

Verification:

- `npm run lint` passed.
- `npm run build` passed.

## Workflow Review Summary

Reviewed workflows:

- Create schedule period.
- Add shift.
- Shift conflict detection.
- Weekly board rendering.
- Print schedule.
- Publish schedule.
- Archive schedule.
- Availability management.
- Time-off request submission.
- Time-off approval and denial.
- Staff schedule self-service.
- Staff availability self-service.
- Staff time-off self-service.
- Admin route permission protection.

## Current Stabilized Behavior

- Add Shift inserts into `public.staff_shifts`.
- Required and optional shift fields are mapped to exact database column names.
- Board reads shifts through server-side service access.
- Board refreshes after successful shift creation.
- Print Schedule is available when active shifts exist.
- Empty schedules cannot be printed.
- Empty schedules cannot be published.
- Overlap protection remains active.
- UI displays 12-hour time while database stores canonical time values.

## Unresolved Limitations

- This phase still depends on `SUPABASE_SERVICE_ROLE_KEY` for server-side scheduling reads and mutations.
- Development RLS policies are not production policies.
- This audit did not execute SQL or inspect live Supabase rows directly.
- No automated browser/Safari print test was run from Codex because that would require GUI control.
- Time clock, payroll, PTO balances, shift swaps, notifications, training, and labor forecasting remain deferred.

## Verification Performed

- Static schema review.
- Static RLS policy review.
- Full scheduling repository/mutation/component route review.
- Type and build verification:
  - `npm run lint`
  - `npm run build`
