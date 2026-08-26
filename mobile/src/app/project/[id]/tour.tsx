import { useLocalSearchParams, Stack } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  PixelRatio,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackEvent } from '@/lib/analytics';
import { getTourConfig } from '@/services/api';
import type { TourViewpoint } from '@/types/api';

const FALLBACK_VIEWPOINTS: TourViewpoint[] = [
  {
    id: -1, project_id: -1, position: 0,
    name: 'Living Room',
    description: '9.5 ft ceilings · engineered oak flooring · floor-to-ceiling windows',
    target_x: 0, target_y: 1.2, target_z: -1, distance: 7, yaw: 0, pitch: 0.32,
  },
  {
    id: -2, project_id: -1, position: 1,
    name: 'Master Bedroom',
    description: 'King-size layout · wardrobe wall · private balcony access',
    target_x: -3.2, target_y: 1.2, target_z: -4.2, distance: 5.5, yaw: -0.55, pitch: 0.3,
  },
  {
    id: -3, project_id: -1, position: 2,
    name: 'Kitchen',
    description: 'Modular kitchen · granite counters · utility balcony',
    target_x: 3.4, target_y: 1.1, target_z: -5.4, distance: 5, yaw: 0.6, pitch: 0.34,
  },
];

type ModelSource = 'scan' | 'demo' | 'builtin';

