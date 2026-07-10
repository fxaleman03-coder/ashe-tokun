import AdminShell from "@/components/admin/AdminShell";
import ProductCreationWizard from "@/components/admin/ProductCreationWizard";
import { getProductMedia } from "@/lib/media";

export default function AdminNewProductPage() {
  const mediaImages = getProductMedia();

  return (
    <AdminShell
      title="Product Creation Wizard"
      description="Create a new ASHE TOKUN product draft through a structured local workflow."
    >
      <ProductCreationWizard mediaImages={mediaImages} />
    </AdminShell>
  );
}
