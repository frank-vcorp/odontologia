import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { createBudget, listBudgets } from "@/server/services/budgets";
import type { BudgetStatus } from "@/server/db/schema";
import { handleRouteError, jsonError } from "@/shared/api-error";

const createSchema = z.object({
  patientId: z.string().uuid(),
  notes: z.string().nullable().optional(),
});

const budgetStatuses = [
  "borrador",
  "presentado",
  "parcialmente_autorizado",
  "autorizado",
  "rechazado",
  "cancelado",
] as const satisfies readonly BudgetStatus[];

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId") ?? undefined;
    const statusParam = searchParams.get("status");
    const status = budgetStatuses.includes(statusParam as BudgetStatus)
      ? (statusParam as BudgetStatus)
      : undefined;

    const budgets = await listBudgets({ patientId, status });
    return NextResponse.json({ budgets });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = createSchema.parse(await request.json());
    const budget = await createBudget(body);
    return NextResponse.json({ budget }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}
