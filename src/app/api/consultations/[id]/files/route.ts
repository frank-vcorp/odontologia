import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { getConsultationById } from "@/server/services/consultations";
import { listPatientExpediente, saveUploadedFile } from "@/server/services/files";
import { handleRouteError, jsonError } from "@/shared/api-error";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const consultation = await getConsultationById(id);
    if (!consultation) return jsonError("Consulta no encontrada", 404);
    const files = (await listPatientExpediente(consultation.patientId)).filter(
      (f) => f.consultationId === id,
    );
    return NextResponse.json({ files });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id: consultationId } = await params;
    const consultation = await getConsultationById(consultationId);
    if (!consultation) return jsonError("Consulta no encontrada", 404);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Archivo requerido", 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const record = await saveUploadedFile({
      patientId: consultation.patientId,
      sourceType: "consulta",
      consultationId,
      originalFilename: file.name,
      mimeType: file.type || null,
      buffer,
    });
    return NextResponse.json({ file: record }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
