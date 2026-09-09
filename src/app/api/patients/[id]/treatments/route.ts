import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { listActiveTreatmentsForPatient } from "@/server/services/consultations";
import { handleRouteError } from "@/shared/api-error";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const treatments = await listActiveTreatmentsForPatient(id);
    return NextResponse.json({ treatments });
  } catch (err) {
    return handleRouteError(err);
  }
}
