"use client";

import { useEffect, useState } from "react";
import { EntitySearchSelect } from "@/components/entity-search-select";
import { centsToDisplay, parseMoneyToCents } from "@/shared/money";
import { toClinicDateInput, toClinicTimeInput } from "@/shared/datetime";

type ServiceLine = {
  serviceId: string;
  serviceName: string;
  price: string;
};

type ServiceCatalog = { id: string; name: string; suggestedPriceCents: number | null };

export function ConsultationForm({
  initialPatientId = "",
  initialAppointmentId = "",
  onSuccess,
}: {
  initialPatientId?: string;
  initialAppointmentId?: string;
  onSuccess: (consultationId: string) => void;
}) {
  const [patientId, setPatientId] = useState(initialPatientId);
  const [date, setDate] = useState(toClinicDateInput(new Date()));
  const [time, setTime] = useState(toClinicTimeInput(new Date()));
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [services, setServices] = useState<ServiceLine[]>([]);
  const [catalog, setCatalog] = useState<ServiceCatalog[]>([]);
  const [treatments, setTreatments] = useState<{ id: string; serviceName: string }[]>([]);
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/services").then(async (r) => {
      if (!r.ok) return;
      const data = await r.json();
      setCatalog(data.services ?? []);
    });
  }, []);

  useEffect(() => {
    if (!patientId) {
      setTreatments([]);
      setSelectedTreatments([]);
      return;
    }
    void fetch(`/api/patients/${patientId}/treatments`)
      .then((r) => r.json())
      .then((d) => setTreatments(d.treatments ?? []));
  }, [patientId]);

  function addServiceFromCatalog(serviceId: string) {
    const service = catalog.find((s) => s.id === serviceId);
    if (!service) return;
    setServices((prev) => [
      ...prev,
      {
        serviceId: service.id,
        serviceName: service.name,
        price: service.suggestedPriceCents != null ? String(service.suggestedPriceCents / 100) : "",
      },
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      patientId,
      appointmentId: initialAppointmentId || null,
      fromAppointment: Boolean(initialAppointmentId),
      date,
      time,
      clinicalNotes: clinicalNotes || null,
      services: services.map((s) => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        priceCents: parseMoneyToCents(s.price) ?? 0,
      })),
      treatmentIds: selectedTreatments,
    };

    const res = await fetch("/api/consultations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo guardar");
      return;
    }
    const data = await res.json();
    onSuccess(data.consultation.id);
  }

  return (
    <form onSubmit={handleSubmit} className="form-panel">
      <div className="form-panel-header">
        <h2 className="form-panel-title">Nueva consulta</h2>
      </div>
      <div className="form-panel-body space-y-4">
        {error && <p className="text-[var(--danger)] text-sm">{error}</p>}

        {!initialAppointmentId && (
          <EntitySearchSelect
            label="Paciente"
            required
            value={patientId}
            onChange={(id) => setPatientId(id)}
            fetchUrl="/api/patients"
            mapItem={(p) => ({ id: String(p.id), label: String(p.fullName), sublabel: String(p.phone) })}
          />
        )}

        <div className="form-grid cols-2">
          <div className="field">
            <label htmlFor="c-date">Fecha *</label>
            <input id="c-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="c-time">Hora *</label>
            <input id="c-time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="clinicalNotes">Observaciones clínicas</label>
          <textarea
            id="clinicalNotes"
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="field flex-1 min-w-[12rem]">
              <label>Agregar servicio</label>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) addServiceFromCatalog(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">Seleccionar…</option>
                {catalog.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.suggestedPriceCents != null ? ` (${centsToDisplay(s.suggestedPriceCents)})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {services.map((line, index) => (
            <div key={`${line.serviceId}-${index}`} className="form-grid cols-2 card">
              <div className="field">
                <label>Servicio</label>
                <input value={line.serviceName} readOnly />
              </div>
              <div className="field">
                <label>Precio (MXN)</label>
                <input
                  value={line.price}
                  onChange={(e) =>
                    setServices((prev) =>
                      prev.map((s, i) => (i === index ? { ...s, price: e.target.value } : s)),
                    )
                  }
                />
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-danger text-sm"
                onClick={() => setServices((prev) => prev.filter((_, i) => i !== index))}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>

        {treatments.length > 0 && (
          <div className="field">
            <label>Tratamientos atendidos</label>
            <div className="space-y-2">
              {treatments.map((t) => (
                <label key={t.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedTreatments.includes(t.id)}
                    onChange={(e) => {
                      setSelectedTreatments((prev) =>
                        e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id),
                      );
                    }}
                  />
                  {t.serviceName}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="form-panel-footer">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Guardando…" : "Guardar consulta"}
        </button>
      </div>
    </form>
  );
}
