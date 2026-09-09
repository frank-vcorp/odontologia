"use client";

import { useCallback, useEffect, useState } from "react";

type PaymentMethod = { id: string; name: string };

export function SettingsManager() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodName, setMethodName] = useState("");
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [methodError, setMethodError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingMethod, setSavingMethod] = useState(false);

  const loadMethods = useCallback(async () => {
    const res = await fetch("/api/payment-methods");
    if (!res.ok) return;
    const data = await res.json();
    setMethods(data.methods);
  }, []);

  useEffect(() => {
    void loadMethods();
  }, [loadMethods]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }
    setSavingPassword(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSavingPassword(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setPasswordError(typeof data.error === "string" ? data.error : "No se pudo cambiar la contraseña");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Contraseña actualizada");
  }

  async function handleMethodSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMethodError("");
    setSavingMethod(true);
    const res = await fetch(
      editingMethodId ? `/api/payment-methods/${editingMethodId}` : "/api/payment-methods",
      {
        method: editingMethodId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: methodName }),
      },
    );
    setSavingMethod(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMethodError(typeof data.error === "string" ? data.error : "No se pudo guardar");
      return;
    }
    setMethodName("");
    setEditingMethodId(null);
    await loadMethods();
  }

  async function handleDeleteMethod(id: string) {
    if (!confirm("¿Eliminar este método de pago?")) return;
    await fetch(`/api/payment-methods/${id}`, { method: "DELETE" });
    await loadMethods();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handlePasswordSubmit} className="form-panel">
        <div className="form-panel-header">
          <h2 className="form-panel-title">Cambiar contraseña</h2>
        </div>
        <div className="form-panel-body">
          {passwordMessage && <p className="text-[var(--success)] text-sm">{passwordMessage}</p>}
          {passwordError && <p className="text-[var(--danger)] text-sm">{passwordError}</p>}
          <div className="form-grid cols-2">
            <div className="field">
              <label htmlFor="currentPassword">Contraseña actual</label>
              <input
                id="currentPassword"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="newPassword">Nueva contraseña</label>
              <input
                id="newPassword"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="form-panel-footer">
          <button type="submit" className="btn btn-primary" disabled={savingPassword}>
            {savingPassword ? "Guardando…" : "Actualizar contraseña"}
          </button>
        </div>
      </form>

      <form onSubmit={handleMethodSubmit} className="form-panel">
        <div className="form-panel-header">
          <h2 className="form-panel-title">Métodos de pago</h2>
          <p className="form-panel-desc">Catálogo vacío al inicio. Agrega los métodos que utiliza el consultorio.</p>
        </div>
        <div className="form-panel-body">
          {methodError && <p className="text-[var(--danger)] text-sm">{methodError}</p>}
          <div className="field">
            <label htmlFor="methodName">Nombre del método</label>
            <input
              id="methodName"
              required
              value={methodName}
              onChange={(e) => setMethodName(e.target.value)}
              placeholder="Ej. Efectivo, Transferencia, Tarjeta"
            />
          </div>
        </div>
        <div className="form-panel-footer">
          {editingMethodId && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditingMethodId(null);
                setMethodName("");
              }}
            >
              Cancelar
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={savingMethod}>
            {savingMethod ? "Guardando…" : editingMethodId ? "Actualizar método" : "Agregar método"}
          </button>
        </div>
      </form>

      <div className="panel">
        {methods.length === 0 ? (
          <p className="p-6 text-center text-[var(--muted)]">Aún no hay métodos de pago registrados.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Método</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {methods.map((method) => (
                <tr key={method.id}>
                  <td>{method.name}</td>
                  <td className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost text-sm"
                      onClick={() => {
                        setEditingMethodId(method.id);
                        setMethodName(method.name);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-danger text-sm"
                      onClick={() => void handleDeleteMethod(method.id)}
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
