"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BudgetForm } from "@/components/budget-form";
import { ExpedienteSection } from "@/components/expediente-section";
import { EntitySearchSelect } from "@/components/entity-search-select";
import { PaymentFormModal } from "@/components/payment-form-modal";
import { formatInClinicTimezone } from "@/shared/datetime";
import { centsToDisplay, parseMoneyToCents } from "@/shared/money";

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

type BudgetSummary = {
  id: string;
  status: string;
  totalCents: number;
  createdAt: string;
};

type TreatmentSummary = {
  id: string;
  serviceName: string;
  status: string;
  agreedCostCents: number;
  balanceCents: number;
};

const budgetStatusLabels: Record<string, string> = {
  borrador: "Borrador",
  presentado: "Presentado",
  parcialmente_autorizado: "Parcialmente autorizado",
  autorizado: "Autorizado",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
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
  const [balance, setBalance] = useState<{ totalBalanceCents: number; generalBalanceCents: number; totalTreatmentBalanceCents: number } | null>(null);
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [treatments, setTreatments] = useState<TreatmentSummary[]>([]);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [treatmentForm, setTreatmentForm] = useState({
    serviceId: "",
    serviceName: "",
    cost: "",
    frequencyDays: "",
    notes: "",
  });
  const [creatingTreatment, setCreatingTreatment] = useState(false);

  const loadFinancialData = useCallback(async () => {
    const [balanceRes, budgetsRes, treatmentsRes] = await Promise.all([
      fetch(`/api/patients/${patient.id}/balance`),
      fetch(`/api/patients/${patient.id}/budgets`),
      fetch(`/api/patients/${patient.id}/treatments`),
    ]);
    if (balanceRes.ok) {
      const data = await balanceRes.json();
      setBalance(data.balance ?? null);
    }
    if (budgetsRes.ok) {
      const data = await budgetsRes.json();
      setBudgets(data.budgets ?? []);
    }
    if (treatmentsRes.ok) {
      const data = await treatmentsRes.json();
      setTreatments(data.treatments ?? []);
    }
  }, [patient.id]);

  useEffect(() => {
    void fetch(`/api/consultations?patientId=${patient.id}`)
      .then((r) => r.json())
      .then((d) => setConsultations(d.consultations ?? []));
    void loadFinancialData();
  }, [patient.id, loadFinancialData]);

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

  async function handleCreateTreatment(e: React.FormEvent) {
    e.preventDefault();
    if (!treatmentForm.serviceName.trim()) {
      setError("El nombre del servicio es requerido.");
      return;
    }
    setCreatingTreatment(true);
    setError("");
    const res = await fetch("/api/treatments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: patient.id,
        serviceId: treatmentForm.serviceId || null,
        serviceName: treatmentForm.serviceName,
        agreedCostCents: parseMoneyToCents(treatmentForm.cost) ?? 0,
        recommendedFrequencyDays: treatmentForm.frequencyDays ? Number(treatmentForm.frequencyDays) : null,
        notes: treatmentForm.notes.trim() || null,
      }),
    });
    setCreatingTreatment(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo crear el tratamiento");
      return;
    }
    setShowTreatmentForm(false);
    setTreatmentForm({ serviceId: "", serviceName: "", cost: "", frequencyDays: "", notes: "" });
    void loadFinancialData();
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
            <p className="font-semibold">{centsToDisplay(balance?.totalBalanceCents ?? 0)}</p>
            {balance && balance.totalBalanceCents > 0 && (
              <p className="text-xs text-[var(--muted)]">
                General {centsToDisplay(balance.generalBalanceCents)} · Tratamientos {centsToDisplay(balance.totalTreatmentBalanceCents)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <button type="button" className="btn btn-primary text-sm" onClick={() => setShowPaymentModal(true)}>
              Registrar pago
            </button>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentFormModal
          patientId={patient.id}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => void loadFinancialData()}
        />
      )}

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-semibold m-0">Presupuestos</h2>
          <button type="button" className="btn btn-secondary text-sm" onClick={() => setShowBudgetForm((v) => !v)}>
            {showBudgetForm ? "Cancelar" : "Nuevo presupuesto"}
          </button>
        </div>
        {showBudgetForm && (
          <div className="mb-4">
            <BudgetForm
              initialPatientId={patient.id}
              onCancel={() => setShowBudgetForm(false)}
              onSuccess={() => {
                setShowBudgetForm(false);
                void loadFinancialData();
              }}
            />
          </div>
        )}
        {budgets.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Aún no hay presupuestos para este paciente.</p>
        ) : (
          <ul className="space-y-2">
            {budgets.map((b) => (
              <li key={b.id} className="text-sm flex flex-wrap gap-2 justify-between">
                <Link href={`/presupuestos/${b.id}`}>
                  {formatInClinicTimezone(b.createdAt, { dateStyle: "medium" })} · {budgetStatusLabels[b.status] ?? b.status}
                </Link>
                <span className="text-[var(--muted)]">{centsToDisplay(b.totalCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-semibold m-0">Tratamientos</h2>
          <button type="button" className="btn btn-secondary text-sm" onClick={() => setShowTreatmentForm((v) => !v)}>
            {showTreatmentForm ? "Cancelar" : "Nuevo tratamiento"}
          </button>
        </div>
        {showTreatmentForm && (
          <form onSubmit={(e) => void handleCreateTreatment(e)} className="form-panel mb-4">
            <div className="form-panel-body space-y-3">
              <EntitySearchSelect
                label="Servicio del catálogo"
                value={treatmentForm.serviceId}
                onChange={(id, item) =>
                  setTreatmentForm((f) => ({
                    ...f,
                    serviceId: id,
                    serviceName: item?.label ?? f.serviceName,
                  }))
                }
                fetchUrl="/api/services"
                mapItem={(item) => ({
                  id: item.id as string,
                  label: item.name as string,
                })}
              />
              <div className="form-grid cols-2">
                <div className="field">
                  <label htmlFor="treatment-name">Nombre *</label>
                  <input
                    id="treatment-name"
                    required
                    value={treatmentForm.serviceName}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, serviceName: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="treatment-cost">Costo acordado (MXN)</label>
                  <input
                    id="treatment-cost"
                    value={treatmentForm.cost}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, cost: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="treatment-frequency">Frecuencia (días)</label>
                  <input
                    id="treatment-frequency"
                    type="number"
                    min={1}
                    value={treatmentForm.frequencyDays}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, frequencyDays: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="treatment-notes">Notas</label>
                  <input
                    id="treatment-notes"
                    value={treatmentForm.notes}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="form-panel-footer">
              <button type="submit" className="btn btn-primary" disabled={creatingTreatment}>
                {creatingTreatment ? "Guardando…" : "Crear tratamiento"}
              </button>
            </div>
          </form>
        )}
        {treatments.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Aún no hay tratamientos para este paciente.</p>
        ) : (
          <ul className="space-y-2">
            {treatments.map((t) => (
              <li key={t.id} className="text-sm flex flex-wrap gap-2 justify-between">
                <Link href={`/tratamientos/${t.id}`}>{t.serviceName}</Link>
                <span className="text-[var(--muted)]">
                  {t.status} · Saldo {centsToDisplay(t.balanceCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-semibold m-0">Historial de consultas</h2>
          <Link href="/consultas" className="btn btn-secondary text-sm">
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
