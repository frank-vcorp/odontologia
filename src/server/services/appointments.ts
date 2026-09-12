import { and, eq, gte, isNull, lt, ne } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  appointments,
  consultations,
  patients,
  services,
  treatments,
} from "@/server/db/schema";
import { addMinutes } from "@/shared/datetime";

export type AppointmentInput = {
  patientId: string;
  serviceId: string;
  treatmentId?: string | null;
  startsAt: Date;
  durationMinutes: number;
  notes?: string | null;
};

export type AppointmentView = {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  serviceId: string;
  serviceName: string;
  treatmentId: string | null;
  treatmentName: string | null;
  startsAt: Date;
  durationMinutes: number;
  notes: string | null;
  status: "programada" | "cancelada";
  cancelledAt: Date | null;
  hasConsultation: boolean;
  consultationId: string | null;
  operationalStatus: "programada" | "cancelada" | "invalidada" | "atendida";
};

function endAt(startsAt: Date, durationMinutes: number): Date {
  return addMinutes(startsAt, durationMinutes);
}

function computeOperationalStatus(row: {
  status: "programada" | "cancelada";
  startsAt: Date;
  durationMinutes: number;
  hasConsultation: boolean;
}): AppointmentView["operationalStatus"] {
  if (row.status === "cancelada") return "cancelada";
  if (row.hasConsultation) return "atendida";
  const ends = endAt(row.startsAt, row.durationMinutes);
  if (ends.getTime() < Date.now()) return "invalidada";
  return "programada";
}

async function hasOverlap(
  startsAt: Date,
  durationMinutes: number,
  excludeId?: string,
): Promise<boolean> {
  const db = getDb();
  const newEnd = endAt(startsAt, durationMinutes);

  const conditions = [eq(appointments.status, "programada")];
  if (excludeId) conditions.push(ne(appointments.id, excludeId));

  const rows = await db
    .select({
      startsAt: appointments.startsAt,
      durationMinutes: appointments.durationMinutes,
    })
    .from(appointments)
    .where(and(...conditions));

  return rows.some((row) => {
    const existingEnd = endAt(row.startsAt, row.durationMinutes);
    return startsAt < existingEnd && row.startsAt < newEnd;
  });
}

function mapAppointmentRow(row: {
  appointment: typeof appointments.$inferSelect;
  patientName: string;
  patientPhone: string;
  serviceName: string;
  treatmentName: string | null;
  hasConsultation: boolean;
  consultationId: string | null;
}): AppointmentView {
  const operationalStatus = computeOperationalStatus({
    status: row.appointment.status,
    startsAt: row.appointment.startsAt,
    durationMinutes: row.appointment.durationMinutes,
    hasConsultation: row.hasConsultation,
  });

  return {
    id: row.appointment.id,
    patientId: row.appointment.patientId,
    patientName: row.patientName,
    patientPhone: row.patientPhone,
    serviceId: row.appointment.serviceId,
    serviceName: row.serviceName,
    treatmentId: row.appointment.treatmentId,
    treatmentName: row.treatmentName,
    startsAt: row.appointment.startsAt,
    durationMinutes: row.appointment.durationMinutes,
    notes: row.appointment.notes,
    status: row.appointment.status,
    cancelledAt: row.appointment.cancelledAt,
    hasConsultation: row.hasConsultation,
    consultationId: row.consultationId,
    operationalStatus,
  };
}

