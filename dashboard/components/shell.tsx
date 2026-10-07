"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { LayoutDashboard, Plus, LogOut } from "lucide-react";

import { useAuth, RequireAuth } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/projects/new", label: "New project", icon: Plus },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Shell>{children}</Shell>
    </RequireAuth>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { builder, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="app-shell flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200/80 bg-white/70 backdrop-blur-xl md:flex">    
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-sm font-bold text-white shadow-sm shadow-orange-500/20">
            P
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">PropTech</p>
            <p className="text-[11px] font-medium text-slate-400">Builder Console</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-orange-50/80 text-orange-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-orange-600" />
                )}
                <Icon
                  size={18}
                  strokeWidth={active ? 2.2 : 1.8}
                  className={active ? "text-orange-600" : "text-slate-400 group-hover:text-slate-600"}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <div className="mb-3 rounded-xl bg-slate-50/80 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">Workspace</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
            <p className="mt-1 truncate text-xs font-medium text-slate-600">{builder?.company_name ?? "Builder"}</p>
          </div>
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-semibold text-white shadow-sm shadow-orange-500/20">
              {builder?.company_name?.charAt(0) ?? "B"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{builder?.company_name}</p>
              <p className="truncate text-[11px] text-slate-400">{builder?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 active:scale-[0.98]"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 py-3 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-xs font-bold text-white">
              P
            </div>
            <span className="text-sm font-semibold text-slate-900">PropTech</span>
          </div>
          <button onClick={handleLogout} className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-700">
            Sign out
          </button>
        </header>
        <nav className="flex gap-1 border-b border-slate-200/80 bg-white/80 px-4 py-2 backdrop-blur-xl md:hidden">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                  active ? "bg-orange-50 text-orange-700" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="mx-auto w-full max-w-6xl flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
