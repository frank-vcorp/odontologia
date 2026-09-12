import { createHash } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  budgetDocuments,
  budgetItems,
  budgets,
  patients,
  treatments,
  type BudgetItemStatus,
  type BudgetStatus,
} from "@/server/db/schema";
import { getServiceById } from "@/server/services/catalog-services";
import { getPatientById } from "@/server/services/patients";
import { formatInClinicTimezone } from "@/shared/datetime";

function uploadRoot() {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

export type BudgetItemView = {
  id: string;
  budgetId: string;
  serviceId: string | null;
  serviceName: string;
  priceCents: number;
  generatesTreatment: boolean;
  status: BudgetItemStatus;
  createdAt: string;
  updatedAt: string;
};

export type BudgetView = {
  id: string;
  patientId: string;
  patientName: string;
  status: BudgetStatus;
  notes: string | null;
  items: BudgetItemView[];
  totalCents: number;
  authorizedTotalCents: number;
  createdAt: string;
  updatedAt: string;
};

export type BudgetDocumentView = {
  id: string;
  budgetId: string;
  originalFilename: string;
  createdAt: string;
};

function toIso(date: Date): string {
  return date.toISOString();
}

function mapItem(row: typeof budgetItems.$inferSelect): BudgetItemView {
  return {
    id: row.id,
    budgetId: row.budgetId,
    serviceId: row.serviceId,
    serviceName: row.serviceName,
    priceCents: row.priceCents,
    generatesTreatment: row.generatesTreatment,
    status: row.status,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function computeBudgetStatus(
  items: { status: BudgetItemStatus }[],
  currentStatus: BudgetStatus,
): BudgetStatus {
  if (currentStatus === "cancelado") return "cancelado";

  if (items.length === 0) {
    return currentStatus === "presentado" ? "presentado" : "borrador";
  }

  const authorized = items.filter((i) => i.status === "autorizado").length;
  const rejected = items.filter((i) => i.status === "rechazado").length;

  if (authorized === items.length) return "autorizado";
  if (rejected === items.length) return "rechazado";
  if (authorized > 0) return "parcialmente_autorizado";
  if (currentStatus === "presentado" || currentStatus === "parcialmente_autorizado") {
    return "presentado";
  }
  return currentStatus === "rechazado" ? "borrador" : currentStatus;
}

async function loadBudgetView(id: string): Promise<BudgetView | null> {
  const db = getDb();
  const [row] = await db
    .select({
      budget: budgets,
      patientName: patients.fullName,
    })
    .from(budgets)
    .innerJoin(patients, eq(budgets.patientId, patients.id))
    .where(eq(budgets.id, id))
    .limit(1);

  if (!row) return null;

  const itemRows = await db
    .select()
    .from(budgetItems)
    .where(eq(budgetItems.budgetId, id))
    .orderBy(budgetItems.createdAt);

  const items = itemRows.map(mapItem);
  const totalCents = items.reduce((sum, i) => sum + i.priceCents, 0);
  const authorizedTotalCents = items
    .filter((i) => i.status === "autorizado")
    .reduce((sum, i) => sum + i.priceCents, 0);

  return {
    id: row.budget.id,
    patientId: row.budget.patientId,
    patientName: row.patientName,
    status: row.budget.status,
    notes: row.budget.notes,
    items,
    totalCents,
    authorizedTotalCents,
    createdAt: toIso(row.budget.createdAt),
    updatedAt: toIso(row.budget.updatedAt),
  };
}

async function syncBudgetStatus(budgetId: string) {
  const db = getDb();
  const [budget] = await db.select().from(budgets).where(eq(budgets.id, budgetId)).limit(1);
  if (!budget || budget.status === "cancelado") return;

  const items = await db.select().from(budgetItems).where(eq(budgetItems.budgetId, budgetId));
  const nextStatus = computeBudgetStatus(items, budget.status);

  if (nextStatus !== budget.status) {
    await db
      .update(budgets)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(budgets.id, budgetId));
  }
}

export async function listBudgets(filters?: { patientId?: string; status?: BudgetStatus }) {
  const db = getDb();
  const conditions = [];
  if (filters?.patientId) conditions.push(eq(budgets.patientId, filters.patientId));
  if (filters?.status) conditions.push(eq(budgets.status, filters.status));

  const rows = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(budgets.createdAt));

  const views = await Promise.all(rows.map((r) => loadBudgetView(r.id)));
  return views.filter(Boolean) as BudgetView[];
}

export async function getBudgetById(id: string) {
  return loadBudgetView(id);
}

export async function createBudget(input: { patientId: string; notes?: string | null }) {
  const patient = await getPatientById(input.patientId);
  if (!patient) throw new Error("NOT_FOUND");

  const db = getDb();
  const [budget] = await db
    .insert(budgets)
    .values({
      patientId: input.patientId,
      notes: input.notes?.trim() || null,
    })
    .returning();

  return loadBudgetView(budget.id);
}

export async function updateBudget(
  id: string,
  input: { notes?: string | null; status?: BudgetStatus },
) {
  const existing = await getBudgetById(id);
  if (!existing) throw new Error("NOT_FOUND");

  if (input.status === "cancelado" && existing.status === "cancelado") {
    return existing;
  }

  const allowedManualStatuses: BudgetStatus[] = ["borrador", "presentado", "cancelado"];
  if (input.status && !allowedManualStatuses.includes(input.status)) {
    throw new Error("El estado del presupuesto se calcula automáticamente al autorizar conceptos");
  }

  const db = getDb();
  const patch: Partial<typeof budgets.$inferInsert> = { updatedAt: new Date() };
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.status !== undefined) patch.status = input.status;

  await db.update(budgets).set(patch).where(eq(budgets.id, id));

  if (!input.status) {
    await syncBudgetStatus(id);
  }

  return getBudgetById(id);
}

