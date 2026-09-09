"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppointmentForm, type AppointmentFormValues } from "@/components/appointment-form";
import {
  addDays,
  CLINIC_TIMEZONE,
  formatInClinicTimezone,
  startOfWeek,
  toClinicDateInput,
  toClinicTimeInput,
} from "@/shared/datetime";

type Appointment = {
  id: string;
  patientName: string;
  patientPhone: string;
  serviceName: string;
  startsAt: string;
  durationMinutes: number;
  notes: string | null;
  operationalStatus: "programada" | "cancelada" | "invalidada" | "atendida";
  hasConsultation: boolean;
  consultationId: string | null;
};

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

function statusBadge(status: Appointment["operationalStatus"]) {
  if (status === "programada") return "badge badge-success";
  if (status === "invalidada") return "badge badge-muted";
  if (status === "atendida") return "badge badge-role";
  return "badge badge-muted";
}

function statusLabel(status: Appointment["operationalStatus"]) {
  if (status === "programada") return "Programada";
  if (status === "invalidada") return "Invalidada";
  if (status === "atendida") return "Atendida";
  return "Cancelada";
}

export function AgendaManager() {
  const [view, setView] = useState<"week" | "day">("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formInitial, setFormInitial] = useState<Partial<AppointmentFormValues>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState(false);

  const range = useMemo(() => {
    if (view === "day") {
      const start = new Date(anchorDate);
      start.setHours(0, 0, 0, 0);
      const end = addDays(start, 1);
      return { start, end, days: [start] };
    }
    const start = startOfWeek(anchorDate);
    const end = addDays(start, 7);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return { start, end, days };
  }, [anchorDate, view]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/appointments?from=${encodeURIComponent(range.start.toISOString())}&to=${encodeURIComponent(range.end.toISOString())}`,
    );
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setAppointments(data.appointments);
  }, [range.end, range.start]);

  useEffect(() => {
    void load();
  }, [load]);

  function openNewSlot(day: Date, hour: number) {
    const d = new Date(day);
    d.setHours(hour, 0, 0, 0);
    setFormInitial({
      date: toClinicDateInput(d),
      time: `${String(hour).padStart(2, "0")}:00`,
      durationMinutes: 60,
    });
    setFormError("");
    setRescheduleMode(false);
    setShowForm(true);
    setSelected(null);
  }

  async function saveAppointment(values: AppointmentFormValues) {
    setSaving(true);
    setFormError("");
    const payload = {
      ...values,
      treatmentId: values.treatmentId || null,
      notes: values.notes || null,
    };

    const res = await fetch(
      rescheduleMode && selected ? `/api/appointments/${selected.id}` : "/api/appointments",
      {
        method: rescheduleMode && selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFormError(typeof data.error === "string" ? data.error : "No se pudo guardar");
      return;
    }
    setShowForm(false);
    setRescheduleMode(false);
    setSelected(null);
    await load();
  }

  async function cancelSelected() {
    if (!selected || !confirm("¿Cancelar esta cita?")) return;
    await fetch(`/api/appointments/${selected.id}`, { method: "DELETE" });
    setSelected(null);
    await load();
  }

  async function createConsultationFromSelected() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch("/api/consultations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: "",
        appointmentId: selected.id,
        fromAppointment: true,
        date: toClinicDateInput(new Date()),
        time: toClinicTimeInput(new Date()),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(typeof data.error === "string" ? data.error : "No se pudo crear la consulta");
      return;
    }
    const data = await res.json();
    window.location.href = `/consultas/${data.consultation.id}`;
  }

  function appointmentsForDay(day: Date) {
    const key = toClinicDateInput(day);
    return appointments.filter((a) => toClinicDateInput(a.startsAt) === key);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`btn ${view === "week" ? "btn-primary" : "btn-secondary"}`} onClick={() => setView("week")}>
            Semanal
          </button>
          <button type="button" className={`btn ${view === "day" ? "btn-primary" : "btn-secondary"}`} onClick={() => setView("day")}>
            Diaria
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setAnchorDate(new Date());
            }}
          >
            Hoy
          </button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" className="btn btn-ghost" onClick={() => setAnchorDate(addDays(anchorDate, view === "week" ? -7 : -1))}>
            ←
          </button>
          <span className="text-sm font-medium">
            {formatInClinicTimezone(range.start, { dateStyle: "medium", timeZone: CLINIC_TIMEZONE })}
            {view === "week" ? ` — ${formatInClinicTimezone(addDays(range.start, 6), { dateStyle: "medium" })}` : ""}
          </span>
          <button type="button" className="btn btn-ghost" onClick={() => setAnchorDate(addDays(anchorDate, view === "week" ? 7 : 1))}>
            →
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setFormInitial({ date: toClinicDateInput(new Date()), time: toClinicTimeInput(new Date()), durationMinutes: 60 });
              setShowForm(true);
              setRescheduleMode(false);
              setSelected(null);
            }}
          >
            Nueva cita
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-[var(--muted)]">Cargando agenda…</p>
      ) : (
        <div className="panel overflow-x-auto">
          <div
            className="grid min-w-[720px]"
            style={{ gridTemplateColumns: `4rem repeat(${range.days.length}, minmax(0, 1fr))` }}
          >
            <div className="panel-header" />
            {range.days.map((day) => (
              <div key={day.toISOString()} className="panel-header text-center">
                {formatInClinicTimezone(day, { weekday: "short", day: "numeric", month: "short" })}
              </div>
            ))}

            {HOURS.map((hour) => (
              <div key={hour} className="contents">
                <div className="px-2 py-3 text-xs text-[var(--muted)] border-b border-[var(--border-subtle)]">
                  {String(hour).padStart(2, "0")}:00
                </div>
                {range.days.map((day) => {
                  const dayAppointments = appointmentsForDay(day).filter((a) => {
                    const h = Number.parseInt(toClinicTimeInput(a.startsAt).split(":")[0] ?? "0", 10);
                    return h === hour;
                  });
                  return (
                    <button
                      key={`${day.toISOString()}-${hour}`}
                      type="button"
                      className="min-h-16 border-b border-r border-[var(--border-subtle)] p-1 text-left align-top hover:bg-[var(--surface-2)]"
                      onClick={() => openNewSlot(day, hour)}
                    >
                      {dayAppointments.map((a) => (
                        <div
                          key={a.id}
                          className="mb-1 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-xs shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(a);
                            setShowForm(false);
                          }}
                        >
                          <div className="font-semibold truncate">{a.patientName}</div>
                          <div className="text-[var(--muted)] truncate">{a.serviceName}</div>
                          <span className={statusBadge(a.operationalStatus)}>{statusLabel(a.operationalStatus)}</span>
                        </div>
                      ))}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <AppointmentForm
          initial={formInitial}
          saving={saving}
          error={formError}
          submitLabel={rescheduleMode ? "Reagendar cita" : "Guardar cita"}
          onCancel={() => {
            setShowForm(false);
            setRescheduleMode(false);
          }}
          onSubmit={saveAppointment}
        />
      )}

      {selected && !showForm && (
        <div className="card space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold m-0">{selected.patientName}</h2>
              <p className="text-sm text-[var(--muted)] m-0">{selected.patientPhone}</p>
              <p className="text-sm mt-2">{selected.serviceName}</p>
              <p className="text-sm text-[var(--muted)]">
                {formatInClinicTimezone(selected.startsAt, {
                  dateStyle: "full",
                  timeStyle: "short",
                })}{" "}
                · {selected.durationMinutes} min
              </p>
              {selected.notes && <p className="text-sm mt-2">{selected.notes}</p>}
              <span className={`${statusBadge(selected.operationalStatus)} mt-2 inline-block`}>
                {statusLabel(selected.operationalStatus)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {!selected.hasConsultation && selected.operationalStatus !== "cancelada" && (
                <>
                  <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void createConsultationFromSelected()}>
                    Crear consulta
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setFormInitial({
                        date: toClinicDateInput(selected.startsAt),
                        time: toClinicTimeInput(selected.startsAt),
                        durationMinutes: selected.durationMinutes,
                      });
                      setRescheduleMode(true);
                      setShowForm(true);
                    }}
                  >
                    Reagendar
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => void cancelSelected()}>
                    Cancelar cita
                  </button>
                </>
              )}
              {selected.hasConsultation && selected.consultationId && (
                <Link href={`/consultas/${selected.consultationId}`} className="btn btn-secondary">
                  Ver consulta
                </Link>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
