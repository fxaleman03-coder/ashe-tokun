import AdminReturnsManager from "@/components/admin/AdminReturnsManager";
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
    <AdminShell
      title="Returns & Exchanges"
      description="Manage return requests, exchanges, store credit, and administrative refund tracking."
    >
      <AdminReturnsManager returns={returns} metrics={metrics} />
    </AdminShell>
  );
}
