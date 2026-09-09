import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { jsonError } from "@/shared/api-error";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autorizado", 401);
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
