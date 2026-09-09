import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { financialCategories } from "@/server/db/schema";

export type FinancialCategoryInput = {
  name: string;
  type: "ingreso" | "egreso";
};

export async function listActiveFinancialCategories(type?: "ingreso" | "egreso") {
  const db = getDb();
  if (type) {
    return db
      .select()
      .from(financialCategories)
      .where(and(eq(financialCategories.isActive, true), eq(financialCategories.type, type)))
      .orderBy(financialCategories.name);
  }
  return db
    .select()
    .from(financialCategories)
    .where(eq(financialCategories.isActive, true))
    .orderBy(financialCategories.name);
}

export async function getFinancialCategoryById(id: string) {
  const db = getDb();
  const [category] = await db
    .select()
    .from(financialCategories)
    .where(eq(financialCategories.id, id))
    .limit(1);
  return category ?? null;
}

export async function createFinancialCategory(input: FinancialCategoryInput) {
  const db = getDb();
  const [category] = await db
    .insert(financialCategories)
    .values({
      name: input.name.trim(),
      type: input.type,
    })
    .returning();
  return category;
}

export async function updateFinancialCategory(id: string, input: FinancialCategoryInput) {
  const db = getDb();
  const existing = await getFinancialCategoryById(id);
  if (!existing) throw new Error("NOT_FOUND");

  const [category] = await db
    .update(financialCategories)
    .set({
      name: input.name.trim(),
      type: input.type,
      updatedAt: new Date(),
    })
    .where(eq(financialCategories.id, id))
    .returning();
  return category;
}

export async function deleteFinancialCategory(id: string) {
  const db = getDb();
  const existing = await getFinancialCategoryById(id);
  if (!existing) throw new Error("NOT_FOUND");

  await db
    .update(financialCategories)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(financialCategories.id, id));
}
