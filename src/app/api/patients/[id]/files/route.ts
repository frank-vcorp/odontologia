import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { listPatientExpediente, saveUploadedFile } from "@/server/services/files";
import { handleRouteError, jsonError } from "@/shared/api-error";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const files = await listPatientExpediente(id);
    return NextResponse.json({ files });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id: patientId } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Archivo requerido", 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const record = await saveUploadedFile({
      patientId,
      sourceType: "paciente",
      originalFilename: file.name,
      mimeType: file.type || null,
      buffer,
    });
    return NextResponse.json({ file: record }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
