import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import InventoryItemDetail from "@/components/admin/InventoryItemDetail";
import {
  getInventoryItems,
  getInventoryLocations,
  getInventoryTransactions,
} from "@/lib/data/inventoryRepository";

type InventoryItemPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const items = await getInventoryItems();

  return items.map((item) => ({
    id: item.id,
  }));
}

export default async function InventoryItemPage({
  params,
}: InventoryItemPageProps) {
  const { id } = await params;
  const [items, locations] = await Promise.all([
    getInventoryItems(),
    getInventoryLocations(),
  ]);
  const item = items.find((inventoryItem) => inventoryItem.id === id) ?? null;
  const transactions = item ? await getInventoryTransactions(item.id) : [];
  const productInventoryItems = item
    ? items.filter((inventoryItem) => inventoryItem.product_id === item.product_id)
    : [];

  if (!item) {
    return (
      <AdminShell
        title="Inventory Item Not Found"
        description="This inventory item is not available."
      >
        <Link
          href="/admin/inventory"
          className="inline-flex min-h-12 items-center justify-center border border-[#d8a344]/60 px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Inventory
        </Link>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Inventory Detail"
      description={`Manage stock controls and transaction history for ${item.product.name}.`}
    >
      <InventoryItemDetail
        item={item}
        locations={locations}
        productInventoryItems={productInventoryItems}
        transactions={transactions}
      />
    </AdminShell>
  );
}
