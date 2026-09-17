import * as THREE from './lib/three.module.js';

document.documentElement.classList.replace('no-js', 'js');

const copy = JSON.parse(document.querySelector('#fly-brain-copy').textContent);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const yellow = new THREE.Color(0xffd400);
const paper = new THREE.Color(0xf4f2ec);
const ink = new THREE.Color(0x000000);
const gray = new THREE.Color(0x5f5f5f);

const ui = {
  loading: document.querySelector('#lab-loading'),
  error: document.querySelector('#webgl-error'),
  play: document.querySelector('#play-toggle'),
  playSymbol: document.querySelector('.play-symbol'),
  playLabel: document.querySelector('.play-label'),
  replay: document.querySelector('#replay'),
  timeline: document.querySelector('#timeline'),
  time: document.querySelector('#time-output'),
  state: document.querySelector('#experiment-state'),
  active: document.querySelector('#active-circuit'),
  scenarioIndex: document.querySelector('#scenario-index'),
  scenarioTitle: document.querySelector('#scenario-title'),
  scenarioDescription: document.querySelector('#scenario-description'),
  phaseItems: [...document.querySelectorAll('#phase-list li')],
  scenarioButtons: [...document.querySelectorAll('.scenario-button')],
  regionKeys: [...document.querySelectorAll('[data-region-key]')],
};

const scenarios = {
  learning: {
    duration: 12,
    phases: [0, 2.1, 4.4, 7.0, 9.5, 12],
    regions: [[], ['sensory'], ['memory'], ['memory', 'dopamine'], ['memory', 'motor']],
    paths: [[], ['sensory'], ['memory'], ['memory', 'dopamine'], ['memory', 'motor']],
  },
  vision: {
    duration: 10,
    phases: [0, 1.7, 3.6, 6.2, 7.8, 10],
    regions: [[], ['sensory'], ['visual'], ['visual'], ['motor']],
    paths: [[], ['sensory'], ['visual'], ['visual'], ['motor']],
  },
  escape: {
    duration: 8,
    phases: [0, 1.3, 2.7, 4.4, 5.4, 8],
    regions: [[], ['sensory'], ['visual'], ['dopamine'], ['motor']],
    paths: [[], ['sensory'], ['visual'], ['dopamine'], ['motor']],
  },
};

let activeScenario = 'learning';
let currentTime = 0;
let playing = false;
let previousFrame = performance.now();
let currentPhase = -1;
let renderReady = false;

function createRenderer(canvas, background) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(background, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

let flyRenderer;
let brainRenderer;

try {
  flyRenderer = createRenderer(document.querySelector('#fly-canvas'), paper);
  brainRenderer = createRenderer(document.querySelector('#brain-canvas'), ink);
} catch (error) {
  ui.loading.classList.add('is-hidden');
  ui.error.hidden = false;
  ui.scenarioButtons.forEach((button) => { button.disabled = true; });
  ui.play.disabled = true;
  ui.replay.disabled = true;
  ui.timeline.disabled = true;
  throw error;
}

function seededRandom(seed = 918273) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function makeLine(points, color = 0x000000, opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  return new THREE.Line(geometry, material);
}

function setupOrbit(canvas, camera, target, config) {
  let yaw = config.yaw;
  let pitch = config.pitch;
  let distance = config.distance;
  let pointer = null;
  let lastX = 0;
  let lastY = 0;

  const update = () => {
    const cp = Math.cos(pitch);
    camera.position.set(
      target.x + Math.cos(yaw) * cp * distance,
      target.y + Math.sin(pitch) * distance,
      target.z + Math.sin(yaw) * cp * distance,
    );
    camera.lookAt(target);
  };

  canvas.addEventListener('pointerdown', (event) => {
    pointer = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(pointer);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointer) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    yaw -= dx * 0.007;
    pitch = THREE.MathUtils.clamp(pitch + dy * 0.006, config.minPitch, config.maxPitch);
    lastX = event.clientX;
    lastY = event.clientY;
    update();
  });

  const release = (event) => {
    if (event.pointerId !== pointer) return;
    if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    pointer = null;
  };

  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  update();
  return { update, get dragging() { return pointer !== null; } };
}

// BODY / ARENA

const flyScene = new THREE.Scene();
flyScene.background = paper;
flyScene.fog = new THREE.Fog(0xf4f2ec, 10, 22);

const flyCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
const flyOrbit = setupOrbit(
  flyRenderer.domElement,
  flyCamera,
  new THREE.Vector3(0, -0.1, 0),
  { yaw: 0.75, pitch: 0.34, distance: 10.8, minPitch: -0.05, maxPitch: 1.05 },
);

flyScene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2.8));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.8);
keyLight.position.set(4, 8, 6);
flyScene.add(keyLight);
const edgeLight = new THREE.DirectionalLight(0xffd400, 0.55);
edgeLight.position.set(-5, 2, -4);
flyScene.add(edgeLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 12),
  new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 1 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.28;
flyScene.add(floor);

const grid = new THREE.GridHelper(18, 18, 0x000000, 0x777777);
grid.position.y = -1.265;
grid.material.transparent = true;
grid.material.opacity = 0.18;
flyScene.add(grid);

const arenaBorder = makeLine([
  new THREE.Vector3(-6, -1.24, -4),
  new THREE.Vector3(6, -1.24, -4),
  new THREE.Vector3(6, -1.24, 4),
  new THREE.Vector3(-6, -1.24, 4),
  new THREE.Vector3(-6, -1.24, -4),
], 0x000000, 0.8);
flyScene.add(arenaBorder);

const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x090909, roughness: 0.9, metalness: 0 });
const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 1 });
const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x353535, roughness: 0.75 });
const wingMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.56,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const fly = new THREE.Group();
fly.position.set(-1.6, 0.08, 0);
fly.rotation.y = -0.1;
flyScene.add(fly);

function addEllipsoid(parent, position, scale, material, detail = 20) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, detail, Math.max(10, detail - 6)), material);
  mesh.position.copy(position);
  mesh.scale.copy(scale);
  parent.add(mesh);
  return mesh;
}

addEllipsoid(fly, new THREE.Vector3(-0.9, 0, 0), new THREE.Vector3(1.22, 0.58, 0.62), bodyMaterial, 24);
addEllipsoid(fly, new THREE.Vector3(0.16, 0.08, 0), new THREE.Vector3(0.72, 0.68, 0.66), bodyMaterial, 22);
addEllipsoid(fly, new THREE.Vector3(0.94, 0.13, 0), new THREE.Vector3(0.56, 0.52, 0.58), bodyMaterial, 20);

for (const side of [-1, 1]) {
  addEllipsoid(fly, new THREE.Vector3(1.16, 0.2, side * 0.42), new THREE.Vector3(0.34, 0.34, 0.12), eyeMaterial, 16);
}

function makeWing(side) {
  const shape = new THREE.Shape();
  shape.moveTo(0.18, 0);
  shape.bezierCurveTo(-0.65, 0.42 * side, -1.7, 0.56 * side, -2.25, 0.12 * side);
  shape.bezierCurveTo(-1.65, -0.12 * side, -0.48, -0.25 * side, 0.18, 0);
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), wingMaterial);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0.1, 0.56, side * 0.24);
  fly.add(mesh);
  return mesh;
}

const wings = [makeWing(-1), makeWing(1)];

const antennaMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
for (const side of [-1, 1]) {
  const antenna = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(1.24, 0.38, side * 0.26),
      new THREE.Vector3(1.62, 0.72, side * 0.38),
      new THREE.Vector3(1.82, 0.63, side * 0.5),
    ]),
    antennaMaterial,
  );
  fly.add(antenna);
}

const legs = [];
const legGeometry = new THREE.CylinderGeometry(0.035, 0.055, 1, 6);

function createLeg(anchorX, side, phase) {
  const hip = new THREE.Group();
  hip.position.set(anchorX, -0.24, side * 0.43);
  fly.add(hip);

  const upper = new THREE.Mesh(legGeometry, jointMaterial);
  upper.scale.y = 0.64;
  upper.position.y = -0.32;
  hip.add(upper);

  const knee = new THREE.Group();
  knee.position.y = -0.64;
  hip.add(knee);

  const lower = new THREE.Mesh(legGeometry, jointMaterial);
  lower.scale.set(0.78, 0.72, 0.78);
  lower.position.y = -0.36;
  knee.add(lower);

  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.42, 5), jointMaterial);
  foot.rotation.z = Math.PI / 2;
  foot.position.set(0.2, -0.69, 0);
  knee.add(foot);

  hip.rotation.x = side * 0.92;
  knee.rotation.x = side * 0.22;
  const leg = { hip, knee, foot, side, phase, anchorX };
  legs.push(leg);
}

