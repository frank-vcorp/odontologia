"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BudgetForm } from "@/components/budget-form";
import { PageHeader } from "@/components/page-header";
import { formatInClinicTimezone } from "@/shared/datetime";
import { centsToDisplay } from "@/shared/money";

type Budget = {
  id: string;
  patientName: string;
  status: string;
  totalCents: number;
  createdAt: string;
};

const statusLabels: Record<string, string> = {
  borrador: "Borrador",
  presentado: "Presentado",
  parcialmente_autorizado: "Parcialmente autorizado",
  autorizado: "Autorizado",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
};

export default function PresupuestosPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void fetch("/api/budgets")
      .then((r) => r.json())
      .then((d) => {
        setBudgets(d.budgets ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <PageHeader
        title="Presupuestos"
        description="Propuestas de tratamiento y autorización de conceptos."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancelar" : "Nuevo presupuesto"}
          </button>
        }
      />

      {showForm && (
        <BudgetForm
          onCancel={() => setShowForm(false)}
          onSuccess={(id) => router.push(`/presupuestos/${id}`)}
        />
      )}

      <div className="panel mt-5">
        {loading ? (
          <p className="p-4 text-[var(--muted)]">Cargando…</p>
        ) : budgets.length === 0 ? (
          <p className="p-6 text-center text-[var(--muted)]">Aún no hay presupuestos registrados.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Paciente</th>
                <th>Estado</th>
                <th>Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => (
                <tr key={b.id}>
                  <td>{formatInClinicTimezone(b.createdAt, { dateStyle: "medium" })}</td>
                  <td>{b.patientName}</td>
                  <td>{statusLabels[b.status] ?? b.status}</td>
                  <td>{centsToDisplay(b.totalCents)}</td>
                  <td>
                    <Link href={`/presupuestos/${b.id}`} className="btn btn-ghost text-sm">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
