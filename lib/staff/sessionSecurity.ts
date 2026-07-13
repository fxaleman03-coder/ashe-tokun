import "server-only";

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { staffSessionCookieName } from "@/lib/staff/sessionCookie";

export type StaffSessionConfig = {
  sessionHours: number;
  inactivityMinutes: number;
  maxFailedAttempts: number;
  lockoutMinutes: number;
};

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

export function getStaffSessionConfig(): StaffSessionConfig {
  return {
    sessionHours: readPositiveInteger(process.env.STAFF_SESSION_HOURS, 10),
    inactivityMinutes: readPositiveInteger(
      process.env.STAFF_INACTIVITY_MINUTES,
      30,
    ),
    maxFailedAttempts: readPositiveInteger(
      process.env.STAFF_MAX_FAILED_ATTEMPTS,
      5,
    ),
    lockoutMinutes: readPositiveInteger(process.env.STAFF_LOCKOUT_MINUTES, 15),
  };
}

export function generateRawSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function getSessionExpirationDate() {
  const { sessionHours } = getStaffSessionConfig();

  return new Date(Date.now() + sessionHours * 60 * 60 * 1000);
}

export function getInactivityExpirationDate(lastActivityAt: string | Date) {
  const { inactivityMinutes } = getStaffSessionConfig();
  const lastActivityDate =
    lastActivityAt instanceof Date ? lastActivityAt : new Date(lastActivityAt);

  return new Date(lastActivityDate.getTime() + inactivityMinutes * 60 * 1000);
}

export async function getStaffSessionCookie() {
  return (await cookies()).get(staffSessionCookieName)?.value ?? null;
}

export async function setStaffSessionCookie(rawToken: string, expiresAt: Date) {
  (await cookies()).set(staffSessionCookieName, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearStaffSessionCookie() {
  (await cookies()).delete(staffSessionCookieName);
}
