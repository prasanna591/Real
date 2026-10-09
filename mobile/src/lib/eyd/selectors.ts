import { formatINRShort } from './format';
import { BUDGET_CATEGORIES, STAGE_LABELS } from './seed';
import type {
  BudgetCategoryId,
  EydAlert,
  EydRoute,
  EydState,
  ProjectStage,
  StageId,
} from './types';

/* ─── Budget ─── */

export interface CategorySpend {
  id: BudgetCategoryId;
  label: string;
  spent: number;
  sharePct: number;
}

export interface BudgetTotals {
  total: number;
  spent: number;
  remaining: number;
  usedPct: number;
  categories: CategorySpend[];
}

export function budgetTotals(state: EydState): BudgetTotals {
  const total = state.project.budgetTotal;
  const byCategory = new Map<BudgetCategoryId, number>();
  for (const expense of state.expenses) {
    byCategory.set(expense.categoryId, (byCategory.get(expense.categoryId) ?? 0) + expense.amount);
  }
  const spent = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const categories: CategorySpend[] = BUDGET_CATEGORIES.map((c) => {
    const value = byCategory.get(c.id) ?? 0;
    return {
      id: c.id,
      label: c.label,
      spent: value,
      sharePct: spent > 0 ? Math.round((value / spent) * 100) : 0,
    };
  });
  return {
    total,
    spent,
    remaining: total - spent,
    usedPct: total > 0 ? (spent / total) * 100 : 0,
    categories,
  };
}

/* ─── Payments ─── */

export interface PaymentTotals {
  /** All recorded payments (paid + pending + failed). */
  total: number;
  paid: number;
  pending: number;
  failed: number;
  /** Share of the planned budget covered by recorded payments. */
  usedPct: number;
}

export function paymentTotals(state: EydState): PaymentTotals {
  let paid = 0;
  let pending = 0;
  let failed = 0;
  for (const p of state.payments) {
    if (p.status === 'paid') paid += p.amount;
    else if (p.status === 'pending') pending += p.amount;
    else failed += p.amount;
  }
  const total = paid + pending + failed;
  const budget = state.project.budgetTotal;
  return { total, paid, pending, failed, usedPct: budget > 0 ? (total / budget) * 100 : 0 };
}

/* ─── Professional network ─── */

