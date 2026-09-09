import { PageHeader } from "@/components/page-header";
import { ServicesManager } from "@/components/services-manager";

export default function ServiciosPage() {
  return (
    <>
      <PageHeader
        title="Servicios"
        description="Precio sugerido opcional. Marca si el servicio genera un tratamiento longitudinal."
      />
      <ServicesManager />
    </>
  );
}
