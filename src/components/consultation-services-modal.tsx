"use client";

import { useEffect, useState } from "react";
import { centsToDisplay, parseMoneyToCents } from "@/shared/money";
import { toClinicDateInput, toClinicTimeInput } from "@/shared/datetime";

type ServiceLine = {
  serviceId: string;
  serviceName: string;
  price: string;
};

type ServiceCatalog = {
  id: string;
  name: string;
  suggestedPriceCents: number | null;
};

export type ConsultationServiceView = {
  id: string;
  serviceId: string | null;
  serviceName: string;
  priceCents: number;
};

export function ConsultationServicesModal({
  consultationId,
  occurredAt,
  clinicalNotes,
  treatmentIds,
  initialServices,
  onClose,
  onSaved,
}: {
  consultationId: string;
  occurredAt: string;
  clinicalNotes: string | null;
  treatmentIds: string[];
  initialServices: ConsultationServiceView[];
  onClose: () => void;
  onSaved: (services: ConsultationServiceView[]) => void;
}) {
  const [services, setServices] = useState<ServiceLine[]>(() =>
    initialServices.map((service) => ({
      serviceId: service.serviceId ?? "",
      serviceName: service.serviceName,
      price: String(service.priceCents / 100),
    })),
  );
  const [catalog, setCatalog] = useState<ServiceCatalog[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/services")
      .then((response) => response.json())
      .then((data) => setCatalog(data.services ?? []));
  }, []);

  function addServiceFromCatalog(serviceId: string) {
    const service = catalog.find((item) => item.id === serviceId);
    if (!service) return;
    if (services.some((line) => line.serviceId === service.id)) {
      setError("Ese servicio ya está en la consulta.");
      return;
    }
    setError("");
    setServices((previous) => [
      ...previous,
      {
        serviceId: service.id,
        serviceName: service.name,
        price: service.suggestedPriceCents != null ? String(service.suggestedPriceCents / 100) : "",
      },
    ]);
  }

  async function handleSave() {
    if (services.length === 0) {
      setError("Agrega al menos un servicio.");
      return;
    }
    if (services.some((line) => !line.serviceId)) {
      setError("Todos los servicios deben estar ligados al catálogo.");
      return;
    }

    setSaving(true);
    setError("");

    const response = await fetch(`/api/consultations/${consultationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: toClinicDateInput(occurredAt),
        time: toClinicTimeInput(occurredAt),
        clinicalNotes,
        services: services.map((line) => ({
          serviceId: line.serviceId,
          serviceName: line.serviceName,
          priceCents: parseMoneyToCents(line.price) ?? 0,
        })),
        treatmentIds,
      }),
    });

    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudieron guardar los servicios");
      return;
    }

    const data = await response.json();
    onSaved(data.consultation.services);
    onClose();
  }

  return (
    <div className="form-overlay" role="dialog" aria-modal="true" aria-label="Servicios de la consulta">
      <button type="button" className="form-overlay-backdrop" aria-label="Cerrar" onClick={onClose} />
      <div className="form-overlay-panel">
        <div className="form-panel">
          <div className="form-panel-header">
            <h2 className="form-panel-title">Servicios de la consulta</h2>
            <p className="form-panel-desc">Agrega, ajusta precios o quita servicios realizados en esta visita.</p>
          </div>
          <div className="form-panel-body space-y-4">
            {error && <p className="text-[var(--danger)] text-sm">{error}</p>}

            <div className="field">
              <label htmlFor="add-service">Agregar servicio</label>
              <select
                id="add-service"
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) addServiceFromCatalog(event.target.value);
                  event.target.value = "";
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

            {services.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Aún no hay servicios en esta consulta.</p>
            ) : (
              <div className="space-y-3">
                {services.map((line, index) => (
                  <div key={`${line.serviceId}-${index}`} className="card space-y-3">
                    <div className="form-grid cols-2">
                      <div className="field">
                        <label>Servicio</label>
                        <input value={line.serviceName} readOnly />
                      </div>
                      <div className="field">
                        <label>Precio (MXN)</label>
                        <input
                          value={line.price}
                          onChange={(event) =>
                            setServices((previous) =>
                              previous.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, price: event.target.value } : item,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-danger text-sm"
                      onClick={() => setServices((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="form-panel-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void handleSave()}>
              {saving ? "Guardando…" : "Guardar servicios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
