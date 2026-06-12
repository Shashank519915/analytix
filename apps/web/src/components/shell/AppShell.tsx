"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import LogoutButton from "@/components/LogoutButton";
import { PlatformThemeToggle } from "@/components/PlatformThemeToggle";

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden className="appNavIcon">
      {children}
    </span>
  );
}

export default function AppShell({
  email,
  children,
}: {
  email: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isSites =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/sites");

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="appShell">
      <aside className="appSidebar" data-open={sidebarOpen ? "true" : "false"}>
        <Link className="appBrand" href="/dashboard" onClick={() => setSidebarOpen(false)}>
          <div className="appBrandMark">A</div>
          <span className="appBrandName">Analytix</span>
        </Link>

        <nav className="appNav" aria-label="Main">
          <Link
            className="appNavLink"
            href="/dashboard"
            data-active={isSites ? "true" : "false"}
            onClick={() => setSidebarOpen(false)}
          >
            <NavIcon>
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="6" height="6" rx="1" />
                <rect x="10" y="2" width="6" height="6" rx="1" />
                <rect x="2" y="10" width="6" height="6" rx="1" />
                <rect x="10" y="10" width="6" height="6" rx="1" />
              </svg>
            </NavIcon>
            Sites
          </Link>
          <Link
            className="appNavLink"
            href="/dashboard/account"
            data-active={pathname === "/dashboard/account" ? "true" : "false"}
            onClick={() => setSidebarOpen(false)}
          >
            <NavIcon>
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="6" r="3" />
                <path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              </svg>
            </NavIcon>
            Account
          </Link>
        </nav>

        <div className="appSidebarFooter">
          <strong title={email}>{email}</strong>
          <div className="appSidebarActions">
            <PlatformThemeToggle compact />
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="appShellMain">
        {sidebarOpen ? (
          <button
            type="button"
            className="sidebarBackdrop"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <div className="mobileTopBar">
          <button
            type="button"
            className="btnSecondary sidebarToggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            Menu
          </button>
          <span className="appBrandName">Analytix</span>
          <PlatformThemeToggle compact />
        </div>

        <main className="appMain">
          <div className="appMainInner">{children}</div>
        </main>
      </div>
    </div>
  );
}
