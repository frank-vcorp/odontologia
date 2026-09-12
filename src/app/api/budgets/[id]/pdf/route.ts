import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import {
  generateBudgetPdf,
  getBudgetDocumentById,
  listBudgetDocuments,
  readBudgetDocumentBuffer,
} from "@/server/services/budgets";
import { handleRouteError, jsonError } from "@/shared/api-error";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (documentId) {
      const doc = await getBudgetDocumentById(id, documentId);
      if (!doc) return jsonError("Documento no encontrado", 404);

      const buffer = await readBudgetDocumentBuffer(doc.storageKey);
      const forceDownload = searchParams.get("download") === "1";
      const dispositionType = forceDownload ? "attachment" : "inline";

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `${dispositionType}; filename="${encodeURIComponent(doc.originalFilename)}"`,
        },
      });
    }

    const documents = await listBudgetDocuments(id);
    return NextResponse.json({ documents });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const result = await generateBudgetPdf(id);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