export default function TourScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string; unit?: string }>();
  const projectId = Number(params.id);

  const [viewpoints, setViewpoints] = useState<TourViewpoint[]>(FALLBACK_VIEWPOINTS);

  const camRef = useRef({
    target: new THREE.Vector3(
      FALLBACK_VIEWPOINTS[0].target_x,
      FALLBACK_VIEWPOINTS[0].target_y,
      FALLBACK_VIEWPOINTS[0].target_z
    ),
    desiredTarget: new THREE.Vector3(
      FALLBACK_VIEWPOINTS[0].target_x,
      FALLBACK_VIEWPOINTS[0].target_y,
      FALLBACK_VIEWPOINTS[0].target_z
    ),
    distance: FALLBACK_VIEWPOINTS[0].distance,
    desiredDistance: FALLBACK_VIEWPOINTS[0].distance,
    yaw: FALLBACK_VIEWPOINTS[0].yaw,
    desiredYaw: FALLBACK_VIEWPOINTS[0].yaw,
    pitch: FALLBACK_VIEWPOINTS[0].pitch,
    desiredPitch: FALLBACK_VIEWPOINTS[0].pitch,
  });
  const sceneHandleRef = useRef<SceneHandle | null>(null);

  const [active, setActive] = useState(0);
  const [modelSource, setModelSource] = useState<ModelSource | null>(null);
  const [visited, setVisited] = useState<Set<string>>(new Set([FALLBACK_VIEWPOINTS[0].name]));
  const completedRef = useRef(false);

  // Swap in backend viewpoints (or fallbacks) and reset the camera + progress.
  // Runs from the tour-content load callback, never as a render-phase effect.
  const applyViewpoints = useCallback((next: TourViewpoint[]) => {
    const vp = next[0];
    setViewpoints(next);
    if (!vp) return;
    setActive(0);
    setVisited(new Set([vp.name]));
    const cam = camRef.current;
    cam.target.set(vp.target_x, vp.target_y, vp.target_z);
    cam.desiredTarget.set(vp.target_x, vp.target_y, vp.target_z);
    cam.distance = vp.distance;
    cam.desiredDistance = vp.distance;
    cam.yaw = vp.yaw;
    cam.desiredYaw = vp.yaw;
    cam.pitch = vp.pitch;
    cam.desiredPitch = vp.pitch;
  }, []);

  const selectViewpoint = useCallback(
    (index: number) => {
      const vp = viewpoints[index];
      if (!vp) return;
      const cam = camRef.current;
      setActive(index);
      cam.desiredTarget.set(vp.target_x, vp.target_y, vp.target_z);
      cam.desiredDistance = vp.distance;
      cam.desiredYaw = vp.yaw;
      cam.desiredPitch = vp.pitch;
      setVisited(prev => {
        if (prev.has(vp.name)) return prev;
        const next = new Set(prev);
        next.add(vp.name);
        return next;
      });
    },
    [viewpoints]
  );

  useEffect(() => {
    if (
      viewpoints.length > 0 &&
      visited.size === viewpoints.length &&
      !completedRef.current &&
      projectId
    ) {
      completedRef.current = true;
      trackEvent({ eventType: 'walkthrough_complete', projectId });
    }
  }, [visited, viewpoints.length, projectId]);

  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const handleGrant = useCallback(() => {
    lastPos.current = null;
  }, []);

  const handleMove = useCallback((e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    const last = lastPos.current;
    if (last) {
      const cam = camRef.current;
      cam.desiredYaw -= (pageX - last.x) * 0.008;
      cam.desiredPitch = Math.min(1.15, Math.max(0.06, cam.desiredPitch - (pageY - last.y) * 0.005));
    }
    lastPos.current = { x: pageX, y: pageY };
  }, []);

  return (
    <ThemedView type="background" style={styles.root}>
      <Stack.Screen options={{ title: params.unit ? `3D Tour · ${params.unit}` : '3D Walkthrough' }} />

      <View
        style={styles.canvasWrap}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleGrant}
        onResponderMove={handleMove}>
        <GLView
          style={styles.canvas}
          onContextCreate={glContext => {
            sceneHandleRef.current = startScene(glContext, camRef.current, Dimensions.get('window').width);
            void loadTourContent(projectId, sceneHandleRef.current, applyViewpoints, setModelSource);
          }}
        />
        <View style={[styles.hintPill, { backgroundColor: 'rgba(12,14,26,0.55)' }]} pointerEvents="none">
          <ThemedText type="small" style={{ color: '#fff' }}>
            Drag to look around
          </ThemedText>
        </View>
        {modelSource ? (
          <View
            style={[styles.sourcePill, { backgroundColor: 'rgba(12,14,26,0.55)' }]}
            pointerEvents="none">
            <ThemedText type="small" style={{ color: '#fff' }}>
              {modelSource === 'scan'
                ? '◉ Builder scan loaded'
                : modelSource === 'demo'
                  ? '◉ Demo GLB loaded'
                  : 'Built-in preview'}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.panel}>
        <View style={styles.dotsRow}>
          {viewpoints.map((vp, i) => (
            <View
              key={`${vp.id}-${vp.name}`}
              style={[
                styles.dot,
                {
                  backgroundColor: visited.has(vp.name)
                    ? theme.success
                    : i === active
                      ? theme.primary
                      : theme.border,
                },
              ]}
            />
          ))}
          <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.two }}>
            {visited.size}/{viewpoints.length} areas explored
          </ThemedText>
        </View>

        {visited.size === viewpoints.length && (
          <ThemedView
            type="backgroundElement"
            style={[styles.completeCard, { borderColor: theme.border }]}>
            <ThemedText type="subtitle" style={{ color: theme.success }}>
              ✓ Tour complete
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Your interest was shared with the builder team.
            </ThemedText>
          </ThemedView>
        )}

        <ThemedView type="backgroundElement" style={[styles.infoCard, { borderColor: theme.border }]}>
          <ThemedText type="subtitle">{viewpoints[active]?.name}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.one }}>
            {viewpoints[active]?.description}
          </ThemedText>
          <View style={styles.actionsRow}>
            <View style={styles.halfButton}>
              <SecondaryButton
                label="← Previous"
                onPress={() => selectViewpoint((active + viewpoints.length - 1) % viewpoints.length)}
              />
            </View>
            <View style={styles.halfButton}>
              <PrimaryButton
                label="Next area →"
                onPress={() => selectViewpoint((active + 1) % viewpoints.length)}
              />
            </View>
          </View>
        </ThemedView>

        {params.unit && (
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
            Exploring layout for unit {params.unit} · indicative interiors
          </ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}

// ---------------------------------------------------------------------------
// Scene management
// ---------------------------------------------------------------------------

interface SceneHandle {
  setContent: (content: THREE.Group) => void;
}

type TourCam = {
  target: THREE.Vector3;
  desiredTarget: THREE.Vector3;
  distance: number;
  desiredDistance: number;
  yaw: number;
  desiredYaw: number;
  pitch: number;
  desiredPitch: number;
};

async function loadTourContent(
  projectId: number,
  handle: SceneHandle,
  applyViewpoints: (vps: TourViewpoint[]) => void,
  setModelSource: (source: ModelSource) => void,
): Promise<void> {
  let configModelUrl: string | null = null;

  try {
    const config = await getTourConfig(projectId);
    if (config.viewpoints.length > 0) {
      applyViewpoints(config.viewpoints);
    }
    configModelUrl = config.model_url;
  } catch {
    // Offline / API down → keep fallback viewpoints and built-in room.
  }

  if (!configModelUrl) {
    setModelSource('builtin');
    return;
  }

  try {
    const response = await fetch(configModelUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
      new GLTFLoader().parse(buffer, '', resolve, reject);
    });
    handle.setContent(prepareModel(gltf.scene));
    setModelSource(/demo/i.test(configModelUrl) ? 'demo' : 'scan');
  } catch {
    // Untextured-scan decode issues or bad URL → keep the built-in preview.
    setModelSource('builtin');
  }
}

