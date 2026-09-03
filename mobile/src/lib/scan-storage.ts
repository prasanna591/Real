import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import type { Keyframe } from './keyframe-selector';

const SCAN_STORAGE_KEY = 'room_scans';

export interface ScanSession {
  id: string;
  projectId: number;
  name: string;
  thumbnailPath: string | null;
  keyframeCount: number;
  coveragePercent: number;
  durationMs: number;
  createdAt: string;
  keyframes: Keyframe[];
  synced?: boolean;
}

function getScanDir(scanId: string): Directory {
  return new Directory(Paths.document, 'scans', scanId);
}

export async function saveScanSession(session: ScanSession): Promise<void> {
  const dir = getScanDir(session.id);
  if (!dir.exists) {
    dir.create();
  }

  const keyframesFile = new File(dir, 'keyframes.json');
  keyframesFile.write(JSON.stringify(session.keyframes, null, 2));

  const existing = await listScanSessions();
  const updated = [session, ...existing.filter(s => s.id !== session.id)];
  await AsyncStorage.setItem(SCAN_STORAGE_KEY, JSON.stringify(updated));
}

export async function loadScanSession(scanId: string): Promise<ScanSession | null> {
  const sessions = await listScanSessions();
  const session = sessions.find(s => s.id === scanId);
  if (!session) return null;

  const dir = getScanDir(scanId);
  const keyframesFile = new File(dir, 'keyframes.json');

  if (keyframesFile.exists) {
    const raw = await keyframesFile.text();
    session.keyframes = JSON.parse(raw) as Keyframe[];
  }

  return session;
}

export async function listScanSessions(): Promise<ScanSession[]> {
  try {
    const raw = await AsyncStorage.getItem(SCAN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ScanSession[]) : [];
  } catch {
    return [];
  }
}

export async function deleteScanSession(scanId: string): Promise<void> {
  const dir = getScanDir(scanId);
  if (dir.exists) {
    dir.delete();
  }

  const existing = await listScanSessions();
  const updated = existing.filter(s => s.id !== scanId);
  await AsyncStorage.setItem(SCAN_STORAGE_KEY, JSON.stringify(updated));
}

export async function markScanSynced(scanId: string, synced: boolean = true): Promise<void> {
  const sessions = await listScanSessions();
  const idx = sessions.findIndex(s => s.id === scanId);
  if (idx === -1) return;
  sessions[idx] = { ...sessions[idx], synced };
  await AsyncStorage.setItem(SCAN_STORAGE_KEY, JSON.stringify(sessions));
}

export async function saveKeyframeImage(
  scanId: string,
  frameId: string,
  sourceUri: string,
): Promise<string> {
  const dir = getScanDir(scanId);
  if (!dir.exists) {
    dir.create();
  }

  const destFile = new File(dir, `${frameId}.jpg`);
  // Copy the captured photo file into the scan folder so it persists with the session.
  const sourceFile = new File(sourceUri);
  await sourceFile.copy(destFile);
  return destFile.uri;
}

export function generateScanId(): string {
  const now = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `scan_${now}_${random}`;
}
