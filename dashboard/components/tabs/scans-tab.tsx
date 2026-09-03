"use client";

import { useCallback, useEffect, useState } from "react";

import { Card, ErrorNote } from "@/components/ui";
import { requireApi, type RoomScan } from "@/lib/api";

function formatDuration(ms: number): string {
  if (!ms) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ScansTab({ projectId }: { projectId: number }) {
  const [scans, setScans] = useState<RoomScan[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    return requireApi<RoomScan[]>(`/api/v1/room-scans?project_id=${projectId}`)
      .then(setScans)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load scans"));
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!scans && !error) {
    return <div className="flex items-center justify-center p-8 text-sm text-slate-400">Loading scans…</div>;
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorNote message={error} /> : null}

      {scans && scans.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-400">
          No room scans synced from the customer app yet.
          <p className="mt-1 text-xs">
            Scans appear here once a customer completes a scan and taps “Sync to builder” on their device.
          </p>
        </Card>
      ) : (
        (scans ?? []).map((scan) => (
          <Card key={scan.id} className="p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">{scan.name || "Room scan"}</p>
                <p className="text-xs text-slate-400">
                  {scan.client_scan_id} · {formatDate(scan.created_at)}
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <p className="text-base font-semibold text-orange-700">{scan.keyframe_count}</p>
                  <p className="text-xs text-slate-400">keyframes</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-orange-700">
                    {Math.round(scan.coverage_percent)}%
                  </p>
                  <p className="text-xs text-slate-400">coverage</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-slate-700">
                    {formatDuration(scan.duration_ms)}
                  </p>
                  <p className="text-xs text-slate-400">duration</p>
                </div>
              </div>
            </div>

            {scan.photo_urls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {scan.photo_urls.map((url, idx) => (
                  <a
                    key={`${scan.id}-${idx}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-md border border-slate-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${scan.name} keyframe ${idx + 1}`}
                      className="aspect-square w-full object-cover transition hover:opacity-90"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No keyframe photos uploaded.</p>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
