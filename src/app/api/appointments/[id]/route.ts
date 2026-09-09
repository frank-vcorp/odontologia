import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import {
  cancelAppointment,
  getAppointmentById,
  rescheduleAppointment,
} from "@/server/services/appointments";
import { parseClinicDateTime } from "@/shared/datetime";
import { handleRouteError, jsonError } from "@/shared/api-error";

const rescheduleSchema = z.object({
  date: z.string().min(1),
  time: z.string().min(1),
  durationMinutes: z.number().int().min(1),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const appointment = await getAppointmentById(id);
    if (!appointment) return jsonError("Cita no encontrada", 404);
    return NextResponse.json({ appointment });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const body = rescheduleSchema.parse(await request.json());
    const appointment = await rescheduleAppointment(id, {
      startsAt: parseClinicDateTime(body.date, body.time),
      durationMinutes: body.durationMinutes,
    });
    return NextResponse.json({ appointment });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const appointment = await cancelAppointment(id);
    return NextResponse.json({ appointment });
  } catch (err) {
    return handleRouteError(err);
  }
}
