import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { getBudgetById, updateBudget } from "@/server/services/budgets";
import type { BudgetStatus } from "@/server/db/schema";
import { handleRouteError, jsonError } from "@/shared/api-error";

const patchSchema = z.object({
  notes: z.string().nullable().optional(),
  status: z.enum(["borrador", "presentado", "cancelado"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const budget = await getBudgetById(id);
    if (!budget) return jsonError("Presupuesto no encontrado", 404);
    return NextResponse.json({ budget });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const budget = await updateBudget(id, {
      notes: body.notes,
      status: body.status as BudgetStatus | undefined,
    });
    return NextResponse.json({ budget });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}
