import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  appointments,
  consultationTreatments,
  consultations,
  paymentAllocations,
  patients,
  treatments,
  type TreatmentStatus,
} from "@/server/db/schema";
import { getServiceById } from "@/server/services/catalog-services";
import { getPatientById } from "@/server/services/patients";
import { addDays } from "@/shared/datetime";

function toIso(date: Date): string {
  return date.toISOString();
}

export type TreatmentSummaryView = {
  id: string;
  patientId: string;
  serviceId: string | null;
  serviceName: string;
  agreedCostCents: number;
  status: TreatmentStatus;
  budgetId: string | null;
  budgetItemId: string | null;
  recommendedFrequencyDays: number | null;
  notes: string | null;
  paidCents: number;
  balanceCents: number;
  activeBalanceCents: number;
  createdAt: string;
  updatedAt: string;
};

export type TreatmentDetailView = TreatmentSummaryView & {
  patientName: string;
  consultations: {
    id: string;
    occurredAt: string;
    clinicalNotes: string | null;
  }[];
  appointments: {
    id: string;
    startsAt: string;
    durationMinutes: number;
    status: "programada" | "cancelada";
    notes: string | null;
  }[];
  suggestedNextAppointmentDate: string | null;
};

async function sumPaidForTreatments(treatmentIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (treatmentIds.length === 0) return result;

  const db = getDb();
  const rows = await db
    .select({
      treatmentId: paymentAllocations.treatmentId,
      total: sql<number>`coalesce(sum(${paymentAllocations.amountCents}), 0)::int`,
    })
    .from(paymentAllocations)
    .where(
      and(
        eq(paymentAllocations.targetType, "treatment"),
        inArray(paymentAllocations.treatmentId, treatmentIds),
      ),
    )
    .groupBy(paymentAllocations.treatmentId);

  for (const row of rows) {
    if (row.treatmentId) result.set(row.treatmentId, row.total);
  }
  return result;
}

function mapTreatmentSummary(
  row: typeof treatments.$inferSelect,
  paidCents: number,
): TreatmentSummaryView {
  const balanceCents = Math.max(0, row.agreedCostCents - paidCents);
  const activeBalanceCents = row.status === "cancelado" ? 0 : balanceCents;

  return {
    id: row.id,
    patientId: row.patientId,
    serviceId: row.serviceId,
    serviceName: row.serviceName,
    agreedCostCents: row.agreedCostCents,
    status: row.status,
    budgetId: row.budgetId,
    budgetItemId: row.budgetItemId,
    recommendedFrequencyDays: row.recommendedFrequencyDays,
    notes: row.notes,
    paidCents,
    balanceCents,
    activeBalanceCents,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export async function listTreatmentsForPatient(patientId: string): Promise<TreatmentSummaryView[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(treatments)
    .where(eq(treatments.patientId, patientId))
    .orderBy(desc(treatments.createdAt));

  const paidMap = await sumPaidForTreatments(rows.map((r) => r.id));
  return rows.map((row) => mapTreatmentSummary(row, paidMap.get(row.id) ?? 0));
}

export async function getTreatmentById(id: string): Promise<TreatmentSummaryView | null> {
  const db = getDb();
  const [row] = await db.select().from(treatments).where(eq(treatments.id, id)).limit(1);
  if (!row) return null;

  const paidMap = await sumPaidForTreatments([id]);
  return mapTreatmentSummary(row, paidMap.get(id) ?? 0);
}

async function getLastConsultationDate(treatmentId: string): Promise<Date | null> {
  const db = getDb();
  const [row] = await db
    .select({ occurredAt: consultations.occurredAt })
    .from(consultationTreatments)
    .innerJoin(consultations, eq(consultationTreatments.consultationId, consultations.id))
    .where(eq(consultationTreatments.treatmentId, treatmentId))
    .orderBy(desc(consultations.occurredAt))
    .limit(1);

  return row?.occurredAt ?? null;
}

export async function suggestNextAppointmentDate(treatmentId: string): Promise<string | null> {
  const treatment = await getTreatmentById(treatmentId);
  if (!treatment?.recommendedFrequencyDays) return null;

  const lastConsultation = await getLastConsultationDate(treatmentId);
  if (!lastConsultation) return null;

  return addDays(lastConsultation, treatment.recommendedFrequencyDays).toISOString();
}

export async function getTreatmentDetail(id: string): Promise<TreatmentDetailView | null> {
  const db = getDb();
  const [row] = await db
    .select({
      treatment: treatments,
      patientName: patients.fullName,
    })
    .from(treatments)
    .innerJoin(patients, eq(treatments.patientId, patients.id))
    .where(eq(treatments.id, id))
    .limit(1);

  if (!row) return null;

  const paidMap = await sumPaidForTreatments([id]);
  const summary = mapTreatmentSummary(row.treatment, paidMap.get(id) ?? 0);

  const consultationRows = await db
    .select({
      id: consultations.id,
      occurredAt: consultations.occurredAt,
      clinicalNotes: consultations.clinicalNotes,
    })
    .from(consultationTreatments)
    .innerJoin(consultations, eq(consultationTreatments.consultationId, consultations.id))
    .where(eq(consultationTreatments.treatmentId, id))
    .orderBy(desc(consultations.occurredAt));

  const appointmentRows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      durationMinutes: appointments.durationMinutes,
      status: appointments.status,
      notes: appointments.notes,
    })
    .from(appointments)
    .where(eq(appointments.treatmentId, id))
    .orderBy(desc(appointments.startsAt));

  const suggestedNextAppointmentDate = await suggestNextAppointmentDate(id);

  return {
    ...summary,
    patientName: row.patientName,
    consultations: consultationRows.map((c) => ({
      id: c.id,
      occurredAt: toIso(c.occurredAt),
      clinicalNotes: c.clinicalNotes,
    })),
    appointments: appointmentRows.map((a) => ({
      id: a.id,
      startsAt: toIso(a.startsAt),
      durationMinutes: a.durationMinutes,
      status: a.status,
      notes: a.notes,
    })),
    suggestedNextAppointmentDate,
  };
}

