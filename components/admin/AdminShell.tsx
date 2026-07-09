import type { ReactNode } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";

type AdminShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export default function AdminShell({
  title,
  description,
  children,
}: AdminShellProps) {
  return (
    <div className="min-h-screen bg-[#0f0b07] text-[#f7ead2] lg:flex">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        <AdminHeader title={title} description={description} />
        <main className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
