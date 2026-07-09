import AdminShell from "@/components/admin/AdminShell";
import MediaLibrary from "@/components/admin/MediaLibrary";
import { getProductMedia } from "@/lib/media";

export default function AdminMediaPage() {
  const images = getProductMedia();

  return (
    <AdminShell
      title="Media Library"
      description="Manage every image used across ASHE TOKUN."
    >
      <MediaLibrary images={images} />
    </AdminShell>
  );
}