/** Professionals currently in the project team, in the order they were added. */
export function teamMembers(state: EydState) {
  return state.projectTeam
    .map((id) => state.professionals.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
}

/* ─── Progress / roadmap ─── */

export function overallProgress(state: EydState): number {
  if (state.stages.length === 0) return 0;
  const sum = state.stages.reduce((s, stage) => s + stage.progress, 0);
  return Math.round(sum / state.stages.length);
}

export function stageById(state: EydState, id: StageId): ProjectStage | undefined {
  return state.stages.find((s) => s.id === id);
}

export function currentStage(state: EydState): ProjectStage | undefined {
  return (
    stageById(state, state.project.currentStageId) ??
    state.stages.find((s) => s.status === 'current')
  );
}

export interface TimelineStatus {
  label: string;
  tone: 'success' | 'warning' | 'danger';
  detail: string;
  daysRemaining: number;
}

export function timeline(state: EydState): TimelineStatus {
  const start = new Date(state.project.startDate).getTime();
  const target = new Date(state.project.targetEndDate).getTime();
  const now = Date.now();
  const expected = overallProgress(state);

  let expectedPct = 0;
  if (Number.isFinite(start) && Number.isFinite(target) && target > start) {
    expectedPct = ((now - start) / (target - start)) * 100;
  }
  const delta = expected - expectedPct;
  const daysRemaining = Number.isFinite(target) ? Math.ceil((target - now) / 86400000) : 0;

  if (delta < -12) {
    return {
      label: 'Behind schedule',
      tone: 'danger',
      detail: `Plan expects ~${Math.round(expectedPct)}% by today`,
      daysRemaining,
    };
  }
  if (delta < -4) {
    return {
      label: 'Needs attention',
      tone: 'warning',
      detail: `Plan expects ~${Math.round(expectedPct)}% by today`,
      daysRemaining,
    };
  }
  return {
    label: 'On track',
    tone: 'success',
    detail: daysRemaining > 0 ? `${daysRemaining} days to target handover` : 'Target date reached',
    daysRemaining,
  };
}

/* ─── Next action ─── */

export interface NextAction {
  title: string;
  detail: string;
  route: EydRoute;
  cta: string;
}

const STAGE_ACTION: Record<StageId, { title: string; detail: string }> = {
  plan: { title: 'Confirm your home requirements', detail: 'Lock plot, floors and room counts in the planner.' },
  design: { title: 'Review architectural drawings', detail: 'Approve the layout before drawings go for approval.' },
  approval: { title: 'Submit plan approval documents', detail: 'Upload sanction drawings and follow up with the office.' },
  foundation: { title: 'Approve the excavation quote', detail: 'Compare footing quotes before excavation starts.' },
  structure: { title: 'Schedule slab casting', detail: 'Confirm the concrete pour date with your contractor.' },
  roof: { title: 'Choose roofing material', detail: 'Compare waterproofing and roofing options.' },
  electrical: { title: 'Select electrical fixtures', detail: 'Finalise switches, lights and DB layout.' },
  plumbing: { title: 'Choose plumbing fixtures', detail: 'Pick sanitaryware, taps and CP fittings.' },
  interior: { title: 'Choose flooring', detail: 'Compare tile and flooring quotations before ordering.' },
  complete: { title: 'Record the handover checklist', detail: 'Capture warranties and final documents in your passport.' },
};

export function nextAction(state: EydState): NextAction {
  const totals = budgetTotals(state);
  if (!state.profile) {
    return {
      title: 'Generate your home plan',
      detail: 'Answer 4 quick steps to create your home profile.',
      route: '/plan',
      cta: 'Start planner',
    };
  }
  if (totals.total > 0 && totals.usedPct >= 100) {
    return {
      title: 'Rebalance your budget',
      detail: `Spent ${formatINRShort(totals.spent)} of ${formatINRShort(totals.total)}. Review categories before the next payout.`,
      route: '/build/budget',
      cta: 'Open budget',
    };
  }
  if (totals.total > 0 && totals.usedPct >= 92) {
    return {
      title: 'Review upcoming expenses',
      detail: `Only ${formatINRShort(Math.max(0, totals.remaining))} left in the budget.`,
      route: '/build/budget',
      cta: 'Open budget',
    };
  }
  const stage = currentStage(state);
  const action = STAGE_ACTION[stage?.id ?? 'plan'];
  return {
    title: action.title,
    detail: action.detail,
    route: stage?.id === 'plan' ? '/plan' : '/build/progress',
    cta: 'Open',
  };
}

/* ─── Activity ─── */

export function recentActivity(state: EydState, limit = 5) {
  return [...state.activity]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function recentProgressUpdates(state: EydState, limit = 5) {
  return [...state.progressUpdates]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

/* ─── Alerts (locally generated, stable ids) ─── */

export function buildAlerts(state: EydState): EydAlert[] {
  const alerts: EydAlert[] = [];
  const totals = budgetTotals(state);

  if (!state.profile) {
    alerts.push({
      id: 'alert.plan.missing',
      kind: 'action_required',
      title: 'Action required',
      body: 'Your home plan is not generated yet. Complete the planner to unlock budget and roadmap.',
      route: '/plan',
    });
  }

  if (totals.total > 0 && totals.usedPct >= 90) {
    alerts.push({
      id: 'alert.budget.usage',
      kind: 'budget',
      title: 'Budget alert',
      body: `You have used ${Math.round(totals.usedPct)}% of your budget — ${formatINRShort(
        Math.max(0, totals.remaining),
      )} remaining.`,
      route: '/build/budget',
    });
  }

  const top = [...totals.categories].sort((a, b) => b.spent - a.spent)[0];
  if (top && top.spent > 0 && top.sharePct >= 40) {
    alerts.push({
      id: `alert.budget.share.${top.id}`,
      kind: 'budget',
      title: 'Category concentration',
      body: `${top.label} accounts for ${top.sharePct}% of everything you have spent so far.`,
      route: '/build/budget',
    });
  }

  const pendingPayments = state.payments.filter((p) => p.status === 'pending');
  if (pendingPayments.length > 0) {
    const sum = pendingPayments.reduce((s, p) => s + p.amount, 0);
    alerts.push({
      id: 'alert.payment.pending',
      kind: 'action_required',
      title: 'Payment pending',
      body: `${pendingPayments.length} payment${pendingPayments.length > 1 ? 's' : ''} awaiting settlement totalling ${formatINRShort(sum)}.`,
      route: '/build/payments',
    });
  }

  const latest = recentProgressUpdates(state, 1)[0];
  if (latest && Date.now() - new Date(latest.date).getTime() < 10 * 86400000) {
    const stageLabel = STAGE_LABELS[latest.stageId];
    alerts.push({
      id: 'alert.project.update',
      kind: 'project_update',
      title: 'Project update',
      body: `Latest site note on ${stageLabel}: ${latest.note}`,
      route: '/build/progress',
    });
  }

  const status = timeline(state);
  if (status.tone === 'danger') {
    alerts.push({
      id: 'alert.schedule.behind',
      kind: 'upcoming',
      title: 'Schedule risk',
      body: `Your project is behind the planned curve. ${status.detail}.`,
      route: '/build/roadmap',
    });
  }

  const stage = currentStage(state);
  if (stage && stage.id !== 'complete') {
    const nextStage = state.stages.find((s) => s.step === stage.step + 1);
    if (nextStage) {
      alerts.push({
        id: 'alert.upcoming.stage',
        kind: 'upcoming',
        title: 'Upcoming',
        body: `${nextStage.label} stage follows ${stage.label}. Current stage is ${stage.progress}% done.`,
        route: '/build/roadmap',
      });
    }
  }

  return alerts;
}
