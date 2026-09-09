"use client";

import { useCallback, useEffect, useState } from "react";
import { FileGallery, type GalleryFile } from "@/components/file-gallery";

type FileRecord = GalleryFile & {
  sourceType: string;
};

export function ExpedienteSection({ patientId }: { patientId: string }) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/patients/${patientId}/files`);
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setFiles(data.files);
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadFile(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/patients/${patientId}/files`, { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) return;
    await load();
  }

  return (
    <div className="form-panel">
      <div className="form-panel-header">
        <h2 className="form-panel-title">Expediente</h2>
        <p className="form-panel-desc">Archivos del paciente y de sus consultas, conservando la procedencia.</p>
      </div>
      <div className="form-panel-body space-y-3">
        <input
          type="file"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
            e.target.value = "";
          }}
        />
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Cargando expediente…</p>
        ) : (
          <FileGallery
            files={files}
            showMeta
            emptyMessage="Aún no hay archivos en el expediente."
          />
        )}
      </div>
    </div>
  );
}
