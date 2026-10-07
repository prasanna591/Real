"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, Spinner } from "@/components/ui";
import { requireApi, type AnalyticsSummary } from "@/lib/api";

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-premium-lg">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 font-serif text-xl font-semibold text-orange-600 tabular-nums">
        {payload[0].value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

export function AnalyticsTab({ projectId }: { projectId: number }) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    requireApi<AnalyticsSummary>(`/api/v1/projects/${projectId}/analytics/summary`)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load analytics");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!summary) return <Spinner />;

  const data = [
    { stage: "Views", count: summary.property_views },
    { stage: "Tours done", count: summary.serious_explorers },
    { stage: "Saves", count: summary.saves },
    { stage: "Shares", count: summary.shares },
    { stage: "Enquiries", count: summary.enquiries },
    { stage: "Visits", count: summary.site_visits },
  ];

  const conversion =
    summary.property_views > 0
      ? ((summary.enquiries / summary.property_views) * 100).toFixed(1)
      : "0.0";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Property views" value={summary.property_views} />
        <Metric label="Serious explorers" value={summary.serious_explorers} hint="completed 3D walkthrough" />
        <Metric label="Saves" value={summary.saves} />
        <Metric label="Enquiries" value={summary.enquiries} />
        <Metric label="Site visits" value={summary.site_visits} />
        <Metric label="AI assistant chats" value={summary.assistant_messages} hint="conversations started" />
        <Metric label="Shares" value={summary.shares} hint="shared via the app" />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="page-eyebrow mb-1 text-slate-400">Engagement</p>
            <p className="text-sm font-semibold text-slate-800">Conversion funnel</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 ring-1 ring-inset ring-orange-200">
            {summary.property_views.toLocaleString("en-IN")} total views
          </span>
        </div>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradientAnalytics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FB923C" stopOpacity={1} />
                  <stop offset="100%" stopColor="#EA580C" stopOpacity={1} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="stage"
                tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#cbd5e1" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,247,237,0.5)" }} />
              <Bar
                dataKey="count"
                fill="url(#barGradientAnalytics)"
                radius={[8, 8, 0, 0]}
                maxBarSize={56}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-slate-800">View → enquiry conversion</p>
          <p className="mt-0.5 text-xs text-slate-400">Enquiries as a share of total property views</p>
        </div>
        <p className="font-serif text-3xl font-semibold tabular-nums text-orange-700">{conversion}%</p>
      </Card>
    </motion.div>
  );
}

function Metric({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className="p-5 hover:shadow-premium-lg hover:-translate-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 font-serif text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{value.toLocaleString("en-IN")}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </Card>
  );
}
