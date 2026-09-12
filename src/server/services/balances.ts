import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  consultationServices,
  consultations,
  paymentAllocations,
  treatments,
} from "@/server/db/schema";

export type UnpaidConsultationService = {
  id: string;
  consultationId: string;
  consultationOccurredAt: Date;
  serviceName: string;
  priceCents: number;
  paidCents: number;
  pendingCents: number;
};

export type TreatmentBalance = {
  treatmentId: string;
  serviceName: string;
  status: string;
  agreedCostCents: number;
  paidCents: number;
  balanceCents: number;
};

export type PatientBalance = {
  generalBalanceCents: number;
  treatmentBalances: TreatmentBalance[];
  totalTreatmentBalanceCents: number;
  totalBalanceCents: number;
  unpaidConsultationServices: UnpaidConsultationService[];
};

export type DashboardBalanceSummary = {
  totalGeneralBalanceCents: number;
  totalTreatmentBalanceCents: number;
  totalPendingCents: number;
  patientsWithBalance: number;
};

async function sumTreatmentPaidCents(treatmentIds: string[]) {
  if (treatmentIds.length === 0) return new Map<string, number>();

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

  return new Map(rows.filter((r) => r.treatmentId).map((r) => [r.treatmentId!, r.total]));
}

function treatmentActiveBalance(
  status: string,
  agreedCostCents: number,
  paidCents: number,
): number {
  if (status === "cancelado") return 0;
  return Math.max(0, agreedCostCents - paidCents);
}

export async function getUnpaidConsultationServicesForPatient(
  patientId: string,
): Promise<UnpaidConsultationService[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: consultationServices.id,
      consultationId: consultationServices.consultationId,
      consultationOccurredAt: consultations.occurredAt,
      serviceName: consultationServices.serviceName,
      priceCents: consultationServices.priceCents,
      paidCents: consultationServices.paidCents,
    })
    .from(consultationServices)
    .innerJoin(consultations, eq(consultationServices.consultationId, consultations.id))
    .where(
      and(
        eq(consultations.patientId, patientId),
        eq(consultationServices.chargeable, true),
        sql`${consultationServices.priceCents} > ${consultationServices.paidCents}`,
      ),
    )
    .orderBy(asc(consultations.occurredAt), asc(consultationServices.createdAt));

  return rows.map((row) => ({
    id: row.id,
    consultationId: row.consultationId,
    consultationOccurredAt: row.consultationOccurredAt,
    serviceName: row.serviceName,
    priceCents: row.priceCents,
    paidCents: row.paidCents,
    pendingCents: row.priceCents - row.paidCents,
  }));
}

export async function computePatientGeneralBalanceCents(patientId: string): Promise<number> {
  const unpaid = await getUnpaidConsultationServicesForPatient(patientId);
  return unpaid.reduce((sum, service) => sum + service.pendingCents, 0);
}

export async function computeTreatmentBalancesForPatient(
  patientId: string,
): Promise<TreatmentBalance[]> {
  const db = getDb();
  const patientTreatments = await db
    .select({
      id: treatments.id,
      serviceName: treatments.serviceName,
      status: treatments.status,
      agreedCostCents: treatments.agreedCostCents,
    })
    .from(treatments)
    .where(eq(treatments.patientId, patientId))
    .orderBy(treatments.createdAt);

  const paidByTreatment = await sumTreatmentPaidCents(patientTreatments.map((t) => t.id));

  return patientTreatments.map((treatment) => {
    const paidCents = paidByTreatment.get(treatment.id) ?? 0;
    return {
      treatmentId: treatment.id,
      serviceName: treatment.serviceName,
      status: treatment.status,
      agreedCostCents: treatment.agreedCostCents,
      paidCents,
      balanceCents: treatmentActiveBalance(treatment.status, treatment.agreedCostCents, paidCents),
    };
  });
}

