"use client";

import React, {
  useId,
  useMemo,
  useRef,
  useState,
  useEffect,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import Image from "next/image";
import {
  getPreferredTheme,
  setTheme,
  toggleTheme,
  type Theme,
} from "@/lib/theme";
import { getSupportWhatsAppHref } from "@/lib/support";

// No-op store: subscribe never fires, but the client/server snapshots differ
// on purpose so React flips this to `true` right after hydration, without a
// manual setState() call inside an effect.
const noopSubscribe = () => () => {};
function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  resource?: string;
  roles?: string[];
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    name: "Clientes",
    href: "/dashboard/clients",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    resource: "clients",
  },
  {
    name: "Produtos",
    href: "/dashboard/products",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m0 0L4 7m8 4v10M4 7v10m16 0v-10M4 7l8 4m0 0l8-4"
        />
      </svg>
    ),
    resource: "products",
  },
  {
    name: "Orçamentos",
    href: "/dashboard/quotes",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    resource: "quotes",
  },
  {
    name: "Configurações",
    href: "/dashboard/settings",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    resource: "settings",
  },
];

const idearioNavItem: NavItem = {
  name: "Ideário",
  href: "/dashboard/ideario",
  icon: (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  ),
};

const supportWhatsAppIcon = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mounted = useMounted();
  const [currentDate, setCurrentDate] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [theme, setThemeState] = useState<Theme>("light");
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { canAccess, hasRole } = usePermissions();
  const profileMenuId = useId();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const userInitials = useMemo(() => {
    const name = user?.name?.trim();
    if (!name) return "U";
    const parts = name.split(/\s+/).filter(Boolean);
    return (
      parts
        .slice(0, 2)
        .map((p) => p[0] ?? "")
        .join("")
        .toUpperCase() || "U"
    );
  }, [user?.name]);

  const userRoleLabel = useMemo(() => {
    const role = user?.role;
    if (!role) return "";
    if (role === "admin") return "Administrador";
    if (role === "manager") return "Gerente";
    if (role === "employee") return "Funcionário";
    return role;
  }, [user?.role]);

  // Deterministic date/theme, read only after mount to avoid hydration mismatch.
  useEffect(() => {
    function syncDateAndTheme() {
      // Use deterministic date formatting to prevent hydration mismatch
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      setCurrentDate(`${day}/${month}/${year}`);

      const preferred = getPreferredTheme();
      setThemeState(preferred);
      setTheme(preferred);
    }

    syncDateAndTheme();
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const container = profileMenuRef.current;
      if (!container) return;
      if (e.target instanceof Node && container.contains(e.target)) return;
      setProfileMenuOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileMenuOpen(false);
    };

    const pointerDownOptions: AddEventListenerOptions = { capture: true };
    document.addEventListener("pointerdown", onPointerDown, pointerDownOptions);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, pointerDownOptions);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileMenuOpen]);

  const filteredNavigation = mounted
    ? navigation.filter((item) => {
        if (item.roles && !hasRole(item.roles)) return false;
        if (item.resource && !canAccess(item.resource)) return false;
        return true;
      })
    : []; // Empty array during SSR

  const showIdearioNav =
    mounted &&
    (!idearioNavItem.roles || hasRole(idearioNavItem.roles)) &&
    (!idearioNavItem.resource || canAccess(idearioNavItem.resource));

  const supportWhatsAppHref = getSupportWhatsAppHref();

  const sidebarLinkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? "bg-accent-15 text-accent-muted"
        : "text-text-80 hover:bg-glass-10"
    }`;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="lg:pl-64">
          <header className="sticky top-0 z-30 app-header">
            <div className="flex items-center justify-between h-16 px-4 lg:px-8">
              <div className="w-8 h-8 bg-glass-10 rounded animate-pulse"></div>
            </div>
          </header>
          <main className="p-4 lg:p-8">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-glass-5 border-r border-glass-10 backdrop-blur-xl transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-24 px-6 border-b border-glass-10">
            <Link
              href="/dashboard"
              aria-label="Ir para o dashboard"
              className="flex mt-6 gap-2"
              onClick={() => setSidebarOpen(false)}
            >
              <Image
                src="/logo.svg"
                alt="OnMarmoraria Logo"
                className="w-full h-full flex items-center justify-center"
                width={10}
                height={10}
                priority
              />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-text-80 hover:text-foreground"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <nav className="flex-1 min-h-0 px-4 py-6 overflow-y-auto">
            <div className="space-y-2">
              {filteredNavigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={sidebarLinkClass(isActive)}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon}
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="shrink-0 px-4 pt-2 pb-6 border-t border-glass-10 space-y-2">
            {showIdearioNav ? (
              <Link
                href={idearioNavItem.href}
                className={sidebarLinkClass(
                  pathname === idearioNavItem.href ||
                    pathname.startsWith(idearioNavItem.href + "/")
                )}
                onClick={() => setSidebarOpen(false)}
              >
                {idearioNavItem.icon}
                <span className="font-medium">{idearioNavItem.name}</span>
              </Link>
            ) : null}
            <a
              href={supportWhatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              className={sidebarLinkClass(false)}
              onClick={() => setSidebarOpen(false)}
            >
              {supportWhatsAppIcon}
              <span className="font-medium">Suporte</span>
            </a>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-overlay-40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 app-header">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-text-80 hover:text-foreground"
                aria-label="Abrir menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              <div className="hidden md:flex items-center gap-2 text-sm text-text-60">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span suppressHydrationWarning>{currentDate}</span>
              </div>
            </div>

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-glass-10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                aria-controls={profileMenuId}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-detail flex items-center justify-center text-zinc-950 font-semibold shrink-0">
                  {userInitials}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-tight max-w-[160px]">
                  <span className="text-sm font-medium text-foreground truncate w-full">
                    {user?.name || "Usuário"}
                  </span>
                  <span className="text-xs text-text-60 truncate w-full capitalize">
                    {userRoleLabel || "Usuário"}
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-text-60 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {profileMenuOpen && (
                <div
                  id={profileMenuId}
                  role="menu"
                  className="absolute right-0 mt-2 w-64 rounded-xl border border-glass-10 bg-background shadow-xl overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-glass-10">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user?.name || "Usuário"}
                    </p>
                    <p className="text-xs text-text-60 truncate">
                      {user?.email || ""}
                    </p>
                  </div>

                  <div className="p-2">
                    <Link
                      role="menuitem"
                      href="/dashboard/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-80 hover:bg-glass-10 hover:text-foreground transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 21a9 9 0 100-18 9 9 0 000 18z"
                        />
                      </svg>
                      Ver perfil
                    </Link>

                    <Link
                      role="menuitem"
                      href="/dashboard/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-80 hover:bg-glass-10 hover:text-foreground transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Configurações
                    </Link>

                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        setThemeState((t) => {
                          const next = toggleTheme(t);
                          setTheme(next); // só persiste e aplica ao clicar
                          return next;
                        });
                      }}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm text-text-80 hover:bg-glass-10 hover:text-foreground transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        {theme === "dark" ? (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0-1.414 1.414M7.05 16.95l-1.414 1.414"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8a4 4 0 100 8 4 4 0 000-8z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"
                            />
                          </svg>
                        )}
                        {theme === "dark" ? "Modo claro" : "Modo escuro"}
                      </span>
                    </button>

                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        void logout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
                        />
                      </svg>
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
