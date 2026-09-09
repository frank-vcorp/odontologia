import { PageHeader } from "@/components/page-header";
import { AgendaManager } from "@/components/agenda-manager";

export default function AgendaPage() {
  return (
    <>
      <PageHeader
        title="Agenda"
        description="Vista semanal o diaria. Haz clic en un espacio libre para nueva cita, o en una cita existente para operar."
      />
      <AgendaManager />
    </>
  );
}
