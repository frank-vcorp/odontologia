"use client";

import { useEffect } from "react";

export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={alt}>
      <button type="button" className="image-lightbox-backdrop" aria-label="Cerrar imagen" onClick={onClose} />
      <figure className="image-lightbox-panel">
        <img src={src} alt={alt} className="image-lightbox-image" />
        <figcaption className="image-lightbox-caption">{alt}</figcaption>
        <button type="button" className="btn btn-secondary image-lightbox-close" onClick={onClose}>
          Cerrar
        </button>
      </figure>
    </div>
  );
}
