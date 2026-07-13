import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import bcrypt from "bcryptjs";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const NO_WRITE_MESSAGE =
  "Owner bootstrap cancelled. No database changes were made.";

type SupabaseErrorLike = {
  name?: string;
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  status?: number | string;
  statusCode?: number | string;
};

type OwnerBootstrapRow = {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  role: string;
  active: boolean;
  employment_status: string;
  must_change_pin: boolean;
};

function fail(message: string): never {
  console.error(`Owner bootstrap failed: ${message}`);
  process.exitCode = 1;
  throw new Error("__OWNER_BOOTSTRAP_REPORTED__");
}

function formatSupabaseError(error: SupabaseErrorLike) {
  const lines = [
    error.name ? `Name: ${error.name}` : null,
    error.code ? `Code: ${error.code}` : null,
    error.message ? `Message: ${error.message}` : null,
    error.details ? `Details: ${error.details}` : null,
    error.hint ? `Hint: ${error.hint}` : null,
    error.status ? `Status: ${error.status}` : null,
    error.statusCode ? `Status Code: ${error.statusCode}` : null,
  ]
    .filter((line): line is string => Boolean(line));

  if (lines.length > 0) {
    return lines.join("\n");
  }

  try {
    const serialized = JSON.stringify(error);

    return serialized && serialized !== "{}"
      ? serialized
      : "No error details were returned by Supabase.";
  } catch {
    return "Supabase returned an error that could not be serialized.";
  }
}

function validateRequiredEnvironment() {
  const requiredVariables = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const;

  for (const variableName of requiredVariables) {
    if (!process.env[variableName]?.trim()) {
      fail(`Missing required environment variable: ${variableName}`);
    }
  }
}

function getSupabaseProjectReference() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!supabaseUrl) {
    return "missing";
  }

  try {
    const hostname = new URL(supabaseUrl).hostname;
    const [projectReference] = hostname.split(".");

    return projectReference || "unknown";
  } catch {
    return "invalid-url";
  }
}

function printSafeEnvironmentDiagnostics() {
  console.log("Owner bootstrap environment:");
  console.log(
    `NEXT_PUBLIC_SUPABASE_URL exists: ${
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ? "Yes" : "No"
    }`,
  );
  console.log(
    `SUPABASE_SERVICE_ROLE_KEY exists: ${
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ? "Yes" : "No"
    }`,
  );
  console.log(`Supabase project ref: ${getSupabaseProjectReference()}`);
}

function validatePin(pin: string, employeeNumber: string) {
  if (!/^\d+$/.test(pin)) {
    return "PIN must contain numbers only.";
  }

  if (pin.length < 6) {
    return "PIN must be at least 6 digits.";
  }

  if (["000000", "111111", "123456", "654321"].includes(pin)) {
    return "Choose a less common PIN.";
  }

  if (/^(\d)\1+$/.test(pin)) {
    return "PIN cannot repeat one digit only.";
  }

  if (pin === employeeNumber) {
    return "PIN cannot match employee number.";
  }

  return null;
}

async function readRequiredValue(
  rl: ReturnType<typeof createInterface>,
  envKey: string,
  prompt: string,
) {
  const envValue = process.env[envKey]?.trim();

  if (envValue) {
    return envValue;
  }

  const answer = (await rl.question(prompt)).trim();

  if (!answer) {
    fail(`${prompt.trim()} is required.`);
  }

  return answer;
}

async function getServiceClient(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    fail("Supabase service client could not be created.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function verifyStaffMembersConnection(supabase: SupabaseClient) {
  const { error } = await supabase.from("staff_members").select("id").limit(1);

  if (error) {
    fail(
      `Owner bootstrap connection check failed:\n${formatSupabaseError(error)}`,
    );
  }
}

async function ensureNoOwnerExists(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("staff_members")
    .select("id, employee_number, role")
    .eq("role", "owner")
    .limit(1);

  if (error) {
    fail(`Owner lookup failed:\n${formatSupabaseError(error)}`);
  }

  if ((data ?? []).length > 0) {
    fail("Owner already exists. Bootstrap refused to create another Owner.");
  }
}

async function insertOwner(
  supabase: SupabaseClient,
  input: {
    employeeNumber: string;
    firstName: string;
    lastName: string;
    temporaryPin: string;
  },
) {
  const payload = {
    employee_number: input.employeeNumber,
    first_name: input.firstName,
    last_name: input.lastName,
    display_name: `${input.firstName} ${input.lastName}`.trim(),
    role: "owner",
    pin_hash: await bcrypt.hash(input.temporaryPin, 12),
    active: true,
    employment_status: "active",
    must_change_pin: true,
  };

  const { data, error } = await supabase
    .from("staff_members")
    .insert(payload)
    .select(
      "id, employee_number, first_name, last_name, role, active, employment_status, must_change_pin",
    )
    .single();

  if (error) {
    fail(`Owner insert failed: ${formatSupabaseError(error)}`);
  }

  const owner = data as OwnerBootstrapRow | null;

  if (!owner) {
    fail("Owner insert did not return a row.");
  }

  if (owner.employee_number !== input.employeeNumber) {
    fail("Owner insert verification failed: employee number mismatch.");
  }

  if (owner.role !== "owner") {
    fail("Owner insert verification failed: role mismatch.");
  }

  return owner;
}

async function main() {
  if (!process.argv.includes("--confirm")) {
    console.log(NO_WRITE_MESSAGE);
    return;
  }

  validateRequiredEnvironment();
  printSafeEnvironmentDiagnostics();

  const supabase = await getServiceClient();
  await verifyStaffMembersConnection(supabase);
  await ensureNoOwnerExists(supabase);

  const rl = createInterface({ input, output });

  try {
    const employeeNumber = (
      await readRequiredValue(
        rl,
        "OWNER_EMPLOYEE_NUMBER",
        "Owner employee number: ",
      )
    ).toUpperCase();
    const firstName = await readRequiredValue(
      rl,
      "OWNER_FIRST_NAME",
      "First name: ",
    );
    const lastName = await readRequiredValue(
      rl,
      "OWNER_LAST_NAME",
      "Last name: ",
    );
    const temporaryPin = await readRequiredValue(
      rl,
      "OWNER_TEMPORARY_PIN",
      "Temporary PIN: ",
    );
    const pinError = validatePin(temporaryPin, employeeNumber);

    if (pinError) {
      fail(pinError);
    }

    const owner = await insertOwner(supabase, {
      employeeNumber,
      firstName,
      lastName,
      temporaryPin,
    });

    console.log("Owner created successfully.");
    console.log(`Employee Number: ${owner.employee_number}`);
    console.log(`Role: ${owner.role}`);
    console.log(`Must Change PIN: ${owner.must_change_pin ? "Yes" : "No"}`);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  if (error instanceof Error && error.message === "__OWNER_BOOTSTRAP_REPORTED__") {
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(`Owner bootstrap failed: ${message}`);
  process.exitCode = 1;
});
