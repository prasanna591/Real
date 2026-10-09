import type { EyDTextTone } from '@/components/eyd/ui';
import { formatINR, formatINRShort } from './format';
import {
  budgetTotals,
  nextAction,
  overallProgress,
  paymentTotals,
  timeline,
} from './selectors';
import type { EydState } from './types';

/**
 * EYD Intelligence — local, deterministic mock intelligence.
 * Every answer is computed from the current store state, so it changes as the
 * project data changes. The `answer()` signature is `async` and structured so a
 * real AI API can replace this module later without touching the screen.
 */

export interface IntelligenceMetric {
  label: string;
  value: string;
  tone?: EyDTextTone;
}

export interface IntelligenceAnswer {
  question: string;
  headline: string;
  metrics: IntelligenceMetric[];
  recommendation: string;
}

export const SUGGESTED_QUESTIONS = [
  'Are we on budget?',
  'What should I do next?',
  'Why did my cost increase?',
  'Which quotation is better?',
  'Are we behind schedule?',
] as const;

function answerBudget(state: EydState): IntelligenceAnswer {
  const totals = budgetTotals(state);
  const progress = overallProgress(state);
  const payments = paymentTotals(state);
  const top = [...totals.categories].sort((a, b) => b.spent - a.spent)[0];
  const ahead = totals.usedPct - progress;
  const headline =
    totals.usedPct >= 100
      ? `Budget is fully used — ${formatINRShort(totals.spent)} spent of ${formatINRShort(totals.total)}.`
      : `You've spent ${formatINRShort(totals.spent)} of ${formatINRShort(totals.total)} (${Math.round(totals.usedPct)}%).`;
  const recommendation =
    totals.remaining <= 0
      ? 'Pause new commitments and re-balance categories in the Budget screen before the next payout.'
      : ahead > 15
        ? `Spending is running ahead of build progress (${Math.round(ahead)} points). Hold non-critical purchases and review the largest category first.`
        : ahead < -15
          ? 'Spend is trailing your build progress — confirm pending vendor payments and material orders are on track.'
          : 'Spending is tracking your build progress well. Keep logging expenses as they happen.';
  return {
    question: '',
    headline,
    metrics: [
      { label: 'Spent', value: formatINR(totals.spent), tone: 'blue' },
      { label: 'Remaining', value: formatINR(Math.max(0, totals.remaining)), tone: totals.remaining <= 0 ? 'danger' : 'success' },
      { label: 'Budget used', value: `${Math.round(totals.usedPct)}%`, tone: totals.usedPct >= 100 ? 'danger' : totals.usedPct >= 92 ? 'warning' : 'blue' },
      { label: 'Build progress', value: `${progress}%` },
      { label: 'Paid (cash flow)', value: formatINRShort(payments.paid), tone: 'success' },
      ...(top && top.spent > 0 ? [{ label: 'Largest category', value: `${top.label} · ${formatINRShort(top.spent)}`, tone: 'warning' as const }] : []),
    ],
    recommendation,
  };
}

function answerNext(state: EydState): IntelligenceAnswer {
  const action = nextAction(state);
  const stage = state.stages.find((s) => s.id === state.project.currentStageId);
  return {
    question: '',
    headline: action.title,
    metrics: [
      { label: 'Current stage', value: stage?.label ?? 'Plan', tone: 'blue' },
      { label: 'Stage progress', value: `${stage?.progress ?? 0}%` },
      { label: 'Overall', value: `${overallProgress(state)}%` },
      { label: 'Go to', value: action.cta, tone: 'blue' },
    ],
    recommendation: action.detail,
  };
}

function answerCostIncrease(state: EydState): IntelligenceAnswer {
  const totals = budgetTotals(state);
  const sortedCats = [...totals.categories].filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);
  const top2 = sortedCats.slice(0, 2);
  const topShare = top2.reduce((s, c) => s + c.sharePct, 0);
  const recent = [...state.expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  const recentSum = recent.reduce((s, e) => s + e.amount, 0);
  const headline =
    top2.length > 0
      ? `${top2.map((c) => c.label).join(' and ')} drive ${topShare}% of everything spent so far.`
      : 'No expenses recorded yet, so there is nothing driving cost increases.';
  return {
    question: '',
    headline,
    metrics: [
      ...(top2.map((c) => ({ label: c.label, value: formatINR(c.spent), tone: 'warning' as const }))),
      { label: 'Last 5 expenses', value: formatINR(recentSum), tone: 'blue' },
      { label: 'Total spent', value: formatINR(totals.spent) },
    ],
    recommendation:
      top2.length > 0
        ? `Concentrate negotiation where it matters: ask suppliers for a bulk rate on ${top2[0].label.toLowerCase()} and check ${recent[0]?.title ?? 'recent expenses'} for rate drift against your quotation.`
        : 'Record expenses in the Budget screen and this answer becomes specific to your project.',
  };
}

