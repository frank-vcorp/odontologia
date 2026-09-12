import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { deleteBudgetItem, updateBudgetItem } from "@/server/services/budgets";
import { handleRouteError, jsonError } from "@/shared/api-error";

const itemSchema = z.object({
  serviceId: z.string().uuid().nullable().optional(),
  serviceName: z.string().min(1).optional(),
  priceCents: z.number().int().min(0).optional(),
  generatesTreatment: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id, itemId } = await params;
    const body = itemSchema.parse(await request.json());
    const budget = await updateBudgetItem(id, itemId, body);
    return NextResponse.json({ budget });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id, itemId } = await params;
    const budget = await deleteBudgetItem(id, itemId);
    return NextResponse.json({ budget });
  } catch (err) {
    return handleRouteError(err);
  }
}
