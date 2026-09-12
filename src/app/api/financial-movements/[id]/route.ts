import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import {
  deleteManualFinancialMovement,
  getFinancialMovementById,
  updateManualFinancialMovement,
} from "@/server/services/financial-movements";
import { parseClinicDateTime } from "@/shared/datetime";
import { handleRouteError, jsonError } from "@/shared/api-error";

const updateSchema = z.object({
  type: z.enum(["ingreso", "egreso"]),
  categoryId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  date: z.string().min(1),
  time: z.string().min(1),
  description: z.string().min(1),
  patientId: z.string().uuid().nullable().optional(),
  paymentMethodId: z.string().uuid().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const existing = await getFinancialMovementById(id);
    if (!existing) return jsonError("Movimiento no encontrado", 404);

    const body = updateSchema.parse(await request.json());
    const movement = await updateManualFinancialMovement(id, {
      type: body.type,
      categoryId: body.categoryId,
      amountCents: body.amountCents,
      occurredAt: parseClinicDateTime(body.date, body.time),
      description: body.description,
      patientId: body.patientId,
      paymentMethodId: body.paymentMethodId,
    });
    return NextResponse.json({ movement });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const existing = await getFinancialMovementById(id);
    if (!existing) return jsonError("Movimiento no encontrado", 404);

    await deleteManualFinancialMovement(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