function answerQuotation(state: EydState): IntelligenceAnswer {
  const active = state.quotations.filter((q) => q.status !== 'rejected');
  if (active.length < 2) {
    return {
      question: '',
      headline: active.length === 0 ? 'No quotations recorded yet.' : 'Only one quotation recorded — comparison needs at least two.',
      metrics: [{ label: 'Quotations', value: String(state.quotations.length) }],
      recommendation: 'Record vendor quotations in the Quotations screen, then select 2–3 to compare side by side.',
    };
  }
  const byTotal = [...active].sort((a, b) => a.total - b.total);
  const cheapest = byTotal[0];
  const bestRated = [...active]
    .map((q) => ({ q, pro: state.professionals.find((p) => p.id === q.vendorId) }))
    .filter((x) => x.pro)
    .sort((a, b) => (b.pro?.rating ?? 0) - (a.pro?.rating ?? 0))[0];
  const spread = byTotal[byTotal.length - 1].total - cheapest.total;
  return {
    question: '',
    headline: `${cheapest.vendorName} is cheapest at ${formatINR(cheapest.total)}${spread > 0 ? ` — ${formatINR(spread)} below the highest quote` : ''}.`,
    metrics: byTotal.map((q, i) => ({
      label: `${String.fromCharCode(65 + i)}. ${q.vendorName}`,
      value: formatINR(q.total),
      tone: i === 0 ? 'success' : undefined,
    })),
    recommendation: bestRated
      ? `Price favours ${cheapest.vendorName}; the best-rated vendor here is ${bestRated.pro?.name} (${bestRated.pro?.rating.toFixed(1)}★). If ratings and scope are close, take the cheapest — otherwise pay the premium for the stronger track record.`
      : `If scope and timeline match across quotes, ${cheapest.vendorName} is the value pick. Open each quotation to compare line items before accepting.`,
  };
}

function answerSchedule(state: EydState): IntelligenceAnswer {
  const tl = timeline(state);
  const progress = overallProgress(state);
  const start = new Date(state.project.startDate).getTime();
  const target = new Date(state.project.targetEndDate).getTime();
  const expectedPct = Number.isFinite(start) && Number.isFinite(target) && target > start
    ? Math.min(100, Math.max(0, ((Date.now() - start) / (target - start)) * 100))
    : 0;
  const delta = progress - expectedPct;
  return {
    question: '',
    headline: `${tl.label} — you are at ${progress}% against ~${Math.round(expectedPct)}% expected by today.`,
    metrics: [
      { label: 'Overall progress', value: `${progress}%`, tone: 'blue' },
      { label: 'Expected by today', value: `${Math.round(expectedPct)}%` },
      { label: 'Days to handover', value: String(Math.max(0, tl.daysRemaining)), tone: tl.daysRemaining <= 0 ? 'danger' : undefined },
      { label: 'Current stage', value: state.stages.find((s) => s.id === state.project.currentStageId)?.label ?? '—' },
    ],
    recommendation:
      tl.tone === 'danger'
        ? `You are ~${Math.abs(Math.round(delta))} points behind plan. Re-sequence the next two stages, add crew where critical, and log updates daily so the dashboard reflects reality.`
        : tl.tone === 'warning'
          ? 'You are slightly behind plan. Nudge the current stage to finish and confirm the next vendor is scheduled.'
          : 'You are on track. Keep logging site updates so timeline status stays honest.',
  };
}

function answerOverview(state: EydState): IntelligenceAnswer {
  const totals = budgetTotals(state);
  const tl = timeline(state);
  return {
    question: '',
    headline: 'Here is where your project stands right now.',
    metrics: [
      { label: 'Budget used', value: `${Math.round(totals.usedPct)}%`, tone: totals.usedPct >= 92 ? 'warning' : 'blue' },
      { label: 'Build progress', value: `${overallProgress(state)}%` },
      { label: 'Schedule', value: tl.label, tone: tl.tone },
      { label: 'Pending payments', value: formatINR(paymentTotals(state).pending), tone: 'warning' },
    ],
    recommendation: 'Ask about budget, schedule, quotations, costs or what to do next — answers are computed from this device’s data.',
  };
}

function match(question: string, state: EydState): IntelligenceAnswer {
  const q = question.toLowerCase();
  if (q.includes('budget') || q.includes('on budget') || q.includes('spend')) return answerBudget(state);
  if (q.includes('next') || q.includes('should i do') || q.includes('do now')) return answerNext(state);
  if (q.includes('cost increase') || q.includes('cost') || q.includes('expensive') || q.includes('increase')) return answerCostIncrease(state);
  if (q.includes('quotation') || q.includes('quote') || q.includes('better')) return answerQuotation(state);
  if (q.includes('schedule') || q.includes('behind') || q.includes('late') || q.includes('time')) return answerSchedule(state);
  return answerOverview(state);
}

/** Async + structured — swap the body for a real AI call later. */
export async function answer(question: string, state: EydState): Promise<IntelligenceAnswer> {
  const result = match(question, state);
  return { ...result, question };
}