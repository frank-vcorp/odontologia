"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { centsToDisplay, parseMoneyToCents } from "@/shared/money";
import { formatInClinicTimezone } from "@/shared/datetime";

type BudgetItem = {
  id: string;
  serviceId: string | null;
  serviceName: string;
  priceCents: number;
  generatesTreatment: boolean;
  status: "pendiente" | "autorizado" | "rechazado";
};

type Budget = {
  id: string;
  patientId: string;
  patientName: string;
  status: string;
  notes: string | null;
  items: BudgetItem[];
  totalCents: number;
  authorizedTotalCents: number;
  createdAt: string;
};

type TreatmentLink = {
  id: string;
  serviceName: string;
  status: string;
  budgetId: string | null;
  budgetItemId: string | null;
};

const statusLabels: Record<string, string> = {
  borrador: "Borrador",
  presentado: "Presentado",
  parcialmente_autorizado: "Parcialmente autorizado",
  autorizado: "Autorizado",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
};

const itemStatusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  autorizado: "Autorizado",
  rechazado: "Rechazado",
};

export function BudgetDetail({ initial }: { initial: Budget }) {
  const [budget, setBudget] = useState(initial);
  const [treatments, setTreatments] = useState<TreatmentLink[]>([]);
  const [loadingTreatments, setLoadingTreatments] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [itemForm, setItemForm] = useState({ serviceName: "", price: "", generatesTreatment: false });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ serviceName: "", price: "", generatesTreatment: false });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadTreatments = useCallback(async () => {
    setLoadingTreatments(true);
    const res = await fetch(`/api/patients/${budget.patientId}/treatments`);
    setLoadingTreatments(false);
    if (!res.ok) return;
    const data = await res.json();
    setTreatments(
      (data.treatments ?? []).filter(
        (t: TreatmentLink) => t.budgetId === budget.id || budget.items.some((i) => i.id === t.budgetItemId),
      ),
    );
  }, [budget.id, budget.items, budget.patientId]);

  useEffect(() => {
    void loadTreatments();
  }, [loadTreatments]);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/budgets/${budget.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceName: itemForm.serviceName,
        priceCents: parseMoneyToCents(itemForm.price) ?? 0,
        generatesTreatment: itemForm.generatesTreatment,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo agregar el concepto");
      return;
    }
    const data = await res.json();
    setBudget(data.budget);
    setItemForm({ serviceName: "", price: "", generatesTreatment: false });
  }

  async function handleUpdateItem(itemId: string) {
    setError("");
    const res = await fetch(`/api/budgets/${budget.id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceName: editForm.serviceName,
        priceCents: parseMoneyToCents(editForm.price) ?? 0,
        generatesTreatment: editForm.generatesTreatment,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo actualizar");
      return;
    }
    const data = await res.json();
    setBudget(data.budget);
    setEditingItemId(null);
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("¿Eliminar este concepto?")) return;
    const res = await fetch(`/api/budgets/${budget.id}/items/${itemId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo eliminar");
      return;
    }
    const data = await res.json();
    setBudget(data.budget);
  }

  async function handleAuthorize(itemId: string) {
    const res = await fetch(`/api/budgets/${budget.id}/items/${itemId}/authorize`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo autorizar");
      return;
    }
    const data = await res.json();
    setBudget(data.budget);
    void loadTreatments();
  }

  async function handleReject(itemId: string) {
    const res = await fetch(`/api/budgets/${budget.id}/items/${itemId}/reject`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo rechazar");
      return;
    }
    const data = await res.json();
    setBudget(data.budget);
  }

  async function handleGeneratePdf() {
    setGeneratingPdf(true);
    setError("");
    const res = await fetch(`/api/budgets/${budget.id}/pdf`, { method: "POST" });
    setGeneratingPdf(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo generar el documento");
      return;
    }
    const data = await res.json();
    if (data.budget) setBudget(data.budget);
    if (data.document?.id) {
      window.open(`/api/budgets/${budget.id}/pdf?documentId=${data.document.id}`, "_blank");
    }
    setMessage("Documento generado.");
  }

  async function handleCancelBudget() {
    if (!confirm("¿Cancelar este presupuesto?")) return;
    const res = await fetch(`/api/budgets/${budget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelado" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo cancelar");
      return;
    }
    const data = await res.json();
    setBudget(data.budget);
  }

  const editable = budget.status !== "cancelado";

  return (
    <div className="space-y-5">
      <div className="card space-y-2">
        <p className="text-sm text-[var(--muted)] m-0">Paciente</p>
        <Link href={`/pacientes/${budget.patientId}`} className="text-lg font-semibold">
          {budget.patientName}
        </Link>
        <div className="flex flex-wrap gap-4 text-sm mt-2">
          <div>
            <span className="text-[var(--muted)]">Estado: </span>
            <span className="badge badge-role">{statusLabels[budget.status] ?? budget.status}</span>
          </div>
          <div>
            <span className="text-[var(--muted)]">Total: </span>
            <strong>{centsToDisplay(budget.totalCents)}</strong>
          </div>
          <div>
            <span className="text-[var(--muted)]">Autorizado: </span>
            <strong>{centsToDisplay(budget.authorizedTotalCents)}</strong>
          </div>
          <div>
            <span className="text-[var(--muted)]">Creado: </span>
            {formatInClinicTimezone(budget.createdAt, { dateStyle: "medium" })}
          </div>
        </div>
        {budget.notes && <p className="text-sm whitespace-pre-wrap m-0">{budget.notes}</p>}
        <div className="flex flex-wrap gap-2 pt-2">
          <button type="button" className="btn btn-secondary text-sm" disabled={generatingPdf} onClick={() => void handleGeneratePdf()}>
            {generatingPdf ? "Generando…" : "Generar PDF"}
          </button>
          {editable && budget.status !== "cancelado" && (
            <button type="button" className="btn btn-ghost btn-danger text-sm" onClick={() => void handleCancelBudget()}>
              Cancelar presupuesto
            </button>
          )}
        </div>
        {message && <p className="text-[var(--success)] text-sm m-0">{message}</p>}
        {error && <p className="text-[var(--danger)] text-sm m-0">{error}</p>}
      </div>

      <div className="panel">
        <div className="panel-header">Conceptos</div>
        {budget.items.length === 0 ? (
          <p className="p-4 text-[var(--muted)]">Sin conceptos.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Precio</th>
                <th>Tratamiento</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {budget.items.map((item) => (
                <tr key={item.id}>
                  {editingItemId === item.id ? (
                    <>
                      <td colSpan={5}>
                        <div className="p-3 space-y-3">
                          <div className="form-grid cols-2">
                            <div className="field">
                              <label>Nombre</label>
                              <input
                                value={editForm.serviceName}
                                onChange={(e) => setEditForm({ ...editForm, serviceName: e.target.value })}
                              />
                            </div>
                            <div className="field">
                              <label>Precio (MXN)</label>
                              <input
                                value={editForm.price}
                                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={editForm.generatesTreatment}
                              onChange={(e) => setEditForm({ ...editForm, generatesTreatment: e.target.checked })}
                            />
                            Genera tratamiento
                          </label>
                          <div className="flex gap-2">
                            <button type="button" className="btn btn-primary text-sm" onClick={() => void handleUpdateItem(item.id)}>
                              Guardar
                            </button>
                            <button type="button" className="btn btn-ghost text-sm" onClick={() => setEditingItemId(null)}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{item.serviceName}</td>
                      <td>{centsToDisplay(item.priceCents)}</td>
                      <td>{item.generatesTreatment ? "Sí" : "No"}</td>
                      <td>{itemStatusLabels[item.status] ?? item.status}</td>
                      <td>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {item.status === "pendiente" && editable && (
                            <>
                              <button
                                type="button"
                                className="btn btn-ghost text-sm"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditForm({
                                    serviceName: item.serviceName,
                                    price: String(item.priceCents / 100),
                                    generatesTreatment: item.generatesTreatment,
                                  });
                                }}
                              >
                                Editar
                              </button>
                              <button type="button" className="btn btn-ghost btn-danger text-sm" onClick={() => void handleDeleteItem(item.id)}>
                                Eliminar
                              </button>
                              <button type="button" className="btn btn-secondary text-sm" onClick={() => void handleAuthorize(item.id)}>
                                Autorizar
                              </button>
                              <button type="button" className="btn btn-ghost text-sm" onClick={() => void handleReject(item.id)}>
                                Rechazar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editable && (
        <form onSubmit={(e) => void handleAddItem(e)} className="form-panel">
          <div className="form-panel-header">
            <h2 className="form-panel-title">Agregar concepto</h2>
          </div>
          <div className="form-panel-body">
            <div className="form-grid cols-2">
              <div className="field">
                <label htmlFor="item-name">Concepto *</label>
                <input
                  id="item-name"
                  required
                  value={itemForm.serviceName}
                  onChange={(e) => setItemForm({ ...itemForm, serviceName: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="item-price">Precio (MXN) *</label>
                <input
                  id="item-price"
                  required
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm mt-3">
              <input
                type="checkbox"
                checked={itemForm.generatesTreatment}
                onChange={(e) => setItemForm({ ...itemForm, generatesTreatment: e.target.checked })}
              />
              Genera tratamiento longitudinal
            </label>
          </div>
          <div className="form-panel-footer">
            <button type="submit" className="btn btn-primary">Agregar</button>
          </div>
        </form>
      )}

      <div className="panel">
        <div className="panel-header">Tratamientos generados</div>
        {loadingTreatments ? (
          <p className="p-4 text-[var(--muted)]">Cargando…</p>
        ) : treatments.length === 0 ? (
          <p className="p-4 text-[var(--muted)]">Aún no hay tratamientos vinculados a este presupuesto.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {treatments.map((t) => (
                <tr key={t.id}>
                  <td>{t.serviceName}</td>
                  <td>{t.status}</td>
                  <td>
                    <Link href={`/tratamientos/${t.id}`} className="btn btn-ghost text-sm">
                      Ver
                    </Link>
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
