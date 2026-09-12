import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { getTreatmentDetail, updateTreatment } from "@/server/services/treatments";
import { handleRouteError, jsonError } from "@/shared/api-error";

const patchSchema = z.object({
  status: z.enum(["activo", "terminado", "cancelado"]).optional(),
  notes: z.string().nullable().optional(),
  recommendedFrequencyDays: z.number().int().min(1).nullable().optional(),
  agreedCostCents: z.number().int().min(0).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const treatment = await getTreatmentDetail(id);
    if (!treatment) return jsonError("Tratamiento no encontrado", 404);
    return NextResponse.json({ treatment });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const treatment = await updateTreatment(id, body);
    return NextResponse.json({ treatment });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}
