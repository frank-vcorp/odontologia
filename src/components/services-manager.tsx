"use client";

import { useCallback, useEffect, useState } from "react";
import { centsToDisplay, parseMoneyToCents } from "@/shared/money";

type Service = {
  id: string;
  name: string;
  suggestedPriceCents: number | null;
  generatesTreatment: boolean;
};

const emptyForm = { name: "", price: "", generatesTreatment: false };

export function ServicesManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/services");
    setLoading(false);
    if (!res.ok) {
      setError("No se pudieron cargar los servicios");
      return;
    }
    const data = await res.json();
    setServices(data.services);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(service: Service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      price: service.suggestedPriceCents != null ? String(service.suggestedPriceCents / 100) : "",
      generatesTreatment: service.generatesTreatment,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      name: form.name,
      suggestedPriceCents: parseMoneyToCents(form.price),
      generatesTreatment: form.generatesTreatment,
    };
    const res = await fetch(editingId ? `/api/services/${editingId}` : "/api/services", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo guardar");
      return;
    }
    resetForm();
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este servicio del catálogo?")) return;
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("No se pudo eliminar");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="form-panel">
        <div className="form-panel-header">
          <h2 className="form-panel-title">{editingId ? "Editar servicio" : "Nuevo servicio"}</h2>
        </div>
        <div className="form-panel-body">
          {error && <p className="text-[var(--danger)] text-sm">{error}</p>}
          <div className="form-grid cols-2">
            <div className="field">
              <label htmlFor="service-name">Nombre *</label>
              <input
                id="service-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="service-price">Precio sugerido (MXN)</label>
              <input
                id="service-price"
                inputMode="decimal"
                placeholder="Opcional"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.generatesTreatment}
                  onChange={(e) => setForm({ ...form, generatesTreatment: e.target.checked })}
                />
                Genera tratamiento
              </label>
            </div>
          </div>
        </div>
        <div className="form-panel-footer">
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              Cancelar
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando…" : editingId ? "Actualizar" : "Agregar servicio"}
          </button>
        </div>
      </form>

      <div className="panel">
        {loading ? (
          <p className="p-4 text-[var(--muted)]">Cargando…</p>
        ) : services.length === 0 ? (
          <p className="p-6 text-center text-[var(--muted)]">Aún no hay servicios en el catálogo.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Precio sugerido</th>
                <th>Genera tratamiento</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td>{service.name}</td>
                  <td>{centsToDisplay(service.suggestedPriceCents)}</td>
                  <td>{service.generatesTreatment ? "Sí" : "No"}</td>
                  <td className="flex gap-2">
                    <button type="button" className="btn btn-ghost text-sm" onClick={() => startEdit(service)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-danger text-sm"
                      onClick={() => void handleDelete(service.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
