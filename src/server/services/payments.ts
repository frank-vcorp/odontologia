import { and, asc, desc, eq, like, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import type { DbClient } from "@/server/db/types";
import {
  consultationServices,
  consultations,
  financialMovements,
  paymentAllocations,
  paymentMethods,
  payments,
  treatments,
  type PaymentAllocationTarget,
} from "@/server/db/schema";
import {
  computeConsultationServicePendingCents,
  computePatientGeneralBalanceCents,
  computeTreatmentBalanceCents,
  getUnpaidConsultationServicesForPatient,
} from "@/server/services/balances";
import { createFinancialCategory, listActiveFinancialCategories } from "@/server/services/financial-categories";
import { getPatientById } from "@/server/services/patients";
import { getPaymentMethodById } from "@/server/services/payment-methods";

export type PaymentAllocationInput = {
  targetType: PaymentAllocationTarget;
  treatmentId?: string | null;
  consultationServiceId?: string | null;
  amountCents: number;
};

export type CreatePaymentInput = {
  patientId: string;
  paymentMethodId: string;
  amountCents: number;
  paidAt: Date;
  notes?: string | null;
  consultationId?: string | null;
  allocations: PaymentAllocationInput[];
  idempotencyKey?: string | null;
};

export type PaymentAllocationView = {
  id: string;
  targetType: PaymentAllocationTarget;
  treatmentId: string | null;
  consultationServiceId: string | null;
  amountCents: number;
};

export type PaymentView = {
  id: string;
  patientId: string;
  paymentMethodId: string;
  paymentMethodName: string;
  amountCents: number;
  paidAt: Date;
  notes: string | null;
  consultationId: string | null;
  allocations: PaymentAllocationView[];
  createdAt: Date;
};

const IDEMPOTENCY_PREFIX = "[ik:";

async function getDefaultIngresoCategoryId() {
  const categories = await listActiveFinancialCategories("ingreso");
  if (categories.length > 0) return categories[0].id;

  const created = await createFinancialCategory({
    name: "Pagos de pacientes",
    type: "ingreso",
  });
  return created.id;
}

async function loadPaymentView(id: string): Promise<PaymentView | null> {
  const db = getDb();
  const [row] = await db
    .select({
      payment: payments,
      paymentMethodName: paymentMethods.name,
    })
    .from(payments)
    .innerJoin(paymentMethods, eq(payments.paymentMethodId, paymentMethods.id))
    .where(eq(payments.id, id))
    .limit(1);

  if (!row) return null;

  const allocations = await db
    .select()
    .from(paymentAllocations)
    .where(eq(paymentAllocations.paymentId, id))
    .orderBy(paymentAllocations.createdAt);

  return {
    id: row.payment.id,
    patientId: row.payment.patientId,
    paymentMethodId: row.payment.paymentMethodId,
    paymentMethodName: row.paymentMethodName,
    amountCents: row.payment.amountCents,
    paidAt: row.payment.paidAt,
    notes: row.payment.notes,
    consultationId: row.payment.consultationId,
    allocations: allocations.map((allocation) => ({
      id: allocation.id,
      targetType: allocation.targetType,
      treatmentId: allocation.treatmentId,
      consultationServiceId: allocation.consultationServiceId,
      amountCents: allocation.amountCents,
    })),
    createdAt: row.payment.createdAt,
  };
}

async function findPaymentByIdempotencyKey(idempotencyKey: string) {
  const db = getDb();
  const [movement] = await db
    .select({ paymentId: financialMovements.paymentId })
    .from(financialMovements)
    .where(like(financialMovements.description, `${IDEMPOTENCY_PREFIX}${idempotencyKey}]%`))
    .limit(1);

  if (!movement?.paymentId) return null;
  return loadPaymentView(movement.paymentId);
}

async function validateAllocation(
  patientId: string,
  consultationId: string | null | undefined,
  allocation: PaymentAllocationInput,
) {
  if (allocation.amountCents <= 0) {
    throw new Error("INVALID_ALLOCATION");
  }

  if (allocation.targetType === "general") {
    if (allocation.treatmentId || allocation.consultationServiceId) {
      throw new Error("INVALID_ALLOCATION");
    }
    const generalBalance = await computePatientGeneralBalanceCents(patientId);
    if (allocation.amountCents > generalBalance) {
      throw new Error("PAYMENT_EXCEEDS_BALANCE");
    }
    return;
  }

  if (allocation.targetType === "treatment") {
    if (!allocation.treatmentId || allocation.consultationServiceId) {
      throw new Error("INVALID_ALLOCATION");
    }

    const db = getDb();
    const [treatment] = await db
      .select({ patientId: treatments.patientId, status: treatments.status })
      .from(treatments)
      .where(eq(treatments.id, allocation.treatmentId))
      .limit(1);

    if (!treatment || treatment.patientId !== patientId) {
      throw new Error("NOT_FOUND");
    }
    if (treatment.status === "cancelado") {
      throw new Error("TREATMENT_CANCELLED");
    }

    const balance = await computeTreatmentBalanceCents(allocation.treatmentId);
    if (allocation.amountCents > balance) {
      throw new Error("PAYMENT_EXCEEDS_BALANCE");
    }
    return;
  }

  if (allocation.targetType === "consultation_service") {
    if (!allocation.consultationServiceId || allocation.treatmentId) {
      throw new Error("INVALID_ALLOCATION");
    }

    const db = getDb();
    const [service] = await db
      .select({
        consultationId: consultationServices.consultationId,
        chargeable: consultationServices.chargeable,
        patientId: consultations.patientId,
      })
      .from(consultationServices)
      .innerJoin(consultations, eq(consultationServices.consultationId, consultations.id))
      .where(eq(consultationServices.id, allocation.consultationServiceId))
      .limit(1);

    if (!service || service.patientId !== patientId) {
      throw new Error("NOT_FOUND");
    }
    if (!service.chargeable) {
      throw new Error("INVALID_ALLOCATION");
    }
    if (consultationId && service.consultationId !== consultationId) {
      throw new Error("INVALID_ALLOCATION");
    }

    const pending = await computeConsultationServicePendingCents(allocation.consultationServiceId);
    if (allocation.amountCents > pending) {
      throw new Error("PAYMENT_EXCEEDS_BALANCE");
    }
  }
}

async function getUnpaidConsultationServicesInTx(db: DbClient, patientId: string) {
  const rows = await db
    .select({
      id: consultationServices.id,
      paidCents: consultationServices.paidCents,
      pendingCents: sql<number>`(${consultationServices.priceCents} - ${consultationServices.paidCents})::int`,
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

  return rows;
}

async function applyGeneralAllocation(db: DbClient, patientId: string, amountCents: number) {
  const unpaidServices = await getUnpaidConsultationServicesInTx(db, patientId);
  let remaining = amountCents;

  for (const service of unpaidServices) {
    if (remaining <= 0) break;
    const apply = Math.min(remaining, service.pendingCents);
    await db
      .update(consultationServices)
      .set({
        paidCents: service.paidCents + apply,
        updatedAt: new Date(),
      })
      .where(eq(consultationServices.id, service.id));
    remaining -= apply;
  }

  if (remaining > 0) {
    throw new Error("PAYMENT_EXCEEDS_BALANCE");
  }
}

async function applyConsultationServiceAllocation(
  db: DbClient,
  consultationServiceId: string,
  amountCents: number,
) {
  const [service] = await db
    .select({
      priceCents: consultationServices.priceCents,
      paidCents: consultationServices.paidCents,
      chargeable: consultationServices.chargeable,
    })
    .from(consultationServices)
    .where(eq(consultationServices.id, consultationServiceId))
    .limit(1);

  if (!service || !service.chargeable) {
    throw new Error("INVALID_ALLOCATION");
  }

  const pending = service.priceCents - service.paidCents;
  if (amountCents > pending) {
    throw new Error("PAYMENT_EXCEEDS_BALANCE");
  }

  await db
    .update(consultationServices)
    .set({
      paidCents: service.paidCents + amountCents,
      updatedAt: new Date(),
    })
    .where(eq(consultationServices.id, consultationServiceId));
}

export async function createPayment(input: CreatePaymentInput): Promise<PaymentView> {
  if (input.amountCents <= 0) {
    throw new Error("INVALID_ALLOCATION");
  }
  if (input.allocations.length === 0) {
    throw new Error("INVALID_ALLOCATION");
  }

  const allocationTotal = input.allocations.reduce((sum, allocation) => sum + allocation.amountCents, 0);
  if (allocationTotal !== input.amountCents) {
    throw new Error("INVALID_ALLOCATION");
  }

  if (input.idempotencyKey?.trim()) {
    const existing = await findPaymentByIdempotencyKey(input.idempotencyKey.trim());
    if (existing) return existing;
  }

  const patient = await getPatientById(input.patientId);
  if (!patient) throw new Error("NOT_FOUND");

  const paymentMethod = await getPaymentMethodById(input.paymentMethodId);
  if (!paymentMethod || !paymentMethod.isActive) {
    throw new Error("NOT_FOUND");
  }

  if (input.consultationId) {
    const db = getDb();
    const [consultation] = await db
      .select({ patientId: consultations.patientId })
      .from(consultations)
      .where(eq(consultations.id, input.consultationId))
      .limit(1);

    if (!consultation || consultation.patientId !== input.patientId) {
      throw new Error("NOT_FOUND");
    }
  }

  if (input.consultationId) {
    for (const allocation of input.allocations) {
      if (allocation.targetType === "general") {
        throw new Error("INVALID_ALLOCATION");
      }
    }
  }

  for (const allocation of input.allocations) {
    await validateAllocation(input.patientId, input.consultationId, allocation);
  }

  const categoryId = await getDefaultIngresoCategoryId();
  const idempotencyKey = input.idempotencyKey?.trim();
  const descriptionPrefix = idempotencyKey ? `${IDEMPOTENCY_PREFIX}${idempotencyKey}] ` : "";
  const description = `${descriptionPrefix}Pago recibido — ${patient.fullName}`;

  const db = getDb();
  const paymentId = await db.transaction(async (tx) => {
    const [payment] = await tx
      .insert(payments)
      .values({
        patientId: input.patientId,
        paymentMethodId: input.paymentMethodId,
        amountCents: input.amountCents,
        paidAt: input.paidAt,
        notes: input.notes?.trim() || null,
        consultationId: input.consultationId ?? null,
      })
      .returning({ id: payments.id });

    if (input.allocations.length > 0) {
      await tx.insert(paymentAllocations).values(
        input.allocations.map((allocation) => ({
          paymentId: payment.id,
          targetType: allocation.targetType,
          treatmentId: allocation.treatmentId ?? null,
          consultationServiceId: allocation.consultationServiceId ?? null,
          amountCents: allocation.amountCents,
        })),
      );
    }

    for (const allocation of input.allocations) {
      if (allocation.targetType === "general") {
        await applyGeneralAllocation(tx, input.patientId, allocation.amountCents);
      } else if (allocation.targetType === "consultation_service" && allocation.consultationServiceId) {
        await applyConsultationServiceAllocation(
          tx,
          allocation.consultationServiceId,
          allocation.amountCents,
        );
      }
    }

    await tx.insert(financialMovements).values({
      type: "ingreso",
      categoryId,
      amountCents: input.amountCents,
      occurredAt: input.paidAt,
      description,
      patientId: input.patientId,
      paymentId: payment.id,
      paymentMethodId: input.paymentMethodId,
    });

    return payment.id;
  });

  const view = await loadPaymentView(paymentId);
  if (!view) throw new Error("NOT_FOUND");
  return view;
}

export async function listPaymentsForPatient(patientId: string): Promise<PaymentView[]> {
  const db = getDb();
  const rows = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.patientId, patientId))
    .orderBy(desc(payments.paidAt), desc(payments.createdAt));

  const views = await Promise.all(rows.map((row) => loadPaymentView(row.id)));
  return views.filter(Boolean) as PaymentView[];
}

export async function listPaymentsForConsultation(consultationId: string): Promise<PaymentView[]> {
  const db = getDb();
  const rows = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.consultationId, consultationId))
    .orderBy(desc(payments.paidAt), desc(payments.createdAt));

  const views = await Promise.all(rows.map((row) => loadPaymentView(row.id)));
  return views.filter(Boolean) as PaymentView[];
}

export async function getPaymentById(id: string): Promise<PaymentView | null> {
  return loadPaymentView(id);
}
