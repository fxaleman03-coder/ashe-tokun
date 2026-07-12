"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  activateShippingOrigin,
  createShippingOrigin,
  deactivateShippingOrigin,
  setDefaultShippingOrigin,
  updateShippingOrigin,
} from "@/lib/data/shippingOriginMutations";
import type {
  CreateShippingOriginInput,
  ShippingOrigin,
} from "@/lib/types/shippingOrigin";

type ShippingOriginFormProps = {
  origin?: ShippingOrigin;
  shipmentCount?: number;
};

const inputClass =
  "min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-sm text-[#f7ead2] outline-none transition focus:border-[#d8a344]/70";

function toInitialState(origin?: ShippingOrigin): CreateShippingOriginInput {
  return {
    name: origin?.name ?? "",
    code: origin?.code ?? "",
    company_name: origin?.company_name ?? "",
    contact_first_name: origin?.contact_first_name ?? "",
    contact_last_name: origin?.contact_last_name ?? "",
    address1: origin?.address1 ?? "",
    address2: origin?.address2 ?? "",
    city: origin?.city ?? "",
    state: origin?.state ?? "",
    postal_code: origin?.postal_code ?? "",
    country: origin?.country ?? "US",
    phone: origin?.phone ?? "",
    email: origin?.email ?? "",
    notes: origin?.notes ?? "",
    active: origin?.active ?? false,
    is_default: origin?.is_default ?? false,
  };
}

export default function ShippingOriginForm({
  origin,
  shipmentCount = 0,
}: ShippingOriginFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState(toInitialState(origin));
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateField<Key extends keyof CreateShippingOriginInput>(
    key: Key,
    value: CreateShippingOriginInput[Key],
  ) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(origin ? "Saving origin..." : "Creating origin...");

    const result = origin
      ? await updateShippingOrigin(origin.id, formState)
      : await createShippingOrigin(formState);

    setIsSaving(false);

    if (!result.ok) {
      setMessage(result.error);
      return;
    }

    setMessage(result.message);

    if (!origin && result.originId) {
      router.push(`/admin/settings/shipping-origins/${result.originId}`);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-6">
      {origin ? (
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 text-sm text-[#e8dcc8]/62 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
          <p>
            Completeness:{" "}
            <span className="text-[#d8a344]">
              {origin.is_complete ? "Complete" : "Incomplete"}
            </span>
          </p>
          {!origin.is_complete ? (
            <p className="mt-2 text-[#d8a344]">
              Complete company, address, city, state, postal code, and country
              before activation or default selection.
            </p>
          ) : null}
          <p className="mt-2">
            Historical shipments using this origin: {shipmentCount}
          </p>
          <p className="mt-2">
            Shipment address snapshots are immutable; editing this origin will
            not alter old shipment addresses.
          </p>
        </section>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              ["name", "Name"],
              ["code", "Code"],
              ["company_name", "Company Name"],
              ["contact_first_name", "Contact First Name"],
              ["contact_last_name", "Contact Last Name"],
              ["address1", "Address 1"],
              ["address2", "Address 2"],
              ["city", "City"],
              ["state", "State"],
              ["postal_code", "Postal Code"],
              ["country", "Country"],
              ["phone", "Phone"],
              ["email", "Email"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
                {label}
              </span>
              <input
                value={formState[key] ?? ""}
                onChange={(event) => updateField(key, event.target.value)}
                className={`${inputClass} mt-2`}
              />
            </label>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="text-xs uppercase tracking-[0.16em] text-[#d8a344]">
            Notes
          </span>
          <textarea
            value={formState.notes ?? ""}
            onChange={(event) => updateField("notes", event.target.value)}
            rows={4}
            className={`${inputClass} mt-2 py-3`}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-5 text-sm text-[#e8dcc8]/72">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={formState.active}
              onChange={(event) => updateField("active", event.target.checked)}
            />
            Active
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={formState.is_default}
              onChange={(event) =>
                updateField("is_default", event.target.checked)
              }
            />
            Default
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 bg-[#d8a344] px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#0f0b07] transition duration-500 hover:shadow-[0_0_36px_rgba(216,163,68,0.26)] disabled:cursor-not-allowed disabled:bg-[#f7ead2]/12 disabled:text-[#e8dcc8]/34"
          >
            {isSaving ? "Saving..." : origin ? "Save Origin" : "Create Origin"}
          </button>
          {origin ? (
            <>
              <button
                type="button"
                onClick={async () => {
                  const result = await setDefaultShippingOrigin(origin.id);
                  setMessage(
                    "message" in result
                      ? result.message ?? "Default origin updated."
                      : result.error ?? "Default update failed.",
                  );
                  if (result.ok) router.refresh();
                }}
                className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
              >
                Set Default
              </button>
              <button
                type="button"
                onClick={async () => {
                  const result = origin.active
                    ? await deactivateShippingOrigin(origin.id)
                    : await activateShippingOrigin(origin.id);
                  setMessage(
                    "message" in result
                      ? result.message ?? "Origin updated."
                      : result.error ?? "Origin update failed.",
                  );
                  if (result.ok) router.refresh();
                }}
                className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/12 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
              >
                {origin.active ? "Deactivate" : "Activate"}
              </button>
            </>
          ) : null}
        </div>
      </form>

      {message ? (
        <p className="border border-[#d8a344]/30 bg-[#0f0b07] px-4 py-3 text-sm text-[#d8a344]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
