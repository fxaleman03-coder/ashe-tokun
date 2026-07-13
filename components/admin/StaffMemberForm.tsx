"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createStaffMemberAction,
  updateStaffMemberProfileAction,
  type StaffActionState,
} from "@/lib/staff/staffActions";
import type { InventoryLocation } from "@/lib/data/inventoryRepository";
import { getStaffBusinessTitle } from "@/lib/staff/roleLabels";
import type { StaffMember } from "@/lib/types/staff";

type StaffMemberFormProps = {
  locations: InventoryLocation[];
  member?: StaffMember;
  mode?: "create" | "edit";
};

const initialState: StaffActionState = {
  message: "",
  status: "idle",
};

const editableRoleOptions = [
  { value: "owner", label: "Owner" },
  { value: "managing_partner", label: "Managing Partner" },
  { value: "store_manager", label: "Store Manager" },
  { value: "assistant_manager", label: "Assistant Manager" },
  { value: "cashier", label: "Cashier" },
  { value: "inventory", label: "Inventory Specialist" },
  { value: "fulfillment", label: "Shipping & Fulfillment" },
  { value: "customer_service", label: "Customer Service" },
  { value: "accounting", label: "Accounting" },
  { value: "marketing_ecommerce", label: "Marketing & E-Commerce" },
];

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="min-h-12 border border-[#d8a344]/55 px-5 text-xs font-bold uppercase tracking-[0.22em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:opacity-55"
    >
      {pending
        ? mode === "edit"
          ? "Saving..."
          : "Creating..."
        : mode === "edit"
          ? "Save Changes"
          : "Create Employee"}
    </button>
  );
}

export default function StaffMemberForm({
  locations,
  member,
  mode = "create",
}: StaffMemberFormProps) {
  const [state, formAction] = useActionState(
    mode === "edit" ? updateStaffMemberProfileAction : createStaffMemberAction,
    initialState,
  );
  const isEdit = mode === "edit";
  const businessTitle = member
    ? getStaffBusinessTitle(member.role, member.business_title)
    : "";

  return (
    <form
      action={formAction}
      className="space-y-6 border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
    >
      {isEdit && member ? (
        <input type="hidden" name="staffMemberId" value={member.id} />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Employee Number
          </span>
          <input
            name="employeeNumber"
            required={!isEdit}
            readOnly={isEdit}
            defaultValue={member?.employee_number ?? ""}
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          />
          {isEdit ? (
            <span className="mt-1 block text-xs text-[#e8dcc8]/50">
              Employee numbers are permanent and cannot be changed.
            </span>
          ) : null}
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Security Role
          </span>
          <select
            name="role"
            required
            defaultValue={member?.role ?? "cashier"}
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          >
            {member?.role === "manager" ? (
              <option value="manager">Store Manager (legacy)</option>
            ) : null}
            {editableRoleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-[#e8dcc8]/50">
            Security role controls default permissions. Business title is edited separately.
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            First Name
          </span>
          <input
            name="firstName"
            required
            defaultValue={member?.first_name ?? ""}
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
            defaultValue={member?.last_name ?? ""}
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Display Name
          </span>
          <input
            name="displayName"
            defaultValue={member?.display_name ?? ""}
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Business Title
          </span>
          <input
            name="businessTitle"
            defaultValue={businessTitle}
            placeholder="Managing Partner"
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          />
          <span className="mt-1 block text-xs text-[#e8dcc8]/50">
            Business title describes leadership or job title; it does not grant access by itself.
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            Assigned Location
          </span>
          <select
            name="assignedLocationId"
            defaultValue={member?.assigned_location_id ?? ""}
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
        {isEdit ? (
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              Employment Status
            </span>
            <select
              name="employmentStatus"
              defaultValue={member?.employment_status ?? "active"}
              className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
            >
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="resigned">Resigned</option>
              <option value="terminated">Terminated</option>
              <option value="retired">Retired</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        ) : (
          <>
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
          </>
        )}
      </div>

      <label className="flex items-center gap-3 text-sm text-[#e8dcc8]/70">
        <input name="active" type="checkbox" defaultChecked={member?.active ?? true} />
        Active
      </label>

      <p className="text-sm leading-6 text-[#e8dcc8]/58">
        {isEdit
          ? "Protected fields such as employee number, PIN hash, sessions, and authentication history are read-only."
          : "The temporary PIN is hashed server-side and cannot be viewed later."}
      </p>

      {state.message ? (
        <p className="border border-[#d8a344]/25 bg-[#0f0b07] p-3 text-sm text-[#e8dcc8]/72">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <SubmitButton mode={mode} />
        {isEdit && member ? (
          <Link
            href={`/admin/staff/${member.id}`}
            className="inline-flex min-h-12 items-center border border-[#f7ead2]/12 px-5 text-xs font-bold uppercase tracking-[0.22em] text-[#e8dcc8]/70 transition hover:border-[#d8a344]/50 hover:text-[#d8a344]"
          >
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}
