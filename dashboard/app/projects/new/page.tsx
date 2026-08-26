"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { buttonPrimary, Card, ErrorNote, Field, inputClass } from "@/components/ui";
import { AppShell } from "@/components/shell";
import { requireApi, type Project } from "@/lib/api";

const PROPERTY_TYPES = [
  { value: "luxury_apartment", label: "Luxury Apartments" },
  { value: "villa", label: "Villas" },
  { value: "premium_residence", label: "Premium Residences" },
  { value: "waterfront", label: "Waterfront Properties" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    property_type: "luxury_apartment",
    city: "",
    locality: "",
    starting_price: "",
    possession_date: "",
    amenities: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const slugify = () => {
    if (form.slug) return form.slug;
    return form.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const project = await requireApi<Project>("/api/v1/projects", {
        method: "POST",
        body: {
          name: form.name.trim(),
          slug: slugify(),
          property_type: form.property_type,
          city: form.city.trim(),
          locality: form.locality.trim(),
          starting_price: form.starting_price ? Number(form.starting_price) : null,
          possession_date: form.possession_date || null,
          amenities: form.amenities
            .split(",")
            .map((item) => item.trim().toLowerCase().replaceAll(" ", "_"))
            .filter(Boolean),
          description: form.description.trim(),
        },
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <h1 className="text-xl font-semibold text-slate-900">New project</h1>
      <p className="mb-6 text-sm text-slate-500">Create a project, then add towers, floors and units.</p>

      <Card className="max-w-2xl p-6">
        <form onSubmit={submit} className="space-y-4">
          {error ? <ErrorNote message={error} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project name">
              <input required value={form.name} onChange={set("name")} placeholder="Aurora Skyline" className={inputClass} />
            </Field>
            <Field label="URL slug" hint="Leave blank to auto-generate">
              <input value={form.slug} onChange={set("slug")} placeholder="aurora-skyline" className={inputClass} />
            </Field>
            <Field label="Property type">
              <select value={form.property_type} onChange={set("property_type")} className={inputClass}>
                {PROPERTY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Starting price (₹)" hint="e.g. 12500000 for ₹1.25 Cr">
              <input type="number" min="0" value={form.starting_price} onChange={set("starting_price")} placeholder="12500000" className={inputClass} />
            </Field>
            <Field label="City">
              <input required value={form.city} onChange={set("city")} placeholder="Chennai" className={inputClass} />
            </Field>
            <Field label="Locality">
              <input value={form.locality} onChange={set("locality")} placeholder="ECR, Sholinganallur" className={inputClass} />
            </Field>
            <Field label="Possession date">
              <input type="date" value={form.possession_date} onChange={set("possession_date")} className={inputClass} />
            </Field>
            <Field label="Status">
              <select disabled value="draft" className={`${inputClass} bg-slate-50 text-slate-400`}>
                <option value="draft">Draft (until you publish)</option>
              </select>
            </Field>
          </div>
          <Field label="Amenities" hint="Comma separated — pool, gym, clubhouse, park, parking…">
            <input value={form.amenities} onChange={set("amenities")} placeholder="pool, gym, clubhouse" className={inputClass} />
          </Field>
          <Field label="Description">
            <textarea rows={3} value={form.description} onChange={set("description")} className={inputClass} />
          </Field>
          <button type="submit" disabled={busy} className={buttonPrimary}>
            {busy ? "Creating…" : "Create project"}
          </button>
        </form>
      </Card>
    </AppShell>
  );
}
