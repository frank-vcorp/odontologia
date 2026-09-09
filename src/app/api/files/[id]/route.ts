import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { patientFiles } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getFileById, readFileBuffer } from "@/server/services/files";
import { handleRouteError, jsonError } from "@/shared/api-error";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const db = getDb();
    const [row] = await db.select().from(patientFiles).where(eq(patientFiles.id, id)).limit(1);
    if (!row) return jsonError("Archivo no encontrado", 404);

    const meta = await getFileById(id);
    const buffer = await readFileBuffer(row.storageKey);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": meta?.mimeType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(row.originalFilename)}"`,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
