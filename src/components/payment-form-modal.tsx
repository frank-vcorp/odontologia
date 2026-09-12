"use client";

import { useEffect, useMemo, useState } from "react";
import { centsToDisplay, parseMoneyToCents } from "@/shared/money";
import { formatInClinicTimezone, toClinicDateInput, toClinicTimeInput } from "@/shared/datetime";

type PaymentMethod = { id: string; name: string };

type TreatmentBalance = {
  treatmentId: string;
  serviceName: string;
  status: string;
  balanceCents: number;
};

type UnpaidService = {
  id: string;
  consultationId: string;
  consultationOccurredAt: string;
  serviceName: string;
  pendingCents: number;
};

type PatientBalance = {
  generalBalanceCents: number;
  treatmentBalances: TreatmentBalance[];
  unpaidConsultationServices: UnpaidService[];
};

type AllocationSelection = {
  key: string;
  targetType: "treatment" | "consultation_service" | "general";
  treatmentId?: string;
  consultationServiceId?: string;
  label: string;
  maxCents: number;
  selected: boolean;
  amount: string;
};

export function PaymentFormModal({
  patientId,
  consultationId,
  onClose,
  onSuccess,
}: {
  patientId: string;
  consultationId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [balance, setBalance] = useState<PatientBalance | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toClinicDateInput(new Date()));
  const [time, setTime] = useState(toClinicTimeInput(new Date()));
  const [notes, setNotes] = useState("");
  const [selections, setSelections] = useState<AllocationSelection[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([
      fetch("/api/payment-methods").then((r) => r.json()),
      fetch(`/api/patients/${patientId}/balance`).then((r) => r.json()),
    ]).then(([methodsData, balanceData]) => {
      setMethods(methodsData.methods ?? []);
      if (methodsData.methods?.[0]) setPaymentMethodId(methodsData.methods[0].id);
      setBalance(balanceData.balance ?? null);
    });
  }, [patientId]);

  const unpaidServices = useMemo(() => {
    if (!balance) return [];
    const services = balance.unpaidConsultationServices;
    if (consultationId) return services.filter((s) => s.consultationId === consultationId);
    return services;
  }, [balance, consultationId]);

  useEffect(() => {
    if (!balance) return;

    const items: AllocationSelection[] = [];

    for (const service of unpaidServices) {
      items.push({
        key: `cs-${service.id}`,
        targetType: "consultation_service",
        consultationServiceId: service.id,
        label: `${service.serviceName} (${formatInClinicTimezone(service.consultationOccurredAt, { dateStyle: "short" })})`,
        maxCents: service.pendingCents,
        selected: false,
        amount: String(service.pendingCents / 100),
      });
    }

    for (const treatment of balance.treatmentBalances) {
      if (treatment.status === "cancelado" || treatment.balanceCents <= 0) continue;
      items.push({
        key: `t-${treatment.treatmentId}`,
        targetType: "treatment",
        treatmentId: treatment.treatmentId,
        label: `${treatment.serviceName} (tratamiento)`,
        maxCents: treatment.balanceCents,
        selected: false,
        amount: String(treatment.balanceCents / 100),
      });
    }

    if (!consultationId && balance.generalBalanceCents > 0) {
      items.push({
        key: "general",
        targetType: "general",
        label: "Saldo general (servicios de consulta)",
        maxCents: balance.generalBalanceCents,
        selected: false,
        amount: String(balance.generalBalanceCents / 100),
      });
    }

    setSelections(items);
  }, [balance, consultationId, unpaidServices]);

  function toggleSelection(key: string, selected: boolean) {
    setSelections((prev) => prev.map((item) => (item.key === key ? { ...item, selected } : item)));
  }

  function updateAmount(key: string, amountValue: string) {
    setSelections((prev) => prev.map((item) => (item.key === key ? { ...item, amount: amountValue } : item)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const amountCents = parseMoneyToCents(amount);
    if (!amountCents || amountCents <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }
    if (!paymentMethodId) {
      setError("Selecciona un método de pago.");
      return;
    }

    const selected = selections.filter((s) => s.selected);
    if (selected.length === 0) {
      setError("Selecciona al menos un destino para el pago.");
      return;
    }

    const allocations: {
      targetType: "treatment" | "consultation_service" | "general";
      treatmentId: string | null;
      consultationServiceId: string | null;
      amountCents: number;
    }[] = [];

    for (const item of selected) {
      const allocCents = parseMoneyToCents(item.amount) ?? 0;
      if (allocCents <= 0 || allocCents > item.maxCents) {
        setError(`Monto inválido para ${item.label}`);
        return;
      }
      allocations.push({
        targetType: item.targetType,
        treatmentId: item.treatmentId ?? null,
        consultationServiceId: item.consultationServiceId ?? null,
        amountCents: allocCents,
      });
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + a.amountCents, 0);
    if (totalAllocated !== amountCents) {
      setError("La suma de destinos debe coincidir con el monto total.");
      return;
    }

    setSaving(true);
    const url = consultationId
      ? `/api/consultations/${consultationId}/payments`
      : "/api/payments";

    const body = consultationId
      ? { paymentMethodId, amountCents, date, time, notes: notes.trim() || null, allocations }
      : { patientId, paymentMethodId, amountCents, date, time, notes: notes.trim() || null, allocations };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo registrar el pago");
      return;
    }

    onSuccess();
    onClose();
  }

  return (
    <div className="form-overlay" role="dialog" aria-modal="true" aria-label="Registrar pago">
      <button type="button" className="form-overlay-backdrop" aria-label="Cerrar" onClick={onClose} />
      <div className="form-overlay-panel">
        <form onSubmit={(e) => void handleSubmit(e)} className="form-panel">
          <div className="form-panel-header">
            <h2 className="form-panel-title">Registrar pago</h2>
            <p className="form-panel-desc">Distribuye el monto entre tratamientos, servicios o saldo general.</p>
          </div>
          <div className="form-panel-body space-y-4">
            {error && <p className="text-[var(--danger)] text-sm">{error}</p>}

            <div className="form-grid cols-2">
              <div className="field">
                <label htmlFor="payment-method">Método de pago *</label>
                <select
                  id="payment-method"
                  required
                  value={paymentMethodId}
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                >
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="payment-amount">Monto total (MXN) *</label>
                <input
                  id="payment-amount"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="payment-date">Fecha *</label>
                <input id="payment-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="payment-time">Hora *</label>
                <input id="payment-time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label htmlFor="payment-notes">Notas</label>
              <textarea id="payment-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {selections.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No hay saldos pendientes para asignar.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium m-0">Destino del pago</p>
                {selections.map((item) => (
                  <div key={item.key} className="card space-y-2">
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => toggleSelection(item.key, e.target.checked)}
                      />
                      <span>
                        {item.label}
                        <span className="text-[var(--muted)]"> · Pendiente {centsToDisplay(item.maxCents)}</span>
                      </span>
                    </label>
                    {item.selected && (
                      <div className="field">
                        <label>Monto a aplicar (MXN)</label>
                        <input value={item.amount} onChange={(e) => updateAmount(item.key, e.target.value)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="form-panel-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Registrando…" : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
