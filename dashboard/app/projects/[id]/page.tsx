"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AnalyticsTab } from "@/components/tabs/analytics-tab";
import { InventoryTab } from "@/components/tabs/inventory-tab";
import { LeadsTab } from "@/components/tabs/leads-tab";
import { MediaTab } from "@/components/tabs/media-tab";
import { ScansTab } from "@/components/tabs/scans-tab";
import { Badge, ErrorNote, Spinner } from "@/components/ui";
import { AppShell } from "@/components/shell";
import { requireApi, type Project, type ProjectStatus } from "@/lib/api";

const TABS = [
  { key: "analytics", label: "Analytics" },
  { key: "leads", label: "Leads & visits" },
  { key: "inventory", label: "Inventory" },
  { key: "media", label: "Media" },
  { key: "scans", label: "Room scans" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STATUSES: ProjectStatus[] = ["draft", "active", "sold_out"];

interface LoadedProject {
  id: number;
  project: Project;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);

  const [loaded, setLoaded] = useState<LoadedProject | null>(null);
  const [failure, setFailure] = useState<{ id: number; message: string } | null>(null);
  const [tab, setTab] = useState<TabKey>("analytics");
  const [savingStatus, setSavingStatus] = useState(false);

  const project = loaded && loaded.id === projectId ? loaded.project : null;
  const error = failure && failure.id === projectId ? failure.message : null;

  const reload = useCallback(() => {
    return requireApi<Project>(`/api/v1/projects/${projectId}`)
      .then((data) => setLoaded({ id: projectId, project: data }))
      .catch((err) =>
        setFailure({ id: projectId, message: err instanceof Error ? err.message : "Failed to load" }),
      );
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const changeStatus = async (status: ProjectStatus) => {
    if (!project) return;
    setSavingStatus(true);
    try {
      const updated = await requireApi<Project>(`/api/v1/projects/${project.id}`, {
        method: "PATCH",
        body: { status },
      });
      setLoaded({ id: project.id, project: updated });
    } catch (err) {
      setFailure({
        id: project.id,
        message: err instanceof Error ? err.message : "Could not update status",
      });
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <AppShell>
      {!project && !error ? <Spinner /> : null}
      {error ? (
        <div className="space-y-4">
          <ErrorNote message={error} />
          <Link href="/" className="text-sm font-medium text-orange-600">
            ← Back to overview
          </Link>
        </div>
      ) : null}

      {project ? (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href="/" className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600">
                ← Portfolio
              </Link>
              <h1 className="mt-1.5 flex items-center gap-3 font-serif text-2xl font-semibold tracking-tight text-slate-900">
                {project.name}
                <Badge label={project.status} kind={project.status} />
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {[project.locality, project.city].filter(Boolean).join(", ")} · {project.property_type.replaceAll("_", " ")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={project.status}
                disabled={savingStatus}
                onChange={(e) => void changeStatus(e.target.value as ProjectStatus)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 focus:outline-none"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-6 flex gap-1 rounded-xl border border-slate-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm">
            {TABS.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 ${
                  tab === item.key
                    ? "bg-orange-600 text-white shadow-sm shadow-orange-500/20"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "analytics" ? <AnalyticsTab projectId={projectId} /> : null}
          {tab === "leads" ? <LeadsTab projectId={projectId} /> : null}
          {tab === "inventory" ? <InventoryTab projectId={project.id} onMutate={reload} /> : null}
          {tab === "media" ? <MediaTab projectId={projectId} /> : null}
          {tab === "scans" ? <ScansTab projectId={projectId} /> : null}
        </>
      ) : null}
    </AppShell>
  );
}
