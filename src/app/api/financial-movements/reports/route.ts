import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import {
  getFinancialMovementReport,
  type FinancialMovementFilters,
} from "@/server/services/financial-movements";
import { endOfDayClinic, parseClinicDateTime, startOfDayClinic } from "@/shared/datetime";
import { handleRouteError } from "@/shared/api-error";

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
    const report = await getFinancialMovementReport(parseFilters(searchParams));
    return NextResponse.json({ report });
  } catch (err) {
    return handleRouteError(err);
  }
}
