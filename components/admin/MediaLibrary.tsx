"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { USE_SUPABASE } from "@/lib/config";
import type { MediaAsset } from "@/lib/data/mediaRepository";
import { PRODUCT_MEDIA_BUCKET } from "@/lib/storage/mediaStorage";
import { uploadProductImage } from "@/lib/storage/mediaStorageActions";

type MediaLibraryProps = {
  mediaAssets: MediaAsset[];
};

type ViewMode = "grid" | "list";
type UploadStatus = "idle" | "uploading" | "complete" | "failed";

type LibraryImage = MediaAsset & { vendor: string };

const inputClass =
  "min-h-12 w-full border border-[#f7ead2]/10 bg-[#120d08] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 placeholder:text-[#e8dcc8]/38 focus:border-[#d8a344]/70";

function detectVendor(image: MediaAsset) {
  const path = `${image.relativePath}/${image.folder}`.toLowerCase();

  if (path.includes("ajako-originals")) {
    return "AJAKO ORIGINALS";
  }

  if (
    path.includes("edibere-creation") ||
    path.includes("products/ide") ||
    path.includes("tools/irofa")
  ) {
    return "EDIBERE CREATION";
  }

  return "Unassigned";
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
      <p className="text-[0.64rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
        {label}
      </p>
      <p className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-[#e8dcc8]/54">{detail}</p>
    </article>
  );
}

function AssetImage({ image, sizes }: { image: MediaAsset; sizes: string }) {
  const isRemoteImage = image.url.startsWith("http");

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#080503]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(216,163,68,0.16),transparent_34%),linear-gradient(135deg,#171008_0%,#0f0b07_58%,#050302_100%)]" />
      {isRemoteImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt={image.filename}
          className="absolute inset-0 h-full w-full object-contain p-5 drop-shadow-[0_22px_32px_rgba(0,0,0,0.62)]"
        />
      ) : (
        <Image
          src={image.url}
          alt={image.filename}
          fill
          sizes={sizes}
          className="object-contain p-5 drop-shadow-[0_22px_32px_rgba(0,0,0,0.62)]"
        />
      )}
    </div>
  );
}

async function getImageDimensions(file: File) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      const dimensions = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };

      URL.revokeObjectURL(objectUrl);
      resolve(
        dimensions.width > 0 && dimensions.height > 0 ? dimensions : null,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    image.src = objectUrl;
  });
}

