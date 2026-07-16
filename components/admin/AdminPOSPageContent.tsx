"use client";

import AdminPOS from "@/components/admin/AdminPOS";
import { useLanguage } from "@/components/LanguageProvider";
import type {
  PosCustomer,
  PosDataSource,
  PosInventoryLocation,
  PosProduct,
} from "@/lib/types/pos";

type AdminPOSPageContentProps = {
  products: PosProduct[];
  locations: PosInventoryLocation[];
  customer: PosCustomer;
  customers: PosCustomer[];
  nextOrderNumber: string;
  nextReceiptNumber: string;
  source: PosDataSource;
};

export default function AdminPOSPageContent({
  products,
  locations,
  customer,
  customers,
  nextOrderNumber,
  nextReceiptNumber,
  source,
}: AdminPOSPageContentProps) {
  const { t } = useLanguage();
  const labels = t.admin.pos;

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

      <AdminPOS
        products={products}
        locations={locations}
        customer={customer}
        customers={customers}
        nextOrderNumber={nextOrderNumber}
        nextReceiptNumber={nextReceiptNumber}
        source={source}
      />
    </>
  );
}
