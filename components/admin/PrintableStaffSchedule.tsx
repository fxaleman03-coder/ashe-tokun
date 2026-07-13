import type { StaffSchedulePeriod, StaffShift } from "@/lib/types/scheduling";
import { formatTimeForDisplay } from "@/lib/utils/schedulingTime";

type PrintableStaffScheduleProps = {
  period: StaffSchedulePeriod;
  shifts: StaffShift[];
  preparedBy?: string;
};

function employeeNumber(shift: StaffShift) {
  return shift.staff_member?.employee_number ?? "";
}

function employeeName(shift: StaffShift) {
  const staff = shift.staff_member;

  if (!staff) return `Employee ${shift.staff_member_id.slice(0, 8)}`;

  return staff.display_name || `${staff.first_name} ${staff.last_name}`.trim() || "Employee";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  }).format(new Date(`${value}T00:00:00`));
}

function formatPublishedDate(value: string | null) {
  if (!value) return "Draft";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function PrintableStaffSchedule({
  period,
  shifts,
  preparedBy = "ASHE TOKUN Admin",
}: PrintableStaffScheduleProps) {
  const printableShifts = shifts
    .filter((shift) => shift.status !== "cancelled")
    .sort((first, second) =>
      `${first.shift_date}${first.start_time}${employeeName(first)}`.localeCompare(
        `${second.shift_date}${second.start_time}${employeeName(second)}`,
      ),
    );

  return (
    <section id="staff-schedule-print" className="print-only" aria-label="Printable staff schedule">
      <header className="staff-print-header">
        <p className="staff-print-brand">ASHE TOKUN</p>
        <h1>Staff Schedule</h1>
        <div className="staff-print-meta">
          <p>
            <span>Schedule</span>
            {period.name}
          </p>
          <p>
            <span>Location</span>
            {period.location_name ?? "All locations"}
          </p>
          <p>
            <span>Date Range</span>
            {formatDate(period.start_date)} - {formatDate(period.end_date)}
          </p>
          <p>
            <span>Published</span>
            {formatPublishedDate(period.published_at)}
          </p>
          <p>
            <span>Prepared By</span>
            {preparedBy}
          </p>
        </div>
      </header>

      {printableShifts.length === 0 ? (
        <p className="staff-print-empty">There are no shifts to print.</p>
      ) : (
        <table className="staff-print-table">
          <thead>
            <tr>
              <th>Employee #</th>
              <th>Employee Name</th>
              <th>Date</th>
              <th>Day</th>
              <th>Start</th>
              <th>End</th>
              <th>Break</th>
              <th>Shift / Role</th>
              <th>Location</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {printableShifts.map((shift) => (
              <tr key={shift.id}>
                <td>{employeeNumber(shift) || "Pending"}</td>
                <td>{employeeName(shift)}</td>
                <td>{formatDate(shift.shift_date)}</td>
                <td>{formatDay(shift.shift_date)}</td>
                <td>{formatTimeForDisplay(shift.start_time)}</td>
                <td>{formatTimeForDisplay(shift.end_time)}</td>
                <td>{shift.unpaid_break_minutes} min</td>
                <td>{shift.role_label ?? "Staff Shift"}</td>
                <td>{shift.location_name ?? period.location_name ?? "Pending"}</td>
                <td>{shift.notes ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
