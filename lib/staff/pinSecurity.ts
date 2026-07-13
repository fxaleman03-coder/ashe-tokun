import "server-only";

import bcrypt from "bcryptjs";

const commonPins = new Set(["000000", "111111", "123456", "654321"]);
const saltRounds = 12;

export type PinValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validatePinFormat(
  pin: string,
  employeeNumber?: string,
): PinValidationResult {
  const normalizedPin = pin.trim();

  if (!/^\d+$/.test(normalizedPin)) {
    return { valid: false, error: "PIN must contain numbers only." };
  }

  if (normalizedPin.length < 6) {
    return { valid: false, error: "PIN must be at least 6 digits." };
  }

  if (commonPins.has(normalizedPin)) {
    return { valid: false, error: "Choose a less common PIN." };
  }

  if (/^(\d)\1+$/.test(normalizedPin)) {
    return { valid: false, error: "PIN cannot repeat one digit only." };
  }

  if (employeeNumber && normalizedPin === employeeNumber.trim()) {
    return { valid: false, error: "PIN cannot match employee number." };
  }

  return { valid: true };
}

export async function hashPin(pin: string) {
  return bcrypt.hash(pin, saltRounds);
}

export async function verifyPin(pin: string, pinHash: string) {
  return bcrypt.compare(pin, pinHash);
}