[-0.55, 0.05, 0.58].forEach((x, pair) => {
  createLeg(x, -1, pair * 2.1);
  createLeg(x, 1, pair * 2.1 + Math.PI);
});

const stimulus = new THREE.Group();
flyScene.add(stimulus);

const signalMaterial = new THREE.MeshBasicMaterial({ color: yellow, side: THREE.DoubleSide });
const targetCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), signalMaterial);
targetCore.position.y = -0.72;
stimulus.add(targetCore);

const targetRing = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.025, 6, 48), signalMaterial);
targetRing.rotation.x = Math.PI / 2;
targetRing.position.y = -0.77;
stimulus.add(targetRing);

const signalGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(),
  new THREE.Vector3(),
]);
const signalLine = new THREE.Line(
  signalGeometry,
  new THREE.LineDashedMaterial({ color: yellow, dashSize: 0.18, gapSize: 0.12 }),
);
signalLine.computeLineDistances();
flyScene.add(signalLine);

const dustGeometry = new THREE.BufferGeometry();
const dustPoints = [];
const random = seededRandom(4129);
for (let i = 0; i < 150; i += 1) {
  dustPoints.push((random() - 0.5) * 16, random() * 4 - 1, (random() - 0.5) * 10);
}
dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustPoints, 3));
const dust = new THREE.Points(
  dustGeometry,
  new THREE.PointsMaterial({ color: 0x000000, size: 0.018, transparent: true, opacity: 0.28 }),
);
flyScene.add(dust);

// CNS / ACTIVITY

const brainScene = new THREE.Scene();
brainScene.background = ink;
const brainCamera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
const brainOrbit = setupOrbit(
  brainRenderer.domElement,
  brainCamera,
  new THREE.Vector3(0, 0, 0),
  { yaw: 0.35, pitch: 0.1, distance: 8.5, minPitch: -1.1, maxPitch: 1.1 },
);

const brain = new THREE.Group();
brain.rotation.z = -0.04;
brainScene.add(brain);

const brainShellMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: true,
  transparent: true,
  opacity: 0.065,
});

for (const side of [-1, 1]) {
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), brainShellMaterial);
  shell.position.x = side * 0.92;
  shell.scale.set(1.35, 1.55, 1.08);
  brain.add(shell);
}

const neck = new THREE.Mesh(
  new THREE.CylinderGeometry(0.43, 0.26, 2.5, 12, 3, true),
  brainShellMaterial,
);
neck.position.y = -2.15;
brain.add(neck);

const pointPositions = [];
const pointColors = [];
const pointRegions = [];
const brainRandom = seededRandom(821337);

function classifyRegion(x, y, z) {
  if (y < -1.3) return 'motor';
  if (Math.abs(x) > 1.25) return 'sensory';
  if (y > 0.35 && Math.abs(x) < 1.0) return 'memory';
  if (y < -0.45 && Math.abs(x) < 0.72 && z > -0.3) return 'dopamine';
  return 'visual';
}

for (let i = 0; i < 2800; i += 1) {
  const side = brainRandom() < 0.5 ? -1 : 1;
  let x;
  let y;
  let z;
  do {
    x = (brainRandom() * 2 - 1) * 1.25;
    y = (brainRandom() * 2 - 1) * 1.5;
    z = (brainRandom() * 2 - 1) * 1.05;
  } while ((x / 1.25) ** 2 + (y / 1.5) ** 2 + (z / 1.05) ** 2 > 1);
  x += side * 0.92;
  const region = classifyRegion(x, y, z);
  pointPositions.push(x, y, z);
  pointColors.push(0.33, 0.33, 0.33);
  pointRegions.push(region);
}

for (let i = 0; i < 310; i += 1) {
  const x = (brainRandom() - 0.5) * 0.66;
  const y = -1.18 - brainRandom() * 2.1;
  const z = (brainRandom() - 0.5) * (0.72 - (Math.abs(y + 1.18) / 2.1) * 0.36);
  pointPositions.push(x, y, z);
  pointColors.push(0.33, 0.33, 0.33);
  pointRegions.push('motor');
}

