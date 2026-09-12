import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import {
  createManualFinancialMovement,
  listFinancialMovements,
  type FinancialMovementFilters,
} from "@/server/services/financial-movements";
import { endOfDayClinic, parseClinicDateTime, startOfDayClinic } from "@/shared/datetime";
import { handleRouteError, jsonError } from "@/shared/api-error";

const createSchema = z.object({
  type: z.enum(["ingreso", "egreso"]),
  categoryId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  date: z.string().min(1),
  time: z.string().min(1),
  description: z.string().min(1),
  patientId: z.string().uuid().nullable().optional(),
  paymentMethodId: z.string().uuid().nullable().optional(),
});

function parseFilters(searchParams: URLSearchParams): FinancialMovementFilters {
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");
  const typeParam = searchParams.get("type");
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const patientId = searchParams.get("patientId") ?? undefined;
  const type: FinancialMovementFilters["type"] =
    typeParam === "ingreso" || typeParam === "egreso" ? typeParam : undefined;

  return {
    from: fromDate ? startOfDayClinic(parseClinicDateTime(fromDate, "00:00")) : undefined,
    to: toDate ? endOfDayClinic(parseClinicDateTime(toDate, "00:00")) : undefined,
    type,
    categoryId,
    patientId,
  };
}

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const movements = await listFinancialMovements(parseFilters(searchParams));
    return NextResponse.json({ movements });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = createSchema.parse(await request.json());
    const movement = await createManualFinancialMovement({
      type: body.type,
      categoryId: body.categoryId,
      amountCents: body.amountCents,
      occurredAt: parseClinicDateTime(body.date, body.time),
      description: body.description,
      patientId: body.patientId,
      paymentMethodId: body.paymentMethodId,
    });
    return NextResponse.json({ movement }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}
