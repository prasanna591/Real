import { Ionicons } from '@expo/vector-icons';

import type { EyDTone } from '@/constants/eyd';
import type { ActivityItem, AlertKind, DocumentCategory, MaterialAvailability, PaymentStatus, QuotationStatus } from './types';

export type EydIconName = keyof typeof Ionicons.glyphMap;

/** Icon per document category — shared by the documents screen. */
export const DOCUMENT_CATEGORY_META: Record<DocumentCategory, { icon: EydIconName; label: string }> = {
  home_plan: { icon: 'map-outline', label: 'Home Plan' },
  estimate: { icon: 'calculator-outline', label: 'Estimate' },
  boq: { icon: 'list-outline', label: 'BOQ' },
  quotations: { icon: 'documents-outline', label: 'Quotations' },
  agreements: { icon: 'document-attach-outline', label: 'Agreements' },
  bills: { icon: 'receipt-outline', label: 'Bills' },
  approvals: { icon: 'ribbon-outline', label: 'Approvals' },
  other: { icon: 'document-text-outline', label: 'Other' },
};

/** Label + tone per material availability — shared by the materials catalogue. */
export const MATERIAL_AVAILABILITY_META: Record<MaterialAvailability, { label: string; tone: EyDTone }> = {
  in_stock: { label: 'In stock', tone: 'success' },
  limited: { label: 'Limited', tone: 'warning' },
  on_order: { label: 'On order', tone: 'neutral' },
};

/** Label + tone per payment status — shared by payments and any status chip. */
export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: EyDTone }> = {
  paid: { label: 'Paid', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' },
};

/** Label + tone per quotation status — shared by the quotations list and detail. */
export const QUOTATION_STATUS_META: Record<QuotationStatus, { label: string; tone: EyDTone }> = {
  pending: { label: 'Pending', tone: 'warning' },
  received: { label: 'Received', tone: 'blue' },
  compared: { label: 'Compared', tone: 'neutral' },
  accepted: { label: 'Accepted', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

/** Icon + tone + label per alert kind — shared by dashboard and notification center. */
export const ALERT_KIND_META: Record<AlertKind, { icon: EydIconName; tone: EyDTone; label: string }> = {
  budget: { icon: 'wallet-outline', tone: 'warning', label: 'Budget alert' },
  project_update: { icon: 'construct-outline', tone: 'blue', label: 'Project update' },
  action_required: { icon: 'alert-circle-outline', tone: 'danger', label: 'Action required' },
  upcoming: { icon: 'calendar-outline', tone: 'warm', label: 'Upcoming' },
};

/** Icon + tone per activity kind — used by the dashboard feed. */
export const ACTIVITY_KIND_META: Record<ActivityItem['kind'], { icon: EydIconName; tone: EyDTone }> = {
  expense: { icon: 'receipt-outline', tone: 'warning' },
  payment: { icon: 'card-outline', tone: 'success' },
  progress: { icon: 'trending-up-outline', tone: 'blue' },
  stage: { icon: 'flag-outline', tone: 'blue' },
  plan: { icon: 'sparkles-outline', tone: 'warm' },
  team: { icon: 'people-outline', tone: 'blue' },
  quotation: { icon: 'documents-outline', tone: 'blue' },
  material: { icon: 'cube-outline', tone: 'warm' },
  document: { icon: 'document-text-outline', tone: 'blue' },
  maintenance: { icon: 'construct-outline', tone: 'warning' },
};
