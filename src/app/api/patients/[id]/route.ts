import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { getPatientById, updatePatient } from "@/server/services/patients";
import { handleRouteError, jsonError } from "@/shared/api-error";

const optionalEmail = z.preprocess(
  (value) => (value === "" || value == null ? null : value),
  z.string().email().nullable(),
);

const patientSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  email: optionalEmail.optional(),
  birthDate: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  medicalHistory: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const patient = await getPatientById(id);
    if (!patient) return jsonError("Paciente no encontrado", 404);
    return NextResponse.json({ patient });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const body = patientSchema.parse(await request.json());
    const patient = await updatePatient(id, body);
    return NextResponse.json({ patient });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}
