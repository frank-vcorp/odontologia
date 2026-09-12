"use client";

import Link from "next/link";
import { useState } from "react";
import { FileGallery, type GalleryFile } from "@/components/file-gallery";
import { formatInClinicTimezone, toClinicDateInput } from "@/shared/datetime";
import { centsToDisplay } from "@/shared/money";

type Treatment = {
  id: string;
  patientId: string;
  patientName: string;
  serviceId: string | null;
  serviceName: string;
  agreedCostCents: number;
  status: "activo" | "terminado" | "cancelado";
  budgetId: string | null;
  recommendedFrequencyDays: number | null;
  notes: string | null;
  paidCents: number;
  balanceCents: number;
  consultations: { id: string; occurredAt: string; clinicalNotes: string | null }[];
  suggestedNextAppointmentDate: string | null;
};

const statusLabels: Record<string, string> = {
  activo: "Activo",
  terminado: "Terminado",
  cancelado: "Cancelado",
};

export function TreatmentDetail({
  initial,
  initialFiles = [],
}: {
  initial: Treatment;
  initialFiles?: GalleryFile[];
}) {
  const [treatment, setTreatment] = useState(initial);
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(status: "terminado" | "cancelado") {
    const label = status === "terminado" ? "terminar" : "cancelar";
    if (!confirm(`¿Confirmas ${label} este tratamiento?`)) return;
    setUpdating(true);
    setError("");
    const res = await fetch(`/api/treatments/${treatment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo actualizar");
      return;
    }
    const data = await res.json();
    setTreatment((prev) => ({ ...prev, ...data.treatment, patientName: prev.patientName, consultations: prev.consultations, suggestedNextAppointmentDate: prev.suggestedNextAppointmentDate }));
  }

  async function uploadFile(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/treatments/${treatment.id}/files`, { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) return;
    const data = await res.json();
    setFiles((prev) => [{ ...data.file, createdAt: data.file.createdAt ?? new Date().toISOString() }, ...prev]);
  }

  function appointmentHref() {
    const params = new URLSearchParams({ nueva: "1", patientId: treatment.patientId, treatmentId: treatment.id });
    if (treatment.serviceId) params.set("serviceId", treatment.serviceId);
    if (treatment.suggestedNextAppointmentDate) {
      params.set("date", toClinicDateInput(treatment.suggestedNextAppointmentDate));
    }
    return `/agenda?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-2">
        <p className="text-sm text-[var(--muted)] m-0">Paciente</p>
        <Link href={`/pacientes/${treatment.patientId}`} className="text-lg font-semibold">
          {treatment.patientName}
        </Link>
        {treatment.budgetId && (
          <p className="text-sm m-0">
            Presupuesto:{" "}
            <Link href={`/presupuestos/${treatment.budgetId}`}>Ver presupuesto</Link>
          </p>
        )}
        <p className="text-lg font-semibold m-0 mt-2">{treatment.serviceName}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm mt-3">
          <div>
            <span className="text-[var(--muted)]">Costo acordado</span>
            <p className="font-semibold m-0">{centsToDisplay(treatment.agreedCostCents)}</p>
          </div>
          <div>
            <span className="text-[var(--muted)]">Pagado</span>
            <p className="font-semibold m-0">{centsToDisplay(treatment.paidCents)}</p>
          </div>
          <div>
            <span className="text-[var(--muted)]">Saldo</span>
            <p className="font-semibold m-0">{centsToDisplay(treatment.balanceCents)}</p>
          </div>
          <div>
            <span className="text-[var(--muted)]">Estado</span>
            <p className="m-0">
              <span className="badge badge-role">{statusLabels[treatment.status] ?? treatment.status}</span>
            </p>
          </div>
        </div>
        {treatment.recommendedFrequencyDays && (
          <p className="text-sm text-[var(--muted)] m-0">
            Frecuencia recomendada: cada {treatment.recommendedFrequencyDays} días
          </p>
        )}
        {treatment.notes && <p className="text-sm whitespace-pre-wrap m-0">{treatment.notes}</p>}
        {error && <p className="text-[var(--danger)] text-sm m-0">{error}</p>}
        {treatment.status === "activo" && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href={appointmentHref()} className="btn btn-primary text-sm">
              Crear próxima cita
            </Link>
            <button type="button" className="btn btn-secondary text-sm" disabled={updating} onClick={() => void updateStatus("terminado")}>
              Terminar
            </button>
            <button type="button" className="btn btn-ghost btn-danger text-sm" disabled={updating} onClick={() => void updateStatus("cancelado")}>
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">Consultas vinculadas</div>
        {treatment.consultations.length === 0 ? (
          <p className="p-4 text-[var(--muted)]">Aún no hay consultas registradas para este tratamiento.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Notas</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {treatment.consultations.map((c) => (
                <tr key={c.id}>
                  <td>{formatInClinicTimezone(c.occurredAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="text-[var(--muted)]">{c.clinicalNotes ?? "—"}</td>
                  <td>
                    <Link href={`/consultas/${c.id}`} className="btn btn-ghost text-sm">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="form-panel">
        <div className="form-panel-header">
          <h2 className="form-panel-title">Archivos del tratamiento</h2>
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
