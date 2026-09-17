import * as THREE from '../lib/three.module.js';

const DEFAULT_YAW = 0.9;
const DEFAULT_PITCH = 0.6;
const DISTANCE = 3.6;

export function createCamera(canvas, environment) {
  const camera = new THREE.PerspectiveCamera(52, 1, 0.025, 160);
  let yaw = DEFAULT_YAW,
    pitch = DEFAULT_PITCH,
    pointer = null;
  const target = new THREE.Vector3(),
    ray = new THREE.Raycaster(),
    direction = new THREE.Vector3();
  let initialized = false;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    pointer = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
    };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointer?.id !== e.pointerId) return;
    if (!pointer.dragging) {
      const dx = Math.abs(e.clientX - pointer.startX);
      const dy = Math.abs(e.clientY - pointer.startY);
      if (Math.max(dx, dy) < 4 || (e.pointerType === 'touch' && dy > dx)) return;
      pointer.dragging = true;
    }
    yaw -= (e.clientX - pointer.x) * 0.008;
    pitch = THREE.MathUtils.clamp(pitch + (e.clientY - pointer.y) * 0.006, 0.15, 1.35);
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  });
  const release = () => {
    pointer = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  return {
    camera,
    resetView() {
      yaw = DEFAULT_YAW;
      pitch = DEFAULT_PITCH;
      initialized = false;
    },
    get following() {
      return true;
    },
    update(position, dt, reduced) {
      const focus = position.clone().add(new THREE.Vector3(0, 0.1, 0));
      if (!initialized || reduced) target.copy(focus);
      else target.lerp(focus, 1 - Math.exp(-dt * 9));
      initialized = true;
      // In narrow corridors, look from above before resorting to a close-up.
      // Keep yaw fixed: the scene must not spin each time a wall approaches.
      let viewPitch = pitch,
        available = 0;
      const options = [pitch, 1.0, 1.3, 1.5];
      for (const candidate of options) {
        direction.set(
          Math.cos(yaw) * Math.cos(candidate),
          Math.sin(candidate),
          Math.sin(yaw) * Math.cos(candidate),
        );
        ray.set(target, direction);
        ray.far = DISTANCE;
        const wall = ray
          .intersectObjects(environment.walls, false)
          .find((hit) => hit.distance > 0.2);
        const clearance = wall ? Math.max(0.4, wall.distance - 0.12) : DISTANCE;
        if (clearance > available) {
          viewPitch = candidate;
          available = clearance;
        }
        if (clearance >= 2.4) break;
      }
      direction.set(
        Math.cos(yaw) * Math.cos(viewPitch),
        Math.sin(viewPitch),
        Math.sin(yaw) * Math.cos(viewPitch),
      );
      const desired = target.clone().addScaledVector(direction, Math.min(DISTANCE, available));
      ray.set(target, direction);
      ray.far = DISTANCE;
      // Only ceiling patches intersecting the current view are cut away.
      const hidden = new Set(
        ray.intersectObjects(environment.ceilings, false).map((hit) => hit.object),
      );
      for (const ceiling of environment.ceilings) ceiling.visible = !hidden.has(ceiling);
      camera.position.copy(desired);
      camera.lookAt(target);
    },
  };
}
