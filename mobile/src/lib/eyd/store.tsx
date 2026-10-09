import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createSeedState, MATERIALS, PROFESSIONALS, STAGE_ORDER } from './seed';
import type { ActivityItem, EydDocument, EydState, Expense, MaintenanceEntry, Payment, ProgressUpdate, ProjectStage, Quotation, StageId, WarrantyEntry } from './types';

const STORAGE_KEY = 'eyd.state.v1';
const STATE_VERSION = 1;

type Draft = EydState;
type Recipe = (draft: Draft) => void;

interface EyDContextValue {
  /** Local, persisted project data. Never null once `ready` is true. */
  state: EydState;
  ready: boolean;
  /** Mutate + persist locally. Safe to call from any screen. */
  update: (recipe: Recipe) => void;
  /** Restore demo data (also used when storage is empty/corrupt). */
  reset: () => void;
}

const EyDContext = createContext<EyDContextValue | null>(null);

function clone(value: EydState): EydState {
  return JSON.parse(JSON.stringify(value)) as EydState;
}

export function logActivity(draft: Draft, text: string, kind: ActivityItem['kind']): void {
  const item: ActivityItem = {
    id: `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    text,
    kind,
    createdAt: new Date().toISOString(),
  };
  draft.activity = [item, ...draft.activity].slice(0, 60);
}

/** Mark a single alert as read (dedupes). Call inside `update()`. */
export function markAlertRead(draft: Draft, alertId: string): void {
  if (!draft.readAlertIds.includes(alertId)) {
    draft.readAlertIds = [...draft.readAlertIds, alertId].slice(-200);
  }
}

/** Mark every currently known alert id as read. Call inside `update()`. */
export function markAllAlertsRead(draft: Draft, alertIds: string[]): void {
  const merged = new Set([...draft.readAlertIds, ...alertIds]);
  draft.readAlertIds = [...merged].slice(-200);
}

/**
 * Switch the active project stage. Stages before it become `completed`
 * (progress forced to 100%), it becomes `current`, later stages become
 * `upcoming` (progress preserved — no real data is erased).
 */
export function setCurrentStage(draft: Draft, stageId: StageId): void {
  const idx = STAGE_ORDER.indexOf(stageId);
  if (idx < 0) return;
  const now = new Date().toISOString();
  draft.project.currentStageId = stageId;
  draft.stages = draft.stages.map((s, i) => {
    if (i < idx) {
      return s.status === 'completed' && s.progress === 100
        ? s
        : { ...s, status: 'completed', progress: 100, updatedAt: now };
    }
    if (i === idx) {
      return s.status === 'current' ? s : { ...s, status: 'current', updatedAt: now };
    }
    return s.status === 'upcoming' ? s : { ...s, status: 'upcoming', updatedAt: now };
  });
}

/** Patch one stage's progress/note. Call inside `update()`. */
export function updateStage(
  draft: Draft,
  stageId: StageId,
  patch: { progress?: number; note?: string },
): void {
  const stage: ProjectStage | undefined = draft.stages.find((s) => s.id === stageId);
  if (!stage) return;
  if (patch.progress !== undefined) {
    stage.progress = Math.max(0, Math.min(100, Math.round(patch.progress)));
  }
  if (patch.note !== undefined) stage.note = patch.note;
  stage.updatedAt = new Date().toISOString();
}

/** Insert or replace an expense (matched by id). Call inside `update()`. */
export function saveExpense(draft: Draft, expense: Expense): void {
  const idx = draft.expenses.findIndex((e) => e.id === expense.id);
  if (idx >= 0) {
    draft.expenses[idx] = expense;
  } else {
    draft.expenses = [expense, ...draft.expenses];
  }
}

/** Remove an expense by id. Call inside `update()`. */
export function removeExpense(draft: Draft, expenseId: string): void {
  draft.expenses = draft.expenses.filter((e) => e.id !== expenseId);
}

/** Insert or replace a payment (matched by id). Call inside `update()`. */
export function savePayment(draft: Draft, payment: Payment): void {
  const idx = draft.payments.findIndex((p) => p.id === payment.id);
  if (idx >= 0) {
    draft.payments[idx] = payment;
  } else {
    draft.payments = [payment, ...draft.payments];
  }
}

/** Remove a payment by id. Call inside `update()`. */
export function removePayment(draft: Draft, paymentId: string): void {
  draft.payments = draft.payments.filter((p) => p.id !== paymentId);
}

/** Insert or replace a progress update. Also nudges the stage's progress upward. Call inside `update()`. */
export function upsertProgressUpdate(draft: Draft, update: ProgressUpdate): void {
  const idx = draft.progressUpdates.findIndex((u) => u.id === update.id);
  if (idx >= 0) {
    draft.progressUpdates[idx] = update;
  } else {
    draft.progressUpdates = [update, ...draft.progressUpdates];
  }
  if (update.progress != null) {
    const stage = draft.stages.find((s) => s.id === update.stageId);
    if (stage && update.progress > stage.progress) {
      stage.progress = Math.max(0, Math.min(100, Math.round(update.progress)));
      stage.updatedAt = new Date().toISOString();
    }
  }
}

/** Remove a progress update. Stage progress is left as-is (roadmap editor is the source of truth). */
export function removeProgressUpdate(draft: Draft, updateId: string): void {
  draft.progressUpdates = draft.progressUpdates.filter((u) => u.id !== updateId);
}

/** Add a professional to the project team (idempotent). Call inside `update()`. */
export function addToProjectTeam(draft: Draft, professionalId: string): void {
  if (!draft.projectTeam.includes(professionalId)) {
    draft.projectTeam = [...draft.projectTeam, professionalId];
  }
}

/** Remove a professional from the project team. Call inside `update()`. */
export function removeFromProjectTeam(draft: Draft, professionalId: string): void {
  draft.projectTeam = draft.projectTeam.filter((id) => id !== professionalId);
}

/** Insert or replace a quotation — recomputes item totals + grand total. Call inside `update()`. */
export function saveQuotation(draft: Draft, quotation: Quotation): void {
  const record: Quotation = {
    ...quotation,
    items: quotation.items.map((it) => ({
      ...it,
      total: Math.round((it.qty * it.unitPrice) * 100) / 100,
    })),
    total: quotation.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0),
  };
  const idx = draft.quotations.findIndex((q) => q.id === record.id);
  if (idx >= 0) draft.quotations[idx] = record;
  else draft.quotations = [record, ...draft.quotations];
}

/** Remove a quotation by id. Call inside `update()`. */
export function removeQuotation(draft: Draft, quotationId: string): void {
  draft.quotations = draft.quotations.filter((q) => q.id !== quotationId);
}

/** Set a quotation's accepted/rejected status via confirmation flow. Call inside `update()`. */
export function setQuotationStatus(draft: Draft, quotationId: string, status: Quotation['status']): void {
  const quote = draft.quotations.find((q) => q.id === quotationId);
  if (quote) quote.status = status;
}

/** Add a catalogue material to the project list (idempotent). Call inside `update()`. */
export function addProjectMaterial(draft: Draft, materialId: string): void {
  if (!draft.projectMaterials.includes(materialId)) {
    draft.projectMaterials = [...draft.projectMaterials, materialId];
  }
}

/** Remove a material from the project list. Call inside `update()`. */
export function removeProjectMaterial(draft: Draft, materialId: string): void {
  draft.projectMaterials = draft.projectMaterials.filter((id) => id !== materialId);
}

/** Insert or replace a document record (matched by id). Call inside `update()`. */
export function saveEydDocument(draft: Draft, document: EydDocument): void {
  const idx = draft.documents.findIndex((d) => d.id === document.id);
  if (idx >= 0) draft.documents[idx] = document;
  else draft.documents = [document, ...draft.documents];
}

/** Remove a document record. Call inside `update()`. */
export function removeEydDocument(draft: Draft, documentId: string): void {
  draft.documents = draft.documents.filter((d) => d.id !== documentId);
}

/** Insert or replace a passport maintenance entry. Call inside `update()`. */
export function saveMaintenance(draft: Draft, entry: MaintenanceEntry): void {
  const idx = draft.maintenance.findIndex((m) => m.id === entry.id);
  if (idx >= 0) draft.maintenance[idx] = entry;
  else draft.maintenance = [entry, ...draft.maintenance];
}

/** Remove a maintenance entry. Call inside `update()`. */
export function removeMaintenance(draft: Draft, entryId: string): void {
  draft.maintenance = draft.maintenance.filter((m) => m.id !== entryId);
}

/** Insert or replace a passport warranty entry. Call inside `update()`. */
export function saveWarranty(draft: Draft, entry: WarrantyEntry): void {
  const idx = draft.warranties.findIndex((w) => w.id === entry.id);
  if (idx >= 0) draft.warranties[idx] = entry;
  else draft.warranties = [entry, ...draft.warranties];
}

/** Remove a warranty entry. Call inside `update()`. */
export function removeWarranty(draft: Draft, entryId: string): void {
  draft.warranties = draft.warranties.filter((w) => w.id !== entryId);
}

/** Fill arrays added in later provider versions so old persisted state survives upgrades. */
function migrateState(parsed: Partial<EydState>): EydState {
  return {
    ...(parsed as EydState),
    professionals: parsed.professionals ?? PROFESSIONALS,
    projectTeam: parsed.projectTeam ?? [],
    expenses: parsed.expenses ?? [],
    payments: parsed.payments ?? [],
    progressUpdates: parsed.progressUpdates ?? [],
    quotations: parsed.quotations ?? [],
    materials: parsed.materials ?? MATERIALS,
    projectMaterials: parsed.projectMaterials ?? [],
    documents: parsed.documents ?? [],
    maintenance: parsed.maintenance ?? [],
    warranties: parsed.warranties ?? [],
    activity: parsed.activity ?? [],
    readAlertIds: parsed.readAlertIds ?? [],
    updatedAt: parsed.updatedAt ?? new Date().toISOString(),
  };
}

export function EyDProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EydState>(() => createSeedState());
  const [ready, setReady] = useState(false);
  const writeChain = useRef<Promise<void>>(Promise.resolve());

  const persist = useCallback((next: EydState) => {
    writeChain.current = writeChain.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)))
      .catch(() => {
        /* offline-first: local write failures never block the UI */
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<EydState>;
          if (parsed && parsed.version === STATE_VERSION && parsed.project) {
            setState(migrateState(parsed));
          } else {
            const seeded = createSeedState();
            setState(seeded);
            persist(seeded);
          }
        } else {
          const seeded = createSeedState();
          setState(seeded);
          persist(seeded);
        }
      } catch {
        /* corrupt storage → fall back to seed data, never crash the app */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persist]);

  const update = useCallback(
    (recipe: Recipe) => {
      setState((prev) => {
        const draft = clone(prev);
        recipe(draft);
        draft.updatedAt = new Date().toISOString();
        persist(draft);
        return draft;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    const seeded = createSeedState();
    setState(seeded);
    persist(seeded);
  }, [persist]);

  const value = useMemo(
    () => ({ state, ready, update, reset }),
    [state, ready, update, reset],
  );

  return <EyDContext.Provider value={value}>{children}</EyDContext.Provider>;
}

export function useEyD(): EyDContextValue {
  const ctx = useContext(EyDContext);
  if (!ctx) throw new Error('useEyD must be used inside <EyDProvider>');
  return ctx;
}
