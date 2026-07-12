import AdminReturnsManager from "@/components/admin/AdminReturnsManager";
import AdminShell from "@/components/admin/AdminShell";
import {
  getReturnMetrics,
  getReturns,
} from "@/lib/data/returnsRepository";

export default async function AdminReturnsPage() {
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
