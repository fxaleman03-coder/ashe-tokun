import AdminShell from "@/components/admin/AdminShell";
import AdminTraditionsPageContent from "@/components/admin/AdminTraditionsPageContent";
import { getTraditionsResult } from "@/lib/data/traditions";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminTraditionsPage() {
  await requirePermission("products.read");

  const traditionReadResult = await getTraditionsResult();
  return (
    <AdminShell title="">
      <AdminTraditionsPageContent
        traditions={traditionReadResult.traditions}
        source={traditionReadResult.source}
      />
    </AdminShell>
  );
}
