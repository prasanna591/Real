import type { PropertyType } from '@/types/api';

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  luxury_apartment: 'Luxury Apartment',
  villa: 'Villa',
  premium_residence: 'Premium Residence',
  waterfront: 'Waterfront',
};

export function formatPrice(value: string | number | null): string {
  if (value === null || value === '') return 'Price on request';
  const amount = Number(value);
  if (Number.isNaN(amount)) return 'Price on request';
  if (amount >= 10000000) {
    const crore = amount / 10000000;
    return `₹${trimZero(crore)} Cr`;
  }
  if (amount >= 100000) {
    const lakh = amount / 100000;
    return `₹${trimZero(lakh)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

function trimZero(value: number): string {
  const fixed = value.toFixed(2);
  return fixed.endsWith('.00') ? String(Math.round(value)) : fixed;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function formatCount(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return '0';
  if (n >= 1000000) return `${trimZero(n / 1000000)}M`;
  if (n >= 1000) return `${trimZero(n / 1000)}k`;
  return String(n);
}