async function queryAppointments(whereClause?: ReturnType<typeof and>) {
  const db = getDb();
  const rows = await db
    .select({
      appointment: appointments,
      patientName: patients.fullName,
      patientPhone: patients.phone,
      serviceName: services.name,
      treatmentName: treatments.serviceName,
      consultationId: consultations.id,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(treatments, eq(appointments.treatmentId, treatments.id))
    .leftJoin(consultations, eq(consultations.appointmentId, appointments.id))
    .where(whereClause)
    .orderBy(appointments.startsAt);

  return rows.map((row) =>
    mapAppointmentRow({
      appointment: row.appointment,
      patientName: row.patientName,
      patientPhone: row.patientPhone,
      serviceName: row.serviceName,
      treatmentName: row.treatmentName,
      hasConsultation: Boolean(row.consultationId),
      consultationId: row.consultationId,
    }),
  );
}

export async function listAppointmentsInRange(from: Date, to: Date, includeCancelled = false) {
  const filters = [gte(appointments.startsAt, from), lt(appointments.startsAt, to)];
  if (!includeCancelled) {
    filters.push(eq(appointments.status, "programada"));
  }
  return queryAppointments(and(...filters));
}

export async function getAppointmentById(id: string) {
  const rows = await queryAppointments(eq(appointments.id, id));
  return rows[0] ?? null;
}

export async function createAppointment(input: AppointmentInput) {
  if (input.durationMinutes < 1) throw new Error("La duración debe ser al menos 1 minuto");
  const overlap = await hasOverlap(input.startsAt, input.durationMinutes);
  if (overlap) throw new Error("APPOINTMENT_OVERLAP");

  const db = getDb();
  const [appointment] = await db
    .insert(appointments)
    .values({
      patientId: input.patientId,
      serviceId: input.serviceId,
      treatmentId: input.treatmentId ?? null,
      startsAt: input.startsAt,
      durationMinutes: input.durationMinutes,
      notes: input.notes?.trim() || null,
    })
    .returning();
  return getAppointmentById(appointment.id);
}

export async function rescheduleAppointment(
  id: string,
  input: { startsAt: Date; durationMinutes: number },
) {
  const existing = await getAppointmentById(id);
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.status === "cancelada") throw new Error("La cita está cancelada");

  const overlap = await hasOverlap(input.startsAt, input.durationMinutes, id);
  if (overlap) throw new Error("APPOINTMENT_OVERLAP");

  const db = getDb();
  await db
    .update(appointments)
    .set({
      startsAt: input.startsAt,
      durationMinutes: input.durationMinutes,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, id));

  return getAppointmentById(id);
}

export async function cancelAppointment(id: string) {
  const existing = await getAppointmentById(id);
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.status === "cancelada") return existing;

  const db = getDb();
  await db
    .update(appointments)
    .set({
      status: "cancelada",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, id));

  return getAppointmentById(id);
}

async function listActionableAppointments(limit?: number): Promise<AppointmentView[]> {
  const db = getDb();
  const now = new Date();
  const rows = await db
    .select({
      appointment: appointments,
      patientName: patients.fullName,
      patientPhone: patients.phone,
      serviceName: services.name,
      treatmentName: treatments.serviceName,
      consultationId: consultations.id,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(treatments, eq(appointments.treatmentId, treatments.id))
    .leftJoin(consultations, eq(consultations.appointmentId, appointments.id))
    .where(and(eq(appointments.status, "programada"), isNull(consultations.id)))
    .orderBy(appointments.startsAt)
    .limit(50);

  const actionable: AppointmentView[] = [];

  for (const row of rows) {
    const view = mapAppointmentRow({
      appointment: row.appointment,
      patientName: row.patientName,
      patientPhone: row.patientPhone,
      serviceName: row.serviceName,
      treatmentName: row.treatmentName,
      hasConsultation: Boolean(row.consultationId),
      consultationId: row.consultationId,
    });
    if (view.operationalStatus !== "programada") continue;
    if (endAt(view.startsAt, view.durationMinutes) >= now) actionable.push(view);
    if (limit !== undefined && actionable.length >= limit) break;
  }

  return actionable;
}

export async function listUpcomingAppointments(limit = 5) {
  return listActionableAppointments(limit);
}

/** Próxima cita pendiente: programada, sin consulta y aún dentro de su horario o en el futuro. */
export async function getNextAppointment(): Promise<AppointmentView | null> {
  const [next] = await listActionableAppointments(1);
  return next ?? null;
}

export async function listTodayAppointments() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return listAppointmentsInRange(start, end);
}
