import { API_BASE_URL, API_TIMEOUT_MS } from '@/lib/config';
import { getAuthToken, http } from '@/lib/http';
import type { RoomScan } from '@/types/api';
import type { ScanSession } from '@/lib/scan-storage';

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export async function listRoomScans(projectId?: number): Promise<RoomScan[]> {
  return http.get<RoomScan[]>('/api/v1/room-scans', {
    project_id: projectId,
  });
}

export async function uploadRoomScan(session: ScanSession): Promise<RoomScan> {
  const form = new FormData();
  form.append('project_id', String(session.projectId));
  form.append('client_scan_id', session.id);
  form.append('name', session.name);
  form.append('coverage_percent', String(Math.round(session.coveragePercent)));
  form.append('duration_ms', String(session.durationMs));

  for (const keyframe of session.keyframes) {
    if (keyframe.imagePath) {
      form.append('photos', {
        uri: keyframe.imagePath,
        name: `${keyframe.frameId}.jpg`,
        type: 'image/jpeg',
      } as unknown as Blob);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS * 4);

  const token = getAuthToken();

  let response: Response;
  try {
    response = await fetch(buildUrl('/api/v1/room-scans'), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Upload timed out. Check your connection.');
    }
    throw new Error('Network error. Is the server running?');
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      typeof data?.detail === 'string'
        ? data.detail
        : `Upload failed (${response.status})`;
    throw new Error(detail);
  }
  return data as RoomScan;
}
