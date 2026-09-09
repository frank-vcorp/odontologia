import { and, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/server/db";
import { patients } from "@/server/db/schema";

export type PatientInput = {
  fullName: string;
  phone: string;
  email?: string | null;
  birthDate?: string | null;
  address?: string | null;
  medicalHistory?: string | null;
  notes?: string | null;
};

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function listPatients(query?: string) {
  const db = getDb();
  if (!query?.trim()) {
    return db.select().from(patients).orderBy(patients.fullName);
  }
  const term = `%${query.trim()}%`;
  return db
    .select()
    .from(patients)
    .where(or(ilike(patients.fullName, term), ilike(patients.phone, term)))
    .orderBy(patients.fullName);
}

export async function getPatientById(id: string) {
  const db = getDb();
  const [patient] = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  return patient ?? null;
}

export async function createPatient(input: PatientInput) {
  const db = getDb();
  const [patient] = await db
    .insert(patients)
    .values({
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      email: normalizeOptional(input.email),
      birthDate: normalizeOptional(input.birthDate),
      address: normalizeOptional(input.address),
      medicalHistory: normalizeOptional(input.medicalHistory),
      notes: normalizeOptional(input.notes),
    })
    .returning();
  return patient;
}

export async function updatePatient(id: string, input: PatientInput) {
  const db = getDb();
  const existing = await getPatientById(id);
  if (!existing) throw new Error("NOT_FOUND");

  const [patient] = await db
    .update(patients)
    .set({
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      email: normalizeOptional(input.email),
      birthDate: normalizeOptional(input.birthDate),
      address: normalizeOptional(input.address),
      medicalHistory: normalizeOptional(input.medicalHistory),
      notes: normalizeOptional(input.notes),
      updatedAt: new Date(),
    })
    .where(eq(patients.id, id))
    .returning();
  return patient;
}

export async function searchPatients(query: string) {
  return listPatients(query);
}
