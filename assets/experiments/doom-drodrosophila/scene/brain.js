import * as THREE from '../lib/three.module.js';

export function createBrain() {
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 30);
  camera.position.set(0, 0, 8);
  camera.lookAt(0, -0.3, 0);
  const shell = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.09,
  });
  const positions = [],
    channels = [],
    colors = [];
  let seed = 8128;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (const side of [-1, 1]) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), shell);
    mesh.position.x = side * 0.8;
    mesh.scale.set(1.1, 1.25, 0.8);
    scene.add(mesh);
    for (let i = 0; i < 900; i++) {
      let x, y, z;
      do {
        x = random() * 2 - 1;
        y = random() * 2 - 1;
        z = random() * 2 - 1;
      } while (x * x + y * y + z * z > 1);
      x = x * 1.1 + side * 0.8;
      y *= 1.25;
      z *= 0.8;
      positions.push(x, y, z);
      colors.push(0.3, 0.3, 0.3);
      channels.push(Math.abs(x) > 1.1 ? 'sensory' : y > 0.35 ? 'plan' : y < -0.6 ? 'stop' : 'turn');
    }
  }
  for (let i = 0; i < 220; i++) {
    positions.push((random() - 0.5) * 0.4, -1 - random() * 1.5, (random() - 0.5) * 0.35);
    colors.push(0.3, 0.3, 0.3);
    channels.push('motor');
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  scene.add(
    new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.042, vertexColors: true })),
  );
  const definitions = {
    sensory: [
      [-1.8, 0.1, 0],
      [-0.7, 0.1, 0.3],
      [0, 0.35, 0.4],
    ],
    plan: [
      [0, 0.2, 0.4],
      [-0.5, 0.9, 0.2],
      [0.5, 0.9, 0.2],
      [0, 0, 0.4],
    ],
    turn: [
      [1.7, 0.1, 0],
      [0.7, 0.3, 0.4],
      [0, -0.3, 0.4],
    ],
    motor: [
      [0, 0.2, 0.3],
      [0, -1, 0.3],
      [0, -2.4, 0],
    ],
    stop: [
      [-0.6, -0.6, 0.3],
      [0.6, -0.6, 0.3],
    ],
  };
  const paths = Object.entries(definitions).map(([name, points]) => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(32)),
      new THREE.LineBasicMaterial({ color: 0x666666 }),
    );
    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd400 }),
    );
    scene.add(line, pulse);
    return { name, curve, line, pulse };
  });
  return {
    scene,
    camera,
    update(agent) {
      const attribute = geometry.getAttribute('color');
      for (let i = 0; i < channels.length; i++) {
        const signal = agent.signals[channels[i]];
        if (signal > 0.6 && i % 3 === 0) attribute.setXYZ(i, 1, 0.83, 0);
        else {
          const v = 0.19 + signal * 0.45;
          attribute.setXYZ(i, v, v, v);
        }
      }
      attribute.needsUpdate = true;
      for (const p of paths) {
        const signal = agent.signals[p.name];
        p.line.material.color.setHex(signal > 0.6 ? 0xffd400 : 0x444444);
        p.pulse.visible = signal > 0.6;
        p.pulse.position.copy(p.curve.getPoint((agent.time * 0.65) % 1));
      }
    },
  };
}
