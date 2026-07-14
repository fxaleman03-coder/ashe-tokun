export const BUSINESS_TIME_ZONE =
  process.env.BUSINESS_TIME_ZONE || "America/New_York";

export const BUSINESS_TIME_ZONE_NOTES =
  "Database timestamps are stored as UTC timestamptz. ASHE TOKUN work dates and attendance calculations use America/New_York company time, including daylight-saving transitions handled by Intl.";
