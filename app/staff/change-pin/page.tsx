import StaffChangePinForm from "@/components/staff/StaffChangePinForm";
import { getAuthenticatedStaffReadOnlyResult } from "@/lib/staff/staffAuthService";
import { redirect } from "next/navigation";

export default async function StaffChangePinPage() {
  const result = await getAuthenticatedStaffReadOnlyResult();

  if (!result.ok) {
    redirect(
      result.reason === "missing"
        ? "/staff/login?status=session_required"
        : "/staff/login?status=session_expired",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f0b07] px-5 py-10 text-[#f7ead2]">
      <StaffChangePinForm />
    </main>
  );
}
