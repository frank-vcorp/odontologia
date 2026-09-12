import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  appointments,
  consultationServices,
  consultationTreatments,
  consultations,
  patients,
  services,
  treatments,
} from "@/server/db/schema";
import { getAppointmentById } from "@/server/services/appointments";
import { getServiceById } from "@/server/services/catalog-services";

export type ConsultationServiceInput = {
  serviceId: string;
  serviceName: string;
  priceCents: number;
  chargeable?: boolean;
};

export type ConsultationInput = {
  patientId: string;
  appointmentId?: string | null;
  occurredAt: Date;
  clinicalNotes?: string | null;
  services: ConsultationServiceInput[];
  treatmentIds?: string[];
};

export type ConsultationView = {
  id: string;
  patientId: string;
  patientName: string;
  appointmentId: string | null;
  occurredAt: Date;
  clinicalNotes: string | null;
  services: {
    id: string;
    serviceId: string | null;
    serviceName: string;
    priceCents: number;
    paidCents: number;
    chargeable: boolean;
  }[];
  treatments: {
    id: string;
    serviceName: string;
    status: string;
  }[];
  createdAt: Date;
};

async function loadConsultationView(id: string): Promise<ConsultationView | null> {
  const db = getDb();
  const [row] = await db
    .select({
      consultation: consultations,
      patientName: patients.fullName,
    })
    .from(consultations)
    .innerJoin(patients, eq(consultations.patientId, patients.id))
    .where(eq(consultations.id, id))
    .limit(1);

  if (!row) return null;

  const serviceRows = await db
    .select()
    .from(consultationServices)
    .where(eq(consultationServices.consultationId, id))
    .orderBy(consultationServices.createdAt);

  const treatmentLinks = await db
    .select({
      treatmentId: consultationTreatments.treatmentId,
      serviceName: treatments.serviceName,
      status: treatments.status,
    })
    .from(consultationTreatments)
    .innerJoin(treatments, eq(consultationTreatments.treatmentId, treatments.id))
    .where(eq(consultationTreatments.consultationId, id));

  return {
    id: row.consultation.id,
    patientId: row.consultation.patientId,
    patientName: row.patientName,
    appointmentId: row.consultation.appointmentId,
    occurredAt: row.consultation.occurredAt,
    clinicalNotes: row.consultation.clinicalNotes,
    services: serviceRows.map((s) => ({
      id: s.id,
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      priceCents: s.priceCents,
      paidCents: s.paidCents,
      chargeable: s.chargeable,
    })),
    treatments: treatmentLinks.map((t) => ({
      id: t.treatmentId,
      serviceName: t.serviceName,
      status: t.status,
    })),
    createdAt: row.consultation.createdAt,
  };
}

export async function listConsultations(patientId?: string) {
  const db = getDb();
  let query = db.select({ id: consultations.id }).from(consultations).$dynamic();
  if (patientId) {
    query = query.where(eq(consultations.patientId, patientId));
  }
  const rows = await query.orderBy(desc(consultations.occurredAt)).limit(100);

  const views = await Promise.all(rows.map((r) => loadConsultationView(r.id)));
  return views.filter(Boolean) as ConsultationView[];
}

export async function getConsultationById(id: string) {
  return loadConsultationView(id);
}

export async function createConsultationFromAppointment(appointmentId: string, overrides?: {
  occurredAt?: Date;
  clinicalNotes?: string | null;
  extraServiceIds?: string[];
}) {
  const appointment = await getAppointmentById(appointmentId);
  if (!appointment) throw new Error("NOT_FOUND");

  const service = await getServiceById(appointment.serviceId);
  const initialServices: ConsultationServiceInput[] = [
    {
      serviceId: appointment.serviceId,
      serviceName: service?.name ?? appointment.serviceName,
      priceCents: service?.suggestedPriceCents ?? 0,
    },
  ];

  const treatmentIds = appointment.treatmentId ? [appointment.treatmentId] : [];

  return createConsultation({
    patientId: appointment.patientId,
    appointmentId,
    occurredAt: overrides?.occurredAt ?? new Date(),
    clinicalNotes: overrides?.clinicalNotes ?? null,
    services: initialServices.map((service) => ({
      ...service,
      chargeable: treatmentIds.length === 0,
    })),
    treatmentIds,
  });
}