export type TreatmentInput = {
  patientId: string;
  serviceId?: string | null;
  serviceName: string;
  agreedCostCents: number;
  recommendedFrequencyDays?: number | null;
  notes?: string | null;
};

export async function createTreatment(input: TreatmentInput) {
  const patient = await getPatientById(input.patientId);
  if (!patient) throw new Error("NOT_FOUND");
  if (input.agreedCostCents < 0) throw new Error("El costo acordado no puede ser negativo");

  let serviceId = input.serviceId ?? null;
  let serviceName = input.serviceName.trim();
  let agreedCostCents = input.agreedCostCents;

  if (serviceId) {
    const service = await getServiceById(serviceId);
    if (!service) throw new Error("Servicio no encontrado");
    if (!serviceName) serviceName = service.name;
    if (input.agreedCostCents === 0 && service.suggestedPriceCents != null) {
      agreedCostCents = service.suggestedPriceCents;
    }
  }

  if (!serviceName) throw new Error("El nombre del servicio es requerido");

  const db = getDb();
  const [treatment] = await db
    .insert(treatments)
    .values({
      patientId: input.patientId,
      serviceId,
      serviceName,
      agreedCostCents,
      recommendedFrequencyDays: input.recommendedFrequencyDays ?? null,
      notes: input.notes?.trim() || null,
    })
    .returning();

  return getTreatmentById(treatment.id);
}

export async function updateTreatmentStatus(id: string, status: TreatmentStatus) {
  const existing = await getTreatmentById(id);
  if (!existing) throw new Error("NOT_FOUND");

  const db = getDb();
  await db
    .update(treatments)
    .set({ status, updatedAt: new Date() })
    .where(eq(treatments.id, id));

  return getTreatmentById(id);
}

export async function updateTreatment(
  id: string,
  input: {
    status?: TreatmentStatus;
    notes?: string | null;
    recommendedFrequencyDays?: number | null;
    agreedCostCents?: number;
  },
) {
  const existing = await getTreatmentById(id);
  if (!existing) throw new Error("NOT_FOUND");

  if (input.agreedCostCents !== undefined && input.agreedCostCents < 0) {
    throw new Error("El costo acordado no puede ser negativo");
  }

  const db = getDb();
  const patch: Partial<typeof treatments.$inferInsert> = { updatedAt: new Date() };
  if (input.status !== undefined) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.recommendedFrequencyDays !== undefined) {
    patch.recommendedFrequencyDays = input.recommendedFrequencyDays;
  }
  if (input.agreedCostCents !== undefined) patch.agreedCostCents = input.agreedCostCents;

  await db.update(treatments).set(patch).where(eq(treatments.id, id));

  return getTreatmentById(id);
}

export async function listActiveTreatmentsForPatient(patientId: string) {
  const all = await listTreatmentsForPatient(patientId);
  return all.filter((t) => t.status === "activo");
}
