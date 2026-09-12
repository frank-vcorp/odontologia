"use client";

import { useCallback, useEffect, useState } from "react";
import { centsToDisplay, parseMoneyToCents } from "@/shared/money";
import { formatInClinicTimezone, toClinicDateInput, toClinicTimeInput } from "@/shared/datetime";

type Tab = "movimientos" | "reportes";

type Movement = {
  id: string;
  type: "ingreso" | "egreso";
  categoryName: string;
  amountCents: number;
  occurredAt: string;
  description: string;
  patientName: string | null;
  paymentMethodName: string | null;
  isEditable: boolean;
};

type Category = { id: string; name: string; type: "ingreso" | "egreso" };

type Report = {
  totalIngresoCents: number;
  totalEgresoCents: number;
  netCents: number;
  byCategory: { categoryId: string; categoryName: string; type: string; totalCents: number }[];
};

export function FinancesManager() {
  const [tab, setTab] = useState<Tab>("movimientos");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ from: "", to: "", type: "" });
  const [form, setForm] = useState({
    type: "ingreso" as "ingreso" | "egreso",
    categoryId: "",
    amount: "",
    date: toClinicDateInput(new Date()),
    time: toClinicTimeInput(new Date()),
    description: "",
  });

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/financial-categories");
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories ?? []);
    }
  }, []);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.type) params.set("type", filters.type);
    const res = await fetch(`/api/financial-movements?${params.toString()}`);
    setLoading(false);
    if (!res.ok) {
      setError("No se pudieron cargar los movimientos");
      return;
    }
    const data = await res.json();
    setMovements(
      (data.movements ?? []).map((m: Movement & { occurredAt: Date | string }) => ({
        ...m,
        occurredAt: typeof m.occurredAt === "string" ? m.occurredAt : new Date(m.occurredAt).toISOString(),
      })),
    );
  }, [filters]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.type) params.set("type", filters.type);
    const res = await fetch(`/api/financial-movements/reports?${params.toString()}`);
    setLoading(false);
    if (!res.ok) {
      setError("No se pudo cargar el reporte");
      return;
    }
    const data = await res.json();
    setReport(data.report ?? null);
  }, [filters]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (tab === "movimientos") void loadMovements();
    else void loadReport();
  }, [tab, loadMovements, loadReport]);

  const filteredCategories = categories.filter((c) => c.type === form.type);

  async function handleCreateMovement(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/financial-movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        categoryId: form.categoryId,
        amountCents: parseMoneyToCents(form.amount) ?? 0,
        date: form.date,
        time: form.time,
        description: form.description,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo registrar");
      return;
    }
    setForm((f) => ({ ...f, amount: "", description: "" }));
    if (tab === "movimientos") void loadMovements();
    else void loadReport();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn text-sm ${tab === "movimientos" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("movimientos")}
        >
          Movimientos
        </button>
        <button
          type="button"
          className={`btn text-sm ${tab === "reportes" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("reportes")}
        >
          Reportes
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (tab === "movimientos") void loadMovements();
          else void loadReport();
        }}
        className="flex flex-wrap gap-2 items-end"
      >
        <div className="field">
          <label htmlFor="filter-from">Desde</label>
          <input id="filter-from" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="filter-to">Hasta</label>
          <input id="filter-to" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="filter-type">Tipo</label>
          <select id="filter-type" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">Todos</option>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </select>
        </div>
        <button type="submit" className="btn btn-secondary">Filtrar</button>
      </form>

      {error && <p className="text-[var(--danger)] text-sm">{error}</p>}

      {tab === "movimientos" && (
        <div className="panel">
          {loading ? (
            <p className="p-4 text-[var(--muted)]">Cargando…</p>
          ) : movements.length === 0 ? (
            <p className="p-6 text-center text-[var(--muted)]">No hay movimientos en el periodo.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Paciente</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>{formatInClinicTimezone(m.occurredAt, { dateStyle: "short", timeStyle: "short" })}</td>
                    <td>{m.type === "ingreso" ? "Ingreso" : "Egreso"}</td>
                    <td>{m.categoryName}</td>
                    <td>{m.description}</td>
                    <td>{m.patientName ?? "—"}</td>
                    <td>{centsToDisplay(m.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "reportes" && (
        <div className="space-y-4">
          {loading ? (
            <p className="text-[var(--muted)]">Cargando…</p>
          ) : report ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="card">
                  <p className="text-sm text-[var(--muted)] m-0">Ingresos</p>
                  <p className="text-lg font-semibold m-0">{centsToDisplay(report.totalIngresoCents)}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-[var(--muted)] m-0">Egresos</p>
                  <p className="text-lg font-semibold m-0">{centsToDisplay(report.totalEgresoCents)}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-[var(--muted)] m-0">Neto</p>
                  <p className="text-lg font-semibold m-0">{centsToDisplay(report.netCents)}</p>
                </div>
              </div>
              <div className="panel">
                <div className="panel-header">Por categoría</div>
                {report.byCategory.length === 0 ? (
                  <p className="p-4 text-[var(--muted)]">Sin datos en el periodo.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Categoría</th>
                        <th>Tipo</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byCategory.map((row) => (
                        <tr key={row.categoryId}>
                          <td>{row.categoryName}</td>
                          <td>{row.type === "ingreso" ? "Ingreso" : "Egreso"}</td>
                          <td>{centsToDisplay(row.totalCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      <form onSubmit={(e) => void handleCreateMovement(e)} className="form-panel">
        <div className="form-panel-header">
          <h2 className="form-panel-title">Registro manual</h2>
          <p className="form-panel-desc">Ingresos o egresos que no provienen de pagos de pacientes.</p>
        </div>
        <div className="form-panel-body">
          <div className="form-grid cols-2">
            <div className="field">
              <label htmlFor="mov-type">Tipo *</label>
              <select
                id="mov-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as "ingreso" | "egreso", categoryId: "" })}
              >
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="mov-category">Categoría *</label>
              <select
                id="mov-category"
                required
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">Seleccionar…</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="mov-amount">Monto (MXN) *</label>
              <input id="mov-amount" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="mov-desc">Descripción *</label>
              <input id="mov-desc" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="mov-date">Fecha *</label>
              <input id="mov-date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="mov-time">Hora *</label>
              <input id="mov-time" type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="form-panel-footer">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Registrar movimiento"}
          </button>
        </div>
      </form>
    </div>
  );
}
