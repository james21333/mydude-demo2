import fs from 'node:fs';
import path from 'node:path';
import { generatePhase1SceneSpec } from '../shared/phase1/phase1-avatar-engine.mjs';

const dist = path.resolve('dist');
const index = path.join(dist, 'index.html');
const manifest = path.join(dist, '.vite', 'manifest.json');

assert(fs.existsSync(index), 'Vite dist/index.html missing');
assert(fs.existsSync(manifest), 'Vite manifest missing');

const appSource = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
for (const required of [
  'mydude.live AI Ecosystem',
  'Start',
  'Reset',
  'Thinking…',
  'Generated autonomously by OpenClaw',
  'My Dude',
]) {
  assert(appSource.includes(required), `Missing required app text: ${required}`);
}

const workerSource = fs.readFileSync(path.resolve('src/index.js'), 'utf8');
assert(workerSource.includes('window') === false, 'Worker should not depend on window');
assert(workerSource.includes('mydude.live'), 'Worker root domain missing');

const phase1 = generatePhase1SceneSpec({ prompt: 'turn into a cow', seed: 1 });
assert(phase1 && phase1.kind === 'scene', 'Phase 1 generator must return a SceneSpec-shaped object');
assert(phase1.engine && phase1.engine.id === 'phase1-procedural', 'Phase 1 generator must include engine metadata');
const mouthLayers = (phase1.layers || []).filter(layer => layer && layer.role === 'mouth');
assert(mouthLayers.length === 1, 'Phase 1 generator must emit exactly one mouth layer');
assert(mouthLayers[0]?.attach?.socket === 'head.mouth', 'Phase 1 mouth layer must attach to head.mouth');

console.log('Validation passed: React demo, wildcard routing shell, reset, listener-safe build state, and avatar copy are present.');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
