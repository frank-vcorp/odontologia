import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { addBudgetItem } from "@/server/services/budgets";
import { handleRouteError, jsonError } from "@/shared/api-error";

const itemSchema = z.object({
  serviceId: z.string().uuid().nullable().optional(),
  serviceName: z.string().min(1),
  priceCents: z.number().int().min(0),
  generatesTreatment: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const body = itemSchema.parse(await request.json());
    const budget = await addBudgetItem(id, body);
    return NextResponse.json({ budget }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}
