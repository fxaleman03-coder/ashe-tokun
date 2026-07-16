import AuthenticatedUserMenu from "@/components/shared/AuthenticatedUserMenu";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import NotificationCenter from "@/components/shared/NotificationCenter";
import AdminLanguageSwitcher from "@/components/admin/AdminLanguageSwitcher";
import AdminHeaderPageContent from "@/components/admin/AdminHeaderPageContent";

type AdminHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  user: {
    displayName: string;
    employeeNumber: string;
    businessTitle?: string | null;
    securityRole: string;
    profileHref: string;
  };
};

export default function AdminHeader({
  eyebrow,
  title,
  description,
  user,
}: AdminHeaderProps) {
  return (
    <header className="border-b border-[#f7ead2]/10 bg-[#0f0b07]/86 px-6 py-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:px-8 lg:px-10">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Breadcrumbs />
        <div className="flex items-center gap-3">
          <NotificationCenter />
          <AdminLanguageSwitcher />
          <AuthenticatedUserMenu
            context="admin"
            displayName={user.displayName}
            employeeNumber={user.employeeNumber}
            businessTitle={user.businessTitle}
            securityRole={user.securityRole}
            profileHref={user.profileHref}
          />
        </div>
      </div>
      <AdminHeaderPageContent
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
    </header>
  );
}
