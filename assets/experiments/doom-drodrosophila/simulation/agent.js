import { floorAt } from './terrain.js';
export const STEP = 1 / 60;
export const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

export function shortestPath(data, start, end) {
  const previous = new Int32Array(data.nodes.length).fill(-1);
  const queue = [start];
  previous[start] = start;
  for (let i = 0; i < queue.length && previous[end] < 0; i++) {
    for (const next of data.nodes[queue[i]][4])
      if (previous[next] < 0) {
        previous[next] = queue[i];
        queue.push(next);
      }
  }
  if (previous[end] < 0) throw new Error(`Unreachable target ${end}`);
  const path = [end];
  while (path.at(-1) !== start) path.push(previous[path.at(-1)]);
  return path.reverse();
}

export class Agent {
  constructor(data) {
    this.data = data;
    this.reset();
  }
  random() {
    this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  reset() {
    this.seed = 8128;
    this.time = 0;
    this.round = 0;
    this.visits = 0;
    this.distance = 0;
    this.recoveries = 0;
    this.relocations = 0;
    this.stall = 0;
    this.retryCount = 0;
    this.backtracking = false;
    this.node = this.data.spawn;
    this.position = this.data.nodes[this.node].slice(0, 3);
    this.previous = [...this.position];
    this.heading = this.data.heading;
    this.state = 'SCAN';
    this.wait = 1.2;
    this.path = [];
    this.target = null;
    this.outstanding = new Set(this.data.targets.map((t) => t.sector));
    this.region = this.data.nodes[this.node][3];
    this.speed = 0;
    this.signals = { sensory: 1, plan: 0, turn: 0, motor: 0, stop: 1 };
    this.liftHeight = this.data.lift.bottom;
    this.history = [];
  }
  plan() {
    if (!this.outstanding.size) {
      this.round++;
      this.outstanding = new Set(this.data.targets.map((t) => t.sector));
    }
    // Every target remains outstanding until arrival. Seeded nearest-neighbor
    // selection varies each round without turning fairness into a probability.
    const choices = this.data.targets.filter((t) => this.outstanding.has(t.sector));
    const routes = choices.map((target) => ({
      target,
      path: shortestPath(this.data, this.node, target.node),
      jitter: this.random() * 12,
    }));
    routes.sort((a, b) => a.path.length + a.jitter - b.path.length - b.jitter);
    this.target = routes[0].target;
    this.path = routes[0].path.slice(1);
    this.state = 'TURN';
  }
  arrive() {
    if (this.target) {
      this.outstanding.delete(this.target.sector);
      this.visits++;
      this.history.push({ time: this.time, sector: this.target.sector, round: this.round });
      if (this.history.length > 100) this.history.shift();
    }
    this.state = 'INSPECT';
    this.wait = 0.5 + this.random() * 1.5;
    this.target = null;
    this.speed = 0;
    if (!this.backtracking) this.retryCount = 0;
    this.backtracking = false;
  }
  step(dt = STEP) {
    this.previous = [...this.position];
    this.time += dt;
    this.signals = { sensory: 0.45, plan: 0, turn: 0, motor: 0, stop: 0 };
    this.speed = 0;
    if (this.wait > 0) {
      this.wait -= dt;
      this.signals.sensory = 1;
      this.signals.stop = 1;
      if (this.state === 'PLAN') this.signals.plan = 1;
      if (this.wait <= 0 && this.state !== 'PLAN') {
        this.state = 'PLAN';
        this.wait = 0.35;
      }
      return;
    }
    if (this.state === 'PLAN') {
      this.signals.plan = 1;
      this.plan();
      return;
    }
    if (!this.path.length) {
      this.arrive();
      return;
    }
    const next = this.data.nodes[this.path[0]];
    if (!next) throw new Error('Invalid navigation node');
    const dx = next[0] - this.position[0],
      dz = next[2] - this.position[2];
    const horizontal = Math.hypot(dx, dz);
    const vertical = next[1] - this.position[1];
    const onLift = next[3] === 70 && this.region === 70;
    // Bring the platform to the boarding elevation before entering it.
    if (next[3] === 70 && this.region !== 70 && Math.abs(this.liftHeight - next[1]) > 0.01) {
      this.state = 'LIFT';
      this.signals.stop = 1;
      this.liftHeight +=
        Math.sign(next[1] - this.liftHeight) *
        Math.min(Math.abs(next[1] - this.liftHeight), 48 * dt);
      return;
    }
    if (horizontal < 0.01 && Math.abs(vertical) > 0.01 && onLift) {
      this.state = 'LIFT';
      this.signals.stop = 1;
      this.signals.sensory = 1;
      this.position[1] += Math.sign(vertical) * Math.min(Math.abs(vertical), 48 * dt);
      this.liftHeight = this.position[1];
    } else {
      const desired = Math.atan2(-dz, dx),
        angle = wrap(desired - this.heading);
      this.signals.turn = Math.min(1, Math.abs(angle));
      if (Math.abs(angle) > 0.045) {
        this.state = 'TURN';
        this.signals.stop = 1;
        const rotation = Math.sign(angle) * Math.min(Math.abs(angle), 3.2 * dt);
        this.heading = wrap(this.heading + rotation);
        this.distance += Math.abs(rotation) * 8;
        return;
      }
      this.state = 'WALK';
      this.signals.motor = 1;
      // Locomotion consumes the same drive shown in the brain overlay.
      this.speed = 92 * this.signals.motor;
      const movement = Math.min(horizontal, this.speed * dt),
        fraction = horizontal ? movement / horizontal : 1;
      this.position[0] += dx * fraction;
      this.position[2] += dz * fraction;
      // Each grid edge is floor-validated; stair height changes are explicit.
      this.position[1] =
        floorAt(this.data, this.position[0], this.position[2], this.liftHeight) ?? this.position[1];
      this.distance += movement;
      this.stall = movement > 0.001 ? 0 : this.stall + dt;
      if (this.stall > 1.5) {
        if (++this.retryCount > 3) throw new Error('Navigation could not recover');
        this.recoveries++;
        this.stall = 0;
        this.state = 'RECOVER';
        this.signals.motor = 0;
        this.signals.stop = 1;
        this.speed = 0;
        // Return along the same validated segment before selecting a new route.
        // The outstanding target is retained, never silently dropped.
        this.path = [this.node];
        this.target = null;
        this.backtracking = true;
        return;
      }
    }
    if (
      Math.hypot(
        next[0] - this.position[0],
        next[1] - this.position[1],
        next[2] - this.position[2],
      ) < 0.01
    ) {
      this.node = this.path.shift();
      this.position = next.slice(0, 3);
      this.region = next[3];
    }
  }
  snapshot() {
    return {
      time: this.time,
      state: this.state,
      position: [...this.position],
      region: this.region,
      round: this.round,
      visited: this.data.targets.length - this.outstanding.size,
      total: this.data.targets.length,
      recoveries: this.recoveries,
      relocations: this.relocations,
      signals: { ...this.signals },
      history: [...this.history],
    };
  }
}
