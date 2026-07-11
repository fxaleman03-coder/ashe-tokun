import AdminShell from "@/components/admin/AdminShell";
import MediaLibrary from "@/components/admin/MediaLibrary";
import { getMediaAssets } from "@/lib/data/mediaRepository";

export default async function AdminMediaPage() {
  const mediaAssets = await getMediaAssets();

  return (
    <AdminShell
      title="Digital Asset Manager"
      description="Manage product photography, brand assets, and future media used across ASHE TOKUN."
    >
      <MediaLibrary mediaAssets={mediaAssets} />
    </AdminShell>
  );
}
