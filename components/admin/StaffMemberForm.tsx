"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useLanguage } from "@/components/LanguageProvider";
import type { InventoryLocation } from "@/lib/data/inventoryRepository";
import {
  createStaffMemberAction,
  updateStaffMemberProfileAction,
  type StaffActionState,
} from "@/lib/staff/staffActions";
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

const editableRoleValues = [
  "owner",
  "managing_partner",
  "store_manager",
  "assistant_manager",
  "cashier",
] as const;

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const { t } = useLanguage();
  const labels = t.admin.userAccess.form;

  return (
    <button
      disabled={pending}
      className="min-h-12 border border-[#d8a344]/55 px-5 text-xs font-bold uppercase tracking-[0.22em] text-[#d8a344] transition hover:bg-[#d8a344] hover:text-[#0f0b07] disabled:opacity-55"
    >
      {pending
        ? mode === "edit"
          ? labels.saving
          : labels.creating
        : mode === "edit"
          ? labels.saveChanges
          : labels.createUser}
    </button>
  );
}

export default function StaffMemberForm({
  locations,
  member,
  mode = "create",
}: StaffMemberFormProps) {
  const { t } = useLanguage();
  const labels = t.admin.userAccess;
  const [state, formAction] = useActionState(
    mode === "edit" ? updateStaffMemberProfileAction : createStaffMemberAction,
    initialState,
  );
  const isEdit = mode === "edit";
  const roleLabels = {
    owner: labels.roles.owner,
    managing_partner: labels.roles.managingPartner,
    store_manager: labels.roles.storeManager,
    assistant_manager: labels.roles.assistantManager,
    cashier: labels.roles.cashier,
  };

  return (
    <form
      action={formAction}
      className="space-y-6 border border-[#f7ead2]/10 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
    >
      {isEdit && member ? (
        <>
          <input type="hidden" name="staffMemberId" value={member.id} />
          <input
            type="hidden"
            name="businessTitle"
            value={member.business_title ?? ""}
          />
          <input
            type="hidden"
            name="employmentStatus"
            value={member.employment_status}
          />
        </>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            {labels.form.accessId}
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
              {labels.form.accessIdPermanentHelp}
            </span>
          ) : null}
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            {labels.form.securityRole}
          </span>
          <select
            name="role"
            required
            defaultValue={member?.role ?? "cashier"}
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          >
            {editableRoleValues.map((roleValue) => (
              <option key={roleValue} value={roleValue}>
                {roleLabels[roleValue]}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-[#e8dcc8]/50">
            {labels.form.securityRoleHelp}
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            {labels.form.firstName}
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
            {labels.form.lastName}
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
            {labels.form.displayName}
          </span>
          <input
            name="displayName"
            defaultValue={member?.display_name ?? ""}
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
            {labels.form.assignedLocation}
          </span>
          <select
            name="assignedLocationId"
            defaultValue={member?.assigned_location_id ?? ""}
            className="mt-2 min-h-11 w-full border border-[#f7ead2]/10 bg-[#0f0b07] px-3 text-[#f7ead2] outline-none focus:border-[#d8a344]/70"
          >
            <option value="">{labels.form.unassigned}</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        {!isEdit ? (
          <>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                {labels.form.temporaryPin}
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
                {labels.form.confirmTemporaryPin}
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
        ) : null}
      </div>

      <label className="flex items-center gap-3 text-sm text-[#e8dcc8]/70">
        <input name="active" type="checkbox" defaultChecked={member?.active ?? true} />
        {labels.form.active}
      </label>

      <p className="text-sm leading-6 text-[#e8dcc8]/58">
        {isEdit ? labels.form.editSecurityHelp : labels.form.createSecurityHelp}
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
            {labels.form.cancel}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
