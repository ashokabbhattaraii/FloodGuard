"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/queries/auth";
import { routes } from "@/app/lib/routes";
import { roleLabel } from "@/app/lib/auth-helpers";
import { ThemeProvider } from "@/app/_components/theme/ThemeProvider";
import ThemeToggle from "@/app/_components/theme/ThemeToggle";
import NotificationBell from "@/app/_components/ui/NotificationBell";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const icon = (d: string) => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
    <path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const navByRole: Record<string, NavItem[]> = {
  resident: [
    { href: routes.dashboard.resident.root, label: "Overview", icon: icon("M3 10l7-6 7 6M5 9v7h10V9") },
    { href: routes.dashboard.resident.alerts, label: "Alerts", icon: icon("M15 7a5 5 0 00-10 0c0 5.5-2 7-2 7h14s-2-1.5-2-7") },
    { href: routes.dashboard.resident.map, label: "Flood Map", icon: icon("M7 3L3 5v12l4-2 6 2 4-2V3l-4 2-6-2zM7 3v12M13 5v12") },
    { href: routes.dashboard.resident.reports, label: "Reports", icon: icon("M5 3h7l3 3v11H5zM12 3v3h3") },
    { href: routes.dashboard.resident.requests, label: "Requests", icon: icon("M12 9v4l3 3M12 3a9 9 0 100 18 9 9 0 000-18z") },
    { href: routes.dashboard.resident.evacuation, label: "Shelters", icon: icon("M10 3l7 6v8H3V9l7-6zM8 17v-5h4v5") },
  ],
  admin: [
    { href: routes.dashboard.admin.root, label: "Overview", icon: icon("M3 10l7-6 7 6M5 9v7h10V9") },
    { href: routes.dashboard.admin.alerts, label: "Alert Manager", icon: icon("M15 7a5 5 0 00-10 0c0 5.5-2 7-2 7h14s-2-1.5-2-7") },
    { href: routes.dashboard.admin.reports, label: "Report Queue", icon: icon("M5 3h7l3 3v11H5zM12 3v3h3") },
    { href: routes.dashboard.admin.requests, label: "SOS Queue", icon: icon("M12 9v4l3 3M12 3a9 9 0 100 18 9 9 0 000-18z") },
    { href: routes.dashboard.admin.evacuation, label: "Shelters", icon: icon("M10 3l7 6v8H3V9l7-6zM8 17v-5h4v5") },
    { href: routes.dashboard.admin.regions, label: "Regions", icon: icon("M10 2a6 6 0 016 6c0 4-6 10-6 10S4 12 4 8a6 6 0 016-6zM10 6a2 2 0 100 4 2 2 0 000-4z") },
    { href: routes.dashboard.admin.users, label: "User Management", icon: icon("M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8z") },
    { href: routes.dashboard.admin.analytics, label: "Analytics", icon: icon("M4 16V8M9 16V4M14 16v-6") },
  ],
  volunteer: [
    { href: routes.dashboard.volunteer.root, label: "My Tasks", icon: icon("M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h0a2 2 0 002-2M9 5a2 2 0 012-2h0a2 2 0 012 2") },
    { href: routes.dashboard.volunteer.requests, label: "Open Requests", icon: icon("M15 7a5 5 0 00-10 0c0 5.5-2 7-2 7h14s-2-1.5-2-7") },
    { href: routes.dashboard.volunteer.helpRequests, label: "Help Requests", icon: icon("M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8z") },
    { href: routes.dashboard.volunteer.shelters, label: "Shelters", icon: icon("M10 3l7 6v8H3V9l7-6zM8 17v-5h4v5") },
    { href: routes.dashboard.volunteer.relief, label: "Relief Log", icon: icon("M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8") },
    { href: routes.dashboard.volunteer.activity, label: "My Activity", icon: icon("M12 8v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0") },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && !localStorage.getItem("floodguard_token")) {
      router.replace("/login");
    }
  }, [router]);

  const role: string = auth.data?.role ?? "resident";
  const items = useMemo(() => navByRole[role] ?? navByRole.resident, [role]);

  function logout() {
    localStorage.removeItem("floodguard_token");
    router.push("/login");
  }

  return (
    <ThemeProvider>
      <div className="min-h-dvh flex bg-app text-app">
        {mobileOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/45 lg:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`${collapsed ? "lg:w-[76px]" : "lg:w-[264px]"} ${
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } fixed lg:sticky top-0 left-0 z-40 w-[292px] shrink-0 h-dvh flex flex-col border-r border-app bg-[var(--chrome-bg)] transition-all duration-300`}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 h-16 border-b border-app">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none" className="shrink-0">
              <rect width="32" height="32" rx="8" fill="#7c7cff"/>
              <path d="M16 6C13 6 10 8 9 11C8 14 9 16 10 17.5C11 19 12.5 20 14 21C15 21.7 15.5 22.5 16 24C16.5 22.5 17 21.7 18 21C19.5 20 21 19 22 17.5C23 16 24 14 23 11C22 8 19 6 16 6Z" fill="white" opacity="0.95"/>
              <path d="M12 18C13 17 14.5 16.5 16 16.5C17.5 16.5 19 17 20 18" stroke="#7c7cff" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="16" cy="13" r="2.5" fill="#7c7cff" opacity="0.8"/>
            </svg>
            <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
                <span className="block text-app font-[700] text-[16px]">FloodGuard</span>
                <span className="block text-[11px] text-app-muted">Response Operations</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
            {items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-[10px] text-[14px] font-medium transition-all duration-200 ${
                    active ? "text-app bg-[var(--accent-soft)]" : "text-app-muted hover:text-app hover:bg-[var(--accent-soft)]"
                  }`}
                  style={active ? { borderLeft: "3px solid var(--accent)" } : { borderLeft: "3px solid transparent" }}
                  title={item.label}>
                  <span className="shrink-0">{item.icon}</span>
                  <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User + logout */}
          <div className="border-t border-app p-3">
            <div className={`flex items-center gap-2.5 px-2 py-2 mb-2 ${collapsed ? "lg:hidden" : ""}`}>
                <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-soft)] border border-app flex items-center justify-center text-[12px] text-accent font-semibold shrink-0">
                  {(auth.data?.name?.[0] ?? "U").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] text-app font-medium truncate">{auth.data?.name ?? "User"}</p>
                  <p className="text-[11px] text-app-muted truncate">{roleLabel(role)}</p>
                </div>
            </div>
            <button onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-[10px] text-[14px] text-app-muted hover:text-[#dc2626] hover:bg-[rgba(220,38,38,0.08)] transition-all"
              title="Logout">
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                <path d="M8 17H4a1 1 0 01-1-1V4a1 1 0 011-1h4M13 14l4-4-4-4M17 10H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className={collapsed ? "lg:hidden" : ""}>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 sm:px-6 border-b border-app glass-nav">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex lg:hidden flex-col gap-[4px] p-3 -ml-2 rounded-[10px] hover:bg-[var(--accent-soft)] transition-colors"
              aria-label="Open navigation"
            >
              {[0, 1, 2].map((i) => <span key={i} className="block w-5 h-[1.5px] bg-current text-app" />)}
            </button>
            <button onClick={() => setCollapsed((v) => !v)}
              className="hidden lg:flex flex-col gap-[4px] p-3 -ml-2 rounded-[10px] hover:bg-[var(--accent-soft)] transition-colors" aria-label="Toggle sidebar">
              {[0, 1, 2].map((i) => <span key={i} className="block w-4 h-[1.5px] bg-current text-app" />)}
            </button>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-[10px] border border-app bg-[var(--glass-bg)]">
                <span className="relative flex w-2 h-2">
                  <span className="animate-ping absolute inset-0 rounded-full bg-[#16a34a] opacity-60" />
                  <span className="relative rounded-full w-2 h-2 bg-[#16a34a]" />
                </span>
                <span className="text-[12px] font-medium text-app-muted">System operational</span>
              </div>
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
            {!mounted || auth.isLoading ? (
              <div className="flex items-center justify-center h-64">
                <span className="text-app-muted text-[14px] animate-pulse">Loading dashboard…</span>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
