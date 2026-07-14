# Timekeeper Operating Rules

## Punch Rules

- Staff may clock in once per work date.
- Staff may start and end breaks while clocked in.
- Staff must end an active break before clocking out.
- Approved and archived timecards cannot receive normal staff punches.
- Manual missed punches require a manager permission and a correction reason.

## Timecard Rules

- Timecards are created for a staff member and work date.
- Scheduled shift links are copied from published schedules when available.
- Actual worked time is derived from punch history.
- Break time is derived from break-out and break-in pairs.
- Regular and overtime columns are stored for future payroll integration, but Phase 10.5 does not process payroll.

## Exception Rules

The system can flag:

- Late arrival
- Early arrival
- Early departure
- Late departure
- Missed clock-out
- Unscheduled work
- Time-off conflict
- Excessive shift duration

Managers may resolve or dismiss exceptions with notes. Exception history should be preserved.

## Review Rules

- Staff can submit their own timecards.
- Authorized managers can approve or reopen timecards.
- Reopened timecards require manager notes.
- Owner and Managing Partner can perform operational Timekeeper review.

## Privacy Rules

- Timekeeper does not use biometrics.
- Timekeeper does not use facial recognition.
- Timekeeper does not use GPS surveillance.
- Staff self-service views must not expose other employees' timecards.

## Production Readiness Notes

Before production, replace development RLS with authenticated staff claims and role-based policies. Keep correction and approval actions server-side.
