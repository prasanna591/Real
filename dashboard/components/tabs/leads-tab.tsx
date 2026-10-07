"use client";

import { useCallback, useEffect, useState } from "react";

import { Card, ErrorNote, Spinner } from "@/components/ui";
import { requireApi, type EnquiryStatus, type Pipeline, type VisitStatus } from "@/lib/api";

const STATUSES: EnquiryStatus[] = ["new", "contacted", "qualified", "site_visit", "booked", "closed"];

const VISIT_STATUSES: VisitStatus[] = ["scheduled", "completed", "cancelled"];

export function LeadsTab({ projectId }: { projectId: number }) {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    return requireApi<Pipeline>(`/api/v1/builder/projects/${projectId}/pipeline`)
      .then(setPipeline)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load pipeline"));
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateStatus = async (enquiryId: number, status: EnquiryStatus) => {
    try {
      await requireApi(`/api/v1/enquiries/${enquiryId}`, { method: "PATCH", body: { status } });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    }
  };

  const updateVisitStatus = async (visitId: number, status: VisitStatus) => {
    try {
      await requireApi(`/api/v1/site-visits/${visitId}`, { method: "PATCH", body: { status } });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update visit");
    }
  };

  if (!pipeline && !error) return <Spinner />;

  return (
    <div className="space-y-6">
      {error ? <ErrorNote message={error} /> : null}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/40 px-4 py-3">
          <div>
            <p className="page-eyebrow mb-1 text-slate-400">Pipeline</p>
            <p className="text-sm font-semibold text-slate-800">Enquiries</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {pipeline?.enquiries.length ?? 0}
          </span>
        </div>
        <table className="data w-full">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>Message</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(pipeline?.enquiries ?? []).map((enquiry) => (
              <tr key={enquiry.id}>
                <td className="font-medium text-slate-900">{enquiry.name}</td>
                <td>
                  <span className="block">{enquiry.phone}</span>
                  {enquiry.message ? (
                    <span className="block max-w-56 truncate text-xs text-slate-400">{enquiry.message}</span>
                  ) : null}
                </td>
                <td className="text-xs text-slate-400">{new Date(enquiry.created_at).toLocaleDateString()}</td>
                <td>
                  <select
                    value={enquiry.status}
                    onChange={(e) => void updateStatus(enquiry.id, e.target.value as EnquiryStatus)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {pipeline && pipeline.enquiries.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-slate-400">
                  No enquiries yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/40 px-4 py-3">
          <div>
            <p className="page-eyebrow mb-1 text-slate-400">Schedule</p>
            <p className="text-sm font-semibold text-slate-800">Site visits</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {pipeline?.site_visits.length ?? 0}
          </span>
        </div>
        <table className="data w-full">
          <thead>
            <tr>
              <th>Visitor</th>
              <th>Phone</th>
              <th>Scheduled</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(pipeline?.site_visits ?? []).map((visit) => (
              <tr key={visit.id}>
                <td className="font-medium text-slate-900">{visit.name}</td>
                <td>{visit.phone}</td>
                <td>{new Date(visit.scheduled_at).toLocaleString()}</td>
                <td>
                  <select
                    value={visit.status ?? "scheduled"}
                    onChange={(e) => void updateVisitStatus(visit.id, e.target.value as VisitStatus)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                  >
                    {VISIT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {pipeline && pipeline.site_visits.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-slate-400">
                  No site visits booked yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
