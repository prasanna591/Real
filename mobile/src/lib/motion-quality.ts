export interface MotionQualityConfig {
  angularVelocityThreshold: number;
  minSharpnessScore: number;
}

export const DEFAULT_MOTION_CONFIG: MotionQualityConfig = {
  angularVelocityThreshold: 1.5,
  minSharpnessScore: 50,
};

export type MotionStatus = 'good' | 'too_fast' | 'blurry';

export interface MotionQualityResult {
  status: MotionStatus;
  angularSpeed: number;
  sharpnessScore: number;
}

function computeAngularSpeed(angularVelocity: { x: number; y: number; z: number }): number {
  return Math.sqrt(
    angularVelocity.x ** 2 + angularVelocity.y ** 2 + angularVelocity.z ** 2,
  );
}

function computeLaplacianVariance(imageData: Uint8ClampedArray, width: number, height: number): number {
  if (width < 3 || height < 3) return 100;

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const idxTop = ((y - 1) * width + x) * 4;
      const idxBottom = ((y + 1) * width + x) * 4;
      const idxLeft = (y * width + (x - 1)) * 4;
      const idxRight = (y * width + (x + 1)) * 4;

      const center = imageData[idx];
      const laplacian =
        -4 * center +
        imageData[idxTop] +
        imageData[idxBottom] +
        imageData[idxLeft] +
        imageData[idxRight];

      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

export function evaluateMotionQuality(
  angularVelocity: { x: number; y: number; z: number },
  imageData?: Uint8ClampedArray,
  imageWidth?: number,
  imageHeight?: number,
  config: MotionQualityConfig = DEFAULT_MOTION_CONFIG,
): MotionQualityResult {
  const angularSpeed = computeAngularSpeed(angularVelocity);

  if (angularSpeed > config.angularVelocityThreshold) {
    return { status: 'too_fast', angularSpeed, sharpnessScore: 0 };
  }

  if (imageData && imageWidth && imageHeight) {
    const sharpness = computeLaplacianVariance(imageData, imageWidth, imageHeight);
    if (sharpness < config.minSharpnessScore) {
      return { status: 'blurry', angularSpeed, sharpnessScore: sharpness };
    }
    return { status: 'good', angularSpeed, sharpnessScore: sharpness };
  }

  return { status: 'good', angularSpeed, sharpnessScore: 100 };
}

export function getStatusMessage(status: MotionStatus): string {
  switch (status) {
    case 'too_fast':
      return 'Slow down';
    case 'blurry':
      return 'Hold steady';
    case 'good':
      return '';
  }
}

export function getStatusColor(status: MotionStatus): string {
  switch (status) {
    case 'too_fast':
      return '#DC2626';
    case 'blurry':
      return '#D97706';
    case 'good':
      return '#16A34A';
  }
}
