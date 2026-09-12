"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ConsultationServicesModal,
  type ConsultationServiceView,
} from "@/components/consultation-services-modal";
import { FileGallery, type GalleryFile } from "@/components/file-gallery";
import { PaymentFormModal } from "@/components/payment-form-modal";
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

type Payment = {
  id: string;
  amountCents: number;
  paidAt: string;
  paymentMethodName: string;
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const loadPayments = useCallback(async () => {
    const res = await fetch(`/api/consultations/${consultation.id}/payments`);
    if (!res.ok) return;
    const data = await res.json();
    setPayments(
      (data.payments ?? []).map((p: Payment & { paidAt: Date | string; paymentMethodName: string }) => ({
        id: p.id,
        amountCents: p.amountCents,
        paymentMethodName: p.paymentMethodName,
        paidAt: typeof p.paidAt === "string" ? p.paidAt : new Date(p.paidAt).toISOString(),
      })),
    );
  }, [consultation.id]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

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
                  <td>
                    <Link href={`/tratamientos/${t.id}`}>{t.serviceName}</Link>
                  </td>
                  <td>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel">
        <div className="panel-header flex flex-wrap items-center justify-between gap-2">
          <span>Pagos</span>
          <button type="button" className="btn btn-primary text-sm" onClick={() => setShowPaymentModal(true)}>
            Registrar pago
          </button>
        </div>
        {payments.length === 0 ? (
          <p className="p-4 text-[var(--muted)]">Sin pagos registrados para esta consulta.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Método</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatInClinicTimezone(p.paidAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td>{p.paymentMethodName}</td>
                  <td>{centsToDisplay(p.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPaymentModal && (
        <PaymentFormModal
          patientId={consultation.patientId}
          consultationId={consultation.id}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => void loadPayments()}
        />
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
