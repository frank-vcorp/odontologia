import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { getConsultationById, updateConsultation } from "@/server/services/consultations";
import { parseClinicDateTime } from "@/shared/datetime";
import { handleRouteError, jsonError } from "@/shared/api-error";

const serviceLineSchema = z.object({
  serviceId: z.string().uuid(),
  serviceName: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
});

const updateSchema = z.object({
  date: z.string().min(1),
  time: z.string().min(1),
  clinicalNotes: z.string().nullable().optional(),
  services: z.array(serviceLineSchema),
  treatmentIds: z.array(z.string().uuid()).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const consultation = await getConsultationById(id);
    if (!consultation) return jsonError("Consulta no encontrada", 404);
    return NextResponse.json({ consultation });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const body = updateSchema.parse(await request.json());
    const consultation = await updateConsultation(id, {
      occurredAt: parseClinicDateTime(body.date, body.time),
      clinicalNotes: body.clinicalNotes,
      services: body.services,
      treatmentIds: body.treatmentIds,
    });
    return NextResponse.json({ consultation });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}
