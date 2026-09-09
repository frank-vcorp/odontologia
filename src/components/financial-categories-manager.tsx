"use client";

import { useCallback, useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  type: "ingreso" | "egreso";
};

export function FinancialCategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"ingreso" | "egreso">("ingreso");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/financial-categories");
    setLoading(false);
    if (!res.ok) {
      setError("No se pudieron cargar las categorías");
      return;
    }
    const data = await res.json();
    setCategories(data.categories);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(
      editingId ? `/api/financial-categories/${editingId}` : "/api/financial-categories",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      },
    );
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo guardar");
      return;
    }
    setName("");
    setType("ingreso");
    setEditingId(null);
    await load();
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setName(category.name);
    setType(category.type);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    const res = await fetch(`/api/financial-categories/${id}`, { method: "DELETE" });
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
          <h2 className="form-panel-title">
            {editingId ? "Editar categoría" : "Alta rápida de categoría"}
          </h2>
        </div>
        <div className="form-panel-body">
          {error && <p className="text-[var(--danger)] text-sm">{error}</p>}
          <div className="form-grid cols-2">
            <div className="field">
              <label htmlFor="category-name">Nombre *</label>
              <input
                id="category-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="category-type">Tipo *</label>
              <select id="category-type" value={type} onChange={(e) => setType(e.target.value as "ingreso" | "egreso")}>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
          </div>
        </div>
        <div className="form-panel-footer">
          {editingId && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditingId(null);
                setName("");
                setType("ingreso");
              }}
            >
              Cancelar
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando…" : editingId ? "Actualizar" : "Agregar categoría"}
          </button>
        </div>
      </form>

      <div className="panel">
        {loading ? (
          <p className="p-4 text-[var(--muted)]">Cargando…</p>
        ) : categories.length === 0 ? (
          <p className="p-6 text-center text-[var(--muted)]">Aún no hay categorías financieras.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>
                    <span className={`badge ${category.type === "ingreso" ? "badge-success" : "badge-muted"}`}>
                      {category.type === "ingreso" ? "Ingreso" : "Egreso"}
                    </span>
                  </td>
                  <td className="flex gap-2">
                    <button type="button" className="btn btn-ghost text-sm" onClick={() => startEdit(category)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-danger text-sm"
                      onClick={() => void handleDelete(category.id)}
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
