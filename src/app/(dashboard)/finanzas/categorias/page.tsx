import { PageHeader } from "@/components/page-header";
import { FinancialCategoriesManager } from "@/components/financial-categories-manager";

export default function CategoriasFinancierasPage() {
  return (
    <>
      <PageHeader
        title="Categorías financieras"
        description="Cada categoría aplica a ingresos o egresos. Sin subcategorías."
      />
      <FinancialCategoriesManager />
    </>
  );
}
