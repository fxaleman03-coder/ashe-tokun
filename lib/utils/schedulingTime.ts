const canonicalTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const databaseTimePattern = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/;
const meridiemTimePattern = /^(\d{1,2}):([0-5]\d)\s*([ap])\.?m\.?$/i;

export function normalizeTimeInputValue(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) return "";

  const databaseMatch = trimmed.match(databaseTimePattern);
  if (databaseMatch) {
    return `${databaseMatch[1]}:${databaseMatch[2]}`;
  }

  const meridiemMatch = trimmed.match(meridiemTimePattern);
  if (meridiemMatch) {
    const hourNumber = Number(meridiemMatch[1]);
    const minute = meridiemMatch[2];
    const meridiem = meridiemMatch[3].toLowerCase();

    if (hourNumber < 1 || hourNumber > 12) return "";

    const hour =
      meridiem === "p"
        ? hourNumber === 12
          ? 12
          : hourNumber + 12
        : hourNumber === 12
          ? 0
          : hourNumber;

    return `${String(hour).padStart(2, "0")}:${minute}`;
  }

  return "";
}

export function isCanonicalTimeInputValue(value: string | null | undefined) {
  return canonicalTimePattern.test(value ?? "");
}

export function timeInputValueToMinutes(value: string | null | undefined) {
  const normalized = normalizeTimeInputValue(value);

  if (!normalized) return null;

  const [hours, minutes] = normalized.split(":").map(Number);

  return hours * 60 + minutes;
}

export function formatTimeForDisplay(value: string | null | undefined, locale = "en-US") {
  const normalized = normalizeTimeInputValue(value);

  if (!normalized) return "";

  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(`2000-01-01T${normalized}:00`));
}
