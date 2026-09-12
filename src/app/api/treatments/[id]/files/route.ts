import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { listPatientExpediente, saveUploadedFile } from "@/server/services/files";
import { getTreatmentById } from "@/server/services/treatments";
import { handleRouteError, jsonError } from "@/shared/api-error";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const treatment = await getTreatmentById(id);
    if (!treatment) return jsonError("Tratamiento no encontrado", 404);
    const files = (await listPatientExpediente(treatment.patientId)).filter(
      (f) => f.treatmentId === id,
    );
    return NextResponse.json({ files });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id: treatmentId } = await params;
    const treatment = await getTreatmentById(treatmentId);
    if (!treatment) return jsonError("Tratamiento no encontrado", 404);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Archivo requerido", 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const record = await saveUploadedFile({
      patientId: treatment.patientId,
      sourceType: "tratamiento",
      treatmentId,
      originalFilename: file.name,
      mimeType: file.type || null,
      buffer,
    });
    return NextResponse.json({ file: record }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
