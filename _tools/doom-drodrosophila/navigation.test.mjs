import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  Agent,
  STEP,
  shortestPath,
} from '../../assets/experiments/doom-drodrosophila/simulation/agent.js';
import {
  floorAt,
  sectorAt,
} from '../../assets/experiments/doom-drodrosophila/simulation/terrain.js';
import { readTriangles } from './geometry.mjs';
const data = JSON.parse(
  fs.readFileSync('assets/experiments/doom-drodrosophila/data/e1m1-navigation.json'),
);
const { triangles } = readTriangles('assets/experiments/doom-drodrosophila/models/e1m1.glb');
const editMap = new Map(data.edits.map((e) => [e.index, e]));

test('inventory, verified spawn, and connected bidirectional graph', () => {
  assert.deepEqual(data.nodes[data.spawn].slice(0, 3), [-1056, 0, -3616]);
  assert.equal(data.targets.length, 72);
  assert.equal(data.targets.length + data.excluded.length, data.sectors.length);
  const seen = new Set([data.spawn]),
    queue = [data.spawn];
  for (let i = 0; i < queue.length; i++)
    for (const j of data.nodes[queue[i]][4]) {
      assert.ok(Number.isInteger(j) && data.nodes[j]);
      assert.ok(data.nodes[j][4].includes(queue[i]));
      if (!seen.has(j)) {
        seen.add(j);
        queue.push(j);
      }
    }
  assert.equal(seen.size, data.nodes.length);
  for (const target of data.targets) assert.equal(data.nodes[target.node][3], target.sector);
});

test('every graph node has support in the supplied GLB or the moving lift', () => {
  function inside(t, x, z) {
    const [a, b, c] = t.v,
      sign = (p, q) => (x - q[0]) * (p[2] - q[2]) - (p[0] - q[0]) * (z - q[2]);
    const ds = [sign(a, b), sign(b, c), sign(c, a)];
    return !(ds.some((v) => v < -0.01) && ds.some((v) => v > 0.01));
  }
  const floors = triangles
    .map((t, i) => ({ ...t, edit: editMap.get(i) }))
    .filter((t) => t.normal[1] > 0.9);
  const missing = [];
  for (const [x, y, z, sector] of data.nodes) {
    const floor = floors.find(
      (t) => inside(t, x, z) && Math.abs(t.v[0][1] + (t.edit?.offset || 0) - y) < 0.01,
    );
    if (!floor && sector !== 70) missing.push([x, y, z, sector]);
  }
  assert.equal(missing.length, 0, JSON.stringify(missing.slice(0, 20)));
});

test('all edges preserve clearance and floor support; only lift edges are vertical', () => {
  function distance(p, a, b) {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
  }
  const floor = (id, y) =>
    id === 59 ? -48 : id === 70 ? (y < 28 ? -48 : 104) : data.sectors[id].floor;
  const blocks = (l, y) =>
    l.l < 0 ||
    l.r < 0 ||
    l.flags & 1 ||
    data.excluded.includes(l.l) ||
    data.excluded.includes(l.r) ||
    Math.abs(floor(l.l, y) - floor(l.r, y)) > data.step;
  const byHeight = new Map();
  for (let i = 0; i < data.nodes.length; i++)
    for (const j of data.nodes[i][4]) {
      if (i > j) continue;
      const a = data.nodes[i],
        b = data.nodes[j];
      if (a[0] === b[0] && a[2] === b[2]) {
        assert.equal(a[3], 70);
        assert.equal(b[3], 70);
        continue;
      }
      assert.ok(Math.abs(a[1] - b[1]) <= data.step);
      const y = Math.max(a[1], b[1]);
      if (!byHeight.has(y))
        byHeight.set(
          y,
          data.lines.filter((l) => blocks(l, y)),
        );
      for (let k = 0; k <= 8; k++) {
        const p = [a[0] + ((b[0] - a[0]) * k) / 8, a[2] + ((b[2] - a[2]) * k) / 8];
        assert.ok(sectorAt(data, ...p));
        for (const l of byHeight.get(y))
          assert.ok(distance(p, l.a, l.b) >= data.radius - 0.01, `Clearance ${i} -> ${j}`);
      }
    }
});

test('two deterministic rounds, causal signals, bounded history, no relocation', () => {
  const a = new Agent(data),
    b = new Agent(data),
    rounds = [new Set(), new Set()];
  let priorVisits = 0,
    steps = 0;
  // Bound = worst shortest route per target + rotation per grid edge + pauses
  // and two full lift cycles per target. It does not depend on observed runtime.
  const longest =
    Math.max(...data.targets.map((t) => shortestPath(data, data.spawn, t.node).length)) * 2;
  const bound =
    2 * data.targets.length * (longest * (16 / 92 + Math.PI / 3.2) + 3 + (2 * 152) / 48);
  const limit = Math.ceil(bound / STEP);
  for (; a.round < 2 && steps < limit; steps++) {
    const previous = a.snapshot();
    a.step();
    b.step();
    if (a.visits > priorVisits) {
      const event = a.history.at(-1);
      if (event.round < 2) rounds[event.round].add(event.sector);
      priorVisits = a.visits;
    }
    if (a.state === 'WALK') assert.equal(a.signals.motor, 1);
    if (a.state === 'TURN') assert.equal(a.signals.motor, 0);
    assert.ok(a.history.length <= 100);
    assert.ok(
      Math.hypot(a.position[0] - previous.position[0], a.position[2] - previous.position[2]) <=
        92 * STEP + 0.01,
    );
    const height = floorAt(data, a.position[0], a.position[2], a.liftHeight);
    assert.ok(Math.abs(a.position[1] - height) < 0.01);
  }
  assert.equal(a.round, 2);
  assert.deepEqual(a.snapshot(), b.snapshot());
  assert.equal(rounds[0].size, 72);
  assert.equal(rounds[1].size, 72);
  assert.equal(a.relocations, 0);
  console.log(
    `Two rounds: ${a.time.toFixed(2)} simulation seconds; analytical bound ${bound.toFixed(0)} s.`,
  );
  a.reset();
  assert.deepEqual(a.snapshot(), new Agent(data).snapshot());
});

test('stalled targets stay outstanding and retries are bounded without teleporting', () => {
  const broken = structuredClone(data);
  const start = broken.nodes[broken.spawn];
  const duplicate = broken.nodes.length;
  broken.nodes.push([start[0], start[1] + 1, start[2], start[3], [broken.spawn]]);
  start[4] = [duplicate];
  broken.targets = [{ sector: start[3], node: duplicate }];
  const agent = new Agent(broken);
  assert.throws(() => {
    for (let i = 0; i < 10000; i++) agent.step();
  }, /could not recover/);
  assert.equal(agent.outstanding.size, 1);
  assert.equal(agent.relocations, 0);
  assert.deepEqual(agent.position, start.slice(0, 3));
});
