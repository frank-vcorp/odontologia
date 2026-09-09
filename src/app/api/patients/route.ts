import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { createPatient, listPatients } from "@/server/services/patients";
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

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const patients = await listPatients(q);
    return NextResponse.json({ patients });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = patientSchema.parse(await request.json());
    const patient = await createPatient(body);
    return NextResponse.json({ patient }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}
