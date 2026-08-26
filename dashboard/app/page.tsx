"use client";

import Link from "next/link";
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

import { Badge, Card, ErrorNote, formatPrice, Spinner, StatCard } from "@/components/ui";
import { AppShell } from "@/components/shell";
import { requireApi, type AnalyticsSummary, type ProjectSummary } from "@/lib/api";

const EMPTY_SUMMARY: AnalyticsSummary = {
  property_views: 0,
  serious_explorers: 0,
  saves: 0,
  enquiries: 0,
  site_visits: 0,
  assistant_messages: 0,
};

export default function OverviewPage() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [summaries, setSummaries] = useState<Record<number, AnalyticsSummary>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    requireApi<ProjectSummary[]>("/api/v1/builder/projects")
      .then(async (list) => {
        if (cancelled) return list;
        setProjects(list);
        const entries = await Promise.all(
          list.map(async (project) => {
            try {
              const summary = await requireApi<AnalyticsSummary>(
                `/api/v1/projects/${project.id}/analytics/summary`,
              );
              return [project.id, summary] as const;
            } catch {
              return [project.id, EMPTY_SUMMARY] as const;
            }
          }),
        );
        if (!cancelled) setSummaries(Object.fromEntries(entries));
        return list;
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = (projects ?? []).reduce(
    (acc, project) => {
      acc.units += project.unit_count;
      acc.available += project.available_units;
      const summary = summaries[project.id];
      if (summary) {
        acc.views += summary.property_views;
        acc.explorers += summary.serious_explorers;
        acc.saves += summary.saves;
        acc.enquiries += summary.enquiries;
        acc.visits += summary.site_visits;
        acc.assistant += summary.assistant_messages;
      }
      return acc;
    },
    { units: 0, available: 0, views: 0, explorers: 0, saves: 0, enquiries: 0, visits: 0, assistant: 0 },
  );

  const funnel = [
    { stage: "Views", count: totals.views },
    { stage: "Tours done", count: totals.explorers },
    { stage: "Saves", count: totals.saves },
    { stage: "Enquiries", count: totals.enquiries },
    { stage: "Visits", count: totals.visits },
  ];

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Portfolio overview</h1>
          <p className="text-sm text-slate-500">Live engagement across all your projects</p>
        </div>
      </div>

      {error ? <ErrorNote message={error} /> : null}
      {!projects && !error ? <Spinner /> : null}

      {projects ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Projects" value={projects.length} hint={`${totals.units} units total`} />
            <StatCard
              label="Available units"
              value={totals.available}
              hint={totals.units ? `${Math.round((totals.available / totals.units) * 100)}% of inventory` : "—"}
            />
            <StatCard label="Enquiries" value={totals.enquiries} hint="lifetime leads" accent="text-orange-700" />
            <StatCard label="Site visits" value={totals.visits} hint="booked" accent="text-orange-700" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <Card className="p-4 lg:col-span-3">
              <p className="mb-3 text-sm font-semibold text-slate-800">Conversion funnel</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="stage" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip cursor={{ fill: "#fff7ed" }} />
                    <Bar dataKey="count" fill="#ea580c" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Serious explorers = customers who completed a full 3D walkthrough · AI assistant conversations:{" "}
                <span className="font-semibold text-slate-600">{totals.assistant}</span>
              </p>
            </Card>

            <Card className="overflow-hidden lg:col-span-2">
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">Projects</p>
                <Link href="/projects/new" className="text-xs font-medium text-orange-600 hover:text-orange-700">
                  + Add
                </Link>
              </div>
              <table className="data w-full">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Status</th>
                    <th className="!text-right">Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="cursor-pointer hover:bg-slate-50">
                      <td>
                        <Link href={`/projects/${project.id}`} className="block">
                          <span className="font-medium text-slate-900 hover:text-orange-700">{project.name}</span>
                          <span className="block text-xs text-slate-400">{project.city}</span>
                        </Link>
                      </td>
                      <td>{project.status ? <Badge label={project.status} kind={project.status} /> : "—"}</td>
                      <td className="!text-right tabular-nums">
                        {project.unit_count ? `${project.available_units}/${project.unit_count}` : "—"}
                      </td>
                    </tr>
                  ))}
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-sm text-slate-400">
                        No projects yet — add your first one.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Property views" value={totals.views} />
            <StatCard label="Serious explorers" value={totals.explorers} hint="completed 3D tours" />
            <StatCard label="Saves" value={totals.saves} />
            <StatCard label="Avg starting price" value={formatPrice(averageStarting(projects))} />
          </div>
        </>
      ) : null}
    </AppShell>
  );
}

function averageStarting(projects: ProjectSummary[]): number | null {
  const prices = projects.map((p) => p.starting_price).filter((p): p is number => p !== null);
  if (!prices.length) return null;
  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
}
