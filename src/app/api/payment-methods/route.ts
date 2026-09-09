import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { createPaymentMethod, listActivePaymentMethods } from "@/server/services/payment-methods";
import { handleRouteError, jsonError } from "@/shared/api-error";

const schema = z.object({
  name: z.string().min(1),
});

export async function GET() {
  try {
    await requireUser();
    const methods = await listActivePaymentMethods();
    return NextResponse.json({ methods });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = schema.parse(await request.json());
    const method = await createPaymentMethod(body.name);
    return NextResponse.json({ method }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return handleRouteError(err);
  }
}
