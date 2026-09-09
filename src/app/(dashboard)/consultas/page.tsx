"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConsultationForm } from "@/components/consultation-form";
import { PageHeader } from "@/components/page-header";
import { formatInClinicTimezone } from "@/shared/datetime";

type Consultation = {
  id: string;
  patientName: string;
  occurredAt: string;
  services: { serviceName: string }[];
};

export default function ConsultasPage() {
  const router = useRouter();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void fetch("/api/consultations")
      .then((r) => r.json())
      .then((d) => {
        setConsultations(d.consultations ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <PageHeader
        title="Consultas"
        description="Registro de la atención real. El historial clínico principal del paciente."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancelar" : "Nueva consulta"}
          </button>
        }
      />

      {showForm && (
        <ConsultationForm
          onSuccess={(id) => {
            router.push(`/consultas/${id}`);
          }}
        />
      )}

      <div className="panel mt-5">
        {loading ? (
          <p className="p-4 text-[var(--muted)]">Cargando…</p>
        ) : consultations.length === 0 ? (
          <p className="p-6 text-center text-[var(--muted)]">Aún no hay consultas registradas.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Paciente</th>
                <th>Servicios</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {consultations.map((c) => (
                <tr key={c.id}>
                  <td>{formatInClinicTimezone(c.occurredAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td>{c.patientName}</td>
                  <td>{c.services.map((s) => s.serviceName).join(", ") || "—"}</td>
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
    </>
  );
}
