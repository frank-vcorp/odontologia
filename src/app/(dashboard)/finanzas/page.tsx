import { PageHeader } from "@/components/page-header";
import { FinancesManager } from "@/components/finances-manager";

export default function FinanzasPage() {
  return (
    <>
      <PageHeader
        title="Finanzas"
        description="Movimientos del consultorio, reportes y registros manuales."
      />
      <FinancesManager />
    </>
  );
}
