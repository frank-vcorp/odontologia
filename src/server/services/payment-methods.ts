import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { paymentMethods } from "@/server/db/schema";

export async function listActivePaymentMethods() {
  const db = getDb();
  return db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.isActive, true))
    .orderBy(paymentMethods.name);
}

export async function getPaymentMethodById(id: string) {
  const db = getDb();
  const [method] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id)).limit(1);
  return method ?? null;
}

export async function createPaymentMethod(name: string) {
  const db = getDb();
  const [method] = await db
    .insert(paymentMethods)
    .values({ name: name.trim() })
    .returning();
  return method;
}

export async function updatePaymentMethod(id: string, name: string) {
  const db = getDb();
  const existing = await getPaymentMethodById(id);
  if (!existing) throw new Error("NOT_FOUND");

  const [method] = await db
    .update(paymentMethods)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(paymentMethods.id, id))
    .returning();
  return method;
}

export async function deletePaymentMethod(id: string) {
  const db = getDb();
  const existing = await getPaymentMethodById(id);
  if (!existing) throw new Error("NOT_FOUND");

  await db
    .update(paymentMethods)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(paymentMethods.id, id));
}
