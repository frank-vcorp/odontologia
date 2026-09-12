import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { rejectBudgetItem } from "@/server/services/budgets";
import { handleRouteError } from "@/shared/api-error";

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id, itemId } = await params;
    const budget = await rejectBudgetItem(id, itemId);
    return NextResponse.json({ budget });
  } catch (err) {
    return handleRouteError(err);
  }
}
