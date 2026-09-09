import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Inicio"
        description="Base operativa del consultorio. La agenda y saldos se completan en fases posteriores."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/pacientes" className="card hover:border-[var(--accent-brand)] transition-colors">
          <h2 className="text-base font-semibold m-0">Pacientes</h2>
          <p className="text-sm text-[var(--muted)] mt-2">Registrar y consultar pacientes.</p>
        </Link>
        <Link href="/servicios" className="card hover:border-[var(--accent-brand)] transition-colors">
          <h2 className="text-base font-semibold m-0">Servicios</h2>
          <p className="text-sm text-[var(--muted)] mt-2">Catálogo clínico y comercial.</p>
        </Link>
        <Link href="/finanzas/categorias" className="card hover:border-[var(--accent-brand)] transition-colors">
          <h2 className="text-base font-semibold m-0">Categorías financieras</h2>
          <p className="text-sm text-[var(--muted)] mt-2">Ingresos y egresos para Finanzas.</p>
        </Link>
        <Link href="/configuracion" className="card hover:border-[var(--accent-brand)] transition-colors">
          <h2 className="text-base font-semibold m-0">Configuración</h2>
          <p className="text-sm text-[var(--muted)] mt-2">Contraseña y métodos de pago.</p>
        </Link>
      </div>
    </>
  );
}
