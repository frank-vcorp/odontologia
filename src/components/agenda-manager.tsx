"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppointmentForm, type AppointmentFormValues } from "@/components/appointment-form";
import {
  addClinicDays,
  addDays,
  CLINIC_TIMEZONE,
  clinicDayAtHour,
  endOfDayClinic,
  formatInClinicTimezone,
  parseClinicDateTime,
  startOfDayClinic,
  startOfWeekClinic,
  toClinicDateInput,
  toClinicTimeInput,
} from "@/shared/datetime";

type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  serviceId: string;
  serviceName: string;
  treatmentId: string | null;
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

function defaultFormInitial(): Partial<AppointmentFormValues> {
  const now = new Date();
  return {
    date: toClinicDateInput(now),
    time: toClinicTimeInput(now),
    durationMinutes: 60,
  };
}

export function AgendaManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formPanelRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"week" | "day">("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formInitial, setFormInitial] = useState<Partial<AppointmentFormValues>>(defaultFormInitial);
  const [formKey, setFormKey] = useState(0);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [rescheduleLabels, setRescheduleLabels] = useState<{
    patientName: string;
    patientPhone: string;
    serviceName: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const range = useMemo(() => {
    if (!mounted) return null;

    if (view === "day") {
      const start = startOfDayClinic(anchorDate);
      const end = endOfDayClinic(anchorDate);
      return { start, end, days: [start] };
    }

    const start = startOfWeekClinic(anchorDate);
    const startKey = toClinicDateInput(start);
    const days = Array.from({ length: 7 }, (_, index) =>
      parseClinicDateTime(addClinicDays(startKey, index), "12:00"),
    );
    const end = parseClinicDateTime(addClinicDays(startKey, 7), "00:00");
    return { start, end, days };
  }, [anchorDate, mounted, view]);

  const load = useCallback(async () => {
    if (!range) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/appointments?from=${encodeURIComponent(range.start.toISOString())}&to=${encodeURIComponent(range.end.toISOString())}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setAppointments(data.appointments ?? []);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const openForm = useCallback(
    (
      initial: Partial<AppointmentFormValues>,
      reschedule = false,
      labels?: { patientName: string; patientPhone: string; serviceName: string },
    ) => {
      setFormInitial(initial);
      setFormKey((value) => value + 1);
      setFormError("");
      setRescheduleMode(reschedule);
      setRescheduleLabels(reschedule && labels ? labels : null);
      setShowForm(true);
      if (!reschedule) {
        setSelected(null);
      }
      requestAnimationFrame(() => {
        formPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    },
    [],
  );

  useEffect(() => {
    if (!mounted) return;
    if (searchParams.get("nueva") === "1") {
      const initial = defaultFormInitial();
      const patientId = searchParams.get("patientId");
      const treatmentId = searchParams.get("treatmentId");
      const serviceId = searchParams.get("serviceId");
      const date = searchParams.get("date");
      if (patientId) initial.patientId = patientId;
      if (treatmentId) initial.treatmentId = treatmentId;
      if (serviceId) initial.serviceId = serviceId;
      if (date) initial.date = date;
      openForm(initial);
      router.replace("/agenda");
    }
  }, [mounted, openForm, router, searchParams]);

  function openNewSlot(day: Date, hour: number) {
    setSelected(null);
    openForm({
      date: toClinicDateInput(day),
      time: `${String(hour).padStart(2, "0")}:00`,
      durationMinutes: 60,
    });
  }

  function openAppointmentDetail(appointment: Appointment) {
    setShowForm(false);
    setRescheduleMode(false);
    setSelected(appointment);
  }

  function openRescheduleForm(appointment: Appointment) {
    setSelected(appointment);
    openForm(
      {
        patientId: appointment.patientId,
        serviceId: appointment.serviceId,
        treatmentId: appointment.treatmentId ?? "",
        date: toClinicDateInput(appointment.startsAt),
        time: toClinicTimeInput(appointment.startsAt),
        durationMinutes: appointment.durationMinutes,
        notes: appointment.notes ?? "",
      },
      true,
      {
        patientName: appointment.patientName,
        patientPhone: appointment.patientPhone,
        serviceName: appointment.serviceName,
      },
    );
  }

  async function saveAppointment(values: AppointmentFormValues) {
    setSaving(true);
    setFormError("");
    const createPayload = {
      ...values,
      treatmentId: values.treatmentId || null,
      notes: values.notes || null,
    };
    const reschedulePayload = {
      date: values.date,
      time: values.time,
      durationMinutes: values.durationMinutes,
    };

    try {
      const res = await fetch(
        rescheduleMode && selected ? `/api/appointments/${selected.id}` : "/api/appointments",
        {
          method: rescheduleMode && selected ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rescheduleMode && selected ? reschedulePayload : createPayload),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(typeof data.error === "string" ? data.error : "No se pudo guardar");
        return;
      }
      setShowForm(false);
      setRescheduleMode(false);
      setRescheduleLabels(null);
      setSelected(null);
      await load();
    } finally {
      setSaving(false);
    }
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
    return appointments.filter((appointment) => toClinicDateInput(appointment.startsAt) === key);
  }

  if (!mounted || !range) {
    return <p className="text-[var(--muted)]">Cargando agenda…</p>;
  }

  return (
    <div className="space-y-4">
      {showForm && (
        <div ref={formPanelRef} className="form-overlay" role="dialog" aria-modal="true" aria-label="Nueva cita">
          <button
            type="button"
            className="form-overlay-backdrop"
            aria-label="Cerrar formulario"
            onClick={() => {
              setShowForm(false);
              setRescheduleMode(false);
              setRescheduleLabels(null);
            }}
          />
          <div className="form-overlay-panel">
            <AppointmentForm
              key={formKey}
              initial={formInitial}
              saving={saving}
              error={formError}
              rescheduleMode={rescheduleMode}
              rescheduleLabels={rescheduleLabels ?? undefined}
              submitLabel={rescheduleMode ? "Reagendar cita" : "Guardar cita"}
              onCancel={() => {
                setShowForm(false);
                setRescheduleMode(false);
                setRescheduleLabels(null);
              }}
              onSubmit={saveAppointment}
            />
          </div>
        </div>
      )}

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
            {view === "week"
              ? ` — ${formatInClinicTimezone(parseClinicDateTime(addClinicDays(toClinicDateInput(range.start), 6), "12:00"), { dateStyle: "medium" })}`
              : ""}
          </span>
          <button type="button" className="btn btn-ghost" onClick={() => setAnchorDate(addDays(anchorDate, view === "week" ? 7 : 1))}>
            →
          </button>
          <button type="button" className="btn btn-primary" onClick={() => openForm(defaultFormInitial())}>
            Nueva cita
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-[var(--muted)]">Cargando citas…</p>
      ) : (
        <div className="panel overflow-x-auto">
          <div
            className="grid min-w-[720px]"
            style={{ gridTemplateColumns: `4rem repeat(${range.days.length}, minmax(0, 1fr))` }}
          >
            <div className="panel-header" />
            {range.days.map((day) => (
              <div key={toClinicDateInput(day)} className="panel-header text-center">
                {formatInClinicTimezone(day, { weekday: "short", day: "numeric", month: "short" })}
              </div>
            ))}

            {HOURS.map((hour) => (
              <div key={hour} className="contents">
                <div className="px-2 py-3 text-xs text-[var(--muted)] border-b border-[var(--border-subtle)]">
                  {String(hour).padStart(2, "0")}:00
                </div>
                {range.days.map((day) => {
                  const dayAppointments = appointmentsForDay(day).filter((appointment) => {
                    const slotHour = Number.parseInt(toClinicTimeInput(appointment.startsAt).split(":")[0] ?? "0", 10);
                    return slotHour === hour;
                  });

                  return (
                    <div
                      key={`${toClinicDateInput(day)}-${hour}`}
                      className="min-h-16 border-b border-r border-[var(--border-subtle)] p-1 text-left align-top hover:bg-[var(--surface-2)]"
                    >
                      {dayAppointments.length === 0 ? (
                        <button
                          type="button"
                          className="calendar-slot-empty"
                          aria-label={`Nueva cita ${formatInClinicTimezone(clinicDayAtHour(day, hour), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                          onClick={() => openNewSlot(clinicDayAtHour(day, hour), hour)}
                        />
                      ) : (
                        dayAppointments.map((appointment) => (
                          <button
                            key={appointment.id}
                            type="button"
                            data-calendar-appointment=""
                            className="calendar-appointment"
                            onClick={() => openAppointmentDetail(appointment)}
                          >
                            <div className="font-semibold truncate">{appointment.patientName}</div>
                            <div className="text-[var(--muted)] truncate">{appointment.serviceName}</div>
                            <span className={statusBadge(appointment.operationalStatus)}>
                              {statusLabel(appointment.operationalStatus)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && !showForm && (
        <div className="form-overlay" role="dialog" aria-modal="true" aria-label="Detalle de cita">
          <button
            type="button"
            className="form-overlay-backdrop"
            aria-label="Cerrar detalle"
            onClick={() => setSelected(null)}
          />
          <div className="form-overlay-panel">
            <div className="form-panel">
              <div className="form-panel-header">
                <h2 className="form-panel-title">Detalle de cita</h2>
                <p className="form-panel-desc">{selected.patientName}</p>
              </div>
              <div className="form-panel-body space-y-3">
                <dl className="detail-list">
                  <div className="detail-row">
                    <dt>Paciente</dt>
                    <dd>
                      {selected.patientName}
                      <span className="text-[var(--muted)]"> · {selected.patientPhone}</span>
                    </dd>
                  </div>
                  <div className="detail-row">
                    <dt>Servicio</dt>
                    <dd>{selected.serviceName}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Fecha y hora</dt>
                    <dd>
                      {formatInClinicTimezone(selected.startsAt, {
                        dateStyle: "full",
                        timeStyle: "short",
                      })}{" "}
                      · {selected.durationMinutes} min
                    </dd>
                  </div>
                  {selected.notes && (
                    <div className="detail-row">
                      <dt>Observación</dt>
                      <dd>{selected.notes}</dd>
                    </div>
                  )}
                  <div className="detail-row">
                    <dt>Estado</dt>
                    <dd>
                      <span className={statusBadge(selected.operationalStatus)}>
                        {statusLabel(selected.operationalStatus)}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="form-panel-footer">
                {!selected.hasConsultation && selected.operationalStatus !== "cancelada" && (
                  <>
                    <button type="button" className="btn btn-danger" onClick={() => void cancelSelected()}>
                      Cancelar cita
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => openRescheduleForm(selected)}
                    >
                      Reagendar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={saving}
                      onClick={() => void createConsultationFromSelected()}
                    >
                      Crear consulta
                    </button>
                  </>
                )}
                {selected.hasConsultation && selected.consultationId && (
                  <Link href={`/consultas/${selected.consultationId}`} className="btn btn-primary">
                    Ver consulta
                  </Link>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
