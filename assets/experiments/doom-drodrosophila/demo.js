import * as THREE from './lib/three.module.js';
import { loadEnvironment } from './scene/environment.js';
import { createFly } from './scene/fly.js';
import { createBrain } from './scene/brain.js';
import { createCamera } from './scene/camera.js';
import { Agent, STEP } from './simulation/agent.js';
import { floorAt } from './simulation/terrain.js';

const copy = JSON.parse(document.querySelector('#experiment-copy').textContent);
const $ = (id) => document.getElementById(id);
const controls = ['play-toggle', 'replay', 'reset-view', 'speed'].map($);
const signalElements = [...document.querySelectorAll('[data-signal]')].map((element) => ({
  name: element.dataset.signal,
  element,
  meter: element.querySelector('meter'),
}));
const supportOffsets = [
  [10, 0],
  [-10, 0],
  [0, 10],
  [0, -10],
];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let playing = !motion.matches,
  speed = 1,
  ready = false,
  firstFrameRendered = false,
  failed = false;
let frame,
  accumulator = 0,
  previousTime = performance.now(),
  lastStatus = 0;
let environment, agent, fly, brain, cameraRig, renderer, brainRenderer;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x181818);
scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 2.3));
const light = new THREE.DirectionalLight(0xffffff, 2.4);
light.position.set(3, 8, 4);
scene.add(light);

