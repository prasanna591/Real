"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, Spinner } from "@/components/ui";
import { requireApi, type AnalyticsSummary } from "@/lib/api";

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
    { stage: "Enquiries", count: summary.enquiries },
    { stage: "Visits", count: summary.site_visits },
    { stage: "AI chats", count: summary.assistant_messages },
  ];

  const conversion =
    summary.property_views > 0
      ? ((summary.enquiries / summary.property_views) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Metric label="Property views" value={summary.property_views} />
        <Metric label="Serious explorers" value={summary.serious_explorers} hint="completed 3D walkthrough" />
        <Metric label="Saves" value={summary.saves} />
        <Metric label="Enquiries" value={summary.enquiries} />
        <Metric label="Site visits" value={summary.site_visits} />
        <Metric label="AI assistant chats" value={summary.assistant_messages} hint="assistant_message events" />
      </div>

      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold text-slate-800">Engagement funnel</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="stage" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip cursor={{ fill: "#fff7ed" }} />
              <Bar dataKey="count" fill="#ea580c" radius={[6, 6, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-medium text-slate-800">View → enquiry conversion</p>
          <p className="text-xs text-slate-400">Enquiries as a share of total property views</p>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-orange-700">{conversion}%</p>
      </Card>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-400">{hint}</p> : null}
    </Card>
  );
}
