import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../assets/experiments/doom-drodrosophila/lib/three.module.js';
import { createFly } from '../../assets/experiments/doom-drodrosophila/scene/fly.js';
import { createCamera } from '../../assets/experiments/doom-drodrosophila/scene/camera.js';

const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const vectorNear = (actual, expected) => near(actual.distanceTo(expected), 0);
const makeFly = () => createFly(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));

test('helmet turns 90 degrees right from its original orientation', () => {
  const fly = makeFly();
  fly.root.updateMatrixWorld(true);
  const body = fly.root.children[0];
  const head = body.children.find((child) => child.isGroup);
  near(head.rotation.y - Math.PI / 2, -Math.PI / 2);
  const bounds = new THREE.Box3().setFromObject(body.children[0]);
  assert.ok(bounds.min.y >= 0, 'Lowered abdomen stays above the floor');
});

test('all twelve leg segments keep half their original resting length during gait', () => {
  const fly = makeFly();
  for (const speed of [0, 1]) {
    const agent = { distance: 17, speed, state: 'WALK', time: 0, signals: { sensory: 0 } };
    fly.update(agent, () => 0);
    let index = 1;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const p = agent.distance / 9 + (i % 2 ? Math.PI : 0) + (side > 0 ? Math.PI : 0);
        const lift = speed ? Math.max(0, Math.sin(p)) * 0.05 : 0;
        const x = 0.1 - i * 0.09;
        const hip = new THREE.Vector3(x, 0.2, side * 0.065);
        const knee = new THREE.Vector3(x, 0.13, side * 0.16);
        const foot = new THREE.Vector3(x + (1 - i) * 0.04, 0.006, side * 0.18);
        near(fly.root.children[index++].scale.y, hip.distanceTo(knee) / 2);
        const lower = fly.root.children[index++];
        near(lower.scale.y, knee.distanceTo(foot) / 2);
        const endpoint = new THREE.Vector3(0, 0.5 * lower.scale.y, 0)
          .applyQuaternion(lower.quaternion)
          .add(lower.position);
        near(endpoint.y, 0.006 + lift / 2);
      }
    }
  }
});

test('stairs and lift gaps cannot extend leg bones or disconnect joints', () => {
  const fly = makeFly();
  const agent = { distance: 0, speed: 1, state: 'WALK', time: 0, signals: { sensory: 0 } };
  const endpoint = (mesh, sign) =>
    new THREE.Vector3(0, sign * 0.5 * mesh.scale.y, 0)
      .applyQuaternion(mesh.quaternion)
      .add(mesh.position);
  for (const height of [-152, -24, -16, -8, 0, 8, 16, 24]) {
    for (let phase = 0; phase < 32; phase++) {
      agent.distance = (phase * 9 * Math.PI) / 16;
      fly.update(agent, (x) => (x < 0 ? height / (64 * 0.8) : 0));
      for (let n = 0; n < 6; n++) {
        const i = n % 3;
        const upper = fly.root.children[1 + n * 2];
        const lower = fly.root.children[2 + n * 2];
        near(upper.scale.y, Math.hypot(0.07, 0.095) / 2);
        near(lower.scale.y, Math.hypot((1 - i) * 0.04, 0.124, 0.02) / 2);
        vectorNear(endpoint(upper, 1), endpoint(lower, -1));
        assert.ok(
          endpoint(upper, -1).distanceTo(endpoint(lower, 1)) <= upper.scale.y + lower.scale.y,
        );
        if (height <= -8 && i === 2) {
          assert.ok(
            endpoint(lower, 1).y > height / (64 * 0.8) + 0.006,
            'Unreachable lower tread leaves the foot airborne, not elongated',
          );
        }
      }
    }
  }
});

test('shortened feet sample terrain at their actual contact coordinates', () => {
  const fly = makeFly(),
    contacts = [];
  fly.update({ distance: 0, speed: 0, state: 'IDLE', time: 0, signals: { sensory: 0 } }, (x, z) => {
    contacts.push([x, z]);
    return 0.02;
  });
  assert.equal(contacts.length, 6);
  for (let i = 0; i < 6; i++) {
    const lower = fly.root.children[2 + i * 2];
    const endpoint = new THREE.Vector3(0, 0.5 * lower.scale.y, 0)
      .applyQuaternion(lower.quaternion)
      .add(lower.position);
    vectorNear(endpoint, new THREE.Vector3(contacts[i][0], 0.026, contacts[i][1]));
  }
});

test('mouse and touch orbit stay attached and reset restores the initial view', () => {
  for (const pointerType of ['mouse', 'touch']) {
    const events = new Map();
    const canvas = { addEventListener: (name, fn) => events.set(name, fn), setPointerCapture() {} };
    const rig = createCamera(canvas, { walls: [], ceilings: [] });
    const start = new THREE.Vector3();
    rig.update(start, 1 / 60, true);
    const initial = rig.camera.position.clone();
    const event = { button: 0, pointerId: 1, pointerType, clientX: 0, clientY: 0 };
    events.get('pointerdown')(event);
    events.get('pointermove')({ ...event, clientX: 70, clientY: 10 });
    events.get('pointerup')(event);
    rig.update(start, 1 / 60, true);
    const orbited = rig.camera.position.clone();
    assert.ok(orbited.distanceTo(initial) > 0.5, 'Drag changes the angle');
    const destination = new THREE.Vector3(5, 2, -3);
    rig.update(destination, 1 / 60, true);
    vectorNear(rig.camera.position, orbited.clone().add(destination));
    const direction = new THREE.Vector3();
    rig.camera.getWorldDirection(direction);
    vectorNear(
      direction,
      destination
        .clone()
        .add(new THREE.Vector3(0, 0.1, 0))
        .sub(rig.camera.position)
        .normalize(),
    );
    assert.equal(rig.following, true);
    rig.resetView();
    rig.update(destination, 1 / 60, true);
    vectorNear(rig.camera.position, initial.clone().add(destination));
    // Normal-motion smoothing also converges to the moving target after orbit.
    for (let i = 0; i < 240; i++) rig.update(start, 1 / 60, false);
    vectorNear(rig.camera.position, initial);
  }
});
