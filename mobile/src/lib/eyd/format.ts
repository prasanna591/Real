/** Indian currency + date helpers used across EYD screens. */

export function formatINR(value: number): string {
  if (!Number.isFinite(value)) return '₹0';
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

/** ₹20,00,000 → ₹20 L · ₹1,20,00,000 → ₹1.2 Cr */
export function formatINRShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10000000) return `₹${trim(value / 10000000)} Cr`;
  if (abs >= 100000) return `₹${trim(value / 100000)} L`;
  if (abs >= 1000) return `₹${trim(value / 1000)} K`;
  return `₹${Math.round(value)}`;
}

function trim(value: number): string {
  const fixed = value.toFixed(value >= 10 ? 1 : 2);
  const trimmed = fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  return trimmed;
}

export function formatPercent(value: number): string {
  const clamped = Math.max(0, Math.min(100, value));
  return `${Math.round(clamped)}%`;
}

export function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatDayMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDayMonth(iso);
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Human-readable file size — `null` renders as an em dash. */
export function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
