import { createHash } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { consultations, patientFiles, patients, treatments } from "@/server/db/schema";
import type { FileSourceType } from "@/server/db/schema";

function uploadRoot() {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

export type FileRecordView = {
  id: string;
  patientId: string;
  consultationId: string | null;
  treatmentId: string | null;
  sourceType: FileSourceType;
  originalFilename: string;
  mimeType: string | null;
  sizeBytes: number;
  createdAt: Date;
  sourceLabel: string;
  sourceHref: string | null;
};

function sourceMeta(row: {
  sourceType: FileSourceType;
  consultationId: string | null;
  treatmentId: string | null;
}): { sourceLabel: string; sourceHref: string | null } {
  if (row.sourceType === "consulta" && row.consultationId) {
    return { sourceLabel: "Consulta", sourceHref: `/consultas/${row.consultationId}` };
  }
  if (row.sourceType === "tratamiento" && row.treatmentId) {
    return { sourceLabel: "Tratamiento", sourceHref: `/tratamientos/${row.treatmentId}` };
  }
  return { sourceLabel: "Paciente", sourceHref: null };
}

function mapFile(row: typeof patientFiles.$inferSelect): FileRecordView {
  const meta = sourceMeta(row);
  return {
    id: row.id,
    patientId: row.patientId,
    consultationId: row.consultationId,
    treatmentId: row.treatmentId,
    sourceType: row.sourceType,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
    ...meta,
  };
}

export async function listPatientExpediente(patientId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(patientFiles)
    .where(eq(patientFiles.patientId, patientId))
    .orderBy(desc(patientFiles.createdAt));
  return rows.map(mapFile);
}

export async function getFileById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(patientFiles).where(eq(patientFiles.id, id)).limit(1);
  return row ? mapFile(row) : null;
}

export async function saveUploadedFile(input: {
  patientId: string;
  sourceType: FileSourceType;
  consultationId?: string | null;
  treatmentId?: string | null;
  originalFilename: string;
  mimeType: string | null;
  buffer: Buffer;
}) {
  const db = getDb();
  const [patient] = await db.select().from(patients).where(eq(patients.id, input.patientId)).limit(1);
  if (!patient) throw new Error("NOT_FOUND");

  if (input.consultationId) {
    const [consultation] = await db
      .select()
      .from(consultations)
      .where(eq(consultations.id, input.consultationId))
      .limit(1);
    if (!consultation || consultation.patientId !== input.patientId) {
      throw new Error("La consulta no pertenece al paciente");
    }
  }

  if (input.treatmentId) {
    const [treatment] = await db
      .select()
      .from(treatments)
      .where(eq(treatments.id, input.treatmentId))
      .limit(1);
    if (!treatment || treatment.patientId !== input.patientId) {
      throw new Error("El tratamiento no pertenece al paciente");
    }
  }

  const hash = createHash("sha256").update(input.buffer).digest("hex").slice(0, 16);
  const safeName = input.originalFilename.replace(/[^\w.\-() ]+/g, "_");
  const storageKey = path.join(input.patientId, `${Date.now()}-${hash}-${safeName}`);
  const fullPath = path.join(uploadRoot(), storageKey);

  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, input.buffer);

  const [record] = await db
    .insert(patientFiles)
    .values({
      patientId: input.patientId,
      consultationId: input.consultationId ?? null,
      treatmentId: input.treatmentId ?? null,
      sourceType: input.sourceType,
      originalFilename: input.originalFilename,
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.length,
    })
    .returning();

  return mapFile(record);
}

export async function readFileBuffer(storageKey: string) {
  const fullPath = path.join(uploadRoot(), storageKey);
  try {
    return await readFile(fullPath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error("FILE_NOT_FOUND");
    }
    throw error;
  }
}
