// Phase 1 (Step 0): shared procedural SceneSpec generator.
// - Pure ESM, no DOM/fs/fetch.
// - Deterministic placeholder output (prompt + seed).
// - Add-only `engine` metadata.

function hashString(value = '') {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(arr, index) {
  if (!arr.length) return null;
  return arr[((index % arr.length) + arr.length) % arr.length];
}

export function generatePhase1SceneSpec({ prompt = '', seed = 0, qualityPresetId = null } = {}) {
  const safePrompt = String(prompt || '').slice(0, 900);
  const safeSeed = Number.isFinite(Number(seed)) ? Number(seed) : 0;
  const h = hashString(`${safePrompt}\n${safeSeed}`);

  const palette = pick(['blue', 'pink', 'green', 'gold', 'purple', 'red', 'gray', 'orange'], h);
  const title = safePrompt
    .toLowerCase()
    .replace(/^(i want you to|make you|turn into|become|look like|be a|be an)\s+/i, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(' ') || 'wild idea';

  // Placeholder body plan that is known to survive existing sanitizers.
  const bodyMaterial = palette === 'green' ? 'glossyGreen'
    : palette === 'pink' ? 'glossyPink'
      : palette === 'gold' ? 'glossyGold'
        : palette === 'purple' ? 'glossyPurple'
          : palette === 'red' ? 'glossyRed'
            : palette === 'orange' ? 'glossyOrange'
              : palette === 'gray' ? 'chrome'
                : 'glossyBlue';

  const layers = [
    { id: 'p1-body', shape: 'mascotBody', anchor: 'free', x: 0, y: 0, scale: [0.62, 0.6], rotate: 0, material: bodyMaterial, role: 'part', z: 2, attach: { socket: 'body.center' } },
    { id: 'p1-leg-l', shape: 'stubbyLeg', anchor: 'free', x: 0, y: -4, scale: [0.21, 0.25], rotate: 0, material: bodyMaterial, role: 'part', z: 4, attach: { socket: 'body.leftHip' } },
    { id: 'p1-leg-r', shape: 'stubbyLeg', anchor: 'free', x: 0, y: -4, scale: [0.21, 0.25], rotate: 0, material: bodyMaterial, role: 'part', z: 4, attach: { socket: 'body.rightHip' } },
    { id: 'p1-foot-l', shape: 'hoof', anchor: 'free', x: 0, y: -4, scale: [0.2, 0.13], rotate: 0, material: 'charcoalRubber', role: 'part', z: 6, attach: { socket: 'body.leftFoot' } },
    { id: 'p1-foot-r', shape: 'hoof', anchor: 'free', x: 0, y: -4, scale: [0.2, 0.13], rotate: 0, material: 'charcoalRubber', role: 'part', z: 6, attach: { socket: 'body.rightFoot' } },
    { id: 'p1-head', shape: 'mascotHead', anchor: 'free', x: 0, y: 0, scale: [0.94, 0.84], rotate: 0, material: bodyMaterial, role: 'part', z: 8, attach: { socket: 'head.center' } },
    { id: 'p1-eye-l', shape: 'cuteEye', anchor: 'free', x: 0, y: 0, scale: [0.24, 0.24], rotate: 0, material: 'softWhite', role: 'eye', z: 20, attach: { socket: 'head.leftEye' } },
    { id: 'p1-eye-r', shape: 'cuteEye', anchor: 'free', x: 0, y: 0, scale: [0.24, 0.24], rotate: 0, material: 'softWhite', role: 'eye', z: 20, attach: { socket: 'head.rightEye' } },
    // Invariant: exactly one mouth layer, attached to head.mouth.
    { id: 'p1-mouth', shape: 'mouthSmile', anchor: 'free', x: 0, y: 14, scale: [0.38, 0.2], rotate: 0, material: 'charcoalRubber', role: 'mouth', z: 31, attach: { socket: 'head.mouth' } },
  ];

  return {
    kind: 'scene',
    prompt: safePrompt,
    title,
    summary: `Phase 1 placeholder scene for: ${title}`.slice(0, 140),
    palette,
    scene: 'scene_sky',
    body: 'body_blob',
    head: 'head_round',
    eyes: 'eyes_cartoon',
    mouth: 'mouth_smile',
    primitives: ['scene_sky', 'body_blob', 'head_round', 'eyes_cartoon', 'mouth_smile'],
    layers,
    engine: {
      id: 'phase1-procedural',
      version: 1,
      seed: safeSeed,
      qualityPresetId: qualityPresetId ?? null,
    },
  };
}
