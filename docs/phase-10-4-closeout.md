# Phase 10.4 Scheduling Closeout

Phase 10.4 completes the ASHE TOKUN employee scheduling foundation without adding Timekeeper, payroll, training, certifications, or PTO balance accounting.

## Completed Functionality

- Staff schedule periods can be created, populated with shifts, published, archived, and printed.
- Weekly schedule board uses the same non-cancelled shift set for rows, counts, publish checks, and print availability.
- Printable schedules stay hidden during normal browsing and print only the schedule.
- Staff availability supports weekday rows, optional all-day availability, canonical `HH:mm` inputs, database `HH:mm:ss` storage, notes, and effective date windows.
- Staff self-service time off supports full-day and partial-day requests with insert verification and request list refresh.
- Admin time-off review supports approve, deny, review notes, immediate refresh, and explicit employee/reviewer relationships.
- Employee profile editing supports existing schema fields only: name, display name, role, assigned location, active status, and employment status.
- Phase 10.4D prepares executive leadership separation between business title and security role.
- Employee number, PIN hash, sessions, authentication events, and audit history remain protected.

## Bugs Found During Live Testing

- Time inputs received localized AM/PM values in browser `type="time"` fields.
- Schedule board used a narrower active shift filter than the insert flow.
- Print content could become visible in normal admin screen flow.
- Time-off request embeds were ambiguous because `staff_time_off_requests` has two staff foreign keys.
- Time-off and availability reads could look empty when the real problem was a query failure.

## Fixes Applied

- Canonicalized time inputs to `HH:mm` and moved AM/PM to display-only helper text.
- Standardized visible scheduling shifts as `status !== "cancelled"`.
- Added print-only CSS for the staff schedule container.
- Explicitly embedded time-off employee and reviewer relationships by foreign key.
- Added typed read results for time-off and availability paths.
- Added profile update server action with staff edit permission, manager/owner restrictions, last-active-owner protections, and audit logging.
- Added Managing Partner security role architecture, owner-only governance permissions, business title display/edit foundation, and executive governance documentation.

## Permissions And Security Behavior

- Profile editing requires `staff.edit` server-side.
- Owner remains legal owner and keeps reserved governance permissions.
- Managing Partner receives Owner-level operational permissions except owner-only governance permissions.
- Managing Partners cannot edit or assign Owner roles.
- Managers cannot edit executive roles or assign executive roles.
- The final active Owner cannot lose Owner role, active status, or active employment status.
- Availability self-service is limited to the authenticated employee unless broader scheduling permissions are present.
- Time-off approval requires `schedule.approve_time_off`.
- Schedule conflict override requires `schedule.override_conflicts`.

## Known Limitations

- Full HR profile fields such as email, phone, hire date, and notes are deferred because they are not present in the current staff schema.
- Time clock, break punches, missed punch correction, overtime calculation, payroll export, PTO balances, shift swaps, live notifications, and training/certifications remain deferred.
- Availability replacement is validated before write, then replaced for the selected employee. A future database RPC can make the replacement fully transactional.

## Phase 10.5 Timekeeper Handoff

Phase 10.5 should build on the authenticated staff identity, permission engine, scheduling records, and audit patterns established here. Timekeeper should add clock-in/out records, break punches, missed punch workflows, overtime calculations, and payroll export as separate domain work.
