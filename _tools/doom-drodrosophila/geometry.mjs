import fs from 'node:fs';
import * as THREE from '../../assets/experiments/doom-drodrosophila/lib/three.module.js';

// Offline reader for the supplied, uncompressed GLB. Keep the original untouched.
export function readTriangles(path) {
  const b = fs.readFileSync(path);
  const size = b.readUInt32LE(12);
  const gltf = JSON.parse(b.subarray(20, 20 + size));
  const bin = b.subarray(28 + size);
  function accessor(index) {
    const a = gltf.accessors[index],
      v = gltf.bufferViews[a.bufferView];
    const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const bytes = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[a.componentType];
    const method = {
      5126: 'readFloatLE',
      5125: 'readUInt32LE',
      5123: 'readUInt16LE',
      5121: 'readUInt8',
    }[a.componentType];
    return Array.from({ length: a.count }, (_, i) =>
      Array.from({ length: n }, (_, c) =>
        bin[method](
          (v.byteOffset || 0) + (a.byteOffset || 0) + i * (v.byteStride || n * bytes) + c * bytes,
        ),
      ),
    );
  }
  const triangles = [];
  function walk(index, parent) {
    const node = gltf.nodes[index];
    const matrix = node.matrix
      ? new THREE.Matrix4().fromArray(node.matrix)
      : new THREE.Matrix4().compose(
          new THREE.Vector3(...(node.translation || [0, 0, 0])),
          new THREE.Quaternion(...(node.rotation || [0, 0, 0, 1])),
          new THREE.Vector3(...(node.scale || [1, 1, 1])),
        );
    matrix.premultiply(parent);
    for (const p of gltf.meshes?.[node.mesh]?.primitives || []) {
      const points = accessor(p.attributes.POSITION).map((p) =>
        new THREE.Vector3(...p).applyMatrix4(matrix),
      );
      const indices =
        p.indices === undefined ? points.map((_, i) => i) : accessor(p.indices).flat();
      for (let i = 0; i < indices.length; i += 3) {
        const v = indices
          .slice(i, i + 3)
          .map((j) => points[j].toArray().map((x) => Math.round(x * 1000) / 1000));
        const normal = new THREE.Triangle(...v.map((p) => new THREE.Vector3(...p)))
          .getNormal(new THREE.Vector3())
          .toArray();
        triangles.push({ v, normal, material: gltf.materials[p.material].name, node: node.name });
      }
    }
    for (const child of node.children || []) walk(child, matrix);
  }
  for (const root of gltf.scenes[gltf.scene || 0].nodes) walk(root, new THREE.Matrix4());
  return { triangles, gltf };
}
