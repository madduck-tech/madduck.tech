import * as THREE from '../lib/three.module.js';
import { GLTFLoader } from '../lib/loaders/GLTFLoader.js';

export async function loadEnvironment() {
  const loader = new GLTFLoader();
  const [level, helmet, response] = await Promise.all([
    loader.loadAsync(new URL('../models/e1m1.glb', import.meta.url).href),
    loader.loadAsync(new URL('../models/doom-slayer-helmet.glb', import.meta.url).href),
    fetch(new URL('../data/e1m1-navigation.json', import.meta.url)),
  ]);
  if (!response.ok) throw new Error(`Navigation: HTTP ${response.status}`);
  const data = await response.json(),
    root = new THREE.Group();
  const edits = new Map(data.edits.map((e) => [e.index, e]));
  const batches = new Map(),
    ceilings = [],
    walls = [],
    lift = [];
  level.scene.updateMatrixWorld(true);
  let triangle = 0;
  level.scene.traverse((object) => {
    if (!object.isMesh) return;
    const source = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    source.applyMatrix4(object.matrixWorld);
    const position = source.getAttribute('position'),
      normal = source.getAttribute('normal'),
      uv = source.getAttribute('uv');
    for (let i = 0; i < position.count; i += 3, triangle++) {
      const edit = edits.get(triangle),
        down = normal.getY(i) < -0.9;
      const kind = edit?.kind || (down ? 'ceiling' : 'static');
      const key = `${object.material.uuid}/${kind}/${down ? data.triangleSectors[triangle] : ''}`;
      if (!batches.has(key))
        batches.set(key, { kind, positions: [], normals: [], uvs: [], material: object.material });
      const batch = batches.get(key);
      for (let j = i; j < i + 3; j++) {
        batch.positions.push(
          position.getX(j),
          position.getY(j) + (edit?.offset || 0),
          position.getZ(j),
        );
        batch.normals.push(normal.getX(j), normal.getY(j), normal.getZ(j));
        batch.uvs.push(uv.getX(j), uv.getY(j));
      }
    }
    source.dispose();
    object.geometry.dispose();
  });
  if (triangle !== data.triangleSectors.length)
    throw new Error('Level and navigation geometry do not match');
  for (const batch of batches.values()) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(batch.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(batch.uvs, 2));
    const mesh = new THREE.Mesh(geometry, batch.material);
    root.add(mesh);
    if (batch.kind === 'ceiling') ceilings.push(mesh);
    else walls.push(mesh);
    if (batch.kind === 'lift') lift.push(mesh);
  }
  root.scale.setScalar(data.scale);
  root.position.fromArray(data.origin).multiplyScalar(-data.scale);
  const toWorld = (p) =>
    new THREE.Vector3(...p).sub(new THREE.Vector3(...data.origin)).multiplyScalar(data.scale);
  return {
    root,
    data,
    helmet: helmet.scene,
    ceilings,
    walls,
    toWorld,
    updateLift(height) {
      for (const mesh of lift) mesh.position.y = height - data.lift.top;
      root.updateMatrixWorld(true);
    },
  };
}