export type BudgetItemInput = {
  serviceId?: string | null;
  serviceName: string;
  priceCents: number;
  generatesTreatment?: boolean;
};

async function resolveItemDefaults(input: BudgetItemInput): Promise<{
  serviceId: string | null;
  serviceName: string;
  priceCents: number;
  generatesTreatment: boolean;
}> {
  if (input.serviceId) {
    const service = await getServiceById(input.serviceId);
    if (!service) throw new Error("Servicio no encontrado");
    return {
      serviceId: service.id,
      serviceName: input.serviceName.trim() || service.name,
      priceCents: input.priceCents,
      generatesTreatment: input.generatesTreatment ?? service.generatesTreatment,
    };
  }

  if (!input.serviceName.trim()) throw new Error("El nombre del servicio es requerido");

  return {
    serviceId: null,
    serviceName: input.serviceName.trim(),
    priceCents: input.priceCents,
    generatesTreatment: input.generatesTreatment ?? false,
  };
}

function assertBudgetEditable(budget: BudgetView) {
  if (budget.status === "cancelado") {
    throw new Error("El presupuesto está cancelado");
  }
}

export async function addBudgetItem(budgetId: string, input: BudgetItemInput) {
  const budget = await getBudgetById(budgetId);
  if (!budget) throw new Error("NOT_FOUND");
  assertBudgetEditable(budget);

  if (input.priceCents < 0) throw new Error("El precio no puede ser negativo");

  const resolved = await resolveItemDefaults(input);
  const db = getDb();

  await db.insert(budgetItems).values({
    budgetId,
    serviceId: resolved.serviceId,
    serviceName: resolved.serviceName,
    priceCents: resolved.priceCents,
    generatesTreatment: resolved.generatesTreatment,
  });

  await syncBudgetStatus(budgetId);
  return getBudgetById(budgetId);
}

export async function updateBudgetItem(
  budgetId: string,
  itemId: string,
  input: Partial<BudgetItemInput>,
) {
  const budget = await getBudgetById(budgetId);
  if (!budget) throw new Error("NOT_FOUND");
  assertBudgetEditable(budget);

  const item = budget.items.find((i) => i.id === itemId);
  if (!item) throw new Error("NOT_FOUND");
  if (item.status !== "pendiente") {
    throw new Error("Los conceptos autorizados o rechazados no pueden modificarse");
  }

  const merged: BudgetItemInput = {
    serviceId: input.serviceId !== undefined ? input.serviceId : item.serviceId,
    serviceName: input.serviceName ?? item.serviceName,
    priceCents: input.priceCents ?? item.priceCents,
    generatesTreatment: input.generatesTreatment ?? item.generatesTreatment,
  };

  if (merged.priceCents < 0) throw new Error("El precio no puede ser negativo");

  const resolved = await resolveItemDefaults(merged);
  const db = getDb();

  await db
    .update(budgetItems)
    .set({
      serviceId: resolved.serviceId,
      serviceName: resolved.serviceName,
      priceCents: resolved.priceCents,
      generatesTreatment: resolved.generatesTreatment,
      updatedAt: new Date(),
    })
    .where(and(eq(budgetItems.id, itemId), eq(budgetItems.budgetId, budgetId)));

  await syncBudgetStatus(budgetId);
  return getBudgetById(budgetId);
}

