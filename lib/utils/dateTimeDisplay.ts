import { BUSINESS_TIME_ZONE } from "@/lib/config/businessTimeZone";

const businessTimeZone = BUSINESS_TIME_ZONE;
const locale = "en-US";

const shortMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const shortWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const longWeekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return {
    year,
    month,
    day,
    weekday: date.getUTCDay(),
  };
}

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  const dateOnly = value.length === 10 ? parseDateOnly(value) : null;
  if (dateOnly) {
    return `${shortMonths[dateOnly.month - 1]} ${dateOnly.day}, ${dateOnly.year}`;
  }

  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: businessTimeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).formatToParts(new Date(value));

  return `${getPart(parts, "month")} ${getPart(parts, "day")}, ${getPart(parts, "year")}`;
}

export function formatDateWithWeekday(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  const dateOnly = value.length === 10 ? parseDateOnly(value) : null;
  if (dateOnly) {
    return `${shortWeekdays[dateOnly.weekday]}, ${shortMonths[dateOnly.month - 1]} ${dateOnly.day}, ${dateOnly.year}`;
  }

  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: businessTimeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).formatToParts(new Date(value));

  return `${getPart(parts, "weekday")}, ${getPart(parts, "month")} ${getPart(parts, "day")}, ${getPart(parts, "year")}`;
}

export function formatShortDateWithWeekday(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  const dateOnly = value.length === 10 ? parseDateOnly(value) : null;
  if (dateOnly) {
    return `${shortWeekdays[dateOnly.weekday]}, ${shortMonths[dateOnly.month - 1]} ${dateOnly.day}`;
  }

  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: businessTimeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).formatToParts(new Date(value));

  return `${getPart(parts, "weekday")}, ${getPart(parts, "month")} ${getPart(parts, "day")}`;
}

export function formatWeekday(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  const dateOnly = value.length === 10 ? parseDateOnly(value) : null;
  if (dateOnly) {
    return longWeekdays[dateOnly.weekday];
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: businessTimeZone,
    weekday: "long",
  }).format(new Date(value));
}

export function formatTime(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  const [hourPart, minutePart] = value.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return "Pending";
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: businessTimeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(value));

  return `${getPart(parts, "month")} ${getPart(parts, "day")}, ${getPart(parts, "year")} at ${getPart(parts, "hour")}:${getPart(parts, "minute")} ${getPart(parts, "dayPeriod")}`;
}

export const formatBusinessDateTime = formatDateTime;
export const businessDateTimeZone = businessTimeZone;

export function getBusinessTodayDate() {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: businessTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  return `${getPart(parts, "year")}-${getPart(parts, "month")}-${getPart(parts, "day")}`;
}

export function addDaysToDateString(value: string, days: number) {
  const dateOnly = parseDateOnly(value);

  if (!dateOnly) {
    return value;
  }

  const date = new Date(
    Date.UTC(dateOnly.year, dateOnly.month - 1, dateOnly.day + days, 12, 0, 0),
  );
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
