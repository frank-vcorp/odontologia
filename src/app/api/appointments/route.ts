import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { createAppointment, listAppointmentsInRange } from "@/server/services/appointments";
import { parseClinicDateTime } from "@/shared/datetime";
import { handleRouteError, jsonError } from "@/shared/api-error";

const createSchema = z.object({
  patientId: z.string().uuid(),
  serviceId: z.string().uuid(),
  treatmentId: z.string().uuid().nullable().optional(),
  date: z.string().min(1),
  time: z.string().min(1),
  durationMinutes: z.number().int().min(1).default(60),
  notes: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to) return jsonError("from y to son requeridos", 400);

    const appointments = await listAppointmentsInRange(new Date(from), new Date(to));
    return NextResponse.json({ appointments });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = createSchema.parse(await request.json());
    const appointment = await createAppointment({
      patientId: body.patientId,
      serviceId: body.serviceId,
      treatmentId: body.treatmentId,
      startsAt: parseClinicDateTime(body.date, body.time),
      durationMinutes: body.durationMinutes,
      notes: body.notes,
    });
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}
