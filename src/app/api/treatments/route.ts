import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { createTreatment } from "@/server/services/treatments";
import { handleRouteError, jsonError } from "@/shared/api-error";

const createSchema = z.object({
  patientId: z.string().uuid(),
  serviceId: z.string().uuid().nullable().optional(),
  serviceName: z.string().min(1),
  agreedCostCents: z.number().int().min(0),
  recommendedFrequencyDays: z.number().int().min(1).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = createSchema.parse(await request.json());
    const treatment = await createTreatment(body);
    return NextResponse.json({ treatment }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}
