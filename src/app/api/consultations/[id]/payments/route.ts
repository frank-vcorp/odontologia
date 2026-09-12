import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { getConsultationById } from "@/server/services/consultations";
import { createPayment, listPaymentsForConsultation } from "@/server/services/payments";
import { parseClinicDateTime } from "@/shared/datetime";
import { handleRouteError, jsonError } from "@/shared/api-error";

const allocationSchema = z
  .object({
    targetType: z.enum(["general", "treatment", "consultation_service"]),
    treatmentId: z.string().uuid().nullable().optional(),
    consultationServiceId: z.string().uuid().nullable().optional(),
    amountCents: z.number().int().positive(),
  })
  .superRefine((allocation, ctx) => {
    if (allocation.targetType === "treatment" && !allocation.treatmentId) {
      ctx.addIssue({ code: "custom", message: "Tratamiento requerido", path: ["treatmentId"] });
    }
    if (allocation.targetType === "consultation_service" && !allocation.consultationServiceId) {
      ctx.addIssue({
        code: "custom",
        message: "Servicio de consulta requerido",
        path: ["consultationServiceId"],
      });
    }
    if (allocation.targetType === "general" && (allocation.treatmentId || allocation.consultationServiceId)) {
      ctx.addIssue({ code: "custom", message: "Destino general inválido", path: ["targetType"] });
    }
  });

const createSchema = z.object({
  paymentMethodId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  date: z.string().min(1),
  time: z.string().min(1),
  notes: z.string().nullable().optional(),
  allocations: z.array(allocationSchema).min(1),
  idempotencyKey: z.string().min(1).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const consultation = await getConsultationById(id);
    if (!consultation) return jsonError("Consulta no encontrada", 404);
    const payments = await listPaymentsForConsultation(id);
    return NextResponse.json({ payments });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const consultation = await getConsultationById(id);
    if (!consultation) return jsonError("Consulta no encontrada", 404);

    const body = createSchema.parse(await request.json());
    const payment = await createPayment({
      patientId: consultation.patientId,
      paymentMethodId: body.paymentMethodId,
      amountCents: body.amountCents,
      paidAt: parseClinicDateTime(body.date, body.time),
      notes: body.notes,
      consultationId: id,
      allocations: body.allocations,
      idempotencyKey: body.idempotencyKey,
    });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}
