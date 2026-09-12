"use client";

import { useEffect, useState } from "react";
import { EntitySearchSelect } from "@/components/entity-search-select";
import { centsToDisplay, parseMoneyToCents } from "@/shared/money";

type ServiceLine = {
  serviceId: string;
  serviceName: string;
  price: string;
  generatesTreatment: boolean;
};

type ServiceCatalog = {
  id: string;
  name: string;
  suggestedPriceCents: number | null;
  generatesTreatment: boolean;
};

export function BudgetForm({
  initialPatientId = "",
  onSuccess,
  onCancel,
}: {
  initialPatientId?: string;
  onSuccess: (budgetId: string) => void;
  onCancel?: () => void;
}) {
  const [patientId, setPatientId] = useState(initialPatientId);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ServiceLine[]>([]);
  const [catalog, setCatalog] = useState<ServiceCatalog[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/services")
      .then((r) => r.json())
      .then((d) => setCatalog(d.services ?? []));
  }, []);

  function addServiceFromCatalog(serviceId: string) {
    const service = catalog.find((s) => s.id === serviceId);
    if (!service) return;
    setItems((prev) => [
      ...prev,
      {
        serviceId: service.id,
        serviceName: service.name,
        price: service.suggestedPriceCents != null ? String(service.suggestedPriceCents / 100) : "",
        generatesTreatment: service.generatesTreatment,
      },
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) {
      setError("Selecciona un paciente.");
      return;
    }
    if (items.length === 0) {
      setError("Agrega al menos un concepto.");
      return;
    }
    if (items.some((line) => !line.serviceName.trim())) {
      setError("Todos los conceptos deben tener nombre.");
      return;
    }

    setSaving(true);
    setError("");

    const createRes = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, notes: notes.trim() || null }),
    });
    if (!createRes.ok) {
      setSaving(false);
      const data = await createRes.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo crear el presupuesto");
      return;
    }

    const { budget } = await createRes.json();

    for (const line of items) {
      const itemRes = await fetch(`/api/budgets/${budget.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: line.serviceId || null,
          serviceName: line.serviceName,
          priceCents: parseMoneyToCents(line.price) ?? 0,
          generatesTreatment: line.generatesTreatment,
        }),
      });
      if (!itemRes.ok) {
        setSaving(false);
        const data = await itemRes.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "No se pudo agregar un concepto");
        onSuccess(budget.id);
        return;
      }
    }

    setSaving(false);
    onSuccess(budget.id);
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="form-panel">
      <div className="form-panel-header">
        <h2 className="form-panel-title">Nuevo presupuesto</h2>
        <p className="form-panel-desc">Selecciona el paciente y agrega los conceptos propuestos.</p>
      </div>
      <div className="form-panel-body space-y-4">
        {error && <p className="text-[var(--danger)] text-sm">{error}</p>}

        {!initialPatientId && (
          <EntitySearchSelect
            label="Paciente"
            required
            value={patientId}
            onChange={(id) => setPatientId(id)}
            fetchUrl="/api/patients"
            mapItem={(item) => ({
              id: item.id as string,
              label: item.fullName as string,
              sublabel: item.phone as string,
            })}
          />
        )}

        <div className="field">
          <label htmlFor="budget-notes">Notas</label>
          <textarea id="budget-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="add-budget-service">Agregar concepto</label>
          <select
            id="add-budget-service"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) addServiceFromCatalog(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">Seleccionar del catálogo…</option>
            {catalog.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
                {service.suggestedPriceCents != null ? ` (${centsToDisplay(service.suggestedPriceCents)})` : ""}
              </option>
            ))}
          </select>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Aún no hay conceptos en este presupuesto.</p>
        ) : (
          <div className="space-y-3">
            {items.map((line, index) => (
              <div key={`${line.serviceId}-${index}`} className="card space-y-3">
                <div className="form-grid cols-2">
                  <div className="field">
                    <label>Concepto</label>
                    <input
                      value={line.serviceName}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, serviceName: e.target.value } : item)),
                        )
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Precio (MXN)</label>
                    <input
                      value={line.price}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, price: e.target.value } : item)),
                        )
                      }
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={line.generatesTreatment}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, generatesTreatment: e.target.checked } : item,
                        ),
                      )
                    }
                  />
                  Genera tratamiento longitudinal
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-danger text-sm"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="form-panel-footer">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Guardando…" : "Crear presupuesto"}
        </button>
      </div>
    </form>
  );
}