export async function deleteBudgetItem(budgetId: string, itemId: string) {
  const budget = await getBudgetById(budgetId);
  if (!budget) throw new Error("NOT_FOUND");
  assertBudgetEditable(budget);

  const item = budget.items.find((i) => i.id === itemId);
  if (!item) throw new Error("NOT_FOUND");
  if (item.status !== "pendiente") {
    throw new Error("Los conceptos autorizados o rechazados no pueden eliminarse");
  }

  const db = getDb();
  await db
    .delete(budgetItems)
    .where(and(eq(budgetItems.id, itemId), eq(budgetItems.budgetId, budgetId)));

  await syncBudgetStatus(budgetId);
  return getBudgetById(budgetId);
}

async function ensureTreatmentForAuthorizedItem(
  budget: BudgetView,
  item: BudgetItemView,
) {
  if (!item.generatesTreatment) return null;

  const db = getDb();
  const [existing] = await db
    .select()
    .from(treatments)
    .where(eq(treatments.budgetItemId, item.id))
    .limit(1);

  if (existing) return existing;

  const [treatment] = await db
    .insert(treatments)
    .values({
      patientId: budget.patientId,
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      agreedCostCents: item.priceCents,
      status: "activo",
      budgetId: budget.id,
      budgetItemId: item.id,
    })
    .returning();

  return treatment;
}

export async function authorizeBudgetItem(budgetId: string, itemId: string) {
  const budget = await getBudgetById(budgetId);
  if (!budget) throw new Error("NOT_FOUND");
  if (budget.status === "cancelado") throw new Error("El presupuesto está cancelado");

  const item = budget.items.find((i) => i.id === itemId);
  if (!item) throw new Error("NOT_FOUND");
  if (item.status === "autorizado") return budget;
  if (item.status !== "pendiente") {
    throw new Error("Solo los conceptos pendientes pueden autorizarse");
  }

  const db = getDb();
  await db
    .update(budgetItems)
    .set({ status: "autorizado", updatedAt: new Date() })
    .where(and(eq(budgetItems.id, itemId), eq(budgetItems.budgetId, budgetId)));

  const updatedBudget = (await getBudgetById(budgetId))!;
  const authorizedItem = updatedBudget.items.find((i) => i.id === itemId)!;

  if (authorizedItem.generatesTreatment) {
    await ensureTreatmentForAuthorizedItem(updatedBudget, authorizedItem);
  }

  await syncBudgetStatus(budgetId);
  return getBudgetById(budgetId);
}

export async function rejectBudgetItem(budgetId: string, itemId: string) {
  const budget = await getBudgetById(budgetId);
  if (!budget) throw new Error("NOT_FOUND");
  if (budget.status === "cancelado") throw new Error("El presupuesto está cancelado");

  const item = budget.items.find((i) => i.id === itemId);
  if (!item) throw new Error("NOT_FOUND");
  if (item.status === "rechazado") return budget;
  if (item.status !== "pendiente") {
    throw new Error("Solo los conceptos pendientes pueden rechazarse");
  }

  const db = getDb();
  await db
    .update(budgetItems)
    .set({ status: "rechazado", updatedAt: new Date() })
    .where(and(eq(budgetItems.id, itemId), eq(budgetItems.budgetId, budgetId)));

  await syncBudgetStatus(budgetId);
  return getBudgetById(budgetId);
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
}

function itemStatusLabel(status: BudgetItemStatus): string {
  const labels: Record<BudgetItemStatus, string> = {
    pendiente: "Pendiente",
    autorizado: "Autorizado",
    rechazado: "Rechazado",
  };
  return labels[status];
}

