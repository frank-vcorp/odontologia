import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getNextAppointment, listTodayAppointments } from "@/server/services/appointments";
import { getDashboardBalanceSummary } from "@/server/services/balances";
import { formatInClinicTimezone } from "@/shared/datetime";
import { centsToDisplay } from "@/shared/money";

export default async function DashboardPage() {
  const [todayAppointments, nextAppointment, balanceSummary] = await Promise.all([
    listTodayAppointments(),
    getNextAppointment(),
    getDashboardBalanceSummary(),
  ]);

  const todayHasPending = todayAppointments.some((a) => a.operationalStatus === "programada");

  return (
    <>
      <PageHeader
        title="Inicio"
        description="Operación diaria del consultorio."
      />

      {balanceSummary.totalPendingCents > 0 && (
        <div className="card mb-6">
          <p className="text-sm text-[var(--muted)] m-0">Saldos pendientes (consultorio)</p>
          <p className="text-lg font-semibold m-0 mt-1">{centsToDisplay(balanceSummary.totalPendingCents)}</p>
          <p className="text-xs text-[var(--muted)] m-0 mt-1">
            {balanceSummary.patientsWithBalance} paciente{balanceSummary.patientsWithBalance === 1 ? "" : "s"} con saldo
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <div className="card lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-base font-semibold m-0">Agenda de hoy</h2>
            <Link href="/agenda" className="btn btn-secondary text-sm">
              Ver agenda
            </Link>
          </div>
          {todayAppointments.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No hay citas programadas para hoy.</p>
          ) : (
            <ul className="space-y-2">
              {todayAppointments.map((a) => (
                <li key={a.id} className="flex flex-wrap gap-2 justify-between text-sm border-b border-[var(--border-subtle)] pb-2">
                  <span>
                    {formatInClinicTimezone(a.startsAt, { timeStyle: "short" })} · {a.patientName}
                  </span>
                  <span className="text-[var(--muted)]">{a.serviceName}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="text-base font-semibold m-0 mb-3">Próxima cita</h2>
          {nextAppointment ? (
            <div className="text-sm space-y-1">
              <p className="m-0 font-medium">{nextAppointment.patientName}</p>
              <p className="m-0 text-[var(--muted)]">{nextAppointment.serviceName}</p>
              <p className="m-0">
                {formatInClinicTimezone(nextAppointment.startsAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          ) : todayAppointments.length > 0 && !todayHasPending ? (
            <p className="text-sm text-[var(--muted)]">
              Las citas de hoy ya concluyeron.{" "}
              <Link href="/agenda?nueva=1" className="text-[var(--accent-brand)]">
                Programar siguiente
              </Link>
            </p>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Sin citas programadas.{" "}
              <Link href="/agenda?nueva=1" className="text-[var(--accent-brand)]">
                Nueva cita
              </Link>
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link href="/agenda?nueva=1" className="btn btn-primary">
          Nueva cita
        </Link>
        <Link href="/pacientes" className="btn btn-secondary">
          Nuevo paciente
        </Link>
        <Link href="/consultas" className="btn btn-secondary">
          Nueva consulta
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/agenda" className="card hover:border-[var(--accent-brand)] transition-colors">
          <h2 className="text-base font-semibold m-0">Agenda</h2>
          <p className="text-sm text-[var(--muted)] mt-2">Programar y operar citas.</p>
        </Link>
        <Link href="/consultas" className="card hover:border-[var(--accent-brand)] transition-colors">
          <h2 className="text-base font-semibold m-0">Consultas</h2>
          <p className="text-sm text-[var(--muted)] mt-2">Registrar atención real.</p>
        </Link>
        <Link href="/pacientes" className="card hover:border-[var(--accent-brand)] transition-colors">
          <h2 className="text-base font-semibold m-0">Pacientes</h2>
          <p className="text-sm text-[var(--muted)] mt-2">Historial y expediente.</p>
        </Link>
        <Link href="/presupuestos" className="card hover:border-[var(--accent-brand)] transition-colors">
          <h2 className="text-base font-semibold m-0">Presupuestos</h2>
          <p className="text-sm text-[var(--muted)] mt-2">Propuestas y autorizaciones.</p>
        </Link>
        <Link href="/finanzas" className="card hover:border-[var(--accent-brand)] transition-colors">
          <h2 className="text-base font-semibold m-0">Finanzas</h2>
          <p className="text-sm text-[var(--muted)] mt-2">Movimientos y reportes.</p>
        </Link>
      </div>
    </>
  );
}