export default function MediaLibrary({
  mediaAssets,
}: MediaLibraryProps) {
  const { t } = useLanguage();
  const labels = t.admin.media;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [assets, setAssets] = useState(mediaAssets);
  const [query, setQuery] = useState("");
  const [vendor, setVendor] = useState("all");
  const [assetType, setAssetType] = useState("all");
  const [folder, setFolder] = useState("all");
  const [fileType, setFileType] = useState("all");
  const [uploadBrandSlug, setUploadBrandSlug] = useState("ajako-originals");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [previewImage, setPreviewImage] = useState<MediaAsset | null>(null);
  const [detailImage, setDetailImage] = useState<MediaAsset | null>(null);

  const enrichedImages = useMemo(
    () =>
      assets.map((image) => ({
        ...image,
        vendor: detectVendor(image),
      })),
    [assets],
  );

  const vendors = useMemo(
    () => ["all", ...Array.from(new Set(enrichedImages.map((image) => image.vendor)))],
    [enrichedImages],
  );
  const assetTypes = useMemo(
    () => ["all", ...Array.from(new Set(enrichedImages.map((image) => image.asset_type)))],
    [enrichedImages],
  );
  const folders = useMemo(
    () => ["all", ...Array.from(new Set(enrichedImages.map((image) => image.folder)))],
    [enrichedImages],
  );
  const fileTypes = useMemo(
    () => ["all", ...Array.from(new Set(enrichedImages.map((image) => image.extension)))],
    [enrichedImages],
  );

  const filteredImages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return enrichedImages.filter((image) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        image.filename.toLowerCase().includes(normalizedQuery) ||
        image.folder.toLowerCase().includes(normalizedQuery) ||
        image.category.toLowerCase().includes(normalizedQuery) ||
        image.asset_type.toLowerCase().includes(normalizedQuery) ||
        image.vendor.toLowerCase().includes(normalizedQuery);
      const matchesVendor = vendor === "all" || image.vendor === vendor;
      const matchesAssetType =
        assetType === "all" || image.asset_type === assetType;
      const matchesFolder = folder === "all" || image.folder === folder;
      const matchesFileType =
        fileType === "all" || image.extension === fileType;

      return (
        matchesQuery &&
        matchesVendor &&
        matchesAssetType &&
        matchesFolder &&
        matchesFileType
      );
    });
  }, [assetType, enrichedImages, fileType, folder, query, vendor]);

  const summary = useMemo(
    () => ({
      total: enrichedImages.length,
      productImages: enrichedImages.filter((image) =>
        image.relativePath.startsWith("products/"),
      ).length,
      ajako: enrichedImages.filter(
        (image) => image.vendor === "AJAKO ORIGINALS",
      ).length,
      edibere: enrichedImages.filter(
        (image) => image.vendor === "EDIBERE CREATION",
      ).length,
      unassigned: enrichedImages.filter((image) => image.vendor === "Unassigned")
        .length,
      uploaded: enrichedImages.filter((image) => image.source === "supabase")
        .length,
    }),
    [enrichedImages],
  );

  async function copyPath(url: string) {
    await navigator.clipboard.writeText(url);
  }

  async function handleUpload(files: FileList | File[]) {
    const selectedFiles = Array.from(files);

    if (selectedFiles.length === 0) {
      return;
    }

    if (!USE_SUPABASE) {
      setUploadStatus("failed");
      setUploadMessage(
        "Supabase Storage is disabled. Local media fallback remains active.",
      );
      return;
    }

    setUploadStatus("uploading");
    setUploadMessage(labels.uploading);

    const uploaded: MediaAsset[] = [];
    const failures: string[] = [];

    for (const file of selectedFiles) {
      const dimensions = await getImageDimensions(file);
      const formData = new FormData();

      formData.set("file", file);
      formData.set("brandSlug", uploadBrandSlug);

      if (dimensions) {
        formData.set("width", String(dimensions.width));
        formData.set("height", String(dimensions.height));
      }

      const result = await uploadProductImage(formData);

      if (result.ok) {
        uploaded.push(result.image);
      } else {
        failures.push(`${file.name}: ${result.error}`);
      }
    }

    if (uploaded.length > 0) {
      setAssets((currentAssets) => [...uploaded, ...currentAssets]);
    }

    if (failures.length > 0) {
      setUploadStatus("failed");
      setUploadMessage(`Upload Failed. ${failures.join(" ")}`);
      return;
    }

    setUploadStatus("complete");
    setUploadMessage("Upload Complete");
  }

  function renderActionButtons(image: LibraryImage) {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setPreviewImage(image)}
          className="min-h-10 border border-[#f7ead2]/12 px-3 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
        >
          {labels.preview}
        </button>
        <button
          type="button"
          onClick={() => copyPath(image.url)}
          className="min-h-10 border border-[#f7ead2]/12 px-3 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
        >
          {labels.copyPath}
        </button>
        <button
          type="button"
          onClick={() => setDetailImage(image)}
          className="min-h-10 border border-[#f7ead2]/12 px-3 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
        >
          Details
        </button>
      </div>
    );
  }

  return (
    <div>
      <section className="mb-6 border border-dashed border-[#d8a344]/35 bg-[#120d08] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <div
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            handleUpload(event.dataTransfer.files);
          }}
          className="flex flex-wrap items-center justify-between gap-5"
        >
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
              {labels.uploadZone}
            </p>
            <h2 className="mt-3 font-serif text-2xl font-semibold text-[#f7ead2]">
              {labels.dragDropTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#e8dcc8]/62">
              {labels.uploadInstructions}
            </p>
            <div className="mt-5 grid max-w-xl gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/54">
                  {labels.storageSource}
                </span>
                <input
                  value={
                    USE_SUPABASE
                      ? labels.supabaseStorage
                      : labels.localFallbackStorage
                  }
                  readOnly
                  className={`${inputClass} mt-2 text-[#f7ead2]/70`}
                />
              </label>
              <label className="block">
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/54">
                  {labels.bucket}
                </span>
                <input
                  value={PRODUCT_MEDIA_BUCKET}
                  readOnly
                  className={`${inputClass} mt-2 text-[#f7ead2]/70`}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/54">
                  {labels.brandFolder}
                </span>
                <select
                  value={uploadBrandSlug}
                  onChange={(event) => setUploadBrandSlug(event.target.value)}
                  className={`${inputClass} mt-2`}
                >
                  <option value="ajako-originals">AJAKO ORIGINALS</option>
                  <option value="edibere-creation">EDIBERE CREATION</option>
                </select>
              </label>
            </div>
            {uploadMessage ? (
              <p
                className={`mt-4 text-sm font-medium ${
                  uploadStatus === "failed"
                    ? "text-red-200"
                    : "text-[#f7ead2]"
                }`}
              >
                {uploadMessage}
              </p>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files) {
                handleUpload(event.target.files);
              }
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadStatus === "uploading"}
            className="inline-flex min-h-12 items-center justify-center border border-[#d8a344]/45 px-6 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
          >
            {uploadStatus === "uploading" ? labels.uploading : labels.browseFiles}
          </button>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label={labels.totalAssets}
          value={String(summary.total)}
          detail={labels.totalAssetsDetail}
        />
        <StatCard
          label={labels.productImages}
          value={String(summary.productImages)}
          detail={labels.productImagesDetail}
        />
        <StatCard
          label={labels.ajakoOriginals}
          value={String(summary.ajako)}
          detail={labels.ajakoOriginalsDetail}
        />
        <StatCard
          label={labels.edibereCreation}
          value={String(summary.edibere)}
          detail={labels.edibereCreationDetail}
        />
        <StatCard
          label={labels.unassignedAssets}
          value={String(summary.unassigned)}
          detail={labels.unassignedAssetsDetail}
        />
        <StatCard
          label={labels.uploadedAssets}
          value={String(summary.uploaded)}
          detail={labels.uploadedAssetsDetail}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)] xl:sticky xl:top-6 xl:self-start">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            {labels.filters}
          </p>
          <div className="mt-5 space-y-4">
            {[
              [labels.vendorBrand, vendor, setVendor, vendors],
              [labels.assetType, assetType, setAssetType, assetTypes],
              [labels.folder, folder, setFolder, folders],
              [labels.fileType, fileType, setFileType, fileTypes],
            ].map(([label, value, setter, options]) => (
              <label key={label as string} className="block">
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#e8dcc8]/54">
                  {label as string}
                </span>
                <select
                  value={value as string}
                  onChange={(event) =>
                    (setter as (nextValue: string) => void)(event.target.value)
                  }
                  className={`${inputClass} mt-2`}
                >
                  {(options as string[]).map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? labels.all : option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </aside>

        <div>
          <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto]">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={labels.searchImages}
              className={inputClass}
            />
            <div className="grid grid-cols-2 border border-[#f7ead2]/10 bg-[#120d08]">
              {[
                ["grid", labels.gridView],
                ["list", labels.listView],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode as ViewMode)}
                  className={`min-h-12 px-4 text-[0.68rem] font-bold uppercase tracking-[0.16em] transition duration-300 ${
                    viewMode === mode
                      ? "bg-[#d8a344] text-[#0f0b07]"
                      : "text-[#e8dcc8]/68 hover:text-[#d8a344]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <p className="mb-5 text-sm text-[#e8dcc8]/58">
            {labels.showingAssets
              .replace("{filtered}", String(filteredImages.length))
              .replace("{total}", String(enrichedImages.length))}
          </p>

          {viewMode === "grid" ? (
            <section className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {filteredImages.map((image) => (
                <article
                  key={image.id}
                  className="group overflow-hidden border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)] transition duration-500 ease-out hover:-translate-y-1 hover:border-[#d8a344]/55 hover:shadow-[0_30px_90px_rgba(0,0,0,0.34),0_0_42px_rgba(216,163,68,0.12)]"
                >
                  <div className="relative aspect-[4/3]">
                    <AssetImage
                      image={image}
                      sizes="(min-width: 1536px) 25vw, (min-width: 640px) 50vw, 100vw"
                    />
                  </div>
                  <div className="p-5">
                    <p className="truncate text-sm font-semibold text-[#f7ead2]">
                      {image.filename}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#d8a344]">
                      {image.vendor}
                    </p>
                    <p className="mt-2 text-[0.62rem] uppercase tracking-[0.16em] text-[#e8dcc8]/46">
                      {image.asset_type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-2 truncate text-xs text-[#e8dcc8]/54">
                      {image.folder}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#e8dcc8]/40">
                      {image.extension}
                    </p>
                    <div className="mt-5">{renderActionButtons(image)}</div>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <div className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
              <table className="w-full min-w-[1060px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
                    <th className="px-5 py-4">{labels.thumbnail}</th>
                    <th className="px-5 py-4">{labels.filename}</th>
                    <th className="px-5 py-4">{labels.path}</th>
                    <th className="px-5 py-4">{labels.vendorBrand}</th>
                    <th className="px-5 py-4">{labels.assetType}</th>
                    <th className="px-5 py-4">{labels.folder}</th>
                    <th className="px-5 py-4">{labels.fileType}</th>
                    <th className="px-5 py-4">{labels.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredImages.map((image) => (
                    <tr
                      key={image.id}
                      className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <div className="relative h-16 w-16 overflow-hidden border border-[#f7ead2]/10 bg-[#080503]">
                          {image.url.startsWith("http") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={image.url}
                              alt={image.filename}
                              className="h-full w-full object-contain p-2"
                            />
                          ) : (
                            <Image
                              src={image.url}
                              alt={image.filename}
                              fill
                              sizes="4rem"
                              className="object-contain p-2"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-[#f7ead2]">
                        {image.filename}
                      </td>
                      <td className="max-w-xs break-all px-5 py-4">
                        {image.url}
                      </td>
                      <td className="px-5 py-4">{image.vendor}</td>
                      <td className="px-5 py-4 uppercase">
                        {image.asset_type.replaceAll("_", " ")}
                      </td>
                      <td className="px-5 py-4">{image.folder}</td>
                      <td className="px-5 py-4 uppercase">{image.extension}</td>
                      <td className="px-5 py-4">{renderActionButtons(image)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {previewImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-7xl overflow-auto border border-[#f7ead2]/10 bg-[#0f0b07] p-6 shadow-[0_34px_120px_rgba(0,0,0,0.54)]">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#d8a344]">
                  {labels.previewLabel}
                </p>
                <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                  {previewImage.filename}
                </h2>
                <p className="mt-3 break-all text-sm text-[#e8dcc8]/58">
                  {previewImage.url}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="border border-[#f7ead2]/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition hover:border-[#d8a344] hover:text-[#d8a344]"
              >
                {labels.close}
              </button>
            </div>
            <div className="relative mt-6 aspect-[16/11] bg-[#080503]">
              <AssetImage image={previewImage} sizes="90vw" />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => copyPath(previewImage.url)}
                className="inline-flex min-h-11 items-center justify-center border border-[#d8a344]/45 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344] transition duration-500 hover:bg-[#d8a344] hover:text-[#0f0b07]"
              >
                {labels.copyPath}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDetailImage(previewImage);
                  setPreviewImage(null);
                }}
                className="inline-flex min-h-11 items-center justify-center border border-[#f7ead2]/16 px-5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
              >
                Details
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailImage ? (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-auto border-l border-[#f7ead2]/10 bg-[#0f0b07] p-6 shadow-[0_0_90px_rgba(0,0,0,0.54)]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#d8a344]">
                Asset Details
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                Image
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setDetailImage(null)}
              className="border border-[#f7ead2]/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition hover:border-[#d8a344] hover:text-[#d8a344]"
            >
              {labels.close}
            </button>
          </div>
          <dl className="mt-8 space-y-5 text-sm text-[#e8dcc8]/68">
            {[
              ["File name", detailImage.filename],
              ["Public URL path", detailImage.url],
              ["Relative folder", detailImage.folder],
              ["Vendor / Brand", detectVendor(detailImage)],
              ["Asset Type", detailImage.asset_type.replaceAll("_", " ")],
              ["Category", detailImage.category],
              ["Extension", detailImage.extension],
              [
                "Future Usage",
                "Product usage tracking will be connected after database integration.",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
                  {label}
                </dt>
                <dd className="mt-2 break-all leading-6">{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      ) : null}
    </div>
  );
}
