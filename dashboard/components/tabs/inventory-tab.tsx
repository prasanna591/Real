"use client";

import { useCallback, useEffect, useState } from "react";

import {
  buttonGhost,
  buttonPrimary,
  Card,
  ErrorNote,
  Field,
  formatPrice,
  inputClass,
} from "@/components/ui";
import { requireApi, type Floor, type Tower, type Unit, type UnitStatus } from "@/lib/api";

const UNIT_CYCLE: Record<UnitStatus, UnitStatus> = {
  available: "booked",
  booked: "sold",
  sold: "available",
};

const UNIT_STYLES: Record<UnitStatus, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  booked: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100",
  sold: "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200 line-through",
};

export function InventoryTab({
  projectId,
  onMutate,
}: {
  projectId: number;
  onMutate: () => void;
}) {
  const [towers, setTowers] = useState<Tower[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTowerName, setNewTowerName] = useState("");

  const reload = useCallback(() => {
    return requireApi<Tower[]>(`/api/v1/projects/${projectId}/towers`)
      .then(setTowers)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load inventory"));
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addTower = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTowerName.trim()) return;
    try {
      await requireApi(`/api/v1/projects/${projectId}/towers`, {
        method: "POST",
        body: { name: newTowerName.trim() },
      });
      setNewTowerName("");
      await reload();
      onMutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add tower");
    }
  };

  if (!towers && !error) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-slate-400">Loading inventory…</div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorNote message={error} /> : null}

      {(towers ?? []).map((tower) => (
        <TowerSection
          key={tower.id}
          projectId={projectId}
          tower={tower}
          onChanged={() => void reload().then(onMutate)}
          onError={(message) => setError(message)}
        />
      ))}

      {towers && towers.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-400">
          No towers yet — add the first tower below.
        </Card>
      ) : null}

      <form onSubmit={addTower} className="flex max-w-md items-end gap-2">
        <Field label="Add tower">
          <input
            value={newTowerName}
            onChange={(e) => setNewTowerName(e.target.value)}
            placeholder="Tower A"
            className={inputClass}
          />
        </Field>
        <button type="submit" className={`${buttonPrimary} mb-[2px] h-[38px]`}>
          Add
        </button>
      </form>
    </div>
  );
}

function SectionActions({
  onRename,
  onDelete,
  busy,
}: {
  onRename?: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <span className="flex items-center gap-1">
      {onRename ? (
        <button
          onClick={onRename}
          disabled={busy}
          className="rounded-md px-2 py-0.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          Rename
        </button>
      ) : null}
      <button
        onClick={onDelete}
        disabled={busy}
        className="rounded-md px-2 py-0.5 text-xs font-medium text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
      >
        Delete
      </button>
    </span>
  );
}

