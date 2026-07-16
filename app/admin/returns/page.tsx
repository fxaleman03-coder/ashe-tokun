import AdminReturnsPageContent from "@/components/admin/AdminReturnsPageContent";
import AdminShell from "@/components/admin/AdminShell";
import {
  getReturnMetrics,
  getReturns,
} from "@/lib/data/returnsRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminReturnsPage() {
  await requirePermission("returns.read");

  const [returns, metrics] = await Promise.all([
    getReturns(),
    getReturnMetrics(),
  ]);

  return (
    <AdminShell title="">
      <AdminReturnsPageContent returns={returns} metrics={metrics} />
    </AdminShell>
  );
}
