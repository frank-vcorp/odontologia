import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  financialCategories,
  financialMovements,
  patients,
  paymentMethods,
  type FinancialMovementType,
} from "@/server/db/schema";
import { getFinancialCategoryById } from "@/server/services/financial-categories";
import { getPatientById } from "@/server/services/patients";
import { getPaymentMethodById } from "@/server/services/payment-methods";

export type FinancialMovementInput = {
  type: FinancialMovementType;
  categoryId: string;
  amountCents: number;
  occurredAt: Date;
  description: string;
  patientId?: string | null;
  paymentMethodId?: string | null;
};

export type FinancialMovementFilters = {
  from?: Date;
  to?: Date;
  type?: FinancialMovementType;
  categoryId?: string;
  patientId?: string;
};

export type FinancialMovementView = {
  id: string;
  type: FinancialMovementType;
  categoryId: string;
  categoryName: string;
  amountCents: number;
  occurredAt: Date;
  description: string;
  patientId: string | null;
  patientName: string | null;
  paymentId: string | null;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  isEditable: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type FinancialMovementReport = {
  totalIngresoCents: number;
  totalEgresoCents: number;
  netCents: number;
  byCategory: {
    categoryId: string;
    categoryName: string;
    type: FinancialMovementType;
    totalCents: number;
  }[];
};

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function loadFinancialMovementView(id: string): Promise<FinancialMovementView | null> {
  const db = getDb();
  const [row] = await db
    .select({
      movement: financialMovements,
      categoryName: financialCategories.name,
      patientName: patients.fullName,
      paymentMethodName: paymentMethods.name,
    })
    .from(financialMovements)
    .innerJoin(financialCategories, eq(financialMovements.categoryId, financialCategories.id))
    .leftJoin(patients, eq(financialMovements.patientId, patients.id))
    .leftJoin(paymentMethods, eq(financialMovements.paymentMethodId, paymentMethods.id))
    .where(eq(financialMovements.id, id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.movement.id,
    type: row.movement.type,
    categoryId: row.movement.categoryId,
    categoryName: row.categoryName,
    amountCents: row.movement.amountCents,
    occurredAt: row.movement.occurredAt,
    description: row.movement.description,
    patientId: row.movement.patientId,
    patientName: row.patientName,
    paymentId: row.movement.paymentId,
    paymentMethodId: row.movement.paymentMethodId,
    paymentMethodName: row.paymentMethodName,
    isEditable: row.movement.paymentId == null,
    createdAt: row.movement.createdAt,
    updatedAt: row.movement.updatedAt,
  };
}

async function validateManualMovementInput(input: FinancialMovementInput) {
  if (input.amountCents <= 0) {
    throw new Error("INVALID_MOVEMENT");
  }

  const category = await getFinancialCategoryById(input.categoryId);
  if (!category || !category.isActive) {
    throw new Error("NOT_FOUND");
  }
  if (category.type !== input.type) {
    throw new Error("INVALID_MOVEMENT");
  }

  if (input.patientId) {
    const patient = await getPatientById(input.patientId);
    if (!patient) throw new Error("NOT_FOUND");
  }

  if (input.paymentMethodId) {
    const method = await getPaymentMethodById(input.paymentMethodId);
    if (!method || !method.isActive) {
      throw new Error("NOT_FOUND");
    }
  }
}

function buildFilters(filters: FinancialMovementFilters) {
  const conditions = [];
  if (filters.from) {
    conditions.push(gte(financialMovements.occurredAt, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(financialMovements.occurredAt, filters.to));
  }
  if (filters.type) {
    conditions.push(eq(financialMovements.type, filters.type));
  }
  if (filters.categoryId) {
    conditions.push(eq(financialMovements.categoryId, filters.categoryId));
  }
  if (filters.patientId) {
    conditions.push(eq(financialMovements.patientId, filters.patientId));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listFinancialMovements(
  filters: FinancialMovementFilters = {},
): Promise<FinancialMovementView[]> {
  const db = getDb();
  const whereClause = buildFilters(filters);

  let query = db
    .select({
      movement: financialMovements,
      categoryName: financialCategories.name,
      patientName: patients.fullName,
      paymentMethodName: paymentMethods.name,
    })
    .from(financialMovements)
    .innerJoin(financialCategories, eq(financialMovements.categoryId, financialCategories.id))
    .leftJoin(patients, eq(financialMovements.patientId, patients.id))
    .leftJoin(paymentMethods, eq(financialMovements.paymentMethodId, paymentMethods.id))
    .$dynamic();

  if (whereClause) {
    query = query.where(whereClause);
  }

  const rows = await query.orderBy(desc(financialMovements.occurredAt), desc(financialMovements.createdAt));

  return rows.map((row) => ({
    id: row.movement.id,
    type: row.movement.type,
    categoryId: row.movement.categoryId,
    categoryName: row.categoryName,
    amountCents: row.movement.amountCents,
    occurredAt: row.movement.occurredAt,
    description: row.movement.description,
    patientId: row.movement.patientId,
    patientName: row.patientName,
    paymentId: row.movement.paymentId,
    paymentMethodId: row.movement.paymentMethodId,
    paymentMethodName: row.paymentMethodName,
    isEditable: row.movement.paymentId == null,
    createdAt: row.movement.createdAt,
    updatedAt: row.movement.updatedAt,
  }));
}

export async function getFinancialMovementById(id: string): Promise<FinancialMovementView | null> {
  return loadFinancialMovementView(id);
}

export async function createManualFinancialMovement(
  input: FinancialMovementInput,
): Promise<FinancialMovementView> {
  await validateManualMovementInput(input);

  const db = getDb();
  const [movement] = await db
    .insert(financialMovements)
    .values({
      type: input.type,
      categoryId: input.categoryId,
      amountCents: input.amountCents,
      occurredAt: input.occurredAt,
      description: input.description.trim(),
      patientId: input.patientId ?? null,
      paymentMethodId: input.paymentMethodId ?? null,
      paymentId: null,
    })
    .returning({ id: financialMovements.id });

  const view = await loadFinancialMovementView(movement.id);
  if (!view) throw new Error("NOT_FOUND");
  return view;
}

export async function updateManualFinancialMovement(
  id: string,
  input: FinancialMovementInput,
): Promise<FinancialMovementView> {
  const db = getDb();
  const [existing] = await db
    .select({ paymentId: financialMovements.paymentId })
    .from(financialMovements)
    .where(eq(financialMovements.id, id))
    .limit(1);

  if (!existing) throw new Error("NOT_FOUND");
  if (existing.paymentId) {
    throw new Error("MOVEMENT_NOT_EDITABLE");
  }

  await validateManualMovementInput(input);

  await db
    .update(financialMovements)
    .set({
      type: input.type,
      categoryId: input.categoryId,
      amountCents: input.amountCents,
      occurredAt: input.occurredAt,
      description: input.description.trim(),
      patientId: input.patientId ?? null,
      paymentMethodId: input.paymentMethodId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(financialMovements.id, id));

  const view = await loadFinancialMovementView(id);
  if (!view) throw new Error("NOT_FOUND");
  return view;
}

export async function deleteManualFinancialMovement(id: string): Promise<void> {
  const db = getDb();
  const [existing] = await db
    .select({ paymentId: financialMovements.paymentId })
    .from(financialMovements)
    .where(eq(financialMovements.id, id))
    .limit(1);

  if (!existing) throw new Error("NOT_FOUND");
  if (existing.paymentId) {
    throw new Error("MOVEMENT_NOT_EDITABLE");
  }

  await db.delete(financialMovements).where(eq(financialMovements.id, id));
}

export async function getFinancialMovementReport(
  filters: FinancialMovementFilters = {},
): Promise<FinancialMovementReport> {
  const db = getDb();
  const whereClause = buildFilters(filters);

  let totalsQuery = db
    .select({
      type: financialMovements.type,
      total: sql<number>`coalesce(sum(${financialMovements.amountCents}), 0)::int`,
    })
    .from(financialMovements)
    .$dynamic();

  if (whereClause) {
    totalsQuery = totalsQuery.where(whereClause);
  }

  const totalsRows = await totalsQuery.groupBy(financialMovements.type);

  let totalIngresoCents = 0;
  let totalEgresoCents = 0;
  for (const row of totalsRows) {
    if (row.type === "ingreso") totalIngresoCents = row.total;
    if (row.type === "egreso") totalEgresoCents = row.total;
  }

  let byCategoryQuery = db
    .select({
      categoryId: financialMovements.categoryId,
      categoryName: financialCategories.name,
      type: financialCategories.type,
      total: sql<number>`coalesce(sum(${financialMovements.amountCents}), 0)::int`,
    })
    .from(financialMovements)
    .innerJoin(financialCategories, eq(financialMovements.categoryId, financialCategories.id))
    .$dynamic();

  if (whereClause) {
    byCategoryQuery = byCategoryQuery.where(whereClause);
  }

  const byCategoryRows = await byCategoryQuery
    .groupBy(financialMovements.categoryId, financialCategories.name, financialCategories.type)
    .orderBy(financialCategories.type, financialCategories.name);

  return {
    totalIngresoCents,
    totalEgresoCents,
    netCents: totalIngresoCents - totalEgresoCents,
    byCategory: byCategoryRows.map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      type: row.type,
      totalCents: row.total,
    })),
  };
}

export { normalizeOptional };
