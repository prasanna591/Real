# Room Scan Feature

## Overview

The Room Scan feature allows users to capture a room walkthrough using their phone's camera and motion sensors. The app guides the user through a 60-second scanning process, tracking coverage across 24 angular segments, and produces a set of keyframes that can be navigated like a mini virtual tour.

## Architecture

### Core Libraries

| File | Purpose |
|------|---------|
| `src/lib/ar-session.ts` | Wraps camera + motion sensors (accelerometer/gyroscope) to provide device pose data |
| `src/lib/coverage-grid.ts` | 8×3 segment grid system with dwell-time tracking for coverage guidance |
| `src/lib/motion-quality.ts` | Angular velocity monitoring + Laplacian variance blur detection |
| `src/lib/keyframe-selector.ts` | Smart keyframe selection based on pose deltas and time intervals |
| `src/lib/scan-storage.ts` | Local persistence for scan sessions using AsyncStorage + FileSystem |

### UI Components

| Component | Purpose |
|-----------|---------|
| `CoverageHUD` | Corner overlay showing grid coverage + progress bar |
| `MotionIndicator` | Pulsing "Slow down" / "Hold steady" prompts |
| `ScanTimer` | 60-second countdown with stop button |

### Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| Room Scan | `/project/[id]/room-scan` | Full-screen camera view with coverage HUD |
| Room Walkthrough | `/project/[id]/room-walkthrough` | Keyframe viewer with 3D preview |
| Scans List | `/scans` (tab) | List of past scan sessions |

## How It Works

### 1. Capture Flow

1. User taps "Room scan" on project detail page
2. App requests camera permission
3. User taps "Start Scanning"
4. App begins tracking device orientation, merging gyroscope (angular velocity + orientation) and accelerometer (motion)
5. Coverage grid updates in real-time as user moves around
6. Motion quality indicator warns if moving too fast (from gyroscope rad/s)
7. Timer counts down from 60 seconds
8. Scan auto-stops early once coverage hits 85%, or at 60s, or on manual stop
9. Each accepted keyframe captures a real photo and saves all keyframes locally

### 2. Coverage Grid

The room's surrounding sphere is divided into **24 segments**:
- 8 horizontal segments (45° yaw slices)
- 3 vertical bands (up/level/down, ~30° pitch slices)

A segment is marked "covered" when the camera dwells within its angular bounds for ≥300ms. The scan is considered complete when 85%+ of segments are covered.

### 3. Keyframe Selection

Frames are selected as keyframes based on:
- **Pose delta**: New keyframe when rotation changes by ~10° or position moves ~0.3m
- **Time interval**: At least 500ms between keyframes
- **Motion quality**: Only frames with good motion (not too fast/blurry) are kept
- **Maximum**: Up to 120 keyframes per scan

### 4. Walkthrough Playback

After capture, users can navigate through the keyframe photos (the actual captured frames):
- **Swipe/drag**: Pan/look around within the current captured photo
- **Previous/Next buttons**: Move between stops in the scan sequence
- **Uncaptured frames**: Shows a placeholder notice if a photo failed to save

## File Structure

```
mobile/src/
  lib/
    ar-session.ts          # AR session wrapper
    coverage-grid.ts       # 24-segment grid math
    motion-quality.ts      # Angular velocity + blur detection
    keyframe-selector.ts   # Frame capture + keyframe selection
    scan-storage.ts        # Local scan persistence
  components/
    CoverageHUD.tsx        # Dome/compass coverage overlay
    MotionIndicator.tsx    # "Slow down" / red pulse indicator
    ScanTimer.tsx          # 60s countdown + stop controls
  app/
    project/[id]/
      room-scan.tsx        # Scan capture screen
      room-walkthrough.tsx # Playback/viewer screen
    (tabs)/
      scans.tsx            # Past scans list
```

## Dependencies

- `expo-camera` - Live camera feed + real keyframe photo capture
- `expo-sensors` - Accelerometer + gyroscope for pose/motion tracking
- `expo-file-system` - Photo + JSON storage
- `@react-native-async-storage/async-storage` - Scan metadata

## Configuration

### Coverage Grid

Adjust in `src/lib/coverage-grid.ts`:
- `GRID_SEGMENTS_YAW`: Number of horizontal segments (default: 8)
- `GRID_SEGMENTS_PITCH`: Number of vertical bands (default: 3)
- `MIN_DWELL_MS`: Minimum dwell time to mark segment covered (default: 300ms)
- `COMPLETION_THRESHOLD`: Coverage % to consider scan complete (default: 85%)

### Motion Quality

Adjust in `src/lib/motion-quality.ts`:
- `angularVelocityThreshold`: Max angular speed before warning (default: 1.5 rad/s)
- `minSharpnessScore`: Minimum Laplacian variance for blur detection (default: 50)

### Keyframe Selection

Adjust in `src/lib/keyframe-selector.ts`:
- `minPoseDeltaDegrees`: Minimum rotation between keyframes (default: 10°)
- `minTimeIntervalMs`: Minimum time between keyframes (default: 500ms)
- `maxKeyframes`: Maximum keyframes per scan (default: 120)

## Future Enhancements

1. **ARKit/ARCore integration**: Use `expo-ar` or `munim-xr` for true visual-inertial odometry pose tracking (more robust than IMU dead-reckoning, and provides accurate world-relative position)
2. **Blur detection on real frames**: Feed the captured photo pixels through the existing Laplacian variance check
3. **3D reconstruction**: Feed keyframe photos + poses into Gaussian Splatting or NeRF pipeline
4. **Cloud sync**: Upload scans to backend for sharing
5. **Multi-room stitching**: Connect multiple scans into a full property walkthrough
