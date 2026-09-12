import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { listBudgets } from "@/server/services/budgets";
import { getPatientById } from "@/server/services/patients";
import { handleRouteError, jsonError } from "@/shared/api-error";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const patient = await getPatientById(id);
    if (!patient) return jsonError("Paciente no encontrado", 404);

    const budgets = await listBudgets({ patientId: id });
    return NextResponse.json({ budgets });
  } catch (err) {
    return handleRouteError(err);
  }
}
