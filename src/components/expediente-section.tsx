"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatInClinicTimezone } from "@/shared/datetime";

type FileRecord = {
  id: string;
  originalFilename: string;
  sourceType: string;
  sourceLabel: string;
  sourceHref: string | null;
  createdAt: string;
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
        ) : files.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Aún no hay archivos en el expediente.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Procedencia</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td>
                    <a href={`/api/files/${f.id}`}>{f.originalFilename}</a>
                  </td>
                  <td>
                    {f.sourceHref ? (
                      <Link href={f.sourceHref}>{f.sourceLabel}</Link>
                    ) : (
                      f.sourceLabel
                    )}
                  </td>
                  <td>{formatInClinicTimezone(f.createdAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
