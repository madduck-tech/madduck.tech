import * as THREE from '../lib/three.module.js';

export function createFly(helmet) {
  const root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  root.scale.setScalar(0.8);
  // Lower the torso with the shorter legs, keeping its underside above the floor.
  body.position.y = -0.09;
  const legScale = 0.5;
  const hipDrop = (0.2 - 0.006) * (1 - legScale);
  const dark = new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.85 });
  const wingMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8d8d8,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.6,
    depthWrite: false,
  });
  function ellipsoid(position, scale, material = dark) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    body.add(mesh);
    return mesh;
  }
  ellipsoid([-0.1, 0.2, 0], [0.135, 0.105, 0.105]);
  ellipsoid([0.045, 0.22, 0], [0.105, 0.12, 0.1]);
  // Source GLB is Y-up. Normalize its actual world bounds without changing UVs.
  helmet.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(helmet),
    center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  helmet.position.sub(center);
  const head = new THREE.Group();
  head.add(helmet);
  head.scale.setScalar(0.225 / size.y);
  head.rotation.y = 0;
  head.position.set(0.17, 0.265, 0);
  body.add(head);
  const wings = [-1, 1].map((side) => {
    const wing = ellipsoid([-0.08, 0.3, side * 0.095], [0.185, 0.008, 0.065], wingMaterial);
    wing.rotation.y = side * 0.32;
    return wing;
  });
  const legs = [],
    material = new THREE.MeshStandardMaterial({ color: 0x535353, roughness: 1 });
  const segmentGeometry = new THREE.CylinderGeometry(0.009, 0.012, 1, 6);
  const up = new THREE.Vector3(0, 1, 0);
  function segment() {
    const mesh = new THREE.Mesh(segmentGeometry, material);
    root.add(mesh);
    return mesh;
  }
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++)
      legs.push({
        side,
        i,
        upper: segment(),
        lower: segment(),
        upperLength: Math.hypot(0.07, 0.095) * legScale,
        lowerLength: Math.hypot((1 - i) * 0.04, 0.124, 0.02) * legScale,
      });
  function link(mesh, a, b) {
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.scale.y = a.distanceTo(b);
    mesh.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
  }
  function bendLeg(leg, hip, knee, foot) {
    // Two fixed-length segments: a lower stair tread must never stretch a leg.
    const axis = foot.clone().sub(hip);
    const requested = axis.length();
    if (requested < 1e-8) axis.set(0, -1, 0);
    else axis.divideScalar(requested);
    const { upperLength: a, lowerLength: b } = leg;
    const reach = THREE.MathUtils.clamp(requested, Math.abs(a - b) + 1e-6, a + b - 1e-6);
    const bend = knee.clone().sub(hip);
    bend.addScaledVector(axis, -bend.dot(axis));
    if (bend.lengthSq() < 1e-10) {
      bend.set(0, 0, leg.side);
      bend.addScaledVector(axis, -bend.dot(axis));
      if (bend.lengthSq() < 1e-10) bend.set(1, 0, 0);
    }
    bend.normalize();
    const along = (a * a - b * b + reach * reach) / (2 * reach);
    knee
      .copy(hip)
      .addScaledVector(axis, along)
      .addScaledVector(bend, Math.sqrt(Math.max(0, a * a - along * along)));
    // Out-of-reach feet stay airborne until a tread is within reach again.
    foot.copy(hip).addScaledVector(axis, reach);
  }
  const antennaMaterial = new THREE.LineBasicMaterial({ color: 0xb0b0b0 });
  const antennae = [-1, 1].map((side) => {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0.22, 0.32, side * 0.07),
        new THREE.Vector3(0.31, 0.4, side * 0.09),
        new THREE.Vector3(0.34, 0.38, side * 0.11),
      ]),
      antennaMaterial,
    );
    body.add(line);
    return line;
  });
  return {
    root,
    update(agent, ground) {
      const phase = agent.distance / 9;
      const stepping = agent.speed > 0 || agent.state === 'TURN';
      for (const leg of legs) {
        const p = phase + (leg.i % 2 ? Math.PI : 0) + (leg.side > 0 ? Math.PI : 0);
        const stride = stepping ? Math.cos(p) * 0.035 : 0;
        const lift = stepping ? Math.max(0, Math.sin(p)) * 0.05 : 0;
        const x = 0.1 - leg.i * 0.09;
        const hip = new THREE.Vector3(x, 0.2, leg.side * 0.065);
        const knee = new THREE.Vector3(x + stride, 0.13, leg.side * 0.16);
        const foot = new THREE.Vector3(
          x + stride + (1 - leg.i) * 0.04,
          0.006 + lift,
          leg.side * 0.18,
        );
        // Contract both segments around the hip before adapting to the terrain.
        knee.sub(hip).multiplyScalar(legScale).add(hip);
        foot.sub(hip).multiplyScalar(legScale).add(hip);
        hip.y -= hipDrop;
        knee.y -= hipDrop;
        foot.y -= hipDrop;
        foot.y += ground(foot.x, foot.z);
        bendLeg(leg, hip, knee, foot);
        link(leg.upper, hip, knee);
        link(leg.lower, knee, foot);
      }
      antennae.forEach((a, i) => {
        a.rotation.x = agent.signals.sensory * Math.sin(agent.time * 4 + i) * 0.04;
      });
      wings.forEach((w, i) => {
        w.rotation.x = (i ? 1 : -1) * 0.08;
      });
    },
  };
}
