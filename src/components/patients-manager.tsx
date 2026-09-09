"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Patient = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  address: string | null;
  medicalHistory: string | null;
  notes: string | null;
};

const emptyForm = {
  fullName: "",
  phone: "",
  email: "",
  birthDate: "",
  address: "",
  medicalHistory: "",
  notes: "",
};

export function PatientsManager() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async (search?: string) => {
    setLoading(true);
    setError("");
    const url = search ? `/api/patients?q=${encodeURIComponent(search)}` : "/api/patients";
    const res = await fetch(url);
    setLoading(false);
    if (!res.ok) {
      setError("No se pudieron cargar los pacientes");
      return;
    }
    const data = await res.json();
    setPatients(data.patients);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    await load(query);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.fullName,
        phone: form.phone,
        email: form.email || null,
        birthDate: form.birthDate || null,
        address: form.address || null,
        medicalHistory: form.medicalHistory || null,
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo crear el paciente");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    await load(query);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2 items-end">
          <div className="field">
            <label htmlFor="patient-search">Buscar</label>
            <input
              id="patient-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre o teléfono"
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Buscar
          </button>
        </form>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "Nuevo paciente"}
        </button>
      </div>

      {error && <p className="text-[var(--danger)] text-sm">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="form-panel">
          <div className="form-panel-header">
            <h2 className="form-panel-title">Alta rápida</h2>
            <p className="form-panel-desc">Nombre y teléfono son obligatorios. El resto puede completarse después.</p>
          </div>
          <div className="form-panel-body">
            <div className="form-grid cols-2">
              <div className="field">
                <label htmlFor="fullName">Nombre completo *</label>
                <input
                  id="fullName"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="phone">Teléfono *</label>
                <input
                  id="phone"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="email">Correo</label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="birthDate">Fecha de nacimiento</label>
                <input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="address">Dirección</label>
                <input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="medicalHistory">Antecedentes médicos</label>
                <textarea
                  id="medicalHistory"
                  value={form.medicalHistory}
                  onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })}
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="notes">Observaciones generales</label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="form-panel-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "Guardar paciente"}
            </button>
          </div>
        </form>
      )}

      <div className="panel">
        {loading ? (
          <p className="p-4 text-[var(--muted)]">Cargando…</p>
        ) : patients.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[var(--muted)]">Aún no hay pacientes registrados.</p>
            {!showForm && (
              <button type="button" className="btn btn-primary mt-4" onClick={() => setShowForm(true)}>
                Registrar primer paciente
              </button>
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>{patient.fullName}</td>
                  <td>{patient.phone}</td>
                  <td>{patient.email ?? "—"}</td>
                  <td>
                    <Link href={`/pacientes/${patient.id}`} className="btn btn-ghost text-sm">
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
