import { PageHeader } from "@/components/page-header";
import { PatientsManager } from "@/components/patients-manager";

export default function PacientesPage() {
  return (
    <>
      <PageHeader
        title="Pacientes"
        description="Alta rápida con nombre y teléfono. Los pacientes no se eliminan ni inactivan."
      />
      <PatientsManager />
    </>
  );
}