export async function computeTreatmentBalanceCents(treatmentId: string): Promise<number> {
  const db = getDb();
  const [treatment] = await db
    .select({
      status: treatments.status,
      agreedCostCents: treatments.agreedCostCents,
    })
    .from(treatments)
    .where(eq(treatments.id, treatmentId))
    .limit(1);

  if (!treatment) throw new Error("NOT_FOUND");

  const paidByTreatment = await sumTreatmentPaidCents([treatmentId]);
  const paidCents = paidByTreatment.get(treatmentId) ?? 0;
  return treatmentActiveBalance(treatment.status, treatment.agreedCostCents, paidCents);
}

export async function computeConsultationServicePendingCents(
  consultationServiceId: string,
): Promise<number> {
  const db = getDb();
  const [service] = await db
    .select({
      priceCents: consultationServices.priceCents,
      paidCents: consultationServices.paidCents,
      chargeable: consultationServices.chargeable,
    })
    .from(consultationServices)
    .where(eq(consultationServices.id, consultationServiceId))
    .limit(1);

  if (!service) throw new Error("NOT_FOUND");
  if (!service.chargeable) return 0;
  return Math.max(0, service.priceCents - service.paidCents);
}

export async function getPatientBalance(patientId: string): Promise<PatientBalance> {
  const generalBalanceCents = await computePatientGeneralBalanceCents(patientId);
  const treatmentBalances = await computeTreatmentBalancesForPatient(patientId);
  const totalTreatmentBalanceCents = treatmentBalances.reduce(
    (sum, treatment) => sum + treatment.balanceCents,
    0,
  );
  const unpaidConsultationServices = await getUnpaidConsultationServicesForPatient(patientId);

  return {
    generalBalanceCents,
    treatmentBalances,
    totalTreatmentBalanceCents,
    totalBalanceCents: generalBalanceCents + totalTreatmentBalanceCents,
    unpaidConsultationServices,
  };
}

export async function getDashboardBalanceSummary(): Promise<DashboardBalanceSummary> {
  const db = getDb();

  const [generalRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${consultationServices.priceCents} - ${consultationServices.paidCents}), 0)::int`,
    })
    .from(consultationServices)
    .innerJoin(consultations, eq(consultationServices.consultationId, consultations.id))
    .where(
      and(
        eq(consultationServices.chargeable, true),
        sql`${consultationServices.priceCents} > ${consultationServices.paidCents}`,
      ),
    );

  const activeTreatments = await db
    .select({
      id: treatments.id,
      status: treatments.status,
      agreedCostCents: treatments.agreedCostCents,
      patientId: treatments.patientId,
    })
    .from(treatments)
    .where(ne(treatments.status, "cancelado"));

  const paidByTreatment = await sumTreatmentPaidCents(activeTreatments.map((t) => t.id));

  let totalTreatmentBalanceCents = 0;
  const patientsWithTreatmentBalance = new Set<string>();

  for (const treatment of activeTreatments) {
    const paidCents = paidByTreatment.get(treatment.id) ?? 0;
    const balance = treatmentActiveBalance(treatment.status, treatment.agreedCostCents, paidCents);
    if (balance > 0) {
      totalTreatmentBalanceCents += balance;
      patientsWithTreatmentBalance.add(treatment.patientId);
    }
  }

  const patientsWithGeneralBalanceRows = await db
    .selectDistinct({ patientId: consultations.patientId })
    .from(consultationServices)
    .innerJoin(consultations, eq(consultationServices.consultationId, consultations.id))
    .where(
      and(
        eq(consultationServices.chargeable, true),
        sql`${consultationServices.priceCents} > ${consultationServices.paidCents}`,
      ),
    );

  const patientsWithBalance = new Set([
    ...patientsWithGeneralBalanceRows.map((row) => row.patientId),
    ...patientsWithTreatmentBalance,
  ]);

  const totalGeneralBalanceCents = generalRow?.total ?? 0;

  return {
    totalGeneralBalanceCents,
    totalTreatmentBalanceCents,
    totalPendingCents: totalGeneralBalanceCents + totalTreatmentBalanceCents,
    patientsWithBalance: patientsWithBalance.size,
  };
}
