import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { patientFiles } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getFileById, readFileBuffer } from "@/server/services/files";
import { handleRouteError, jsonError } from "@/shared/api-error";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const db = getDb();
    const [row] = await db.select().from(patientFiles).where(eq(patientFiles.id, id)).limit(1);
    if (!row) return jsonError("Archivo no encontrado", 404);

    const meta = await getFileById(id);
    const buffer = await readFileBuffer(row.storageKey);
    const mimeType = meta?.mimeType ?? "application/octet-stream";
    const isImage = mimeType.startsWith("image/");
    const forceDownload = searchParams.get("download") === "1";
    const forceInline = searchParams.get("inline") === "1";
    const dispositionType = forceDownload ? "attachment" : forceInline || isImage ? "inline" : "attachment";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(row.originalFilename)}"`,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
