export interface Keyframe {
  frameId: string;
  imagePath: string;
  position: { x: number; y: number; z: number };
  rotationQuaternion: { x: number; y: number; z: number; w: number };
  timestamp: number;
}

export interface KeyframeSelectorConfig {
  minPoseDeltaDegrees: number;
  minTimeIntervalMs: number;
  maxKeyframes: number;
}

export const DEFAULT_KEYFRAME_CONFIG: KeyframeSelectorConfig = {
  minPoseDeltaDegrees: 10,
  minTimeIntervalMs: 500,
  maxKeyframes: 120,
};

function quaternionAngleDegrees(
  q1: { x: number; y: number; z: number; w: number },
  q2: { x: number; y: number; z: number; w: number },
): number {
  let dot = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;
  dot = Math.max(-1, Math.min(1, dot));
  return 2 * Math.acos(Math.abs(dot)) * (180 / Math.PI);
}

function positionDistance(
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number },
): number {
  return Math.sqrt(
    (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2 + (p2.z - p1.z) ** 2,
  );
}

export class KeyframeSelector {
  private keyframes: Keyframe[] = [];
  private lastKeyframe: Keyframe | null = null;
  private config: KeyframeSelectorConfig;

  constructor(config: KeyframeSelectorConfig = DEFAULT_KEYFRAME_CONFIG) {
    this.config = config;
  }

  reset(): void {
    this.keyframes = [];
    this.lastKeyframe = null;
  }

  addFrame(
    frameId: string,
    imagePath: string,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number; w: number },
    timestamp: number,
    isMotionGood: boolean = true,
  ): Keyframe | null {
    if (!isMotionGood) return null;
    if (this.keyframes.length >= this.config.maxKeyframes) return null;

    const candidate: Keyframe = {
      frameId,
      imagePath,
      position,
      rotationQuaternion: rotation,
      timestamp,
    };

    if (!this.lastKeyframe) {
      this.keyframes.push(candidate);
      this.lastKeyframe = candidate;
      return candidate;
    }

    const timeDelta = timestamp - this.lastKeyframe.timestamp;
    const angleDelta = quaternionAngleDegrees(this.lastKeyframe.rotationQuaternion, rotation);
    const positionDelta = positionDistance(this.lastKeyframe.position, position);

    const meetsPoseDelta = angleDelta >= this.config.minPoseDeltaDegrees || positionDelta >= 0.3;
    const meetsTimeDelta = timeDelta >= this.config.minTimeIntervalMs;

    if (meetsPoseDelta || (meetsTimeDelta && positionDelta > 0.05)) {
      this.keyframes.push(candidate);
      this.lastKeyframe = candidate;
      return candidate;
    }

    return null;
  }

  getKeyframes(): Keyframe[] {
    return [...this.keyframes];
  }

  getKeyframeCount(): number {
    return this.keyframes.length;
  }

  findNearestKeyframe(
    position: { x: number; y: number; z: number },
  ): Keyframe | null {
    if (this.keyframes.length === 0) return null;

    let nearest = this.keyframes[0];
    let minDist = Infinity;

    for (const kf of this.keyframes) {
      const dist = positionDistance(kf.position, position);
      if (dist < minDist) {
        minDist = dist;
        nearest = kf;
      }
    }

    return nearest;
  }

  findNextKeyframe(
    currentId: string,
    direction: 'forward' | 'backward',
  ): Keyframe | null {
    const index = this.keyframes.findIndex(kf => kf.frameId === currentId);
    if (index === -1) return null;

    if (direction === 'forward') {
      return index < this.keyframes.length - 1 ? this.keyframes[index + 1] : null;
    }
    return index > 0 ? this.keyframes[index - 1] : null;
  }
}
