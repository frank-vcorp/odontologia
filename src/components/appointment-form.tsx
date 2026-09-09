"use client";

import { useEffect, useState } from "react";
import { EntitySearchSelect } from "@/components/entity-search-select";

export type AppointmentFormValues = {
  patientId: string;
  serviceId: string;
  treatmentId: string;
  date: string;
  time: string;
  durationMinutes: number;
  notes: string;
};

const emptyValues: AppointmentFormValues = {
  patientId: "",
  serviceId: "",
  treatmentId: "",
  date: "",
  time: "",
  durationMinutes: 60,
  notes: "",
};

export function AppointmentForm({
  initial,
  onSubmit,
  onCancel,
  saving,
  error,
  submitLabel = "Guardar cita",
}: {
  initial?: Partial<AppointmentFormValues>;
  onSubmit: (values: AppointmentFormValues) => Promise<void>;
  onCancel?: () => void;
  saving: boolean;
  error?: string;
  submitLabel?: string;
}) {
  const [form, setForm] = useState({ ...emptyValues, ...initial });
  const [localError, setLocalError] = useState("");
  const [quickPatient, setQuickPatient] = useState({ fullName: "", phone: "" });
  const [quickService, setQuickService] = useState({ name: "", price: "" });
  const [treatments, setTreatments] = useState<{ id: string; serviceName: string }[]>([]);

  useEffect(() => {
    if (!form.patientId) {
      setTreatments([]);
      return;
    }
    void fetch(`/api/patients/${form.patientId}/treatments`)
      .then((r) => r.json())
      .then((d) => setTreatments(d.treatments ?? []));
  }, [form.patientId]);

  async function quickAddPatient() {
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quickPatient),
    });
    if (!res.ok) return;
    const data = await res.json();
    setForm((f) => ({ ...f, patientId: data.patient.id }));
    setQuickPatient({ fullName: "", phone: "" });
  }

  async function quickAddService() {
    const price = quickService.price.trim();
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: quickService.name,
        suggestedPriceCents: price ? Math.round(Number.parseFloat(price) * 100) : null,
        generatesTreatment: false,
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setForm((f) => ({ ...f, serviceId: data.service.id }));
    setQuickService({ name: "", price: "" });
  }

  return (
    <form
      className="form-panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.patientId) {
          setLocalError("Selecciona un paciente de la lista o usa alta rápida.");
          return;
        }
        if (!form.serviceId) {
          setLocalError("Selecciona un servicio de la lista o usa alta rápida.");
          return;
        }
        setLocalError("");
        void onSubmit(form);
      }}
    >
      <div className="form-panel-header">
        <h2 className="form-panel-title">Nueva cita</h2>
      </div>
      <div className="form-panel-body space-y-4">
        {(localError || error) && <p className="text-[var(--danger)] text-sm">{localError || error}</p>}

        <EntitySearchSelect
          label="Paciente"
          required
          value={form.patientId}
          onChange={(id) => setForm((f) => ({ ...f, patientId: id, treatmentId: "" }))}
          fetchUrl="/api/patients"
          mapItem={(p) => ({
            id: String(p.id),
            label: String(p.fullName),
            sublabel: String(p.phone),
          })}
        />

        <div className="card space-y-2">
          <p className="text-sm font-semibold">Alta rápida paciente</p>
          <div className="form-grid cols-2">
            <input
              placeholder="Nombre completo"
              value={quickPatient.fullName}
              onChange={(e) => setQuickPatient({ ...quickPatient, fullName: e.target.value })}
            />
            <input
              placeholder="Teléfono"
              value={quickPatient.phone}
              onChange={(e) => setQuickPatient({ ...quickPatient, phone: e.target.value })}
            />
          </div>
          <button type="button" className="btn btn-secondary text-sm" onClick={() => void quickAddPatient()}>
            Agregar paciente
          </button>
        </div>

        <EntitySearchSelect
          label="Servicio"
          required
          value={form.serviceId}
          onChange={(id) => setForm((f) => ({ ...f, serviceId: id }))}
          fetchUrl="/api/services"
          mapItem={(s) => ({
            id: String(s.id),
            label: String(s.name),
          })}
        />

        <div className="card space-y-2">
          <p className="text-sm font-semibold">Alta rápida servicio</p>
          <div className="form-grid cols-2">
            <input
              placeholder="Nombre del servicio"
              value={quickService.name}
              onChange={(e) => setQuickService({ ...quickService, name: e.target.value })}
            />
            <input
              placeholder="Precio sugerido (opcional)"
              value={quickService.price}
              onChange={(e) => setQuickService({ ...quickService, price: e.target.value })}
            />
          </div>
          <button type="button" className="btn btn-secondary text-sm" onClick={() => void quickAddService()}>
            Agregar servicio
          </button>
        </div>

        {treatments.length > 0 && (
          <div className="field">
            <label htmlFor="treatmentId">Tratamiento relacionado (opcional)</label>
            <select
              id="treatmentId"
              value={form.treatmentId}
              onChange={(e) => setForm((f) => ({ ...f, treatmentId: e.target.value }))}
            >
              <option value="">Ninguno</option>
              {treatments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.serviceName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-grid cols-2">
          <div className="field">
            <label htmlFor="date">Fecha *</label>
            <input
              id="date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="time">Hora *</label>
            <input
              id="time"
              type="time"
              required
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="duration">Duración (minutos) *</label>
            <input
              id="duration"
              type="number"
              min={15}
              step={15}
              required
              value={form.durationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
            />
          </div>
          <div className="field">
            <label htmlFor="notes">Observación breve</label>
            <input
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
      </div>
      <div className="form-panel-footer">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
