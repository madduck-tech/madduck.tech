import fs from 'node:fs';
import { readMap } from './wad.mjs';
import { readTriangles } from './geometry.mjs';

// The reference WAD is an offline verification input, never a deployed asset.
const referencePath = process.argv[2];
if (!referencePath) {
  throw new Error('Usage: node _tools/doom-drodrosophila/build-navigation.mjs /path/to/DOOM1.WAD');
}
const map = readMap(referencePath);
const { triangles } = readTriangles('assets/experiments/doom-drodrosophila/models/e1m1.glb');
const doors = [4, 68, 76, 81],
  excluded = [1, 6, 14, 15, 28, 30, 31, 33, 34, 44, 45, 46, 83];
const sectors = map.sectors.map((s, id) => ({ ...s, id, edges: [] }));
const lines = map.lines.map((l) => ({
  a: [-map.vertices[l.a][0], map.vertices[l.a][1]],
  b: [-map.vertices[l.b][0], map.vertices[l.b][1]],
  r: map.sides[l.right]?.sector ?? -1,
  l: map.sides[l.left]?.sector ?? -1,
  flags: l.flags,
}));
for (const l of lines) {
  if (l.l === l.r) continue;
  if (l.r >= 0) sectors[l.r].edges.push([l.a, l.b]);
  if (l.l >= 0) sectors[l.l].edges.push([l.a, l.b]);
}
export function contains(s, x, z) {
  let inside = false;
  for (const [a, b] of s.edges)
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0])
      inside = !inside;
  return inside;
}
function sectorAt(x, z) {
  return sectors.find((s) => contains(s, x, z));
}
function distance(p, a, b) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
}
const floor = (id, y) => (id === 59 ? -48 : id === 70 ? (y < 28 ? -48 : 104) : sectors[id].floor);
const height = 26,
  radius = 15,
  step = 24;
function blocked(l, y) {
  if (l.l < 0 || l.r < 0 || l.flags & 1 || excluded.includes(l.l) || excluded.includes(l.r))
    return true;
  const a = floor(l.l, y),
    b = floor(l.r, y);
  return (
    Math.abs(a - b) > step ||
    Math.min(
      doors.includes(l.l) ? 160 : sectors[l.l].ceiling,
      doors.includes(l.r) ? 160 : sectors[l.r].ceiling,
    ) -
      Math.max(a, b) <
      height
  );
}
const obstacles = new Map();
function clear(x, z, y) {
  if (!obstacles.has(y))
    obstacles.set(
      y,
      lines.filter((l) => blocked(l, y)),
    );
  return obstacles.get(y).every((l) => distance([x, z], l.a, l.b) >= radius - 0.01);
}
const nodes = [],
  lookup = new Map();
for (let x = -3800; x < 768; x += 16)
  for (let z = -4856; z < -2048; z += 16) {
    const s = sectorAt(x, z);
    if (!s || excluded.includes(s.id)) continue;
    for (const y of s.id === 70 ? [-48, 104] : [floor(s.id, s.floor)]) {
      if (!clear(x, z, y)) continue;
      const n = [x, y, z, s.id, []];
      lookup.set(`${x},${z},${y}`, nodes.length);
      nodes.push(n);
    }
  }
function connect(a, b) {
  if (a === b || a === undefined || b === undefined) return;
  if (!nodes[a][4].includes(b)) nodes[a][4].push(b);
  if (!nodes[b][4].includes(a)) nodes[b][4].push(a);
}
for (let i = 0; i < nodes.length; i++) {
  const [x, y, z, s] = nodes[i];
  for (const [dx, dz] of [
    [16, 0],
    [0, 16],
  ]) {
    const other = sectorAt(x + dx, z + dz);
    if (!other) continue;
    const oy = floor(other.id, y),
      j = lookup.get(`${x + dx},${z + dz},${oy}`);
    if (j === undefined || Math.abs(y - oy) > step) continue;
    let valid = true;
    for (let t = 0; t <= 1; t += 0.125) {
      const px = x + dx * t,
        pz = z + dz * t,
        ss = sectorAt(px, pz);
      if (!ss || !clear(px, pz, Math.max(y, oy))) {
        valid = false;
        break;
      }
    }
    if (valid) connect(i, j);
  }
}
const liftNodes = nodes
  .map((n, i) => [n, i])
  .filter(([n]) => n[3] === 70 && n[1] === -48 && lookup.has(`${n[0]},${n[2]},104`));
const liftCenter = liftNodes.reduce((best, p) =>
  Math.hypot(p[0][0] + 3300, p[0][2] + 3500) < Math.hypot(best[0][0] + 3300, best[0][2] + 3500)
    ? p
    : best,
);
const liftLow = liftCenter[1],
  liftHigh = lookup.get(`${liftCenter[0][0]},${liftCenter[0][2]},104`);
connect(liftLow, liftHigh);
const start = map.things.find((t) => t.type === 1);
const spawn = [-start.x, 0, start.y, sectorAt(-start.x, start.y).id, []];
const spawnId = nodes.length;
nodes.push(spawn);
for (let i = 0; i < spawnId; i++)
  if (nodes[i][3] === spawn[3] && Math.hypot(nodes[i][0] - spawn[0], nodes[i][2] - spawn[2]) < 25)
    connect(i, spawnId);
