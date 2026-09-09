"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExpedienteSection } from "@/components/expediente-section";
import { formatInClinicTimezone } from "@/shared/datetime";
import { centsToDisplay } from "@/shared/money";

type Patient = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  address: string | null;
  medicalHistory: string | null;
  notes: string | null;
};

export function PatientDetail({ initial }: { initial: Patient }) {
  const [patient, setPatient] = useState(initial);
  const [form, setForm] = useState({
    fullName: initial.fullName,
    phone: initial.phone,
    email: initial.email ?? "",
    birthDate: initial.birthDate ?? "",
    address: initial.address ?? "",
    medicalHistory: initial.medicalHistory ?? "",
    notes: initial.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [consultations, setConsultations] = useState<
    { id: string; occurredAt: string; services: { serviceName: string }[] }[]
  >([]);

  useEffect(() => {
    void fetch(`/api/consultations?patientId=${patient.id}`)
      .then((r) => r.json())
      .then((d) => setConsultations(d.consultations ?? []));
  }, [patient.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch(`/api/patients/${patient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.fullName,
        phone: form.phone,
        email: form.email || null,
        birthDate: form.birthDate || null,
        address: form.address || null,
        medicalHistory: form.medicalHistory || null,
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo guardar");
      return;
    }
    const data = await res.json();
    setPatient(data.patient);
    setMessage("Paciente actualizado");
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <p className="text-sm text-[var(--muted)] mb-1">Resumen operativo</p>
        <p className="text-lg font-semibold">{patient.fullName}</p>
        <p className="text-sm text-[var(--muted)]">{patient.phone}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
          <div>
            <span className="text-[var(--muted)]">Saldo pendiente</span>
            <p className="font-semibold">{centsToDisplay(0)}</p>
          </div>
          <div>
            <span className="text-[var(--muted)]">Próxima cita</span>
            <p>—</p>
          </div>
        </div>
        <p className="text-xs text-[var(--muted)] mt-3">
          Los saldos, citas y consultas se habilitan en fases posteriores.
        </p>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-semibold m-0">Historial de consultas</h2>
          <Link href={`/consultas`} className="btn btn-secondary text-sm">
            Nueva consulta
          </Link>
        </div>
        {consultations.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Aún no hay consultas para este paciente.</p>
        ) : (
          <ul className="space-y-2">
            {consultations.slice(0, 5).map((c) => (
              <li key={c.id} className="text-sm flex flex-wrap gap-2 justify-between">
                <Link href={`/consultas/${c.id}`}>
                  {formatInClinicTimezone(c.occurredAt, { dateStyle: "medium", timeStyle: "short" })}
                </Link>
                <span className="text-[var(--muted)]">
                  {c.services.map((s) => s.serviceName).join(", ") || "Consulta"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ExpedienteSection patientId={patient.id} />

      <form onSubmit={handleSave} className="form-panel">
        <div className="form-panel-header">
          <h2 className="form-panel-title">Información del paciente</h2>
        </div>
        <div className="form-panel-body">
          {message && <p className="text-[var(--success)] text-sm">{message}</p>}
          {error && <p className="text-[var(--danger)] text-sm">{error}</p>}
          <div className="form-grid cols-2">
            <div className="field">
              <label htmlFor="fullName">Nombre completo *</label>
              <input
                id="fullName"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Teléfono *</label>
              <input
                id="phone"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="email">Correo</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="birthDate">Fecha de nacimiento</label>
              <input
                id="birthDate"
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="address">Dirección</label>
              <input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="medicalHistory">Antecedentes médicos</label>
              <textarea
                id="medicalHistory"
                value={form.medicalHistory}
                onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })}
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="notes">Observaciones generales</label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="form-panel-footer">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
