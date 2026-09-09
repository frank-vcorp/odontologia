import { Suspense } from "react";
import { AgendaManager } from "@/components/agenda-manager";
import { PageHeader } from "@/components/page-header";

export default function AgendaPage() {
  return (
    <>
      <PageHeader
        title="Agenda"
        description="Vista semanal o diaria. Haz clic en un espacio libre para nueva cita, o en una cita existente para operar."
      />
      <Suspense fallback={<p className="text-[var(--muted)]">Cargando agenda…</p>}>
        <AgendaManager />
      </Suspense>
    </>
  );
}
