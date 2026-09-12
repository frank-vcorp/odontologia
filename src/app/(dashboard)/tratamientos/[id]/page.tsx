import Link from "next/link";
import { notFound } from "next/navigation";
import { TreatmentDetail } from "@/components/treatment-detail";
import { PageHeader } from "@/components/page-header";
import { listPatientExpediente } from "@/server/services/files";
import { getTreatmentDetail } from "@/server/services/treatments";

type Params = { params: Promise<{ id: string }> };

export default async function TratamientoDetailPage({ params }: Params) {
  const { id } = await params;
  const treatment = await getTreatmentDetail(id);
  if (!treatment) notFound();

  const files = (await listPatientExpediente(treatment.patientId)).filter(
    (f) => f.treatmentId === id,
  );

  return (
    <>
      <PageHeader
        title="Tratamiento"
        description={treatment.patientName}
        actions={
          <Link href={`/pacientes/${treatment.patientId}`} className="btn btn-secondary">
            Ver paciente
          </Link>
        }
      />
      <TreatmentDetail
        initial={{
          ...treatment,
          consultations: treatment.consultations.map((c) => ({
            ...c,
            occurredAt: c.occurredAt,
          })),
          suggestedNextAppointmentDate: treatment.suggestedNextAppointmentDate,
        }}
        initialFiles={files.map((f) => ({
          ...f,
          createdAt: f.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
