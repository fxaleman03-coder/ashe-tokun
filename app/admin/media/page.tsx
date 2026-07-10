import AdminShell from "@/components/admin/AdminShell";
import MediaLibrary from "@/components/admin/MediaLibrary";
import { getProductMedia } from "@/lib/media";

export default function AdminMediaPage() {
  const images = getProductMedia();

  return (
    <AdminShell
      title="Digital Asset Manager"
      description="Manage product photography, brand assets, and future media used across ASHE TOKUN."
    >
      <MediaLibrary images={images} />
    </AdminShell>
  );
}
