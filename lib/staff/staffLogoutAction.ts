"use server";

import { redirect } from "next/navigation";
import { logoutCurrentStaff } from "@/lib/staff/staffAuthService";

export async function logoutStaffAction() {
  await logoutCurrentStaff();
  redirect("/staff/login?status=logged_out");
}
