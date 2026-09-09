import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import {
  createConsultation,
  createConsultationFromAppointment,
  listConsultations,
} from "@/server/services/consultations";
import { parseClinicDateTime } from "@/shared/datetime";
import { handleRouteError, jsonError } from "@/shared/api-error";

const serviceLineSchema = z.object({
  serviceId: z.string().uuid(),
  serviceName: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
});

const createSchema = z
  .object({
    patientId: z.string().uuid().optional(),
    appointmentId: z.string().uuid().nullable().optional(),
    date: z.string().min(1),
    time: z.string().min(1),
    clinicalNotes: z.string().nullable().optional(),
    services: z.array(serviceLineSchema).default([]),
    treatmentIds: z.array(z.string().uuid()).optional(),
    fromAppointment: z.boolean().optional(),
  })
  .refine((data) => data.fromAppointment || data.patientId, {
    message: "Paciente requerido",
    path: ["patientId"],
  });

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId") ?? undefined;
    const consultations = await listConsultations(patientId);
    return NextResponse.json({ consultations });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = createSchema.parse(await request.json());

    if (body.fromAppointment && body.appointmentId) {
      const consultation = await createConsultationFromAppointment(body.appointmentId, {
        occurredAt: parseClinicDateTime(body.date, body.time),
        clinicalNotes: body.clinicalNotes,
      });
      return NextResponse.json({ consultation }, { status: 201 });
    }

    const consultation = await createConsultation({
      patientId: body.patientId!,
      appointmentId: body.appointmentId,
      occurredAt: parseClinicDateTime(body.date, body.time),
      clinicalNotes: body.clinicalNotes,
      services: body.services,
      treatmentIds: body.treatmentIds,
    });
    return NextResponse.json({ consultation }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}
