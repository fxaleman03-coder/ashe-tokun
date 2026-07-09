"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { MediaImage } from "@/lib/media";

type MediaLibraryProps = {
  images: MediaImage[];
};

export default function MediaLibrary({ images }: MediaLibraryProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [folder, setFolder] = useState("all");
  const [previewImage, setPreviewImage] = useState<MediaImage | null>(null);
  const [detailImage, setDetailImage] = useState<MediaImage | null>(null);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(images.map((image) => image.category)))],
    [images],
  );
  const folders = useMemo(
    () => ["all", ...Array.from(new Set(images.map((image) => image.folder)))],
    [images],
  );

  const filteredImages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return images.filter((image) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        image.filename.toLowerCase().includes(normalizedQuery) ||
        image.folder.toLowerCase().includes(normalizedQuery) ||
        image.category.toLowerCase().includes(normalizedQuery);

      const matchesCategory =
        category === "all" || image.category === category;
      const matchesFolder = folder === "all" || image.folder === folder;

      return matchesQuery && matchesCategory && matchesFolder;
    });
  }, [category, folder, images, query]);

  async function copyPath(url: string) {
    await navigator.clipboard.writeText(url);
  }

  return (
    <div>
      <section className="mb-8 grid gap-4 lg:grid-cols-[1fr_16rem_16rem]">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search images..."
          className="min-h-12 border border-[#f7ead2]/10 bg-[#120d08] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 placeholder:text-[#e8dcc8]/38 focus:border-[#d8a344]/70"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="min-h-12 border border-[#f7ead2]/10 bg-[#120d08] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 focus:border-[#d8a344]/70"
        >
          {categories.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "Category" : option}
            </option>
          ))}
        </select>
        <select
          value={folder}
          onChange={(event) => setFolder(event.target.value)}
          className="min-h-12 border border-[#f7ead2]/10 bg-[#120d08] px-4 text-sm text-[#f7ead2] outline-none transition duration-300 focus:border-[#d8a344]/70"
        >
          {folders.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "Folder" : option}
            </option>
          ))}
        </select>
      </section>

      <p className="mb-5 text-sm text-[#e8dcc8]/58">
        Showing {filteredImages.length} of {images.length} images.
      </p>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredImages.map((image) => (
          <article
            key={image.id}
            className="group overflow-hidden border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)] transition duration-500 ease-out hover:-translate-y-1 hover:border-[#d8a344]/55 hover:shadow-[0_30px_90px_rgba(0,0,0,0.34),0_0_42px_rgba(216,163,68,0.12)]"
          >
            <div className="relative aspect-[4/3] bg-[#080503] p-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(216,163,68,0.16),transparent_34%),linear-gradient(135deg,#171008_0%,#0f0b07_58%,#050302_100%)]" />
              <Image
                src={image.url}
                alt={image.filename}
                fill
                sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-contain p-6 drop-shadow-[0_22px_32px_rgba(0,0,0,0.62)] transition duration-700 ease-out group-hover:scale-[1.025]"
              />
            </div>
            <div className="p-5">
              <p className="truncate text-sm font-semibold text-[#f7ead2]">
                {image.filename}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#d8a344]">
                {image.category}
              </p>
              <p className="mt-2 truncate text-xs text-[#e8dcc8]/54">
                {image.folder}
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setPreviewImage(image)}
                  className="min-h-10 border border-[#f7ead2]/12 px-3 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => copyPath(image.url)}
                  className="min-h-10 border border-[#f7ead2]/12 px-3 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                >
                  Copy Path
                </button>
                <button
                  type="button"
                  onClick={() => setDetailImage(image)}
                  className="min-h-10 border border-[#f7ead2]/12 px-3 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition duration-500 hover:border-[#d8a344]/70 hover:text-[#d8a344]"
                >
                  Details
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {previewImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto border border-[#f7ead2]/10 bg-[#0f0b07] p-6 shadow-[0_34px_120px_rgba(0,0,0,0.54)]">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#d8a344]">
                  Preview
                </p>
                <h2 className="mt-3 font-serif text-3xl font-semibold text-[#f7ead2]">
                  {previewImage.filename}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="border border-[#f7ead2]/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#f7ead2] transition hover:border-[#d8a344] hover:text-[#d8a344]"
              >
                Close
              </button>
            </div>
            <div className="relative mt-6 aspect-[16/10] bg-[#080503]">
              <Image
                src={previewImage.url}
                alt={previewImage.filename}
                fill
                sizes="90vw"
                className="object-contain p-6 drop-shadow-[0_34px_44px_rgba(0,0,0,0.64)]"
              />
            </div>
            <dl className="mt-6 grid gap-4 text-sm text-[#e8dcc8]/68 sm:grid-cols-2">
              <div>
                <dt className="text-[#d8a344]">Relative path</dt>
                <dd className="mt-1 break-all">{previewImage.relativePath}</dd>
              </div>
              <div>
                <dt className="text-[#d8a344]">Dimensions</dt>
                <dd className="mt-1">
                  {previewImage.dimensions
                    ? `${previewImage.dimensions.width} × ${previewImage.dimensions.height}`
                    : "Not available"}
                </dd>
              </div>
              <div>
                <dt className="text-[#d8a344]">Category</dt>
                <dd className="mt-1">{previewImage.category}</dd>
              </div>
              <div>
                <dt className="text-[#d8a344]">Folder</dt>
                <dd className="mt-1">{previewImage.folder}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}

      {detailImage ? (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-auto border-l border-[#f7ead2]/10 bg-[#0f0b07] p-6 shadow-[0_0_90px_rgba(0,0,0,0.54)]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#d8a344]">
                Details
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
              Close
            </button>
          </div>
          <dl className="mt-8 space-y-5 text-sm text-[#e8dcc8]/68">
            {[
              ["Image Name", detailImage.filename],
              ["Full Relative Path", detailImage.relativePath],
              ["Folder", detailImage.folder],
              ["Category", detailImage.category],
              ["Extension", detailImage.extension],
              ["Future Product Usage", "This image is not yet linked to a product."],
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
