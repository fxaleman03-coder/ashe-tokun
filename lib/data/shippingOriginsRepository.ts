import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import type {
  ShippingOrigin,
  ShippingOriginFilters,
  ShippingOriginValidationResult,
} from "@/lib/types/shippingOrigin";

export const localShippingOrigins: ShippingOrigin[] = [
  {
    id: "local-ashe-tokun",
    name: "ASHE TOKUN",
    code: "ashe-tokun",
    company_name: "ASHE TOKUN",
    contact_first_name: null,
    contact_last_name: null,
    contact_name: null,
    address1: "",
    address2: null,
    city: "",
    state: "",
    postal_code: "",
    country: "US",
    phone: null,
    email: null,
    active: false,
    is_default: false,
    notes: "Local fallback record. Complete this origin in Supabase before live shipping.",
    created_at: new Date(0).toISOString(),
    updated_at: null,
    is_complete: false,
  },
  {
    id: "local-ajako-originals",
    name: "AJAKO ORIGINALS",
    code: "ajako-originals",
    company_name: "AJAKO ORIGINALS",
    contact_first_name: null,
    contact_last_name: null,
    contact_name: null,
    address1: "",
    address2: null,
    city: "",
    state: "",
    postal_code: "",
    country: "US",
    phone: null,
    email: null,
    active: false,
    is_default: false,
    notes: "Local fallback record. Complete this origin in Supabase before live shipping.",
    created_at: new Date(0).toISOString(),
    updated_at: null,
    is_complete: false,
  },
  {
    id: "local-edibere-creation",
    name: "EDIBERE CREATION",
    code: "edibere-creation",
    company_name: "EDIBERE CREATION",
    contact_first_name: null,
    contact_last_name: null,
    contact_name: null,
    address1: "",
    address2: null,
    city: "",
    state: "",
    postal_code: "",
    country: "US",
    phone: null,
    email: null,
    active: false,
    is_default: false,
    notes: "Local fallback record. Complete this origin in Supabase before live shipping.",
    created_at: new Date(0).toISOString(),
    updated_at: null,
    is_complete: false,
  },
];

type ShippingOriginRow = Omit<ShippingOrigin, "contact_name" | "is_complete">;

function clean(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function validateShippingOrigin(
  origin: Partial<ShippingOrigin>,
): ShippingOriginValidationResult {
  const requiredFields: [string, string | null | undefined][] = [
    ["company_name", origin.company_name],
    ["address1", origin.address1],
    ["city", origin.city],
    ["state", origin.state],
    ["postal_code", origin.postal_code],
    ["country", origin.country],
  ];
  const missingFields = requiredFields
    .filter(([, value]) => !clean(String(value ?? "")))
    .map(([field]) => field);

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

export function normalizeShippingOrigin(row: ShippingOriginRow): ShippingOrigin {
  const contactName = [row.contact_first_name, row.contact_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const validation = validateShippingOrigin(row);

  return {
    ...row,
    contact_name: contactName || null,
    is_complete: validation.isValid,
  };
}

function applyFilters(
  origins: ShippingOrigin[],
  filters?: ShippingOriginFilters,
) {
  if (!filters) {
    return origins;
  }

  const search = filters.search?.trim().toLowerCase();

  return origins.filter((origin) => {
    const searchable = [
      origin.name,
      origin.code,
      origin.company_name,
      origin.contact_name,
      origin.city,
      origin.state,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!search || searchable.includes(search)) &&
      (!filters.active ||
        filters.active === "all" ||
        (filters.active === "active" ? origin.active : !origin.active)) &&
      (!filters.complete ||
        filters.complete === "all" ||
        (filters.complete === "complete"
          ? origin.is_complete
          : !origin.is_complete))
    );
  });
}

export async function getShippingOrigins(filters?: ShippingOriginFilters) {
  if (!USE_SUPABASE || !supabase) {
    return applyFilters(localShippingOrigins, filters);
  }

  const { data, error } = await supabase
    .from("shipping_origins")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.info("[ASHE TOKUN shipping origins]", "Origin read failed.", {
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
    });

    return applyFilters(localShippingOrigins, filters);
  }

  return applyFilters(
    ((data ?? []) as ShippingOriginRow[]).map(normalizeShippingOrigin),
    filters,
  );
}

export async function getActiveShippingOrigins() {
  const origins = await getShippingOrigins();

  return origins.filter((origin) => origin.active);
}

export async function getShippingOriginById(id: string) {
  const origins = await getShippingOrigins();

  return origins.find((origin) => origin.id === id) ?? null;
}

export async function getShippingOriginByCode(code: string) {
  const origins = await getShippingOrigins();

  return origins.find((origin) => origin.code === code) ?? null;
}

export async function getDefaultShippingOrigin() {
  const origins = await getShippingOrigins();

  return origins.find((origin) => origin.is_default) ?? null;
}
