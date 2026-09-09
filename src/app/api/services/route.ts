import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { createService, listActiveServices } from "@/server/services/catalog-services";
import { handleRouteError, jsonError } from "@/shared/api-error";

const schema = z.object({
  name: z.string().min(1),
  suggestedPriceCents: z.number().int().nonnegative().nullable().optional(),
  generatesTreatment: z.boolean(),
});

export async function GET() {
  try {
    await requireUser();
    const services = await listActiveServices();
    return NextResponse.json({ services });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = schema.parse(await request.json());
    const service = await createService(body);
    return NextResponse.json({ service }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}
