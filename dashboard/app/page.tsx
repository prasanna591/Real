"use client";

import Link from "next/link";
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
  shares: 0,
};

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

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
        acc.shares += summary.shares;
      }
      return acc;
    },
    { units: 0, available: 0, views: 0, explorers: 0, saves: 0, enquiries: 0, visits: 0, assistant: 0, shares: 0 },
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
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="page-eyebrow mb-2 text-orange-600">Builder console</p>
            <h1 className="inline-flex items-center gap-2 font-serif text-2xl font-semibold tracking-tight text-slate-900">
              Portfolio overview
              {projects && projects.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {projects.length}
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-slate-500">Live engagement across all your projects</p>
          </div>
        </div>

        {error ? <ErrorNote message={error} /> : null}
        {!projects && !error ? <Spinner /> : null}

        {projects ? (
          <motion.div variants={stagger} initial="hidden" animate="show">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <motion.div variants={fadeUp}>
                <StatCard
                  label="Projects"
                  value={projects.length}
                  hint={`${totals.units} units total`}
                  statKey="projects"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <StatCard
                  label="Available units"
                  value={totals.available}
                  hint={totals.units ? `${Math.round((totals.available / totals.units) * 100)}% of inventory` : "\u2014"}
                  statKey="units"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <StatCard
                  label="Enquiries"
                  value={totals.enquiries}
                  hint="lifetime leads"
                  accent="text-orange-700"
                  statKey="enquiries"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <StatCard
                  label="Site visits"
                  value={totals.visits}
                  hint="booked"
                  accent="text-orange-700"
                  statKey="visits"
                />
              </motion.div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-5">
              <motion.div variants={fadeUp} className="lg:col-span-3">
                <Card className="p-6">
                  <p className="text-sm font-semibold text-slate-800">Conversion funnel</p>
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnel} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
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
                          fill="url(#barGradient)"
                          radius={[8, 8, 0, 0]}
                          maxBarSize={48}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    Serious explorers = customers who completed a full 3D walkthrough. AI assistant conversations:{" "}
                    <span className="font-semibold text-slate-600">{totals.assistant}</span>
                  </p>
                </Card>
              </motion.div>

              <motion.div variants={fadeUp} className="lg:col-span-2">
                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <p className="text-sm font-semibold text-slate-800">Projects</p>
                    <Link
                      href="/projects/new"
                      className="text-xs font-semibold text-orange-600 transition-colors hover:text-orange-700"
                    >
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
                        <tr
                          key={project.id}
                          className="cursor-pointer transition-colors duration-150 hover:bg-slate-50/80"
                        >
                          <td>
                            <Link href={`/projects/${project.id}`} className="block">
                              <span className="font-medium text-slate-900 transition-colors hover:text-orange-700">
                                {project.name}
                              </span>
                              <span className="block text-xs text-slate-400">{project.city}</span>
                            </Link>
                          </td>
                          <td>{project.status ? <Badge label={project.status} kind={project.status} /> : "\u2014"}</td>
                          <td className="!text-right tabular-nums">
                            {project.unit_count ? `${project.available_units}/${project.unit_count}` : "\u2014"}
                          </td>
                        </tr>
                      ))}
                      {projects.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-12 text-center text-sm text-slate-400">
                            No projects yet — add your first one.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </Card>
              </motion.div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
              <motion.div variants={fadeUp}>
                <StatCard label="Property views" value={totals.views} statKey="views" />
              </motion.div>
              <motion.div variants={fadeUp}>
                <StatCard
                  label="Serious explorers"
                  value={totals.explorers}
                  hint="completed 3D tours"
                  statKey="explorers"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <StatCard label="Saves" value={totals.saves} statKey="saves" />
              </motion.div>
              <motion.div variants={fadeUp}>
                <StatCard label="Shares" value={totals.shares} statKey="shares" />
              </motion.div>
              <motion.div variants={fadeUp}>
                <StatCard label="Avg starting price" value={formatPrice(averageStarting(projects))} statKey="price" />
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </motion.div>
    </AppShell>
  );
}

function averageStarting(projects: ProjectSummary[]): number | null {
  const prices = projects
    .map((project) => (project.starting_price === null ? NaN : Number(project.starting_price)))
    .filter((price) => !Number.isNaN(price));
  if (!prices.length) return null;
  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
}
