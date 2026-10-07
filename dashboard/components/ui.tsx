"use client";

import React from "react";
import {
  FolderOpen,
  Building2,
  MessageSquare,
  MapPin,
  TrendingUp,
  TrendingDown,
  Eye,
  Compass,
  Heart,
  Bot,
  Share2,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/* ─── Card ─── */

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-premium transition-all duration-200 ${
        hover ? "hover:shadow-premium-lg hover:-translate-y-0.5 cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ─── StatCard ─── */

const STAT_CONFIG: Record<
  string,
  { icon: LucideIcon; accent: string; color: string; bg: string }
> = {
  projects: { icon: FolderOpen, accent: "text-slate-900", color: "#0f172a", bg: "bg-slate-100" },
  units: { icon: Building2, accent: "text-slate-900", color: "#10b981", bg: "bg-emerald-50" },
  enquiries: { icon: MessageSquare, accent: "text-orange-700", color: "#f97316", bg: "bg-orange-50" },
  visits: { icon: MapPin, accent: "text-orange-700", color: "#3b82f6", bg: "bg-blue-50" },
  views: { icon: Eye, accent: "text-slate-900", color: "#8b5cf6", bg: "bg-violet-50" },
  explorers: { icon: Compass, accent: "text-slate-900", color: "#06b6d4", bg: "bg-cyan-50" },
  saves: { icon: Heart, accent: "text-slate-900", color: "#f43f5e", bg: "bg-rose-50" },
  assistant: { icon: Bot, accent: "text-slate-900", color: "#6366f1", bg: "bg-indigo-50" },
  shares: { icon: Share2, accent: "text-slate-900", color: "#0ea5e9", bg: "bg-sky-50" },
  price: { icon: Wallet, accent: "text-slate-900", color: "#d97706", bg: "bg-amber-50" },
};

export function StatCard({
  label,
  value,
  hint,
  trend,
  accent = "text-slate-900",
  statKey,
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: { value: number; direction: "up" | "down" };
  accent?: string;
  statKey?: string;
}) {
  const config = statKey ? STAT_CONFIG[statKey] : null;
  const Icon = config?.icon;

  return (
    <Card className="relative overflow-hidden p-5">
      {config && (
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{
            background: `linear-gradient(90deg, ${config.color} 0%, transparent 100%)`,
          }}
        />
      )}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className={`mt-2 font-serif text-3xl font-semibold tabular-nums tracking-tight ${accent}`}>
            {value}
          </p>
        </div>
        {Icon && config && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bg}`}>
            <Icon size={18} className={config.accent} strokeWidth={2} />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
              trend.direction === "up" ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {trend.direction === "up" ? (
              <TrendingUp size={12} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={12} strokeWidth={2.5} />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </Card>
  );
}

/* ─── Badge ─── */

const BADGE_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  draft: "bg-amber-50 text-amber-700 ring-amber-200",
  sold_out: "bg-rose-50 text-rose-700 ring-rose-200",
  available: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  booked: "bg-blue-50 text-blue-700 ring-blue-200",
  sold: "bg-slate-100 text-slate-600 ring-slate-200",
  new: "bg-orange-50 text-orange-700 ring-orange-200",
  contacted: "bg-blue-50 text-blue-700 ring-blue-200",
  qualified: "bg-violet-50 text-violet-700 ring-violet-200",
  site_visit: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  closed: "bg-slate-100 text-slate-500 ring-slate-200",
};

export function Badge({ label, kind }: { label: string; kind?: string }) {
  const style = BADGE_STYLES[kind ?? ""] ?? "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${style}`}
    >
      {label.replaceAll("_", " ")}
    </span>
  );
}

/* ─── Spinner ─── */

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center p-8 text-sm text-slate-400 ${className}`}>
      <svg className="h-5 w-5 animate-spin text-orange-400" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
        <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="ml-2">Loading...</span>
    </div>
  );
}

/* ─── ErrorNote ─── */

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 backdrop-blur-sm">
      {message}
    </div>
  );
}

/* ─── Field ─── */

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

/* ─── Shared Classes ─── */

export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all duration-150 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 focus:shadow-sm";

export const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-all duration-150 hover:from-orange-600 hover:to-orange-700 hover:shadow-md hover:shadow-orange-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

export const buttonGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-all duration-150 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 active:scale-[0.98] disabled:opacity-60";

/* ─── Helpers ─── */

export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "\u2014";
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  if (amount >= 10_000_000) return `\u20B9${(amount / 10_000_000).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (amount >= 100_000) return `\u20B9${(amount / 100_000).toFixed(2).replace(/\.?0+$/, "")} L`;
  return `\u20B9${amount.toLocaleString("en-IN")}`;
}
