import Link from "next/link";
import { notFound } from "next/navigation";
import { BudgetDetail } from "@/components/budget-detail";
import { PageHeader } from "@/components/page-header";
import { getBudgetById } from "@/server/services/budgets";

type Params = { params: Promise<{ id: string }> };

export default async function PresupuestoDetailPage({ params }: Params) {
  const { id } = await params;
  const budget = await getBudgetById(id);
  if (!budget) notFound();

  return (
    <>
      <PageHeader
        title="Presupuesto"
        description={budget.patientName}
        actions={
          <Link href="/presupuestos" className="btn btn-secondary">
            Volver al listado
          </Link>
        }
      />
      <BudgetDetail initial={budget} />
    </>
  );
}