function fail(error) {
  failed = true;
  ready = false;
  cancelAnimationFrame(frame);
  $('lab-loading').hidden = true;
  $('webgl-error').hidden = false;
  for (const control of controls) control.disabled = true;
  renderer?.dispose();
  brainRenderer?.dispose();
  console.error('Fly exploration could not continue:', error);
}
$('retry').addEventListener('click', () => location.reload());
function status(force = false) {
  if (!force && performance.now() - lastStatus < 600) return;
  lastStatus = performance.now();
  $('play-toggle').textContent = playing ? `Ⅱ ${copy.pause}` : `▶ ${copy.run}`;
  $('play-toggle').setAttribute('aria-pressed', String(playing));
  const text = playing ? copy.states[agent.state] : copy.pause;
  if ($('experiment-state').textContent !== text) $('experiment-state').textContent = text;
  $('current-region').textContent = String(agent.region).padStart(2, '0');
  $('coverage-count').textContent =
    `${agent.data.targets.length - agent.outstanding.size}/${agent.data.targets.length}`;
  for (const { name, element, meter } of signalElements) {
    const value = agent.signals[name];
    element.classList.toggle('is-active', value > 0.6);
    meter.value = value;
  }
}
function toggle() {
  if (!ready) return;
  playing = !playing;
  accumulator = 0;
  status(true);
}
function reset() {
  if (!ready) return;
  agent.reset();
  accumulator = 0;
  cameraRig.resetView();
  status(true);
}
$('play-toggle').addEventListener('click', toggle);
$('replay').addEventListener('click', reset);
$('reset-view').addEventListener('click', () => cameraRig?.resetView());
$('speed').addEventListener('change', (e) => {
  speed = Number(e.target.value);
  accumulator = 0;
});
$('experiment').addEventListener('keydown', (e) => {
  if (e.target.closest('button,select,input,textarea,a,[contenteditable="true"]') || e.repeat)
    return;
  if (e.code === 'Space') {
    e.preventDefault();
    toggle();
  }
  if (e.code === 'KeyR') {
    e.preventDefault();
    reset();
  }
  if (e.code === 'KeyF') {
    e.preventDefault();
    cameraRig?.resetView();
  }
});
document.addEventListener('visibilitychange', () => {
  previousTime = performance.now();
  accumulator = 0;
});
motion.addEventListener('change', () => {
  if (motion.matches) {
    playing = false;
    accumulator = 0;
    if (ready) status(true);
  }
});
function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    fail(new Error('WebGL context lost'));
  });
  return renderer;
}
function resize(renderer, camera) {
  const canvas = renderer.domElement,
    width = canvas.clientWidth,
    height = canvas.clientHeight;
  if (!width || !height) return;
  const ratio = renderer.getPixelRatio();
  if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio))
    renderer.setSize(width, height, false);
  const aspect = width / height;
  if (camera.aspect !== aspect) {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
}
function tick(time) {
  if (failed) return;
  frame = requestAnimationFrame(tick);
  const dt = Math.min((time - previousTime) / 1000, 0.1);
  previousTime = time;
  if (document.hidden || !ready) return;
  if (playing) {
    accumulator = Math.min(accumulator + dt * speed, 0.25);
    try {
      while (accumulator >= STEP) {
        agent.step();
        accumulator -= STEP;
      }
    } catch (error) {
      fail(error);
      return;
    }
  }
  const alpha = playing ? accumulator / STEP : 1;
  const p = agent.position.map((x, i) => agent.previous[i] + (x - agent.previous[i]) * alpha);
  // Clear stair noses; feet contact reachable treads without stretching their bones.
  const support = Math.max(
    p[1],
    ...supportOffsets.map(([x, z]) => {
      const y = floorAt(agent.data, p[0] + x, p[2] + z, agent.liftHeight);
      return y !== null && Math.abs(y - p[1]) <= agent.data.step ? y : p[1];
    }),
  );
  fly.root.position.copy(environment.toWorld([p[0], support, p[2]]));
  fly.root.rotation.y = agent.heading;
  const cos = Math.cos(agent.heading),
    sin = Math.sin(agent.heading),
    flyToMap = fly.root.scale.x / agent.data.scale;
  fly.update(agent, (x, z) => {
    const wx = p[0] + (x * cos + z * sin) * flyToMap,
      wz = p[2] + (-x * sin + z * cos) * flyToMap;
    const y = floorAt(agent.data, wx, wz, agent.liftHeight);
    return y === null ? 0 : (y - support) / flyToMap;
  });
  environment.updateLift(agent.liftHeight);
  brain.update(agent);
  cameraRig.update(fly.root.position, dt, motion.matches);
  resize(renderer, cameraRig.camera);
  resize(brainRenderer, brain.camera);
  try {
    renderer.render(scene, cameraRig.camera);
    brainRenderer.render(brain.scene, brain.camera);
  } catch (error) {
    fail(error);
    return;
  }
  if (failed) return;
  if (!firstFrameRendered) {
    firstFrameRendered = true;
    $('lab-loading').hidden = true;
    for (const control of controls) control.disabled = false;
  }
  status();
}
try {
  renderer = makeRenderer($('fly-canvas'));
  brainRenderer = makeRenderer($('brain-canvas'));
  environment = await loadEnvironment();
  agent = new Agent(environment.data);
  const visited = new Set([agent.node]),
    queue = [agent.node];
  for (let i = 0; i < queue.length; i++)
    for (const next of agent.data.nodes[queue[i]][4])
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
  if (agent.data.targets.some((t) => !visited.has(t.node)))
    throw new Error('Incomplete coverage graph');
  scene.add(environment.root);
  fly = createFly(environment.helmet);
  scene.add(fly.root);
  brain = createBrain();
  cameraRig = createCamera($('fly-canvas'), environment);
  ready = true;
  status(true);
  previousTime = performance.now();
  frame = requestAnimationFrame(tick);
  if (new URLSearchParams(location.search).has('debug'))
    window.flyLab = {
      snapshot: () => ({
        ...agent.snapshot(),
        playing,
        speed,
        following: cameraRig.following,
        resources: {
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
          drawCalls: renderer.info.render.calls,
        },
      }),
    };
} catch (error) {
  fail(error);
}
window.addEventListener('pagehide', () => {
  cancelAnimationFrame(frame);
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted && ready) {
    previousTime = performance.now();
    frame = requestAnimationFrame(tick);
  }
});
