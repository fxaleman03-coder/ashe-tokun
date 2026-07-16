"use client";

import AdminInventoryTable from "@/components/admin/AdminInventoryTable";
import { useLanguage } from "@/components/LanguageProvider";
import type {
  InventoryItem,
  InventoryLocation,
  InventorySummary,
} from "@/lib/data/inventoryRepository";

type AdminInventoryPageContentProps = {
  items: InventoryItem[];
  locations: InventoryLocation[];
  summary: InventorySummary;
};

export default function AdminInventoryPageContent({
  items,
  locations,
  summary,
}: AdminInventoryPageContentProps) {
  const { t } = useLanguage();
  const labels = t.admin.inventory;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-[#f7ead2] sm:text-4xl">
          {labels.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#e8dcc8]/66 sm:text-base">
          {labels.description}
        </p>
      </div>

      <AdminInventoryTable
        items={items}
        locations={locations}
        summary={summary}
      />
    </>
  );
}
