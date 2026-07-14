function getNumber(name: string, fallback: number) {
  const raw = process.env[name];
  const parsed = raw ? Number(raw) : Number.NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getBoolean(name: string, fallback: boolean) {
  const raw = process.env[name];

  if (raw === "true") return true;
  if (raw === "false") return false;

  return fallback;
}

export const timekeeperConfig = {
  lateGraceMinutes: getNumber("TIMEKEEPER_LATE_GRACE_MINUTES", 5),
  earlyClockInMinutes: getNumber("TIMEKEEPER_EARLY_CLOCK_IN_MINUTES", 15),
  breakGraceMinutes: getNumber("TIMEKEEPER_BREAK_GRACE_MINUTES", 5),
  maxShiftHours: getNumber("TIMEKEEPER_MAX_SHIFT_HOURS", 16),
  defaultUnpaidBreakMinutes: getNumber(
    "TIMEKEEPER_DEFAULT_UNPAID_BREAK_MINUTES",
    30,
  ),
  weekStartDay: getNumber("TIMEKEEPER_WEEK_START_DAY", 1),
  requirePublishedShift: getBoolean("TIMEKEEPER_REQUIRE_PUBLISHED_SHIFT", false),
};
