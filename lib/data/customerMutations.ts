"use client";

import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import type {
  CreateCustomerAddressInput,
  CreateCustomerInput,
  CustomerAddressType,
  CustomerType,
  UpdateCustomerAddressInput,
  UpdateCustomerInput,
} from "@/lib/types/customer";

type MutationResult<T = unknown> =
  | { ok: true; data?: T; message: string; source: "supabase" | "local" }
  | { ok: false; error: string };

const validCustomerTypes = new Set<CustomerType>([
  "walk_in",
  "registered",
  "wholesale",
  "vip",
]);
const validAddressTypes = new Set<CustomerAddressType>([
  "billing",
  "shipping",
  "other",
]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeText(value: string | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function normalizeEmail(value: string | undefined) {
  const trimmedValue = sanitizeText(value);

  return trimmedValue ? trimmedValue.toLowerCase() : null;
}

function normalizePhone(value: string | undefined) {
  const trimmedValue = sanitizeText(value);

  return trimmedValue ? trimmedValue.replace(/\s+/g, " ") : null;
}

function appendNote(existingNotes: string | null, note: string) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${note.trim()}`;

  return [existingNotes, entry].filter(Boolean).join("\n\n");
}

function localDisabled(): MutationResult {
  return {
    ok: false,
    error: "Live customer management requires Supabase mode.",
  };
}

function validateCustomerPayload(input: CreateCustomerInput | UpdateCustomerInput) {
  if (input.customer_type && !validCustomerTypes.has(input.customer_type)) {
    return "Customer type is not supported.";
  }

  if (input.customer_type === "walk_in") {
    return "Additional walk-in system customers are not supported in this phase.";
  }

  const email = normalizeEmail(input.email);

  if (email && !emailPattern.test(email)) {
    return "Email address is not valid.";
  }

  if (
    "customer_type" in input &&
    input.customer_type &&
    !sanitizeText(input.first_name) &&
    !sanitizeText(input.company_name)
  ) {
    return "First name or company name is required.";
  }

  return null;
}

async function writeCustomerAudit(
  action: string,
  customerId: string | null,
  details: Record<string, unknown>,
) {
  if (!supabase) {
    return;
  }

  await supabase.from("audit_logs").insert({
    action,
    entity_type: "customer",
    entity_id: customerId,
    details,
  });
}

async function getCustomerById(customerId: string) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function emailExists(email: string, excludedCustomerId?: string) {
  if (!supabase) {
    return false;
  }

  let query = supabase
    .from("customers")
    .select("id")
    .eq("email", email)
    .limit(1);

  if (excludedCustomerId) {
    query = query.neq("id", excludedCustomerId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).length > 0;
}

async function getNextCustomerNumber() {
  if (!supabase) {
    return "ASH-CUS-000001";
  }

  const { data, error } = await supabase
    .from("customers")
    .select("customer_number")
    .like("customer_number", "ASH-CUS-%")
    .order("customer_number", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  const nextNumber =
    (data ?? [])
      .map((row) => String(row.customer_number ?? ""))
      .map((value) => {
        const match = value.match(/(\d+)$/);

        return match ? Number(match[1]) : 0;
      })
      .reduce((highest, value) => Math.max(highest, value), 0) + 1;

  return `ASH-CUS-${String(nextNumber).padStart(6, "0")}`;
}

export async function createCustomer(input: CreateCustomerInput) {
  if (!USE_SUPABASE || !supabase) {
    return localDisabled();
  }

  const validationError = validateCustomerPayload(input);

  if (validationError) {
    return { ok: false, error: validationError };
  }

  const email = normalizeEmail(input.email);

  try {
    if (email && (await emailExists(email))) {
      return { ok: false, error: "A customer with this email already exists." };
    }

    let lastError = "Customer creation failed.";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidateNumber = await getNextCustomerNumber();
      const customerNumber =
        attempt === 0 ? candidateNumber : `${candidateNumber}-${attempt + 1}`;
      const { data, error } = await supabase
        .from("customers")
        .insert({
          customer_number: customerNumber,
          customer_type: input.customer_type,
          first_name: sanitizeText(input.first_name),
          last_name: sanitizeText(input.last_name),
          company_name: sanitizeText(input.company_name),
          email,
          phone: normalizePhone(input.phone),
          notes: sanitizeText(input.notes),
          active: input.active ?? true,
        })
        .select("*")
        .single();

      if (!error && data) {
        await writeCustomerAudit("customer_created", data.id, {
          customer_number: data.customer_number,
          customer_type: data.customer_type,
        });

        return {
          ok: true,
          data,
          message: "Customer created.",
          source: "supabase",
        } as const;
      }

      lastError = error?.message ?? lastError;

      if (error?.code !== "23505") {
        break;
      }
    }

    return { ok: false, error: lastError };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Customer creation failed.",
    };
  }
}

export async function updateCustomer(
  customerId: string,
  updates: UpdateCustomerInput,
) {
  if (!USE_SUPABASE || !supabase) {
    return localDisabled();
  }

  try {
    const existingCustomer = await getCustomerById(customerId);

    if (!existingCustomer) {
      return { ok: false, error: "Customer was not found." };
    }

    if (
      existingCustomer.customer_type === "walk_in" &&
      updates.customer_type &&
      updates.customer_type !== "walk_in"
    ) {
      return {
        ok: false,
        error: "Walk-in Customer cannot be changed into another customer type.",
      };
    }

    if (existingCustomer.customer_type === "walk_in" && updates.active === false) {
      return { ok: false, error: "Walk-in Customer cannot be deactivated." };
    }

    const validationError = validateCustomerPayload({
      ...updates,
      customer_type: updates.customer_type ?? existingCustomer.customer_type,
      first_name: updates.first_name ?? existingCustomer.first_name ?? undefined,
      company_name:
        updates.company_name ?? existingCustomer.company_name ?? undefined,
    });

    if (validationError && existingCustomer.customer_type !== "walk_in") {
      return { ok: false, error: validationError };
    }

    const email =
      updates.email !== undefined
        ? normalizeEmail(updates.email)
        : existingCustomer.email;

    if (email && email !== existingCustomer.email && (await emailExists(email, customerId))) {
      return { ok: false, error: "A customer with this email already exists." };
    }

    const payload = {
      customer_type: updates.customer_type ?? existingCustomer.customer_type,
      first_name:
        updates.first_name !== undefined
          ? sanitizeText(updates.first_name)
          : existingCustomer.first_name,
      last_name:
        updates.last_name !== undefined
          ? sanitizeText(updates.last_name)
          : existingCustomer.last_name,
      company_name:
        updates.company_name !== undefined
          ? sanitizeText(updates.company_name)
          : existingCustomer.company_name,
      email,
      phone:
        updates.phone !== undefined
          ? normalizePhone(updates.phone)
          : existingCustomer.phone,
      notes:
        updates.notes !== undefined
          ? sanitizeText(updates.notes)
          : existingCustomer.notes,
      active: updates.active ?? existingCustomer.active,
    };
    const { data, error } = await supabase
      .from("customers")
      .update(payload)
      .eq("id", customerId)
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Customer update failed." };
    }

    await writeCustomerAudit("customer_updated", data.id, {
      customer_number: data.customer_number,
    });

    return {
      ok: true,
      data,
      message: "Customer updated.",
      source: "supabase",
    } as const;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Customer update failed.",
    };
  }
}

export async function deactivateCustomer(customerId: string) {
  const existingCustomer = await getCustomerById(customerId);

  if (existingCustomer?.customer_type === "walk_in") {
    return { ok: false, error: "Walk-in Customer cannot be deactivated." };
  }

  const result = await updateCustomer(customerId, { active: false });

  if (result.ok) {
    await writeCustomerAudit("customer_deactivated", customerId, {});
  }

  return result;
}

export async function reactivateCustomer(customerId: string) {
  const result = await updateCustomer(customerId, { active: true });

  if (result.ok) {
    await writeCustomerAudit("customer_reactivated", customerId, {});
  }

  return result;
}

export async function addCustomerNote(customerId: string, note: string) {
  if (!USE_SUPABASE || !supabase) {
    return localDisabled();
  }

  const trimmedNote = note.trim();

  if (!trimmedNote) {
    return { ok: false, error: "Note cannot be empty." };
  }

  try {
    const existingCustomer = await getCustomerById(customerId);

    if (!existingCustomer) {
      return { ok: false, error: "Customer was not found." };
    }

    const notes = appendNote(existingCustomer.notes, trimmedNote);
    const { data, error } = await supabase
      .from("customers")
      .update({ notes })
      .eq("id", customerId)
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Note save failed." };
    }

    await writeCustomerAudit("customer_note_added", customerId, {
      note: trimmedNote,
    });

    return {
      ok: true,
      data,
      message: "Customer note added.",
      source: "supabase",
    } as const;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Note save failed.",
    };
  }
}

function validateAddress(input: CreateCustomerAddressInput | UpdateCustomerAddressInput) {
  if (input.address_type && !validAddressTypes.has(input.address_type)) {
    return "Address type is not supported.";
  }

  if ("address1" in input && !sanitizeText(input.address1)) {
    return "Address line 1 is required.";
  }

  if ("city" in input && !sanitizeText(input.city)) {
    return "City is required.";
  }

  if ("country" in input && !sanitizeText(input.country)) {
    return "Country is required.";
  }

  return null;
}

async function clearDefaultAddresses(customerId: string) {
  if (!supabase) {
    return;
  }

  await supabase
    .from("customer_addresses")
    .update({ default_address: false })
    .eq("customer_id", customerId);
}

export async function createCustomerAddress(input: CreateCustomerAddressInput) {
  if (!USE_SUPABASE || !supabase) {
    return localDisabled();
  }

  const validationError = validateAddress(input);

  if (validationError) {
    return { ok: false, error: validationError };
  }

  try {
    const existingCustomer = await getCustomerById(input.customer_id);

    if (!existingCustomer) {
      return { ok: false, error: "Customer was not found." };
    }

    if (input.default_address) {
      await clearDefaultAddresses(input.customer_id);
    }

    const { data, error } = await supabase
      .from("customer_addresses")
      .insert({
        customer_id: input.customer_id,
        address_type: input.address_type,
        first_name: sanitizeText(input.first_name),
        last_name: sanitizeText(input.last_name),
        company: sanitizeText(input.company),
        address1: sanitizeText(input.address1),
        address2: sanitizeText(input.address2),
        city: sanitizeText(input.city),
        state: sanitizeText(input.state),
        postal_code: sanitizeText(input.postal_code),
        country: sanitizeText(input.country),
        default_address: input.default_address ?? false,
      })
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Address creation failed." };
    }

    return {
      ok: true,
      data,
      message: "Address created.",
      source: "supabase",
    } as const;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Address creation failed.",
    };
  }
}

export async function updateCustomerAddress(
  addressId: string,
  updates: UpdateCustomerAddressInput,
) {
  if (!USE_SUPABASE || !supabase) {
    return localDisabled();
  }

  const validationError = validateAddress(updates);

  if (validationError) {
    return { ok: false, error: validationError };
  }

  try {
    const { data: existingAddress, error: readError } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("id", addressId)
      .maybeSingle();

    if (readError || !existingAddress) {
      return { ok: false, error: readError?.message ?? "Address was not found." };
    }

    if (updates.default_address) {
      await clearDefaultAddresses(existingAddress.customer_id);
    }

    const { data, error } = await supabase
      .from("customer_addresses")
      .update({
        address_type: updates.address_type ?? existingAddress.address_type,
        first_name:
          updates.first_name !== undefined
            ? sanitizeText(updates.first_name)
            : existingAddress.first_name,
        last_name:
          updates.last_name !== undefined
            ? sanitizeText(updates.last_name)
            : existingAddress.last_name,
        company:
          updates.company !== undefined
            ? sanitizeText(updates.company)
            : existingAddress.company,
        address1:
          updates.address1 !== undefined
            ? sanitizeText(updates.address1)
            : existingAddress.address1,
        address2:
          updates.address2 !== undefined
            ? sanitizeText(updates.address2)
            : existingAddress.address2,
        city:
          updates.city !== undefined
            ? sanitizeText(updates.city)
            : existingAddress.city,
        state:
          updates.state !== undefined
            ? sanitizeText(updates.state)
            : existingAddress.state,
        postal_code:
          updates.postal_code !== undefined
            ? sanitizeText(updates.postal_code)
            : existingAddress.postal_code,
        country:
          updates.country !== undefined
            ? sanitizeText(updates.country)
            : existingAddress.country,
        default_address:
          updates.default_address ?? existingAddress.default_address,
      })
      .eq("id", addressId)
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Address update failed." };
    }

    return {
      ok: true,
      data,
      message: "Address updated.",
      source: "supabase",
    } as const;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Address update failed.",
    };
  }
}

export async function deleteCustomerAddress(addressId: string) {
  if (!USE_SUPABASE || !supabase) {
    return localDisabled();
  }

  const { error } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("id", addressId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    message: "Address deleted.",
    source: "supabase",
  } as const;
}

export async function setDefaultCustomerAddress(
  customerId: string,
  addressId: string,
) {
  if (!USE_SUPABASE || !supabase) {
    return localDisabled();
  }

  await clearDefaultAddresses(customerId);

  const { data, error } = await supabase
    .from("customer_addresses")
    .update({ default_address: true })
    .eq("id", addressId)
    .eq("customer_id", customerId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Default address update failed." };
  }

  return {
    ok: true,
    data,
    message: "Default address updated.",
    source: "supabase",
  } as const;
}
