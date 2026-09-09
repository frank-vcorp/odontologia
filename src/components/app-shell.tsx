"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import { MOBILE_TABS, NAV_GROUPS, type NavGroup } from "@/shared/navigation";
import { ROLE_LABELS, type UserRole } from "@/shared/roles";

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`nav-link${active ? " nav-link-active" : ""}`}>
      {label}
    </Link>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const roleLabel = ROLE_LABELS[user.role as UserRole] ?? user.role;

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderNav(groups: NavGroup[]) {
    return groups.map((group) => (
      <div key={group.id} className="nav-group">
        <p className="nav-group-title">{group.title}</p>
        <div className="nav-group-links">
          {group.items.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} />
          ))}
        </div>
      </div>
    ));
  }

  const sidebar = (
    <div className="app-sidebar-inner">
      <div className="app-brand">
        <p className="app-user-name" style={{ marginTop: 0, fontSize: "1rem" }}>
          Clínica Dental
        </p>
        <p className="app-user-name">{user.name}</p>
        <span className="badge badge-role">{roleLabel}</span>
      </div>
      <nav className="app-nav" aria-label="Principal">
        {renderNav(NAV_GROUPS)}
      </nav>
      <div className="app-sidebar-footer">
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <aside className="app-sidebar desktop-only">{sidebar}</aside>

      <div className="app-main-column">
        <header className="app-topbar mobile-only">
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            aria-label="Abrir menú"
            onClick={() => setDrawerOpen(true)}
          >
            ☰
          </button>
          <span className="font-semibold text-sm">Clínica Dental</span>
          <span className="w-9" aria-hidden="true" />
        </header>

        <main className="app-main">{children}</main>

        <nav className="app-tabbar mobile-only" aria-label="Accesos rápidos">
          {MOBILE_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`app-tab${isActive(tab.href) ? " app-tab-active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {drawerOpen && (
        <>
          <button
            type="button"
            className="app-drawer-backdrop mobile-only"
            aria-label="Cerrar menú"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className={`app-drawer mobile-only${drawerOpen ? " app-drawer-open" : ""}`}>
            <div className="app-drawer-header">
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                aria-label="Cerrar menú"
                onClick={() => setDrawerOpen(false)}
              >
                ✕
              </button>
            </div>
            {sidebar}
          </aside>
        </>
      )}
    </div>
  );
}