/**
 * Normalizes any builder-supplied model to presentation scale:
 * scaled so its largest dimension is ~6 units, centered on X/Z, resting on Y=0.
 */
function prepareModel(model: THREE.Group): THREE.Group {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = 6 / maxDim;
  const center = box.getCenter(new THREE.Vector3());

  const wrapper = new THREE.Group();
  wrapper.add(model);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  return wrapper;
}

function startScene(glContext: WebGLRenderingContext, cam: TourCam, cssWidth: number): SceneHandle {
  const scale = Math.min(PixelRatio.get(), 2);
  const width = Math.floor(cssWidth * scale);
  const height = Math.floor(cssWidth * 0.62 * scale);

  const renderer = new THREE.WebGLRenderer({
    context: glContext as unknown as WebGLRenderingContext,
  });
  renderer.setSize(width, height, false);
  renderer.setClearColor(0xdfe8ff);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xdfe8ff, 18, 40);

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 120);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa4c8, 1.25));
  const sun = new THREE.DirectionalLight(0xfff1dd, 1.35);
  sun.position.set(7, 11, 6);
  scene.add(sun);
  const lamp = new THREE.PointLight(0xffd9a0, 22, 12);
  lamp.position.set(0, 3.4, 1.5);
  scene.add(lamp);

  // Swappable content root: procedural room by default, replaced when a GLB loads.
  let content = buildRoom();
  scene.add(content.group);

  let raf = 0;
  const K = 0.09;
  const tick = () => {
    cam.target.lerp(cam.desiredTarget, K);
    cam.distance += (cam.desiredDistance - cam.distance) * K;
    cam.yaw += (cam.desiredYaw - cam.yaw) * K;
    cam.pitch += (cam.desiredPitch - cam.pitch) * K;

    const t = cam.target;
    camera.position.set(
      t.x + cam.distance * Math.sin(cam.yaw) * Math.cos(cam.pitch),
      t.y + cam.distance * Math.sin(cam.pitch),
      t.z + cam.distance * Math.cos(cam.yaw) * Math.cos(cam.pitch)
    );
    camera.lookAt(t);

    renderer.render(scene, camera);
    (glContext as unknown as { endFrameEXP(): void }).endFrameEXP();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const disposeContent = (next?: { group: THREE.Group; dispose: () => void }) => {
    content.dispose();
    scene.remove(content.group);
    if (next?.group) scene.add(next.group);
    if (next) content = next;
  };

  const originalDestroy = (glContext as unknown as { destroy?: () => void }).destroy?.bind(glContext);
  (glContext as unknown as { destroy?: () => void }).destroy = () => {
    cancelAnimationFrame(raf);
    disposeContent();
    renderer.dispose();
    originalDestroy?.();
  };

  return {
    setContent(gltfScene: THREE.Group) {
      disposeContent({
        group: gltfScene,
        dispose: () =>
          gltfScene.traverse(obj => {
            const mesh = obj as THREE.Mesh;
            mesh.geometry?.dispose?.();
            const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
            if (Array.isArray(material)) material.forEach(m => m.dispose());
            else material?.dispose?.();
          }),
      });
    },
  };
}

function box(w: number, h: number, d: number, color: number, opts?: { emissive?: number; metal?: boolean }): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: opts?.metal ? 0.35 : 0.85,
    metalness: opts?.metal ? 0.55 : 0.05,
    emissive: opts?.emissive ?? 0x000000,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  return mesh;
}

