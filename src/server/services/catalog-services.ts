import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { services } from "@/server/db/schema";

export type ServiceInput = {
  name: string;
  suggestedPriceCents?: number | null;
  generatesTreatment: boolean;
};

export async function listActiveServices() {
  const db = getDb();
  return db
    .select()
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(services.name);
}

export async function getServiceById(id: string) {
  const db = getDb();
  const [service] = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return service ?? null;
}

export async function createService(input: ServiceInput) {
  const db = getDb();
  const [service] = await db
    .insert(services)
    .values({
      name: input.name.trim(),
      suggestedPriceCents: input.suggestedPriceCents ?? null,
      generatesTreatment: input.generatesTreatment,
    })
    .returning();
  return service;
}

export async function updateService(id: string, input: ServiceInput) {
  const db = getDb();
  const existing = await getServiceById(id);
  if (!existing) throw new Error("NOT_FOUND");

  const [service] = await db
    .update(services)
    .set({
      name: input.name.trim(),
      suggestedPriceCents: input.suggestedPriceCents ?? null,
      generatesTreatment: input.generatesTreatment,
      updatedAt: new Date(),
    })
    .where(eq(services.id, id))
    .returning();
  return service;
}

export async function deleteService(id: string) {
  const db = getDb();
  const existing = await getServiceById(id);
  if (!existing) throw new Error("NOT_FOUND");

  await db
    .update(services)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(services.id, id));
}
