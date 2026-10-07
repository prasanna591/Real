"use client";

import { useCallback, useEffect, useState } from "react";

import { buttonPrimary, Card, ErrorNote, Field, inputClass } from "@/components/ui";
import { requireApi, uploadMedia, type MediaAsset, type MediaType } from "@/lib/api";

const MEDIA_TYPES: Array<{ value: MediaType; label: string }> = [
  { value: "model_3d", label: "3D model (GLB)" },
  { value: "floor_plan", label: "Floor plan" },
  { value: "photo", label: "Photo" },
  { value: "capture_360", label: "360° capture" },
  { value: "ar_pack", label: "AR pack" },
  { value: "interior_set", label: "Interior set" },
];

const PREVIEWABLE = new Set<MediaType>(["photo", "model_3d", "floor_plan"]);

export function MediaTab({ projectId }: { projectId: number }) {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ media_type: "photo" as MediaType, title: "", url: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const reload = useCallback(() => {
    return requireApi<MediaAsset[]>(`/api/v1/projects/${projectId}/media`)
      .then(setAssets)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load media"));
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const removeAsset = async (asset: MediaAsset) => {
    if (!window.confirm(`Delete "${asset.title}"?`)) return;
    setDeletingId(asset.id);
    try {
      await requireApi(`/api/v1/projects/${projectId}/media/${asset.id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete asset");
    } finally {
      setDeletingId(null);
    }
  };

  const tryUpload = async (type: MediaType, title: string, file: File) => {
    await uploadMedia(projectId, type, file, title.trim() || file.name);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (file) {
        await tryUpload(draft.media_type, draft.title, file);
        setFile(null);
        setDraft({ media_type: draft.media_type, title: "", url: "" });
      } else {
        await requireApi(`/api/v1/projects/${projectId}/media`, {
          method: "POST",
          body: {
            media_type: draft.media_type,
            title: draft.title.trim() || draft.media_type.replaceAll("_", " "),
            url: draft.url.trim(),
          },
        });
        setDraft({ media_type: draft.media_type, title: "", url: "" });
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register asset");
    } finally {
      setBusy(false);
    }
  };

  if (!assets && !error) {
    return <div className="flex items-center justify-center p-8 text-sm text-slate-400">Loading media…</div>;
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorNote message={error} /> : null}

      <Card className="max-w-2xl p-5">
        <p className="mb-1 text-sm font-semibold text-slate-800">Register media asset</p>
        <p className="mb-4 text-xs text-slate-400">
          Point to a hosted URL, or upload a file straight from your device — GLB models power the
          customer app&apos;s 3D walkthrough and AR.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <select
                value={draft.media_type}
                onChange={(e) => setDraft({ ...draft, media_type: e.target.value as MediaType })}
                className={inputClass}
              >
                {MEDIA_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title">
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Tower A exterior"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Hosted URL" hint={file ? "Upload selected — URL is ignored." : undefined}>
            <input
              type="url"
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              placeholder="https://cdn.example.com/tower-a.glb"
              className={inputClass}
            />
          </Field>
          <Field label="Upload file" hint="Optional — use instead of a hosted URL (photos, GLB, floor plans).">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className={inputClass}
            />
          </Field>
          <button type="submit" disabled={busy} className={buttonPrimary}>
            {busy ? "Registering…" : file ? "Upload & register" : "Register asset"}
          </button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <table className="data w-full">
          <thead>
            <tr>
              <th>Preview</th>
              <th>Title</th>
              <th>Type</th>
              <th>URL</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(assets ?? []).map((asset) => (
              <tr key={asset.id}>
                <td>
                  {PREVIEWABLE.has(asset.media_type) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.url} alt={asset.title} className="h-12 w-16 rounded-md object-cover" />
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
                <td className="font-medium text-slate-900">{asset.title}</td>
                <td className="text-xs uppercase tracking-wide text-slate-500">{asset.media_type}</td>
                <td className="max-w-64 truncate">
                  <a href={asset.url} target="_blank" rel="noreferrer" className="text-xs text-orange-600 hover:underline">
                    {asset.url}
                  </a>
                </td>
                <td>
                  <button
                    onClick={() => void removeAsset(asset)}
                    disabled={deletingId !== null}
                    className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                  >
                    {deletingId === asset.id ? "…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
            {assets && assets.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                  No media registered yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
