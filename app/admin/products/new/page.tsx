import AdminShell from "@/components/admin/AdminShell";
import ProductCreationWizard from "@/components/admin/ProductCreationWizard";
import { getCategories } from "@/lib/data/categories";
import { getMediaAssets } from "@/lib/data/mediaRepository";
import { getProductTypes } from "@/lib/data/productTypes";

export default async function AdminNewProductPage() {
  const [mediaAssets, categories, productTypes] = await Promise.all([
    getMediaAssets(),
    getCategories(),
    getProductTypes(),
  ]);

  return (
    <AdminShell
      title="Product Creation Wizard"
      description="Create a new ASHE TOKUN product draft through a structured local workflow."
    >
      <ProductCreationWizard
        mediaAssets={mediaAssets}
        categories={categories}
        productTypes={productTypes}
      />
    </AdminShell>
  );
}
