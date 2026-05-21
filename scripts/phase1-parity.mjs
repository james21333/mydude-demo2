import crypto from 'node:crypto';
import { generatePhase1SceneSpec } from '../shared/phase1/phase1-avatar-engine.mjs';

// Phase 1 Step 2b: bridge/browser parity + invariant verification.
// This script is intentionally isolated from runtime codepaths.
// It verifies that the shared Phase 1 generator is deterministic for the same
// {prompt, seed} inputs and that core invariants always hold.

const CASES = [
  { prompt: 'turn into a cow', seed: 1 },
  { prompt: 'turn into a sailboat', seed: 42 },
  { prompt: 'become a computer', seed: 999 },
];

for (const c of CASES) {
  const a = generatePhase1SceneSpec({ prompt: c.prompt, seed: c.seed, qualityPresetId: null });
  const b = generatePhase1SceneSpec({ prompt: c.prompt, seed: c.seed, qualityPresetId: null });

  assertDeepEqual(a, b, `generator must be deterministic for prompt=${JSON.stringify(c.prompt)} seed=${c.seed}`);
  assertSceneInvariants(a, `prompt=${JSON.stringify(c.prompt)} seed=${c.seed}`);
}

console.log('Phase 1 parity passed: deterministic generator + invariants.');

function assertSceneInvariants(spec, label) {
  assert(spec && typeof spec === 'object', `${label}: spec must be an object`);
  assert(spec.kind === 'scene', `${label}: spec.kind must be "scene"`);
  assert(spec.engine && spec.engine.id === 'phase1-procedural', `${label}: spec.engine.id must be "phase1-procedural"`);

  const layers = Array.isArray(spec.layers) ? spec.layers : [];
  const mouthLayers = layers.filter(layer => layer && layer.role === 'mouth');
  assert(mouthLayers.length === 1, `${label}: must emit exactly one mouth layer`);
  assert(mouthLayers[0]?.attach?.socket === 'head.mouth', `${label}: mouth layer must attach to head.mouth`);
}

function assertDeepEqual(a, b, message) {
  const ha = stableHash(a);
  const hb = stableHash(b);
  assert(ha === hb, message);
}

function stableHash(value) {
  // JSON stringify ordering is stable for our current generator output.
  // Hashing keeps the diff compact if this ever fails.
  const json = JSON.stringify(value);
  return crypto.createHash('sha256').update(json).digest('hex');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