const neuronsGeometry = new THREE.BufferGeometry();
neuronsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
neuronsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(pointColors, 3));
const neurons = new THREE.Points(
  neuronsGeometry,
  new THREE.PointsMaterial({
    size: 0.032,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  }),
);
brain.add(neurons);

const pathDefinitions = {
  sensory: [
    new THREE.Vector3(-2.05, 0.15, 0.05),
    new THREE.Vector3(-1.52, 0.46, 0.18),
    new THREE.Vector3(-0.82, 0.18, 0.38),
    new THREE.Vector3(-0.25, 0.38, 0.2),
  ],
  visual: [
    new THREE.Vector3(2.05, 0.12, -0.06),
    new THREE.Vector3(1.38, 0.58, 0.1),
    new THREE.Vector3(0.72, 0.2, 0.35),
    new THREE.Vector3(0.05, -0.1, 0.16),
  ],
  memory: [
    new THREE.Vector3(-0.65, 0.18, 0.2),
    new THREE.Vector3(-0.55, 1.05, 0.42),
    new THREE.Vector3(0, 1.28, 0.12),
    new THREE.Vector3(0.62, 0.88, -0.1),
    new THREE.Vector3(0.42, 0.12, 0.12),
  ],
  dopamine: [
    new THREE.Vector3(-0.1, -0.72, 0.5),
    new THREE.Vector3(-0.22, -0.05, 0.28),
    new THREE.Vector3(0.05, 0.72, 0.16),
    new THREE.Vector3(0.5, 0.94, -0.05),
  ],
  motor: [
    new THREE.Vector3(0.32, 0.05, 0.1),
    new THREE.Vector3(0.1, -0.78, 0.16),
    new THREE.Vector3(-0.02, -1.72, 0.08),
    new THREE.Vector3(0.04, -2.95, 0),
  ],
};

const brainPaths = {};
const pulseGeometry = new THREE.SphereGeometry(0.085, 10, 8);
const pulseMaterial = new THREE.MeshBasicMaterial({ color: yellow });

Object.entries(pathDefinitions).forEach(([name, points], index) => {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(72));
  const material = new THREE.LineBasicMaterial({ color: 0x777777, transparent: true, opacity: 0.24 });
  const line = new THREE.Line(geometry, material);
  const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
  pulse.visible = false;
  brain.add(line, pulse);
  brainPaths[name] = { curve, line, pulse, offset: index * 0.17 };
});

function updatePointColors(activeRegions, intensity = 1) {
  const colors = neuronsGeometry.getAttribute('color');
  const activeSet = new Set(activeRegions);
  for (let i = 0; i < pointRegions.length; i += 1) {
    if (activeSet.has(pointRegions[i])) {
      const lit = i % 3 === 0;
      colors.setXYZ(
        i,
        lit ? 1 : 0.75,
        lit ? 0.83 * intensity : 0.75,
        lit ? 0 : 0.75,
      );
    } else {
      colors.setXYZ(i, 0.27, 0.27, 0.27);
    }
  }
  colors.needsUpdate = true;
}

