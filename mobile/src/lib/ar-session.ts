import { useCameraPermissions } from 'expo-camera';
import {
  Accelerometer,
  Gyroscope,
  Magnetometer,
  type AccelerometerMeasurement,
  type GyroscopeMeasurement,
  type MagnetometerMeasurement,
} from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface DevicePose {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  angularVelocity: { x: number; y: number; z: number };
  /** Compass heading in degrees (0-360) fused from the magnetometer. */
  heading: number;
  timestamp: number;
}

export interface ARSessionState {
  isReady: boolean;
  hasPermission: boolean;
  pose: DevicePose | null;
  isTracking: boolean;
}

type PoseCallback = (pose: DevicePose) => void;

const SENSOR_UPDATE_INTERVAL = 16; // ~60Hz

function quaternionFromEuler(pitch: number, yaw: number, roll: number): DevicePose['rotation'] {
  const cp = Math.cos(pitch / 2);
  const sp = Math.sin(pitch / 2);
  const cy = Math.cos(yaw / 2);
  const sy = Math.sin(yaw / 2);
  const cr = Math.cos(roll / 2);
  const sr = Math.sin(roll / 2);

  return {
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
    w: cr * cp * cy + sr * sp * sy,
  };
}

export function useARSession() {
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ARSessionState>({
    isReady: false,
    hasPermission: false,
    pose: null,
    isTracking: false,
  });

  const poseRef = useRef<DevicePose | null>(null);
  const listenersRef = useRef<{
    accel: ReturnType<typeof Accelerometer.addListener> | null;
    gyro: ReturnType<typeof Gyroscope.addListener> | null;
    mag: ReturnType<typeof Magnetometer.addListener> | null;
  }>({ accel: null, gyro: null, mag: null });

  // orientation accumulated from angular velocity (rad), zeroed at reset
  const orientationRef = useRef({ pitch: 0, yaw: 0, roll: 0 });
  // latest instantaneous angular velocity from the gyroscope (rad/s)
  const angularVelocityRef = useRef({ x: 0, y: 0, z: 0 });
  // latest instantaneous linear acceleration from the accelerometer (m/s^2)
  const accelerationRef = useRef({ x: 0, y: 0, z: 0 });
  // smoothed "position" estimate (velocity-integrated) — best-effort only
  const positionRef = useRef({ x: 0, y: 0, z: 0 });
  const velocityRef = useRef({ x: 0, y: 0, z: 0 });
  const lastAccelTsRef = useRef(0);
  // latest compass heading (degrees), fused from the magnetometer
  const headingRef = useRef(0);

  const poseCallbacksRef = useRef<Set<PoseCallback>>(new Set());
  const runningRef = useRef(false);

  const registerPoseCallback = useCallback((cb: PoseCallback) => {
    poseCallbacksRef.current.add(cb);
    return () => {
      poseCallbacksRef.current.delete(cb);
    };
  }, []);

  // Shared pose emission used by the accelerometer (primary) or gyroscope (fallback).
  const emitPose = useCallback((now: number) => {
    const o = orientationRef.current;
    const p = positionRef.current;
    const pose: DevicePose = {
      position: { x: p.x, y: p.y, z: p.z },
      rotation: quaternionFromEuler(o.pitch, o.yaw, o.roll),
      angularVelocity: { ...angularVelocityRef.current },
      heading: headingRef.current,
      timestamp: now,
    };
    poseRef.current = pose;
    if (runningRef.current) {
      poseCallbacksRef.current.forEach((cb) => cb(pose));
    }
    setState((prev) => ({ ...prev, pose, isTracking: true }));
  }, []);

  const handleGyroscope = useCallback((data: GyroscopeMeasurement) => {
    // data is rad/s — keep the instantaneous value for the motion guardrail
    angularVelocityRef.current = { x: data.x, y: data.y, z: data.z };
    // accumulate orientation using the integration step
    const dt = SENSOR_UPDATE_INTERVAL / 1000;
    const o = orientationRef.current;
    o.pitch += data.x * dt;
    o.yaw += data.y * dt;
    o.roll += data.z * dt;

    // If the accelerometer is unavailable, drive pose emission from the
    // gyroscope so coverage still progresses (accelerometer is preferred).
    if (!listenersRef.current.accel) {
      emitPose(Date.now());
    }
  }, [emitPose]);

  const handleMagnetometer = useCallback((data: MagnetometerMeasurement) => {
    // Device-relative magnetic heading (degrees). Tilt compensation is handled
    // implicitly by the coverage model which fuses orientation only.
    const raw = (Math.atan2(data.y, data.x) * 180) / Math.PI;
    headingRef.current = (raw + 360) % 360;
  }, []);

  const handleAccelerometer = useCallback((data: AccelerometerMeasurement) => {
    accelerationRef.current = { x: data.x, y: data.y, z: data.z };

    const now = Date.now();
    const dt = (now - lastAccelTsRef.current) / 1000;
    lastAccelTsRef.current = now;

    // crude dead-reckoning: subtract gravity from raw accel then integrate.
    // This is only an approximation (no orientation compensation) and is NOT
    // used for coverage — coverage is purely orientation-based.
    const ax = data.x;
    const ay = data.y;
    const az = data.z - 9.81;
    const clampDt = Math.min(Math.max(dt, 0.001), 0.05);
    const v = velocityRef.current;
    v.x += ax * clampDt;
    v.y += ay * clampDt;
    v.z += az * clampDt;
    // heavy damping to avoid divergence
    v.x *= 0.9;
    v.y *= 0.9;
    v.z *= 0.9;

    const p = positionRef.current;
    p.x += v.x * clampDt;
    p.y += v.y * clampDt;
    p.z += v.z * clampDt;

    emitPose(now);
  }, [emitPose]);

  const startTracking = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return false;
    }

    Accelerometer.setUpdateInterval(SENSOR_UPDATE_INTERVAL);
    Gyroscope.setUpdateInterval(SENSOR_UPDATE_INTERVAL);
    Magnetometer.setUpdateInterval(SENSOR_UPDATE_INTERVAL);

    // Register each sensor independently so a missing/unavailable sensor (e.g. a
    // device without a magnetometer) does not crash the whole scan session.
    try {
      listenersRef.current.accel = Accelerometer.addListener(handleAccelerometer);
    } catch {
      listenersRef.current.accel = null;
    }
    try {
      listenersRef.current.gyro = Gyroscope.addListener(handleGyroscope);
    } catch {
      listenersRef.current.gyro = null;
    }
    try {
      listenersRef.current.mag = Magnetometer.addListener(handleMagnetometer);
    } catch {
      listenersRef.current.mag = null;
    }

    // At least one motion sensor must be active for pose updates.
    if (!listenersRef.current.accel && !listenersRef.current.gyro) {
      return false;
    }

    runningRef.current = true;

    setState((prev) => ({ ...prev, isReady: true, hasPermission: true }));
    return true;
  }, [permission, requestPermission, handleAccelerometer, handleGyroscope, handleMagnetometer]);

  const stopTracking = useCallback(() => {
    runningRef.current = false;
    listenersRef.current.accel?.remove();
    listenersRef.current.gyro?.remove();
    listenersRef.current.mag?.remove();
    listenersRef.current = { accel: null, gyro: null, mag: null };
    setState((prev) => ({ ...prev, isTracking: false }));
  }, []);

  const resetPose = useCallback(() => {
    orientationRef.current = { pitch: 0, yaw: 0, roll: 0 };
    angularVelocityRef.current = { x: 0, y: 0, z: 0 };
    accelerationRef.current = { x: 0, y: 0, z: 0 };
    positionRef.current = { x: 0, y: 0, z: 0 };
    velocityRef.current = { x: 0, y: 0, z: 0 };
    lastAccelTsRef.current = 0;
    headingRef.current = 0;
    poseRef.current = null;
    setState((prev) => ({ ...prev, pose: null }));
  }, []);

  useEffect(() => {
    return () => {
      listenersRef.current.accel?.remove();
      listenersRef.current.gyro?.remove();
      listenersRef.current.mag?.remove();
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
    resetPose,
    registerPoseCallback,
    getPose: () => poseRef.current,
  };
}
