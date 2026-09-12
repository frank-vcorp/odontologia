import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { getPatientBalance } from "@/server/services/balances";
import { getPatientById } from "@/server/services/patients";
import { handleRouteError, jsonError } from "@/shared/api-error";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const patient = await getPatientById(id);
    if (!patient) return jsonError("Paciente no encontrado", 404);
    const balance = await getPatientBalance(id);
    return NextResponse.json({ balance });
  } catch (err) {
    return handleRouteError(err);
  }
}
