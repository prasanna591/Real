# Development Prompt: Lightweight AR Room Walkthrough Capture App

Paste this into Claude Code as your project brief. It's structured so Claude Code can scaffold the project, then build feature-by-feature.

---

## 1. Project Overview

Build a mobile app (iOS + Android, cross-platform) that lets a user scan a room in under 60 seconds using the phone's camera + built-in IMU/gyro sensors, guided by a real-time on-screen coverage indicator, and produces a lightweight "walkthrough" — a pose-linked sequence of frames the user can navigate through afterward like a mini virtual tour. No server-side 3D reconstruction required for MVP.

**Core principle:** The gyro/IMU is used for *real-time capture guidance* (making sure the user covers the whole room evenly, without blur or gaps) — not for reconstructing 3D geometry. Geometry/pose comes from the platform's built-in visual-inertial odometry (ARKit / ARCore), which already fuses camera + IMU.

---

## 2. Tech Stack

- **Framework:** Unity + AR Foundation (cross-platform, wraps ARKit on iOS and ARCore on Android) — preferred for MVP speed.
  - Alternative if going native: Swift + ARKit (iOS only) or Kotlin + ARCore (Android only) — mention this as a fallback if Unity licensing/build complexity is a blocker.
- **AR/Pose Tracking:** AR Foundation's `ARSession`, `ARCameraManager`, `ARPointCloudManager` (exposes 6-DoF device pose + sparse point cloud for free).
- **Sensors:** Device gyroscope + accelerometer accessed via AR Foundation's pose data (no need for raw sensor APIs unless building custom smoothing).
- **Video/Frame Capture:** Continuous camera feed at 30fps during scan; extract keyframes post-capture rather than requiring discrete photo triggers.
- **Storage format:** Local JSON (pose + timestamp metadata) + JPEG/PNG keyframe images, bundled per scan session.
- **No backend for MVP.** Everything runs on-device.

---

## 3. Core Features (in build order)

### Feature 1 — AR Session + Pose Tracking Setup
- Initialize AR Foundation session on app launch.
- Continuously read device world-pose (position + rotation quaternion) every frame.
- Display a live camera feed as the main UI.

### Feature 2 — Coverage Grid System
- Divide the room's surrounding sphere into a **grid of capture segments**: 8 horizontal segments (45° yaw slices) × 3 vertical bands (up/level/down, ~30° pitch slices) = 24 segments total.
- Track which segments the camera has "dwelled" in (e.g., pose stayed within a segment's angular bounds for ≥300ms) and mark them covered.
- Render a mini on-screen dome/compass overlay (small HUD element, corner of screen) that fills in green per covered segment in real time.
- Scan is "complete" when a configurable % of segments (e.g., 85%) are covered — surface this as a progress bar/percentage too.

### Feature 3 — Motion Quality Guardrails
- Read angular velocity from pose deltas frame-to-frame.
- If angular velocity exceeds a threshold (too fast/jerky), show a non-blocking on-screen prompt: "Slow down" or a red pulse on the HUD.
- Optionally: basic blur detection (Laplacian variance on frame) to flag genuinely unusable frames even if motion was within threshold.

### Feature 4 — Frame Capture & Keyframe Selection
- Record continuous frames with their pose metadata during the scan (don't require the user to tap anything).
- Post-scan (or in real time), select **keyframes**: frames spaced by a minimum pose delta (e.g., new keyframe every ~10° of yaw/pitch change or every 0.5s, whichever first) AND passing the blur check.
- Store each keyframe as: `{ frame_id, image_path, position: {x,y,z}, rotation_quaternion: {x,y,z,w}, timestamp }`.

### Feature 5 — Session Timer & Auto-stop
- 60-second countdown visible during scan.
- Auto-stop at 60s, or manual stop button, or auto-stop early if coverage hits ~95%+.

### Feature 6 — Walkthrough Playback (Viewer)
- After capture, let the user "walk through" the room: navigate between nearby keyframes based on their stored poses (nearest-neighbor pose lookup), creating a simple free-look/point-to-point navigation experience — similar in spirit to Matterport's photo-based walkthroughs, but lightweight and fully on-device.
- Simple UI: swipe/drag to look around within a keyframe (using stored pose to orient), tap directional arrows to move to the next nearest keyframe.

### Feature 7 — Session Management
- Save scans locally (list of past scans with thumbnail + date).
- Export/share a scan as a zipped bundle (JSON + images) for later use (e.g., feeding into a Gaussian Splatting or NeRF pipeline as a v2 feature — not part of MVP).

---

## 4. Explicitly Out of Scope for MVP
- No server-side mesh/point-cloud reconstruction.
- No multi-room stitching.
- No cloud storage/sync.
- No user accounts/auth.

---

## 5. Suggested Project Structure

```
/RoomScanApp
  /Assets
    /Scripts
      ARSessionManager.cs
      CoverageGridTracker.cs
      MotionQualityMonitor.cs
      KeyframeSelector.cs
      ScanSessionController.cs
      WalkthroughViewer.cs
      SessionStorage.cs
    /Prefabs
      CoverageHUD.prefab
      ScanUI.prefab
      WalkthroughUI.prefab
    /Scenes
      ScanScene.unity
      WalkthroughScene.unity
      HomeScene.unity
  /Data (runtime-generated, per-scan folders with JSON + images)
```

---

## 6. Build Instructions for Claude Code

1. Scaffold a Unity project with AR Foundation + ARKit XR Plugin + ARCore XR Plugin packages installed.
2. Build Feature 1 (AR session + pose tracking) first and get a working camera feed with pose logging to console — verify pose data is sane before building anything else.
3. Build Feature 2 (coverage grid) next, with the HUD overlay — this is the crux of the "guided capture in a particular way" requirement, so prioritize getting the segment math and dwell-time logic correct.
4. Add Feature 3 (motion guardrails) and Feature 4 (keyframe selection) together, since both consume the same per-frame pose stream.
5. Add Feature 5 (timer/auto-stop).
6. Build Feature 6 (walkthrough viewer) as a separate scene, consuming the saved JSON+image bundle from a completed scan.
7. Add Feature 7 (session list/storage) last.
8. At each step, write a minimal test scene or debug overlay to verify sensor/pose data before layering UI polish on top.

---

## 7. Key Design Constraints to Respect Throughout
- **Lightweight:** no heavy ML models, no server calls, no dependencies beyond AR Foundation and standard Unity packages.
- **Under 60 seconds:** all guidance UI must be glanceable, not require the user to stop and read.
- **Guided, not manual:** the user should never need to manually decide when/where to "take a photo" — the app drives coverage automatically off the continuous frame stream.
-