const seen = new Set([spawnId]),
  queue = [spawnId];
for (let i = 0; i < queue.length; i++)
  for (const j of nodes[queue[i]][4])
    if (!seen.has(j)) {
      seen.add(j);
      queue.push(j);
    }
const sectorCounts = sectors.map((s) => ({
  id: s.id,
  count: nodes.filter((n) => n[3] === s.id).length,
  reachable: nodes.filter((n, i) => n[3] === s.id && seen.has(i)).length,
}));
console.log(
  JSON.stringify(
    {
      nodes: nodes.length,
      reachable: seen.size,
      missing: sectorCounts.filter((s) => !excluded.includes(s.id) && !s.reachable),
      lift: [liftLow, liftHigh],
    },
    null,
    2,
  ),
);
// A target for each traversable sector gives a conservative full region inventory.
const targets = [];
for (const s of sectors) {
  if (excluded.includes(s.id)) continue;
  const candidates = nodes.map((n, i) => [n, i]).filter(([n, i]) => n[3] === s.id && seen.has(i));
  if (!candidates.length) continue;
  const center = candidates.reduce(
    (v, [n]) => [v[0] + n[0] / candidates.length, v[1] + n[2] / candidates.length],
    [0, 0],
  );
  candidates.sort(
    (a, b) =>
      Math.hypot(a[0][0] - center[0], a[0][2] - center[1]) -
      Math.hypot(b[0][0] - center[0], b[0][2] - center[1]),
  );
  targets.push({ sector: s.id, node: candidates[0][1] });
}
// Match GLB triangles to source sectors; partition dynamic surfaces, never whole materials.
const edits = [];
triangles.forEach((t, index) => {
  const c = [0, 1, 2].map((j) => t.v.reduce((v, p) => v + p[j] / 3, 0));
  if (Math.abs(t.normal[1]) > 0.9) {
    const s = sectorAt(c[0], c[2]);
    if (!s) return;
    if (t.normal[1] < 0 && doors.includes(s.id))
      edits.push({
        index,
        kind: 'door',
        offset:
          Math.min(
            ...lines
              .filter((l) => l.l === s.id || l.r === s.id)
              .flatMap((l) => [l.l, l.r])
              .filter((id) => id >= 0 && id !== s.id)
              .map((id) => sectors[id].ceiling),
          ) -
          4 -
          s.ceiling,
      });
    if (t.normal[1] > 0 && s.id === 59) edits.push({ index, kind: 'lower', offset: -144 });
    if (t.normal[1] > 0 && s.id === 70) edits.push({ index, kind: 'lift', offset: 0 });
  } else {
    const matching = lines.filter((l) => distance([c[0], c[2]], l.a, l.b) < 0.01);
    const door = matching.flatMap((l) => [l.r, l.l]).find((id) => doors.includes(id));
    if (door !== undefined && c[1] >= sectors[door].floor && c[1] <= sectors[door].ceiling + 160) {
      const others = lines
        .filter((l) => l.r === door || l.l === door)
        .flatMap((l) => [l.r, l.l])
        .filter((id) => id >= 0 && id !== door);
      const top = Math.min(...others.map((id) => sectors[id].ceiling));
      edits.push({ index, kind: 'door', offset: top - 4 - sectors[door].ceiling });
    } else if (matching.some((l) => l.r === 59 || l.l === 59) && c[1] < 96 && c[1] > -48)
      edits.push({ index, kind: 'lower', offset: -144 });
    else if (matching.some((l) => l.r === 70 || l.l === 70) && c[1] < 104 && c[1] > -48)
      edits.push({ index, kind: 'lift', offset: 0 });
  }
});
const triangleSectors = triangles.map((t) => {
  const x = t.v.reduce((s, v) => s + v[0] / 3, 0),
    z = t.v.reduce((s, v) => s + v[2] / 3, 0);
  return sectorAt(x, z)?.id ?? -1;
});
if (sectorCounts.some((s) => !excluded.includes(s.id) && !s.reachable))
  throw new Error('Region inventory is incomplete');
const out = {
  version: 1,
  scale: 1 / 64,
  origin: [-1056, 0, -3616],
  spawn: spawnId,
  heading: -Math.PI / 2,
  radius,
  height,
  step,
  grid: 16,
  nodes,
  targets,
  sectors,
  lines,
  excluded,
  doors,
  lift: { sector: 70, low: liftLow, high: liftHigh, bottom: -48, top: 104 },
  edits,
  triangleSectors,
  source:
    'E1M1 GLB geometry cross-checked against shareware E1M1 sectors and THINGS; X is reflected.',
};
fs.mkdirSync('assets/experiments/doom-drodrosophila/data', { recursive: true });
fs.writeFileSync(
  'assets/experiments/doom-drodrosophila/data/e1m1-navigation.json',
  JSON.stringify(out),
);
