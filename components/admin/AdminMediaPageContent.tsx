"use client";

import MediaLibrary from "@/components/admin/MediaLibrary";
import { useLanguage } from "@/components/LanguageProvider";
import type { MediaAsset } from "@/lib/data/mediaRepository";

type AdminMediaPageContentProps = {
  mediaAssets: MediaAsset[];
};

export default function AdminMediaPageContent({
  mediaAssets,
}: AdminMediaPageContentProps) {
  const { t } = useLanguage();
  const labels = t.admin.media;

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

      <MediaLibrary mediaAssets={mediaAssets} />
    </>
  );
}