function buildRoom(): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const add = (mesh: THREE.Mesh, x: number, y: number, z: number) => {
    mesh.position.set(x, y, z);
    geometries.push(mesh.geometry as THREE.BufferGeometry);
    materials.push(mesh.material as THREE.Material);
    group.add(mesh);
    return mesh;
  };

  add(box(11, 0.24, 16, 0xc9a274), 0, -0.12, -1.5);
  const rug = add(box(4.6, 0.06, 3.2, 0xe7e2f9), 0, 0.03, 1.2);
  rug.scale.set(1, 1, 1);

  add(box(11.4, 6, 0.3, 0xf3f1ec), 0, 3, -9.6);
  add(box(0.3, 6, 16, 0xf3f1ec), -5.6, 3, -1.5);
  add(box(0.3, 6, 9, 0xf3f1ec), 5.6, 3, -5);
  add(box(0.3, 6, 4.5, 0xf3f1ec), 5.6, 3, 4.5);

  add(box(3.6, 3.2, 0.12, 0xbfe1ff, { emissive: 0x8fc3ee }), 2.2, 3.1, 9.35);
  add(box(3.8, 0.16, 0.2, 0xffffff), 2.2, 4.75, 9.3);
  add(box(3.8, 0.16, 0.2, 0xffffff), 2.2, 1.45, 9.3);
  add(box(0.16, 3.2, 0.2, 0xffffff), 0.35, 3.1, 9.3);
  add(box(0.16, 3.2, 0.2, 0xffffff), 4.05, 3.1, 9.3);

  add(box(4.2, 0.55, 1.5, 0x5b64d8), -1.2, 0.42, 2.6);
  add(box(4.2, 1.15, 0.45, 0x5b64d8), -1.2, 1.05, 3.28);
  add(box(0.45, 0.85, 1.5, 0x4a52bd), -3.28, 0.57, 2.6);
  add(box(0.45, 0.85, 1.5, 0x4a52bd), 0.88, 0.57, 2.6);
  add(box(1.7, 0.3, 1.15, 0x7d86e8), -2.05, 0.82, 2.45);
  add(box(1.7, 0.3, 1.15, 0x7d86e8), -0.35, 0.82, 2.45);

  const tableTop = add(box(2.1, 0.12, 1.1, 0x8b5a33), -1.2, 0.62, 0.7);
  tableTop.rotation.y = 0;
  add(box(0.14, 0.55, 0.14, 0x2f2a26), -2.1, 0.3, 0.28);
  add(box(0.14, 0.55, 0.14, 0x2f2a26), -0.3, 0.3, 0.28);
  add(box(0.14, 0.55, 0.14, 0x2f2a26), -2.1, 0.3, 1.12);
  add(box(0.14, 0.55, 0.14, 0x2f2a26), -0.3, 0.3, 1.12);

  add(box(3, 0.5, 0.6, 0x3c3630), -1.2, 0.28, 5.4);
  add(box(2.6, 1.5, 0.1, 0x101321, { emissive: 0x232a44 }), -1.2, 1.35, 5.65);

  add(box(3.6, 0.5, 4.4, 0xf5f3ef), -3.2, 0.4, -4.4);
  add(box(3.6, 1.3, 0.28, 0xc9b79b), -3.2, 1.15, -6.4);
  add(box(1.5, 0.28, 0.9, 0xffffff), -3.9, 0.78, -5.9);
  add(box(1.5, 0.28, 0.9, 0xffffff), -2.5, 0.78, -5.9);
  add(box(3.5, 0.24, 2.6, 0xf97346), -3.2, 0.72, -4.1);

  add(box(4.4, 0.95, 0.75, 0xd8dde6, { metal: true }), 3.3, 0.62, -9);
  add(box(4.4, 0.1, 0.95, 0x2e2a26, { metal: true }), 3.3, 1.13, -9);
  add(box(4.2, 1.15, 0.55, 0xeceae4), 3.3, 2.25, -9.15);
  add(box(1.05, 2.6, 0.85, 0xaeb6c2, { metal: true }), 5, 1.45, -9);
  add(box(0.9, 0.5, 0.7, 0x9fb8ad), 4.6, 1.2, -7.6);

  add(box(0.5, 0.6, 0.5, 0xb46a43), 4.6, 0.42, 3.4);
  add(box(1.15, 1.5, 1.15, 0x3f9e63), 4.6, 1.55, 3.4);

  add(box(0.07, 1.1, 0.07, 0x2f2a26), -1.2, 4.05, 0.7);
  add(box(0.55, 0.55, 0.55, 0xffe6b0, { emissive: 0xffdf9e }), -1.2, 3.4, 0.7);

  return {
    group,
    dispose: () => {
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
    },
  };
}

const CANVAS_ASPECT = 0.62;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  canvasWrap: {
    width: '100%',
    aspectRatio: 1 / CANVAS_ASPECT,
    backgroundColor: '#dfe8ff',
  },
  canvas: {
    flex: 1,
  },
  hintPill: {
    position: 'absolute',
    top: Spacing.three,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  sourcePill: {
    position: 'absolute',
    bottom: Spacing.two,
    right: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  panel: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.two,
  },
  completeCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  infoCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  halfButton: {
    flex: 1,
  },
});
