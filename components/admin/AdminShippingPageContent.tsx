"use client";

import AdminShippingManager from "@/components/admin/AdminShippingManager";
import { useLanguage } from "@/components/LanguageProvider";
import type { Shipment, ShipmentMetrics } from "@/lib/types/shipping";
import type { ShippingOrigin } from "@/lib/types/shippingOrigin";

type AdminShippingPageContentProps = {
  shipments: Shipment[];
  metrics: ShipmentMetrics;
  origins: ShippingOrigin[];
};

export default function AdminShippingPageContent({
  shipments,
  metrics,
  origins,
}: AdminShippingPageContentProps) {
  const { t } = useLanguage();
  const labels = t.admin.shipping;

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

      <AdminShippingManager
        shipments={shipments}
        metrics={metrics}
        origins={origins}
      />
    </>
  );
}