function budgetStatusLabel(status: BudgetStatus): string {
  const labels: Record<BudgetStatus, string> = {
    borrador: "Borrador",
    presentado: "Presentado",
    parcialmente_autorizado: "Parcialmente autorizado",
    autorizado: "Autorizado",
    rechazado: "Rechazado",
    cancelado: "Cancelado",
  };
  return labels[status];
}

function buildBudgetHtml(budget: BudgetView): string {
  const rows = budget.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.serviceName)}</td>
        <td style="text-align:right">${formatMoney(item.priceCents)}</td>
        <td>${itemStatusLabel(item.status)}</td>
      </tr>`,
    )
    .join("");

  const generatedAt = formatInClinicTimezone(new Date(), {
    dateStyle: "long",
    timeStyle: "short",
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Presupuesto — ${escapeHtml(budget.patientName)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; margin: 40px; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .meta { color: #555; margin-bottom: 2rem; font-size: 0.95rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; }
    th { font-weight: 600; background: #f7f7f7; }
    .total { margin-top: 1.5rem; font-size: 1.1rem; font-weight: bold; text-align: right; }
    .notes { margin-top: 2rem; white-space: pre-wrap; color: #444; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Presupuesto dental</h1>
  <div class="meta">
    <div><strong>Paciente:</strong> ${escapeHtml(budget.patientName)}</div>
    <div><strong>Fecha:</strong> ${generatedAt}</div>
    <div><strong>Estado:</strong> ${budgetStatusLabel(budget.status)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Concepto</th>
        <th style="text-align:right">Precio</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">Total: ${formatMoney(budget.totalCents)}</div>
  ${budget.notes ? `<div class="notes"><strong>Notas:</strong><br/>${escapeHtml(budget.notes)}</div>` : ""}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function generateBudgetPdf(budgetId: string) {
  const budget = await getBudgetById(budgetId);
  if (!budget) throw new Error("NOT_FOUND");

  const html = buildBudgetHtml(budget);
  const buffer = Buffer.from(html, "utf-8");
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const originalFilename = `presupuesto-${budget.patientName.replace(/[^\w.\-() ]+/g, "_")}-${Date.now()}.html`;
  const storageKey = path.join("budgets", budgetId, `${Date.now()}-${hash}-presupuesto.html`);
  const fullPath = path.join(uploadRoot(), storageKey);

  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);

  const db = getDb();

  if (budget.status === "borrador") {
    await db
      .update(budgets)
      .set({ status: "presentado", updatedAt: new Date() })
      .where(eq(budgets.id, budgetId));
  }

  const [doc] = await db
    .insert(budgetDocuments)
    .values({
      budgetId,
      storageKey,
      originalFilename,
    })
    .returning();

  return {
    document: {
      id: doc.id,
      budgetId: doc.budgetId,
      originalFilename: doc.originalFilename,
      createdAt: toIso(doc.createdAt),
    } satisfies BudgetDocumentView,
    budget: await getBudgetById(budgetId),
  };
}

export async function listBudgetDocuments(budgetId: string): Promise<BudgetDocumentView[]> {
  const budget = await getBudgetById(budgetId);
  if (!budget) throw new Error("NOT_FOUND");

  const db = getDb();
  const rows = await db
    .select()
    .from(budgetDocuments)
    .where(eq(budgetDocuments.budgetId, budgetId))
    .orderBy(desc(budgetDocuments.createdAt));

  return rows.map((row) => ({
    id: row.id,
    budgetId: row.budgetId,
    originalFilename: row.originalFilename,
    createdAt: toIso(row.createdAt),
  }));
}

export async function getBudgetDocumentById(budgetId: string, documentId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(budgetDocuments)
    .where(and(eq(budgetDocuments.id, documentId), eq(budgetDocuments.budgetId, budgetId)))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    budgetId: row.budgetId,
    originalFilename: row.originalFilename,
    storageKey: row.storageKey,
    createdAt: toIso(row.createdAt),
  };
}

export async function readBudgetDocumentBuffer(storageKey: string) {
  const fullPath = path.join(uploadRoot(), storageKey);
  try {
    return await readFile(fullPath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error("FILE_NOT_FOUND");
    }
    throw error;
  }
}
