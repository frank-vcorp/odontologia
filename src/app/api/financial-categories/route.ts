import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import {
  createFinancialCategory,
  listActiveFinancialCategories,
} from "@/server/services/financial-categories";
import { handleRouteError, jsonError } from "@/shared/api-error";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["ingreso", "egreso"]),
});

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const categories = await listActiveFinancialCategories(
      type === "ingreso" || type === "egreso" ? type : undefined,
    );
    return NextResponse.json({ categories });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = schema.parse(await request.json());
    const category = await createFinancialCategory(body);
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}
