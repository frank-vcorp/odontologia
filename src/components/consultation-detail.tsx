"use client";

import Link from "next/link";
import { useState } from "react";
import { formatInClinicTimezone } from "@/shared/datetime";
import { centsToDisplay } from "@/shared/money";

type Consultation = {
  id: string;
  patientId: string;
  patientName: string;
  appointmentId: string | null;
  occurredAt: string;
  clinicalNotes: string | null;
  services: { id: string; serviceName: string; priceCents: number }[];
  treatments: { id: string; serviceName: string; status: string }[];
};

type FileRecord = {
  id: string;
  originalFilename: string;
  sourceLabel: string;
  createdAt: string;
};

export function ConsultationDetail({
  consultation: initial,
  initialFiles = [],
}: {
  consultation: Consultation;
  initialFiles?: FileRecord[];
}) {
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);

  async function uploadFile(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/consultations/${initial.id}/files`, { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) return;
    const data = await res.json();
    setFiles((prev) => [data.file, ...prev]);
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-2">
        <p className="text-sm text-[var(--muted)] m-0">Paciente</p>
        <Link href={`/pacientes/${initial.patientId}`} className="text-lg font-semibold">
          {initial.patientName}
        </Link>
        <p className="text-sm text-[var(--muted)]">
          {formatInClinicTimezone(initial.occurredAt, { dateStyle: "full", timeStyle: "short" })}
        </p>
        {initial.appointmentId && (
          <Link href="/agenda" className="text-sm">
            Cita de origen
          </Link>
        )}
        {initial.clinicalNotes && <p className="text-sm whitespace-pre-wrap">{initial.clinicalNotes}</p>}
      </div>

      <div className="panel">
        <div className="panel-header">Servicios realizados</div>
        {initial.services.length === 0 ? (
          <p className="p-4 text-[var(--muted)]">Sin servicios registrados.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              {initial.services.map((s) => (
                <tr key={s.id}>
                  <td>{s.serviceName}</td>
                  <td>{centsToDisplay(s.priceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {initial.treatments.length > 0 && (
        <div className="panel">
          <div className="panel-header">Tratamientos atendidos</div>
          <table>
            <tbody>
              {initial.treatments.map((t) => (
                <tr key={t.id}>
                  <td>{t.serviceName}</td>
                  <td>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="form-panel">
        <div className="form-panel-header">
          <h2 className="form-panel-title">Archivos de la consulta</h2>
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
          {files.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Sin archivos adjuntos.</p>
          ) : (
            <ul className="space-y-2">
              {files.map((f) => (
                <li key={f.id} className="flex flex-wrap gap-2 items-center text-sm">
                  <a href={`/api/files/${f.id}`} className="text-[var(--accent-brand)]">
                    {f.originalFilename}
                  </a>
                  <span className="text-[var(--muted)]">{f.sourceLabel}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
