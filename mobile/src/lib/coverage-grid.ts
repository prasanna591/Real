export const GRID_SEGMENTS_YAW = 8;
export const GRID_SEGMENTS_PITCH = 3;
export const TOTAL_SEGMENTS = GRID_SEGMENTS_YAW * GRID_SEGMENTS_PITCH;
export const YAW_STEP = (2 * Math.PI) / GRID_SEGMENTS_YAW;
export const PITCH_STEP = Math.PI / GRID_SEGMENTS_PITCH;
export const MIN_DWELL_MS = 300;
export const COMPLETION_THRESHOLD = 0.85;

export interface Segment {
  index: number;
  yawMin: number;
  yawMax: number;
  pitchMin: number;
  pitchMax: number;
  covered: boolean;
  dwellTime: number;
}

export interface CoverageState {
  segments: Segment[];
  coveredCount: number;
  coveragePercent: number;
  isComplete: boolean;
}

function normalizeAngle(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a;
}

export function createCoverageGrid(): Segment[] {
  const segments: Segment[] = [];
  let index = 0;

  for (let p = 0; p < GRID_SEGMENTS_PITCH; p++) {
    const pitchMin = p * PITCH_STEP - Math.PI / 2;
    const pitchMax = (p + 1) * PITCH_STEP - Math.PI / 2;

    for (let y = 0; y < GRID_SEGMENTS_YAW; y++) {
      const yawMin = y * YAW_STEP;
      const yawMax = (y + 1) * YAW_STEP;

      segments.push({
        index,
        yawMin,
        yawMax,
        pitchMin,
        pitchMax,
        covered: false,
        dwellTime: 0,
      });
      index++;
    }
  }

  return segments;
}

export function getSegmentForOrientation(yaw: number, pitch: number): number {
  const ny = normalizeAngle(yaw);
  const yawIndex = Math.floor(ny / YAW_STEP) % GRID_SEGMENTS_YAW;

  const pitchNormalized = pitch + Math.PI / 2;
  const pitchIndex = Math.max(0, Math.min(GRID_SEGMENTS_PITCH - 1, Math.floor(pitchNormalized / PITCH_STEP)));

  return pitchIndex * GRID_SEGMENTS_YAW + yawIndex;
}

export function updateCoverage(
  segments: Segment[],
  yaw: number,
  pitch: number,
  deltaTimeMs: number,
): CoverageState {
  const segmentIndex = getSegmentForOrientation(yaw, pitch);
  const segment = segments[segmentIndex];

  if (segment && !segment.covered) {
    segment.dwellTime += deltaTimeMs;
    if (segment.dwellTime >= MIN_DWELL_MS) {
      segment.covered = true;
    }
  }

  const coveredCount = segments.filter(s => s.covered).length;
  const coveragePercent = (coveredCount / TOTAL_SEGMENTS) * 100;
  const isComplete = coveragePercent >= COMPLETION_THRESHOLD * 100;

  return { segments, coveredCount, coveragePercent, isComplete };
}

export function getCoverageColor(coveragePercent: number): string {
  if (coveragePercent >= 85) return '#16A34A';
  if (coveragePercent >= 50) return '#D97706';
  return '#DC2626';
}
