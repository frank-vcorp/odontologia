import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { deleteService, updateService } from "@/server/services/catalog-services";
import { handleRouteError, jsonError } from "@/shared/api-error";

const schema = z.object({
  name: z.string().min(1),
  suggestedPriceCents: z.number().int().nonnegative().nullable().optional(),
  generatesTreatment: z.boolean(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const body = schema.parse(await request.json());
    const service = await updateService(id, body);
    return NextResponse.json({ service });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    await deleteService(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
