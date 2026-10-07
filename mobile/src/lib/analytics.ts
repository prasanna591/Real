import AsyncStorage from '@react-native-async-storage/async-storage';

import { http } from './http';

const SESSION_ID_KEY = 'analytics.session_id';

function randomId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getAnalyticsSessionId(): Promise<string> {
  const existing = await AsyncStorage.getItem(SESSION_ID_KEY);
  if (existing) return existing;
  const id = randomId();
  await AsyncStorage.setItem(SESSION_ID_KEY, id);
  return id;
}

export async function trackEvent(payload: {
  eventType: string;
  projectId: number;
  unitId?: number | null;
  refUserId?: number;
}): Promise<void> {
  try {
    const sessionId = await getAnalyticsSessionId();
    await http.post('/api/v1/analytics/events', {
      event_type: payload.eventType,
      project_id: payload.projectId,
      unit_id: payload.unitId ?? null,
      session_id: sessionId,
      ref_user_id: payload.refUserId ?? null,
    });
  } catch {}
}
