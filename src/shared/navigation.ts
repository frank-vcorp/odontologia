export type NavItem = {
  href: string;
  label: string;
};

export type NavGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "operacion",
    title: "Operación",
    items: [
      { href: "/dashboard", label: "Inicio" },
      { href: "/agenda", label: "Agenda" },
      { href: "/consultas", label: "Consultas" },
      { href: "/pacientes", label: "Pacientes" },
    ],
  },
  {
    id: "catalogos",
    title: "Catálogos",
    items: [
      { href: "/servicios", label: "Servicios" },
      { href: "/finanzas/categorias", label: "Categorías financieras" },
    ],
  },
  {
    id: "config",
    title: "Configuración",
    items: [{ href: "/configuracion", label: "Contraseña y métodos de pago" }],
  },
];

export const MOBILE_TABS: NavItem[] = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/agenda", label: "Agenda" },
  { href: "/consultas", label: "Consultas" },
  { href: "/pacientes", label: "Pacientes" },
];
