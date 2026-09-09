import Link from "next/link";
import { notFound } from "next/navigation";
import { ConsultationDetail } from "@/components/consultation-detail";
import { PageHeader } from "@/components/page-header";
import { getConsultationById } from "@/server/services/consultations";
import { listPatientExpediente } from "@/server/services/files";

type Params = { params: Promise<{ id: string }> };

export default async function ConsultaDetailPage({ params }: Params) {
  const { id } = await params;
  const consultation = await getConsultationById(id);
  if (!consultation) notFound();

  const files = (await listPatientExpediente(consultation.patientId)).filter(
    (f) => f.consultationId === id,
  );

  return (
    <>
      <PageHeader
        title="Consulta"
        description={consultation.patientName}
        actions={
          <Link href="/consultas" className="btn btn-secondary">
            Volver al listado
          </Link>
        }
      />
      <ConsultationDetail
        consultation={{
          ...consultation,
          occurredAt: consultation.occurredAt.toISOString(),
        }}
        initialFiles={files.map((f) => ({
          ...f,
          createdAt: f.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
