import { NextResponse } from "next/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function handleRouteError(err: unknown) {
  if (err instanceof Error) {
    if (err.message === "UNAUTHORIZED") return jsonError("No autorizado", 401);
    if (err.message === "FORBIDDEN") return jsonError("Acceso denegado", 403);
    if (err.message === "NOT_FOUND") return jsonError("No encontrado", 404);
    if (err.message === "FILE_NOT_FOUND") {
      return jsonError("El archivo ya no está disponible en el servidor. Vuelve a subirlo.", 404);
    }
    if (err.message === "CONFLICT") return jsonError("Conflicto de datos", 409);
    if (err.message === "APPOINTMENT_OVERLAP") {
      return jsonError("El horario ya está ocupado. Elige otro horario.", 409);
    }
    if (err.message === "CONSULTATION_EXISTS") {
      return jsonError("Esta cita ya tiene una consulta registrada.", 409);
    }
    return jsonError(err.message, 400);
  }
  return jsonError("Error interno", 500);
}
