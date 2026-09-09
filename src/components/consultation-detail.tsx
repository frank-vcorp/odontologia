"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ConsultationServicesModal,
  type ConsultationServiceView,
} from "@/components/consultation-services-modal";
import { FileGallery, type GalleryFile } from "@/components/file-gallery";
import { formatInClinicTimezone } from "@/shared/datetime";
import { centsToDisplay } from "@/shared/money";

type Consultation = {
  id: string;
  patientId: string;
  patientName: string;
  appointmentId: string | null;
  occurredAt: string;
  clinicalNotes: string | null;
  services: ConsultationServiceView[];
  treatments: { id: string; serviceName: string; status: string }[];
};

type FileRecord = GalleryFile;

export function ConsultationDetail({
  consultation: initial,
  initialFiles = [],
}: {
  consultation: Consultation;
  initialFiles?: FileRecord[];
}) {
  const [consultation, setConsultation] = useState(initial);
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);

  async function uploadFile(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/consultations/${consultation.id}/files`, { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) return;
    const data = await res.json();
    setFiles((prev) => [data.file, ...prev]);
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-2">
        <p className="text-sm text-[var(--muted)] m-0">Paciente</p>
        <Link href={`/pacientes/${consultation.patientId}`} className="text-lg font-semibold">
          {consultation.patientName}
        </Link>
        <p className="text-sm text-[var(--muted)]">
          {formatInClinicTimezone(consultation.occurredAt, { dateStyle: "full", timeStyle: "short" })}
        </p>
        {consultation.appointmentId && (
          <Link href="/agenda" className="text-sm">
            Cita de origen
          </Link>
        )}
        {consultation.clinicalNotes && <p className="text-sm whitespace-pre-wrap">{consultation.clinicalNotes}</p>}
      </div>

      <div className="panel">
        <div className="panel-header flex flex-wrap items-center justify-between gap-2">
          <span>Servicios realizados</span>
          <button type="button" className="btn btn-secondary text-sm" onClick={() => setShowServicesModal(true)}>
            {consultation.services.length === 0 ? "Agregar servicios" : "Editar servicios"}
          </button>
        </div>
        {consultation.services.length === 0 ? (
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
              {consultation.services.map((service) => (
                <tr key={service.id}>
                  <td>{service.serviceName}</td>
                  <td>{centsToDisplay(service.priceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showServicesModal && (
        <ConsultationServicesModal
          consultationId={consultation.id}
          occurredAt={consultation.occurredAt}
          clinicalNotes={consultation.clinicalNotes}
          treatmentIds={consultation.treatments.map((treatment) => treatment.id)}
          initialServices={consultation.services}
          onClose={() => setShowServicesModal(false)}
          onSaved={(services) => setConsultation((current) => ({ ...current, services }))}
        />
      )}

      {consultation.treatments.length > 0 && (
        <div className="panel">
          <div className="panel-header">Tratamientos atendidos</div>
          <table>
            <tbody>
              {consultation.treatments.map((t) => (
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
          <FileGallery files={files} emptyMessage="Sin archivos adjuntos." />
        </div>
      </div>
    </div>
  );
}
