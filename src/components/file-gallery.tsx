"use client";

import Link from "next/link";
import { useState } from "react";
import { ImageLightbox } from "@/components/image-lightbox";
import { formatInClinicTimezone } from "@/shared/datetime";
import { fileDownloadUrl, filePreviewUrl, isImageFile } from "@/shared/media";

export type GalleryFile = {
  id: string;
  originalFilename: string;
  mimeType?: string | null;
  sourceLabel?: string;
  sourceHref?: string | null;
  createdAt?: string;
};

export function FileGallery({
  files,
  showMeta = false,
  emptyMessage = "Sin archivos adjuntos.",
}: {
  files: GalleryFile[];
  showMeta?: boolean;
  emptyMessage?: string;
}) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  if (files.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>;
  }

  const images = files.filter(isImageFile);
  const documents = files.filter((file) => !isImageFile(file));

  return (
    <div className="file-gallery space-y-4">
      {images.length > 0 && (
        <div className="file-gallery-grid">
          {images.map((file) => (
            <button
              key={file.id}
              type="button"
              className="file-gallery-thumb"
              aria-label={`Ver imagen ${file.originalFilename}`}
              onClick={() =>
                setLightbox({
                  src: filePreviewUrl(file.id),
                  alt: file.originalFilename,
                })
              }
            >
              <img
                src={filePreviewUrl(file.id)}
                alt={file.originalFilename}
                loading="lazy"
                className="file-gallery-thumb-image"
              />
              <span className="file-gallery-thumb-label">{file.originalFilename}</span>
            </button>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <ul className="file-gallery-documents">
          {documents.map((file) => (
            <li key={file.id} className="file-gallery-document">
              <a href={fileDownloadUrl(file.id)} className="text-[var(--accent-brand)]">
                {file.originalFilename}
              </a>
              {showMeta && (
                <span className="text-[var(--muted)]">
                  {file.sourceHref ? (
                    <>
                      {" · "}
                      <Link href={file.sourceHref}>{file.sourceLabel}</Link>
                    </>
                  ) : file.sourceLabel ? (
                    ` · ${file.sourceLabel}`
                  ) : null}
                  {file.createdAt
                    ? ` · ${formatInClinicTimezone(file.createdAt, { dateStyle: "medium", timeStyle: "short" })}`
                    : null}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {lightbox && (
        <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
