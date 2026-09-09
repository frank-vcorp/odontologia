import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientDetail } from "@/components/patient-detail";
import { PageHeader } from "@/components/page-header";
import { getPatientById } from "@/server/services/patients";

type Params = { params: Promise<{ id: string }> };

export default async function PacienteDetailPage({ params }: Params) {
  const { id } = await params;
  const patient = await getPatientById(id);
  if (!patient) notFound();

  return (
    <>
      <PageHeader
        title={patient.fullName}
        description={patient.phone}
        actions={
          <Link href="/pacientes" className="btn btn-secondary">
            Volver al listado
          </Link>
        }
      />
      <PatientDetail initial={patient} />
    </>
  );
}
