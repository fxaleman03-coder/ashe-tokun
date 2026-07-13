"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createStaffMemberAction,
  type StaffActionState,
} from "@/lib/staff/staffActions";
import type { InventoryLocation } from "@/lib/data/inventoryRepository";

type StaffMemberFormProps = {
  locations: InventoryLocation[];
};

const initialState: StaffActionState = {
  message: "",
  status: "idle",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="min-h-12 border border-[#d8a344]/55 px-5 text-xs font-bold uppercase tracking-[0.22em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:opacity-55"
    >
      {pending ? "Creating..." : "Create Employee"}
    </button>
  );
}

export default function StaffMemberForm({ locations }: StaffMemberFormProps) {
  const [state, formAction] = useActionState(
    createStaffMemberAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="space-y-6 border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Employee Number
          </span>
          <input
            name="employeeNumber"
            required
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Role
          </span>
          <select
            name="role"
            required
            defaultValue="cashier"
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          >
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
            <option value="inventory">Inventory</option>
            <option value="fulfillment">Fulfillment</option>
            <option value="customer_service">Customer Service</option>
            <option value="accounting">Accounting</option>
            <option value="marketing_ecommerce">Marketing & E-Commerce</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            First Name
          </span>
          <input
            name="firstName"
            required
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Last Name
          </span>
          <input
            name="lastName"
            required
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Display Name
          </span>
          <input
            name="displayName"
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Assigned Location
          </span>
          <select
            name="assignedLocationId"
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          >
            <option value="">Unassigned</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Temporary PIN
          </span>
          <input
            name="temporaryPin"
            required
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Confirm Temporary PIN
          </span>
          <input
            name="confirmTemporaryPin"
            required
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          />
        </label>
      </div>

      <label className="flex items-center gap-3 text-sm text-[#e8dcc8]/70">
        <input name="active" type="checkbox" defaultChecked />
        Active
      </label>

      <p className="text-sm leading-6 text-[#e8dcc8]/58">
        The temporary PIN is hashed server-side and cannot be viewed later.
      </p>

      {state.message ? (
        <p className="border border-[#d8a344]/25 bg-[#0f0b07] p-3 text-sm text-[#e8dcc8]/72">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