function TowerSection({
  projectId,
  tower,
  onChanged,
  onError,
}: {
  projectId: number;
  tower: Tower;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [floors, setFloors] = useState<Floor[] | null>(null);
  const [floorNumber, setFloorNumber] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(tower.name);
  const [busy, setBusy] = useState(false);

  const loadFloors = useCallback(() => {
    return requireApi<Floor[]>(`/api/v1/projects/${projectId}/towers/${tower.id}/floors`)
      .then(setFloors)
      .catch((err) => onError(err instanceof Error ? err.message : "Failed to load floors"));
  }, [projectId, tower.id, onError]);

  useEffect(() => {
    if (open && !floors) void loadFloors();
  }, [open, floors, loadFloors]);

  const saveName = async () => {
    const name = draftName.trim();
    if (!name || name === tower.name) {
      setRenaming(false);
      return;
    }
    setBusy(true);
    try {
      await requireApi(`/api/v1/projects/${projectId}/towers/${tower.id}`, {
        method: "PATCH",
        body: { name },
      });
      setRenaming(false);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not rename tower");
    } finally {
      setBusy(false);
    }
  };

  const removeTower = async () => {
    if (!window.confirm(`Delete "${tower.name}" and ALL its floors and units? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await requireApi(`/api/v1/projects/${projectId}/towers/${tower.id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not delete tower");
      setBusy(false);
    }
  };

  const addFloor = async (event: React.FormEvent) => {
    event.preventDefault();
    const number = Number(floorNumber);
    if (!Number.isFinite(number)) return;
    try {
      await requireApi(`/api/v1/projects/${projectId}/towers/${tower.id}/floors`, {
        method: "POST",
        body: { number },
      });
      setFloorNumber("");
      await loadFloors();
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not add floor");
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        {renaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveName();
            }}
            className="flex flex-1 items-center gap-2"
          >
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className={`${inputClass} max-w-56 !py-1`}
            />
            <button type="submit" className={buttonGhost}>
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setRenaming(false);
                setDraftName(tower.name);
              }}
              className="text-xs text-slate-400"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <button
              onClick={() => setOpen((prev) => !prev)}
              className="flex flex-1 items-center gap-2 text-left"
            >
              <span className="text-sm font-semibold text-slate-900">{tower.name}</span>
              <span className="text-xs text-slate-400">
                {floors ? `${floors.length} floor${floors.length === 1 ? "" : "s"}` : ""}
              </span>
              <span className="text-xs text-slate-300">{open ? "▾" : "▸"}</span>
            </button>
            <SectionActions onRename={() => setRenaming(true)} onDelete={() => void removeTower()} busy={busy} />
          </>
        )}
      </div>

      {open && !renaming ? (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          {!floors ? (
            <p className="py-2 text-sm text-slate-400">Loading floors…</p>
          ) : (
            <>
              {floors.map((floor) => (
                <FloorSection
                  key={floor.id}
                  projectId={projectId}
                  towerId={tower.id}
                  floor={floor}
                  onChanged={() => {
                    void loadFloors();
                    onChanged();
                  }}
                  onError={onError}
                />
              ))}
              {floors.length === 0 ? (
                <p className="text-sm text-slate-400">No floors yet.</p>
              ) : null}
              <form onSubmit={addFloor} className="flex items-end gap-2">
                <Field label={`Add floor (${floors.length > 0 ? `next ≈ ${floors[floors.length - 1].number + 1}` : "e.g. 0 for ground"})`}>
                  <input
                    type="number"
                    value={floorNumber}
                    onChange={(e) => setFloorNumber(e.target.value)}
                    placeholder="0"
                    className={`${inputClass} w-40`}
                  />
                </Field>
                <button type="submit" className={`${buttonGhost} mb-[2px] h-[38px]`}>
                  Add floor
                </button>
              </form>
            </>
          )}
        </div>
      ) : null}
    </Card>
  );
}

