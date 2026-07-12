export type ShippingOrigin = {
  id: string;
  name: string;
  code: string;
  company_name: string;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_name: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  is_default: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  is_complete: boolean;
};

export type CreateShippingOriginInput = {
  name: string;
  code: string;
  company_name: string;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string | null;
  email?: string | null;
  active: boolean;
  is_default: boolean;
  notes?: string | null;
};

export type UpdateShippingOriginInput = Partial<CreateShippingOriginInput>;

export type ShippingOriginFilters = {
  search?: string;
  active?: "all" | "active" | "inactive";
  complete?: "all" | "complete" | "incomplete";
};

export type ShippingOriginValidationResult = {
  isValid: boolean;
  missingFields: string[];
};

export type ShippingOriginMutationResult =
  | {
      ok: true;
      message: string;
      originId?: string;
    }
  | {
      ok: false;
      error: string;
    };
