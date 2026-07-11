"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createCustomer,
  updateCustomer,
} from "@/lib/data/customerMutations";
import type { Customer, CustomerType } from "@/lib/types/customer";

type CustomerFormProps = {
  customer?: Customer;
  mode: "create" | "edit";
};

const inputClass =
  "min-h-12 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-4 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70";

const labelClass =
  "text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]";

const customerTypes: { value: CustomerType; label: string }[] = [
  { value: "registered", label: "Registered" },
  { value: "vip", label: "VIP" },
  { value: "wholesale", label: "Wholesale" },
];

export default function CustomerForm({ customer, mode }: CustomerFormProps) {
  const router = useRouter();
  const isWalkInCustomer = customer?.customer_type === "walk_in";
  const [customerType, setCustomerType] = useState<CustomerType>(
    customer?.customer_type === "walk_in"
      ? "walk_in"
      : customer?.customer_type ?? "registered",
  );
  const [firstName, setFirstName] = useState(customer?.first_name ?? "");
  const [lastName, setLastName] = useState(customer?.last_name ?? "");
  const [companyName, setCompanyName] = useState(customer?.company_name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [active, setActive] = useState(customer?.active ?? true);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(mode === "create" ? "Creating..." : "Saving...");

    const payload = {
      customer_type: customerType,
      first_name: firstName,
      last_name: lastName,
      company_name: companyName,
      email,
      phone,
      notes,
      active,
    };
    const result =
      mode === "create"
        ? await createCustomer(payload)
        : customer
          ? await updateCustomer(customer.id, payload)
          : { ok: false as const, error: "Customer was not found." };

    setIsSaving(false);

    if (!result.ok) {
      setStatus(`Creation failed: ${result.error}`);
      return;
    }

    setStatus(
      mode === "create" ? "Customer created." : "Customer changes saved.",
    );

    if (mode === "create" && result.data && "id" in result.data) {
      router.push(`/admin/customers/${result.data.id}`);
      router.refresh();
      return;
    }

    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-6"
    >
      {customer ? (
        <div className="grid gap-3 border border-[#f7ead2]/10 bg-[#0f0b07] p-4 text-sm text-[#e8dcc8]/64 sm:grid-cols-2">
          <p>
            <span className="text-[#d8a344]">Customer Number:</span>{" "}
            {customer.customer_number}
          </p>
          <p>
            <span className="text-[#d8a344]">Status:</span>{" "}
            {customer.active ? "Active" : "Inactive"}
          </p>
        </div>
      ) : null}

      {isWalkInCustomer ? (
        <p className="border border-[#d8a344]/30 bg-[#0f0b07] px-4 py-3 text-sm text-[#d8a344]">
          Walk-in Customer is a protected system customer. Its type and active
          status cannot be changed.
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label>
          <span className={labelClass}>Customer Type</span>
          <select
            value={customerType}
            onChange={(event) => setCustomerType(event.target.value as CustomerType)}
            disabled={isWalkInCustomer}
            className={`${inputClass} mt-2 disabled:cursor-not-allowed disabled:text-[#e8dcc8]/35`}
          >
            {isWalkInCustomer ? (
              <option value="walk_in">Walk-in</option>
            ) : (
              customerTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="flex items-end gap-3 border border-[#f7ead2]/10 bg-[#0f0b07] px-4 py-3">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            disabled={isWalkInCustomer}
            className="h-4 w-4 accent-[#d8a344]"
          />
          <span className="text-sm text-[#f7ead2]">Active customer</span>
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label>
          <span className={labelClass}>First Name</span>
          <input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className={`${inputClass} mt-2`}
          />
        </label>
        <label>
          <span className={labelClass}>Last Name</span>
          <input
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className={`${inputClass} mt-2`}
          />
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Company</span>
        <input
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder={
            customerType === "wholesale"
              ? "Strongly recommended for wholesale customers"
              : ""
          }
          className={`${inputClass} mt-2`}
        />
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label>
          <span className={labelClass}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={`${inputClass} mt-2`}
          />
        </label>
        <label>
          <span className={labelClass}>Phone</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={`${inputClass} mt-2`}
          />
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Notes</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={7}
          className={`${inputClass} mt-2 py-3`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex min-h-12 items-center justify-center border border-[#d8a344]/45 bg-[#d8a344] px-6 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#0f0b07] transition duration-500 hover:shadow-[0_0_36px_rgba(216,163,68,0.24)] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isSaving
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
              ? "Create Customer"
              : "Save Customer"}
        </button>
        {status ? <p className="text-sm text-[#d8a344]">{status}</p> : null}
      </div>
    </form>
  );
}
