import { PageHeader } from "@/components/page-header";
import { SettingsManager } from "@/components/settings-manager";

export default function ConfiguracionPage() {
  return (
    <>
      <PageHeader
        title="Configuración"
        description="Cambio de contraseña y catálogo de métodos de pago."
      />
      <SettingsManager />
    </>
  );
}
