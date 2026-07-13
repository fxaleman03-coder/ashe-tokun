import { redirect } from "next/navigation";
import StaffLoginForm from "@/components/staff/StaffLoginForm";
import { getAuthenticatedStaffReadOnly } from "@/lib/staff/staffAuthService";

export default async function StaffLoginPage() {
  const staff = await getAuthenticatedStaffReadOnly();

  if (staff) {
    redirect(staff.mustChangePin ? "/staff/change-pin" : "/staff");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f0b07] px-5 py-10 text-[#f7ead2]">
      <StaffLoginForm />
    </main>
  );
}