function resizeRenderer(renderer, camera) {
  const canvas = renderer.domElement;
  const width = Math.max(1, Math.round(canvas.clientWidth));
  const height = Math.max(1, Math.round(canvas.clientHeight));
  const pixelRatio = renderer.getPixelRatio();
  if (canvas.width !== Math.round(width * pixelRatio) || canvas.height !== Math.round(height * pixelRatio)) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function getPhase(scenario, time) {
  for (let i = scenario.phases.length - 2; i >= 0; i -= 1) {
    if (time >= scenario.phases[i]) return i;
  }
  return 0;
}

function phaseProgress(scenario, phase, time) {
  const start = scenario.phases[phase];
  const end = scenario.phases[phase + 1];
  return THREE.MathUtils.clamp((time - start) / (end - start), 0, 1);
}

function smooth(value) {
  return value * value * (3 - 2 * value);
}

function updateFlyPose(time, scenarioName, phase, progress) {
  const gaitActive = phase === 4 || (scenarioName === 'escape' && phase >= 2);
  const gaitSpeed = scenarioName === 'escape' ? 9.5 : 5.2;
  const gaitTime = time * gaitSpeed;

  legs.forEach((leg) => {
    const stride = Math.sin(gaitTime + leg.phase);
    const lift = Math.max(0, Math.sin(gaitTime + leg.phase + 0.8));
    leg.hip.rotation.x = leg.side * (0.88 + lift * 0.13);
    leg.hip.rotation.z = (gaitActive ? stride * 0.34 : Math.sin(time * 1.3 + leg.phase) * 0.035)
      + (leg.anchorX < 0 ? -0.12 : leg.anchorX > 0.3 ? 0.12 : 0);
    leg.knee.rotation.z = 0.42 + (gaitActive ? lift * 0.42 : 0.06);
  });

  wings.forEach((wing, index) => {
    const flight = scenarioName === 'escape' && phase >= 2;
    wing.rotation.z = flight ? Math.sin(time * 42 + index * Math.PI) * 0.32 : Math.sin(time * 1.8) * 0.018;
    wing.material.opacity = flight ? 0.32 : 0.56;
  });

  const idle = reducedMotion ? 0 : Math.sin(time * 2.2) * 0.025;
  fly.position.y = 0.08 + idle;
  fly.rotation.z = Math.sin(time * 1.35) * 0.012;

  if (scenarioName === 'learning') {
    fly.rotation.y = -0.1;
    fly.position.x = phase === 4 ? THREE.MathUtils.lerp(-1.6, 1.2, smooth(progress)) : -1.6;
    fly.position.z = Math.sin(time * 0.6) * 0.08;
  } else if (scenarioName === 'vision') {
    const targetZ = Math.sin(time * 0.85) * 2.35;
    fly.position.x = -1.0;
    fly.position.z = 0;
    fly.rotation.y = phase >= 2 ? THREE.MathUtils.clamp(targetZ * 0.18, -0.62, 0.62) : 0;
  } else {
    fly.rotation.y = Math.PI;
    fly.position.x = phase === 4 ? THREE.MathUtils.lerp(-0.2, -3.8, smooth(progress)) : -0.2;
    fly.position.z = phase === 4 ? Math.sin(progress * Math.PI) * 0.7 : 0;
  }
}

function updateStimulus(time, scenarioName, phase, progress) {
  signalLine.visible = phase === 1 || phase === 2;

  if (scenarioName === 'learning') {
    stimulus.position.set(3.0, 0, -1.25);
    targetCore.scale.setScalar(0.65 + Math.sin(time * 4) * 0.08);
    targetRing.scale.setScalar(0.75 + ((time * 0.5) % 1) * 0.8);
    targetRing.material.opacity = 1;
    targetRing.material.transparent = false;
  } else if (scenarioName === 'vision') {
    stimulus.position.set(2.6, 0.28, Math.sin(time * 0.85) * 2.35);
    targetCore.scale.set(0.55, 1.65, 1.65);
    targetRing.scale.setScalar(0.72 + Math.sin(time * 3) * 0.06);
  } else {
    stimulus.position.set(2.2, 0.5, -0.2);
    const looming = phase < 2 ? 0.5 + progress * 1.4 : 1.9;
    targetCore.scale.setScalar(looming);
    targetRing.scale.setScalar(looming * (1 + 0.12 * Math.sin(time * 8)));
  }

  targetRing.rotation.z = time * 0.35;
  const positions = signalGeometry.getAttribute('position');
  positions.setXYZ(0, stimulus.position.x, stimulus.position.y - 0.1, stimulus.position.z);
  positions.setXYZ(1, fly.position.x + 1.05, fly.position.y + 0.2, fly.position.z);
  positions.needsUpdate = true;
  signalLine.computeLineDistances();
}

function updateBrain(time, activeRegions, activePaths) {
  updatePointColors(activeRegions, 0.9 + Math.sin(time * 9) * 0.1);
  const activeSet = new Set(activePaths);
  Object.entries(brainPaths).forEach(([name, path]) => {
    const active = activeSet.has(name);
    path.line.material.color.set(active ? yellow : gray);
    path.line.material.opacity = active ? 0.9 : 0.24;
    path.pulse.visible = active;
    if (active) {
      const position = path.curve.getPoint((time * 0.42 + path.offset) % 1);
      path.pulse.position.copy(position);
      path.pulse.scale.setScalar(0.85 + Math.sin(time * 12 + path.offset) * 0.18);
    }
  });

  ui.regionKeys.forEach((key) => {
    const name = key.dataset.regionKey;
    key.classList.toggle('is-active', activeRegions.includes(name));
  });
}

function updateInterface(scenario, phase) {
  if (phase !== currentPhase) {
    currentPhase = phase;
    const activeRegions = scenario.regions[phase];
    ui.active.textContent = activeRegions.length
      ? activeRegions.map((region) => copy.regions[region]).join(' + ')
      : copy.active_none;
    ui.state.textContent = copy.steps[ui.phaseItems[phase].dataset.phase];
    ui.phaseItems.forEach((item, index) => {
      item.classList.toggle('is-active', index === phase);
      item.classList.toggle('is-complete', index < phase);
      if (index === phase) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
  }

  ui.timeline.value = String(Math.round((currentTime / scenario.duration) * 1000));
  ui.time.value = `${currentTime.toFixed(1).padStart(4, '0')} / ${scenario.duration.toFixed(1)} S`;
}

function updateScene() {
  const scenario = scenarios[activeScenario];
  const phase = getPhase(scenario, currentTime);
  const progress = phaseProgress(scenario, phase, currentTime);
  updateFlyPose(currentTime, activeScenario, phase, progress);
  updateStimulus(currentTime, activeScenario, phase, progress);
  updateBrain(currentTime, scenario.regions[phase], scenario.paths[phase]);
  updateInterface(scenario, phase);
}

function setPlaying(next) {
  playing = next;
  ui.play.setAttribute('aria-pressed', String(playing));
  ui.playSymbol.textContent = playing ? 'Ⅱ' : '▶';
  ui.playLabel.textContent = playing ? copy.pause : copy.run;
}

function reset(play = false) {
  currentTime = 0;
  currentPhase = -1;
  setPlaying(play);
  updateScene();
}

function selectScenario(name) {
  activeScenario = name;
  const keys = Object.keys(scenarios);
  const index = keys.indexOf(name);
  const content = copy.scenarios[name];
  ui.scenarioIndex.textContent = `EXP. ${String(index + 1).padStart(2, '0')}`;
  ui.scenarioTitle.textContent = content.title;
  ui.scenarioDescription.textContent = content.description;
  ui.scenarioButtons.forEach((button) => {
    const active = button.dataset.scenario === name;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  reset(true);
}

ui.play.addEventListener('click', () => {
  const duration = scenarios[activeScenario].duration;
  if (currentTime >= duration) currentTime = 0;
  setPlaying(!playing);
});

ui.replay.addEventListener('click', () => reset(true));

ui.timeline.addEventListener('input', () => {
  setPlaying(false);
  currentTime = (Number(ui.timeline.value) / 1000) * scenarios[activeScenario].duration;
  currentPhase = -1;
  updateScene();
});

ui.scenarioButtons.forEach((button) => {
  button.addEventListener('click', () => selectScenario(button.dataset.scenario));
});

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
  if (event.code === 'Space') {
    event.preventDefault();
    ui.play.click();
  } else if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
    event.preventDefault();
    const direction = event.code === 'ArrowRight' ? 1 : -1;
    const duration = scenarios[activeScenario].duration;
    currentTime = THREE.MathUtils.clamp(currentTime + direction * 0.4, 0, duration);
    setPlaying(false);
    currentPhase = -1;
    updateScene();
  }
});

function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min((now - previousFrame) / 1000, 0.05);
  previousFrame = now;

  if (playing && !document.hidden) {
    currentTime += delta;
    const duration = scenarios[activeScenario].duration;
    if (currentTime >= duration) {
      currentTime = duration;
      setPlaying(false);
    }
  }

  updateScene();
  resizeRenderer(flyRenderer, flyCamera);
  resizeRenderer(brainRenderer, brainCamera);

  if (!reducedMotion && !brainOrbit.dragging) {
    brain.rotation.y += delta * 0.035;
  }
  dust.rotation.y += reducedMotion ? 0 : delta * 0.012;

  flyRenderer.render(flyScene, flyCamera);
  brainRenderer.render(brainScene, brainCamera);

  if (!renderReady) {
    renderReady = true;
    ui.loading.classList.add('is-hidden');
  }
}

updateScene();
flyOrbit.update();
brainOrbit.update();
requestAnimationFrame(animate);