function FloorSection({
  projectId,
  towerId,
  floor,
  onChanged,
  onError,
}: {
  projectId: number;
  towerId: number;
  floor: Floor;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftNumber, setDraftNumber] = useState(String(floor.number));
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ unit_number: "", bhk: "3", area_sqft: "", facing: "east", price: "" });

  const loadUnits = useCallback(() => {
    return requireApi<Unit[]>(`/api/v1/projects/${projectId}/units?floor_id=${floor.id}`)
      .then(setUnits)
      .catch((err) => onError(err instanceof Error ? err.message : "Failed to load units"));
  }, [projectId, floor.id, onError]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  const saveNumber = async () => {
    const number = Number(draftNumber);
    if (!Number.isFinite(number) || number === floor.number) {
      setRenaming(false);
      setDraftNumber(String(floor.number));
      return;
    }
    setBusy(true);
    try {
      await requireApi(`/api/v1/projects/${projectId}/towers/${towerId}/floors/${floor.id}`, {
        method: "PATCH",
        body: { number },
      });
      setRenaming(false);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update floor");
    } finally {
      setBusy(false);
    }
  };

  const removeFloor = async () => {
    if (!window.confirm(`Delete floor ${floor.number} and ALL its units? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await requireApi(`/api/v1/projects/${projectId}/towers/${towerId}/floors/${floor.id}`, {
        method: "DELETE",
      });
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not delete floor");
      setBusy(false);
    }
  };

  const addUnit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await requireApi(`/api/v1/projects/${projectId}/towers/${towerId}/floors/${floor.id}/units`, {
        method: "POST",
        body: {
          unit_number: draft.unit_number.trim(),
          bhk: Number(draft.bhk),
          area_sqft: Number(draft.area_sqft || 0),
          facing: draft.facing.trim(),
          price: draft.price ? Number(draft.price) : undefined,
        },
      });
      setDraft({ unit_number: "", bhk: draft.bhk, area_sqft: "", facing: draft.facing, price: "" });
      setShowForm(false);
      await loadUnits();
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not add unit");
    }
  };

  const cycleUnit = async (unit: Unit) => {
    const next = UNIT_CYCLE[unit.status];
    setUnits((prev) =>
      prev ? prev.map((item) => (item.id === unit.id ? { ...item, status: next } : item)) : prev,
    );
    try {
      await requireApi(`/api/v1/projects/${projectId}/units/${unit.id}`, {
        method: "PATCH",
        body: { status: next },
      });
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update unit");
      await loadUnits();
    }
  };

  const removeUnit = async (unit: Unit) => {
    if (!window.confirm(`Delete unit ${unit.unit_number}?`)) return;
    setBusy(true);
    try {
      await requireApi(`/api/v1/projects/${projectId}/units/${unit.id}`, { method: "DELETE" });
      await loadUnits();
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not delete unit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        {renaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveNumber();
            }}
            className="flex items-center gap-2"
          >
            <input
              autoFocus
              type="number"
              value={draftNumber}
              onChange={(e) => setDraftNumber(e.target.value)}
              className={`${inputClass} w-24 !py-1`}
            />
            <button type="submit" className={buttonGhost}>
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setRenaming(false);
                setDraftNumber(String(floor.number));
              }}
              className="text-xs text-slate-400"
            >
              Cancel
            </button>
          </form>
        ) : (
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Floor {floor.number}
            {units ? (
              <span className="font-normal normal-case text-slate-400">{units.length} units</span>
            ) : null}
          </p>
        )}
        <SectionActions
          onRename={
            renaming
              ? undefined
              : () => {
                  setDraftNumber(String(floor.number));
                  setRenaming(true);
                }
          }
          onDelete={() => void removeFloor()}
          busy={busy}
        />
      </div>

      {units && units.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {units.map((unit) => (
            <div key={unit.id} className="group relative">
              <button
                onClick={() => void cycleUnit(unit)}
                title={`${formatPrice(unit.price)} · ${unit.area_sqft} sqft · ${unit.facing}-facing · click to mark ${UNIT_CYCLE[unit.status]}`}
                className={`rounded-lg border px-3 py-1.5 pr-4 text-left transition ${UNIT_STYLES[unit.status]}`}
              >
                <span className="block text-xs font-semibold">{unit.unit_number}</span>
                <span className="block text-[10px] opacity-80">
                  {unit.bhk} BHK · {unit.status}
                </span>
              </button>
              <button
                onClick={() => void removeUnit(unit)}
                disabled={busy}
                title={`Delete unit ${unit.unit_number}`}
                className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] leading-none text-white shadow hover:bg-rose-700 group-hover:flex"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {units && units.length === 0 ? (
        <p className="text-xs text-slate-400">No units on this floor yet.</p>
      ) : null}

      {showForm ? (
        <form onSubmit={addUnit} className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-5">
          <input required placeholder="Unit no." value={draft.unit_number} onChange={(e) => setDraft({ ...draft, unit_number: e.target.value })} className={`${inputClass} !px-2 !py-1.5`} />
          <select value={draft.bhk} onChange={(e) => setDraft({ ...draft, bhk: e.target.value })} className={`${inputClass} !px-2 !py-1.5`}>
            {[1, 2, 3, 4, 5].map((bhk) => (
              <option key={bhk} value={bhk}>{bhk} BHK</option>
            ))}
          </select>
          <input type="number" placeholder="Sqft" value={draft.area_sqft} onChange={(e) => setDraft({ ...draft, area_sqft: e.target.value })} className={`${inputClass} !px-2 !py-1.5`} />
          <select value={draft.facing} onChange={(e) => setDraft({ ...draft, facing: e.target.value })} className={`${inputClass} !px-2 !py-1.5`}>
            {["east", "west", "north", "south"].map((facing) => (
              <option key={facing} value={facing}>{facing}</option>
            ))}
          </select>
          <input type="number" placeholder="Price ₹" required value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} className={`${inputClass} !px-2 !py-1.5`} />
          <div className="col-span-2 sm:col-span-5">
            <button type="submit" className={buttonPrimary}>
              Save unit
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
