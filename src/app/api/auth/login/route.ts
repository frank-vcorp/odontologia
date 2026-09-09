import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/server/auth/session";
import { verifyUserCredentials } from "@/server/services/users";
import { jsonError } from "@/shared/api-error";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const user = await verifyUserCredentials(body.email, body.password);
    if (!user) return jsonError("Credenciales inválidas", 401);

    await createSession(user.id);
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Datos inválidos", 400);
    return jsonError("Error al iniciar sesión", 500);
  }
}