export async function createConsultation(input: ConsultationInput) {
  if (input.services.length === 0 && (input.treatmentIds?.length ?? 0) === 0) {
    throw new Error("Agrega al menos un servicio o un tratamiento");
  }

  const db = getDb();

  if (input.appointmentId) {
    const [existing] = await db
      .select({ id: consultations.id })
      .from(consultations)
      .where(eq(consultations.appointmentId, input.appointmentId))
      .limit(1);
    if (existing) throw new Error("CONSULTATION_EXISTS");
  }

  const [consultation] = await db
    .insert(consultations)
    .values({
      patientId: input.patientId,
      appointmentId: input.appointmentId ?? null,
      occurredAt: input.occurredAt,
      clinicalNotes: input.clinicalNotes?.trim() || null,
    })
    .returning();

  let linkedTreatmentServiceIds = new Set<string>();
  if (input.treatmentIds && input.treatmentIds.length > 0) {
    const linkedTreatments = await db
      .select({ id: treatments.id, serviceId: treatments.serviceId })
      .from(treatments)
      .where(
        and(
          eq(treatments.patientId, input.patientId),
          inArray(treatments.id, input.treatmentIds),
        ),
      );
    linkedTreatmentServiceIds = new Set(
      linkedTreatments.map((treatment) => treatment.serviceId).filter(Boolean) as string[],
    );
  }

  if (input.services.length > 0) {
    await db.insert(consultationServices).values(
      input.services.map((service) => ({
        consultationId: consultation.id,
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        priceCents: service.priceCents,
        chargeable:
          service.chargeable ??
          !(linkedTreatmentServiceIds.size > 0 && linkedTreatmentServiceIds.has(service.serviceId)),
      })),
    );
  }

  if (input.treatmentIds && input.treatmentIds.length > 0) {
    const validTreatments = await db
      .select({ id: treatments.id })
      .from(treatments)
      .where(
        and(
          eq(treatments.patientId, input.patientId),
          inArray(treatments.id, input.treatmentIds),
        ),
      );

    if (validTreatments.length > 0) {
      await db.insert(consultationTreatments).values(
        validTreatments.map((t) => ({
          consultationId: consultation.id,
          treatmentId: t.id,
        })),
      );
    }
  }

  return loadConsultationView(consultation.id);
}

export async function updateConsultation(
  id: string,
  input: {
    occurredAt: Date;
    clinicalNotes?: string | null;
    services: ConsultationServiceInput[];
    treatmentIds?: string[];
  },
) {
  const existing = await getConsultationById(id);
  if (!existing) throw new Error("NOT_FOUND");

  const db = getDb();
  await db
    .update(consultations)
    .set({
      occurredAt: input.occurredAt,
      clinicalNotes: input.clinicalNotes?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(consultations.id, id));

  const paidByServiceId = new Map(
    existing.services.map((service) => [service.serviceId ?? service.id, service.paidCents]),
  );

  let linkedTreatmentServiceIds = new Set<string>();
  if (input.treatmentIds && input.treatmentIds.length > 0) {
    const linkedTreatments = await db
      .select({ serviceId: treatments.serviceId })
      .from(treatments)
      .where(
        and(eq(treatments.patientId, existing.patientId), inArray(treatments.id, input.treatmentIds)),
      );
    linkedTreatmentServiceIds = new Set(
      linkedTreatments.map((treatment) => treatment.serviceId).filter(Boolean) as string[],
    );
  }

  await db.delete(consultationServices).where(eq(consultationServices.consultationId, id));
  if (input.services.length > 0) {
    await db.insert(consultationServices).values(
      input.services.map((service) => ({
        consultationId: id,
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        priceCents: service.priceCents,
        paidCents: paidByServiceId.get(service.serviceId) ?? 0,
        chargeable:
          service.chargeable ??
          !(linkedTreatmentServiceIds.size > 0 && linkedTreatmentServiceIds.has(service.serviceId)),
      })),
    );
  }

  await db.delete(consultationTreatments).where(eq(consultationTreatments.consultationId, id));
  if (input.treatmentIds && input.treatmentIds.length > 0) {
    const validTreatments = await db
      .select({ id: treatments.id })
      .from(treatments)
      .where(
        and(eq(treatments.patientId, existing.patientId), inArray(treatments.id, input.treatmentIds)),
      );
    if (validTreatments.length > 0) {
      await db.insert(consultationTreatments).values(
        validTreatments.map((t) => ({
          consultationId: id,
          treatmentId: t.id,
        })),
      );
    }
  }

  return loadConsultationView(id);
}

export async function listActiveTreatmentsForPatient(patientId: string) {
  const db = getDb();
  return db
    .select({
      id: treatments.id,
      serviceName: treatments.serviceName,
      status: treatments.status,
    })
    .from(treatments)
    .where(and(eq(treatments.patientId, patientId), eq(treatments.status, "activo")))
    .orderBy(treatments.createdAt);
}
