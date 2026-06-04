import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { generatePhase1SceneSpec } from '../shared/phase1/phase1-avatar-engine.mjs';

const PORT = Number(process.env.PORT || 8788);
const execFileAsync = promisify(execFile);
const REPO_ROOT = '/home/josh/.openclaw/repos/mydude-demo2';
const ALLOWED_ORIGIN = process.env.MYDUDE_ALLOWED_ORIGIN || 'https://demo2.mydude.live';
const MODEL = 'gpt-4o-mini';
function isPhase1BridgeEnabled() {
  return process.env.MYDUDE_PHASE1 === '1';
}
const PHASE1_BRIDGE_ENABLED = isPhase1BridgeEnabled();

const AGENT_DIR = process.env.MYDUDE_AGENT_DIR || '/home/josh/.openclaw/bridge-demo2/mydude-speaker-agent';
const AUTH_PROFILE = '/home/josh/.openclaw/agents/main/agent/auth-profiles.json';
const SERVER_CONFIG_PATH = path.join(AGENT_DIR, 'server-config.json');

let copilotTokenCache = null;
const sessionProfiles = new Map();


const DRAWING_GRAMMAR_PATH = path.join(REPO_ROOT, 'shared/avatar-drawing-grammar.json');
const DRAWING_GRAMMAR = JSON.parse(readFileSync(DRAWING_GRAMMAR_PATH, 'utf8'));
const QUALITY_PRESETS = JSON.parse(readFileSync(path.join(REPO_ROOT, 'shared/avatar-quality-presets.json'), 'utf8'));
const QUALITY_PRESET_HINTS = (QUALITY_PRESETS.presets || []).map(p => `${p.id}: ${p.summary}`).join(' | ');
const DRAWING_SHAPES = new Set(DRAWING_GRAMMAR.shapes || []);
const DRAWING_MATERIALS = new Set(DRAWING_GRAMMAR.materials || []);
const DRAWING_ANCHORS = new Set(DRAWING_GRAMMAR.anchors || []);
const ATTACHMENT_SOCKET_NAMES = new Set(DRAWING_GRAMMAR.rules?.attachmentMath?.sockets || []);
const DRAWING_PROMPT = `Use these polished house-style presets when relevant: ${QUALITY_PRESET_HINTS}. 3D cartoon drawing grammar ${DRAWING_GRAMMAR.version}. Return JSON with title, summary, palette, scene, body, head, eyes, mouth, primitives, and layers. layers is an array of up to 32 objects: {shape, anchor, x, y, scale:[sx,sy], rotate, material, role, z, attach:{socket}}. For mascot pieces prefer attach.socket and use x/y as small local offsets. Use only shapes: ${DRAWING_GRAMMAR.shapes.join(', ')}. Use only anchors: ${DRAWING_GRAMMAR.anchors.join(', ')}. Use only materials: ${DRAWING_GRAMMAR.materials.join(', ')}. Coordinates are -280..280. Required: visible face and one mouth layer with role:"mouth" attached to head.mouth when using mascot parts. Follow the house-style process: build one connected mascot silhouette first (body, overlapping head, attached limbs), then face, then details; never leave core limbs/hooves/ears/spots/patches floating like stickers; details should be embedded into or overlapping their parent surfaces. If a detail cannot be convincingly attached, omit it instead of rendering a floating artifact. Make it look like dimensional glossy 3D cartoon pieces, not flat icon art. Ignore backgrounds. For real people, do symbolic safe caricature/vibe only, not exact likeness.`;

function clampSceneNumber(value, min, max, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}
function materialForText(text = '') {
  const lower = text.toLowerCase();
  if (/pink|dudette/.test(lower)) return 'glossyPink';
  if (/green|cow|farm|tree|leaf/.test(lower)) return 'glossyGreen';
  if (/gold|yellow|idea|lightbulb|sun/.test(lower)) return 'glossyGold';
  if (/purple|alien|space/.test(lower)) return 'glossyPurple';
  if (/red|car|fire/.test(lower)) return 'glossyRed';
  if (/orange|cat|kitten/.test(lower)) return 'glossyOrange';
  if (/computer|monitor|robot|metal/.test(lower)) return 'chrome';
  if (/boat|sail/.test(lower)) return 'canvas';
  return 'glossyBlue';
}
function sceneLayer(shape, anchor, x, y, sx, sy, material, options = {}) { return { shape, anchor, x, y, scale: [sx, sy], material, ...options }; }

const SOCKET_COMPATIBILITY = Object.freeze({
  mascotBody: ['body.center'], mascotHead: ['head.center'],
  stubbyArm: ['body.leftShoulder', 'body.rightShoulder', 'body.leftHand', 'body.rightHand'], wing: ['body.leftShoulder', 'body.rightShoulder'], finLimb: ['body.leftShoulder', 'body.rightShoulder'], noodleArm: ['body.leftShoulder', 'body.rightShoulder'], tentacle: ['body.leftShoulder', 'body.rightShoulder', 'body.leftHand', 'body.rightHand'],
  stubbyLeg: ['body.leftHip', 'body.rightHip'], leg: ['body.leftHip', 'body.rightHip'], boot: ['body.leftFoot', 'body.rightFoot'], hoof: ['body.leftHand', 'body.rightHand', 'body.leftFoot', 'body.rightFoot'],
  paw: ['body.leftHand', 'body.rightHand', 'body.leftFoot', 'body.rightFoot'], mitten: ['body.leftHand', 'body.rightHand'], claw: ['body.leftHand', 'body.rightHand'],
  softEar: ['head.leftEar', 'head.rightEar'], animalEar: ['head.leftEar', 'head.rightEar'], softHorn: ['head.leftHorn', 'head.rightHorn'], horn: ['head.leftHorn', 'head.rightHorn'], antenna: ['head.leftHorn', 'head.rightHorn'],
  cuteEye: ['head.leftEye', 'head.rightEye'], googlyEye: ['head.leftEye', 'head.rightEye'], eyeBall: ['head.leftEye', 'head.rightEye'], pixelEye: ['head.leftEye', 'head.rightEye'], sleepyEye: ['head.leftEye', 'head.rightEye'], heartEye: ['head.leftEye', 'head.rightEye'], starEye: ['head.leftEye', 'head.rightEye'],
  snout: ['head.mouth'], beak: ['head.mouth'], mouthSmile: ['head.mouth'], mouthGrin: ['head.mouth'], mouthO: ['head.mouth'], mouthScreen: ['head.mouth'], mouthGrille: ['head.mouth'],
  bodyPatch: ['body.patchLeft', 'body.patchRight', 'head.patchLeft'], attachedSpot: ['body.patchLeft', 'body.patchRight', 'head.patchLeft'], spot: ['body.patchLeft', 'body.patchRight', 'head.patchLeft'], stripe: ['body.front', 'body.center'], panel: ['body.front', 'body.center'], button: ['body.front'], tie: ['body.front'], bowtie: ['body.front'], badge: ['body.front'],
});
const FLOATING_ARTIFACT_SHAPES = new Set(['hoof', 'paw', 'claw', 'softEar', 'animalEar', 'softHorn', 'horn', 'snout', 'bodyPatch', 'attachedSpot', 'spot', 'stripe', 'panel', 'button', 'badge']);
function sideFromRaw(raw = {}, fallback = 'left') { const text = `${raw.id || ''} ${raw.anchor || ''} ${raw.attach?.socket || ''}`.toLowerCase(); if (/right/.test(text) || Number(raw.x) > 0) return 'right'; if (/left/.test(text) || Number(raw.x) < 0) return 'left'; return fallback; }
function inferSocket(shape, raw = {}, role = 'part') {
  if (role === 'mouth' || /^mouth/.test(shape)) return 'head.mouth';
  if (role === 'eye' || /eye/i.test(shape)) return sideFromRaw(raw) === 'right' ? 'head.rightEye' : 'head.leftEye';
  if (shape === 'mascotBody') return 'body.center'; if (shape === 'mascotHead') return 'head.center';
  if (/ear/i.test(shape)) return sideFromRaw(raw) === 'right' ? 'head.rightEar' : 'head.leftEar';
  if (/horn|antenna/i.test(shape)) return sideFromRaw(raw) === 'right' ? 'head.rightHorn' : 'head.leftHorn';
  if (/snout|beak/i.test(shape)) return 'head.mouth';
  if (/hoof/.test(shape) && /hand|arm|shoulder/i.test(`${raw.id || ''} ${raw.anchor || ''} ${raw.attach?.socket || ''}`)) return sideFromRaw(raw) === 'right' ? 'body.rightHand' : 'body.leftHand';
  if (/hoof|boot/.test(shape)) return sideFromRaw(raw) === 'right' ? 'body.rightFoot' : 'body.leftFoot';
  if (/stubbyLeg|leg/.test(shape)) return sideFromRaw(raw) === 'right' ? 'body.rightHip' : 'body.leftHip';
  if (/arm|mitten|paw|claw|tentacle|flipper|wing|finLimb/.test(shape)) return sideFromRaw(raw) === 'right' ? 'body.rightHand' : 'body.leftHand';
  if (/patch|spot|stripe|panel|button|badge/.test(shape)) return sideFromRaw(raw) === 'right' ? 'body.patchRight' : 'body.patchLeft';
  if (/tie|bowtie/.test(shape)) return 'body.front';
  return null;
}
function normalizeAttach(raw, shape, role) { const requested = raw?.attach && typeof raw.attach === 'object' ? String(raw.attach.socket || '') : ''; const allowed = SOCKET_COMPATIBILITY[shape]; if (requested && ATTACHMENT_SOCKET_NAMES.has(requested) && (!allowed || allowed.includes(requested))) return { socket: requested }; const inferred = inferSocket(shape, raw, role); if (inferred && ATTACHMENT_SOCKET_NAMES.has(inferred) && (!allowed || allowed.includes(inferred))) return { socket: inferred }; return null; }

function matchQualityPreset(text = '') {
  const lower = text.toLowerCase();
  return (QUALITY_PRESETS.presets || []).find(preset => (preset.match || []).some(token => lower.includes(String(token).toLowerCase()))) || null;
}

function presetSceneSpec(text = '') {
  const preset = matchQualityPreset(text);
  if (!preset) return null;
  const base = fallbackSceneSpec(text, { skipPreset: true });
  return { ...base, title: preset.title, summary: preset.summary, palette: preset.palette || base.palette, layers: sanitizeDrawingLayers(preset.layers, text) };
}

function fallbackDrawingLayers(text = '', options = {}) {
  const preset = !options.skipPreset ? matchQualityPreset(text) : null;
  if (preset?.layers?.length) return preset.layers;
  const l = text.toLowerCase(); const mat = materialForText(text);
  const eyeShape = /funny|idea|abstract|silly/.test(l) ? 'googlyEye' : /computer|robot|screen/.test(l) ? 'pixelEye' : 'cuteEye';
  const mouthShape = /computer|robot|screen/.test(l) ? 'mouthScreen' : /funny|idea|abstract|joke/.test(l) ? 'mouthGrin' : /bird|duck|chicken/.test(l) ? 'beak' : 'mouthSmile';
  const bodyMaterial = /idea|funny|abstract|joke/.test(l) ? 'glossyGold' : mat;
  const layers = [
    sceneLayer('shadow','ground',0,6,.98,.18,'shadow',{opacity:.24,z:-10}),
    sceneLayer('mascotBody','free',0,0,.62,.6,bodyMaterial,{z:2,attach:{socket:'body.center'}}),
    sceneLayer('stubbyLeg','free',0,-4,.21,.25,bodyMaterial,{z:4,attach:{socket:'body.leftHip'}}),
    sceneLayer('stubbyLeg','free',0,-4,.21,.25,bodyMaterial,{z:4,attach:{socket:'body.rightHip'}}),
    sceneLayer('hoof','free',0,-4,.2,.13,'charcoalRubber',{z:6,attach:{socket:'body.leftFoot'}}),
    sceneLayer('hoof','free',0,-4,.2,.13,'charcoalRubber',{z:6,attach:{socket:'body.rightFoot'}}),
    sceneLayer('mascotHead','free',0,0,.94,.84,bodyMaterial,{z:8,attach:{socket:'head.center'}}),
  ];
  if (!/computer|monitor|screen|car|boat|sail|rocket/.test(l)) layers.push(sceneLayer('stubbyArm','free',-2,0,.22,.26,bodyMaterial,{rotate:-10,z:5,attach:{socket:'body.leftHand'}}), sceneLayer('stubbyArm','free',2,0,.22,.26,bodyMaterial,{rotate:10,z:5,attach:{socket:'body.rightHand'}}));
  if (/cat|dog|bear|rabbit|bunny|animal|mouse|fox|tiger|lion|elephant/.test(l)) layers.push(sceneLayer('softEar','free',-3,6,.34,.42,bodyMaterial,{rotate:-24,z:9,attach:{socket:'head.leftEar'}}), sceneLayer('softEar','free',3,6,.34,.42,bodyMaterial,{rotate:24,z:9,attach:{socket:'head.rightEar'}}));
  if (/dragon|unicorn|goat|horn|devil|monster/.test(l)) layers.push(sceneLayer('softHorn','free',0,0,.18,.34,'canvas',{rotate:-8,z:10,attach:{socket:'head.leftHorn'}}), sceneLayer('softHorn','free',0,0,.18,.34,'canvas',{rotate:8,z:10,attach:{socket:'head.rightHorn'}}));
  if (/alien|robot|bug|insect/.test(l)) layers.push(sceneLayer('antenna','free',0,0,.22,.36,'neon',{rotate:-18,z:10,attach:{socket:'head.leftHorn'}}), sceneLayer('antenna','free',0,0,.22,.36,'neon',{rotate:18,z:10,attach:{socket:'head.rightHorn'}}));
  if (/cow|dog|pig|bear|mouse|fox|cat|animal/.test(l)) layers.push(sceneLayer('snout','free',0,-2,.42,.24,'warmCream',{z:24,attach:{socket:'head.mouth'}}));
  if (/spot|cow|dog|dalmatian|pattern/.test(l)) layers.push(sceneLayer('bodyPatch','free',0,0,.3,.22,'charcoalRubber',{rotate:-10,z:11,attach:{socket:'body.patchLeft'}}), sceneLayer('bodyPatch','free',0,0,.23,.16,'charcoalRubber',{rotate:8,z:11,attach:{socket:'body.patchRight'}}));
  if (/computer|monitor|screen/.test(l)) layers.push(sceneLayer('screen','free',0,2,.5,.28,'screenGlow',{z:13,attach:{socket:'body.front'}}), sceneLayer('button','free',-20,28,.14,.14,'glossyRed',{z:14,attach:{socket:'body.front'}}));
  if (/car|truck|vehicle/.test(l)) layers.push(sceneLayer('carBody','ground',0,-34,.7,.3,'glossyRed',{z:13}), sceneLayer('wheel','ground',-50,-20,.25,.25,'charcoalRubber',{z:15}), sceneLayer('wheel','ground',50,-20,.25,.25,'charcoalRubber',{z:15}));
  if (/sail|boat|ship/.test(l)) layers.push(sceneLayer('hull','ground',0,-34,.72,.26,'wood',{z:13}), sceneLayer('curvedSail','free',8,-20,.45,.62,'canvas',{z:12,attach:{socket:'head.rightHorn'}}));
  if (/rocket|spaceship|space ship/.test(l)) layers.push(sceneLayer('rocket','free',0,-12,.38,.54,'glossyPurple',{z:13,attach:{socket:'body.front'}}));
  if (/idea|funny|abstract|joke/.test(l)) layers.push(sceneLayer('question','orbit',-158,-120,.36,.36,'neon',{z:12}), sceneLayer('spark','orbit',156,-150,.42,.42,'glossyGold',{z:12}));
  if (/zebra|stripe|striped/.test(l)) layers.push(sceneLayer('stripe','free',-10,-12,.42,.24,'charcoalRubber',{rotate:-18,z:12,attach:{socket:'body.front'}}), sceneLayer('stripe','free',10,14,.34,.2,'charcoalRubber',{rotate:-18,z:12,attach:{socket:'body.patchRight'}}));
  if (/skateboard|skate board/.test(l)) layers.push(sceneLayer('roundedBox','ground',0,-28,.78,.16,'wood',{z:14}), sceneLayer('wheel','ground',-58,-14,.24,.24,'charcoalRubber',{z:15}), sceneLayer('wheel','ground',58,-14,.24,.24,'charcoalRubber',{z:15}));
  if (/\b(dragon|bird|bat|wing|wings)\b/.test(l)) layers.push(sceneLayer('wing','free',-8,4,.42,.34,bodyMaterial,{rotate:-22,z:3,attach:{socket:'body.leftShoulder'}}), sceneLayer('wing','free',8,4,.42,.34,bodyMaterial,{rotate:22,z:3,attach:{socket:'body.rightShoulder'}}));
  layers.push(sceneLayer(eyeShape,'free',0,0,.24,.24,'softWhite',{role:'eye',z:20,attach:{socket:'head.leftEye'}}), sceneLayer(eyeShape,'free',0,0,.24,.24,'softWhite',{role:'eye',z:20,attach:{socket:'head.rightEye'}}), sceneLayer(mouthShape,'free',0,mouthShape === 'mouthGrin' ? 12 : 18,mouthShape === 'beak' ? .38 : .38,mouthShape === 'beak' ? .22 : .2,'charcoalRubber',{role:'mouth',z:31,attach:{socket:'head.mouth'}}));
  return layers;
}
function sanitizeDrawingLayers(rawLayers, text = '') {
  const initialSource = Array.isArray(rawLayers) && rawLayers.length ? rawLayers : fallbackDrawingLayers(text);
  const hasCore = initialSource.some(raw => raw?.shape === 'mascotBody' || raw?.shape === 'mascotHead');
  const source = !hasCore ? fallbackDrawingLayers(text, { skipPreset: true }) : initialSource;
  const cleaned = source.slice(0, DRAWING_GRAMMAR.rules?.maxLayers || 42).map((raw, index) => {
    const shape = DRAWING_SHAPES.has(raw?.shape) ? raw.shape : 'blob';
    if (shape === 'shadow') return null;
    const role = raw?.role === 'mouth' ? 'mouth' : raw?.role === 'eye' ? 'eye' : 'part';
    const attach = normalizeAttach(raw, shape, role);
    if (!attach && FLOATING_ARTIFACT_SHAPES.has(shape) && (!raw?.anchor || raw.anchor === 'free' || raw.anchor === 'orbit')) return null;
    const rawScale = Array.isArray(raw?.scale) ? raw.scale : [raw?.sx, raw?.sy];
    const baseScale = [clampSceneNumber(rawScale?.[0], .05, 3.2, 1), clampSceneNumber(rawScale?.[1], .05, 3.2, 1)];
    const scale = shape === 'mascotHead' ? [Math.max(baseScale[0], .9), Math.max(baseScale[1], .78)] : shape === 'mascotBody' ? [Math.min(baseScale[0], .68), Math.min(baseScale[1], .66)] : baseScale;
    return {
      id: String(raw?.id || `${shape}-${index}`).slice(0, 32),
      shape,
      anchor: attach ? 'free' : DRAWING_ANCHORS.has(raw?.anchor) ? raw.anchor : 'free',
      x: clampSceneNumber(raw?.x, -280, 280, 0), y: clampSceneNumber(raw?.y, -280, 280, 0),
      scale,
      rotate: clampSceneNumber(raw?.rotate, -180, 180, 0),
      material: DRAWING_MATERIALS.has(raw?.material) ? raw.material : materialForText(text),
      opacity: clampSceneNumber(raw?.opacity, .08, 1, 1),
      role,
      z: clampSceneNumber(raw?.z, -20, 40, index),
      attach,
    };
  }).filter(Boolean);
  if (!cleaned.some(item => item.role === 'mouth')) cleaned.push(sceneLayer('mouthSmile','free',0,18,.38,.2,'charcoalRubber',{role:'mouth',z:30,attach:{socket:'head.mouth'}}));
  return cleaned.sort((a,b)=>(a.z||0)-(b.z||0));
}



const SCENE_PRIMITIVES = Object.freeze([
  'body_blob','body_capsule','body_box','body_sphere','body_triangle','body_star','body_cloud','body_flame','body_crystal','body_monitor','body_car','body_boat','body_plane','body_rocket','body_house','body_tree','body_mushroom','body_book','body_phone','body_lightbulb','head_round','head_square','head_screen','head_animal','head_bird','head_fish','head_reptile','head_flower','head_planet','head_helmet','head_crown','head_hat','head_hair','head_mask','head_skull','eyes_dot','eyes_googly','eyes_sleepy','eyes_star','eyes_heart','eyes_pixel','eyes_windshield','eyes_porthole','eyes_cyclops','eyes_glasses','eyes_sunglasses','eyes_binocular','eyes_robot','eyes_cat','eyes_cartoon','mouth_smile','mouth_grin','mouth_screen','mouth_grille','mouth_beak','mouth_snout','mouth_tusk','mouth_fang','mouth_wave','mouth_speaker','mouth_mustache','mouth_tongue','limb_arm','limb_wing','limb_fin','limb_tentacle','limb_branch','limb_wheel','limb_track','limb_leg','limb_boot','limb_claw','limb_paw','limb_flipper','limb_propeller','limb_rope','accessory_hat','accessory_cap','accessory_crown','accessory_tie','accessory_bowtie','accessory_cape','accessory_backpack','accessory_toolbelt','accessory_badge','accessory_flag','accessory_microphone','accessory_sword','accessory_wand','accessory_umbrella','accessory_balloon','accessory_book','accessory_headphones','accessory_antenna','accessory_halo','accessory_lightning','texture_stripes','texture_spots','texture_stars','texture_grid','texture_circuit','texture_wood','texture_metal','texture_glass','texture_fur','texture_scales','texture_feathers','texture_cloud','texture_flame','texture_water','texture_leaf','scene_sky','scene_space','scene_ocean','scene_farm','scene_city','scene_desert','scene_forest','scene_jungle','scene_castle','scene_lab','scene_office','scene_stage','scene_road','scene_mountain','scene_beach','scene_underwater','scene_volcano','scene_snow','scene_candy','scene_dream','object_sun','object_moon','object_star','object_cloud','object_rainbow','object_tree','object_flower','object_rock','object_wave','object_anchor','object_podium','object_flag','object_keyboard','object_mouse','object_orbit','object_satellite','object_comet','object_gear','object_wire','object_spark','symbol_question','symbol_exclamation','symbol_idea','symbol_joke','symbol_music','symbol_heart','symbol_laugh','symbol_magic','symbol_money','symbol_time','symbol_map','symbol_compass','symbol_code'
]);

const SCENE_SCHEMA = `Return only compact JSON with keys: title, summary, palette, scene, body, head, eyes, mouth, primitives, layers. palette one of blue,pink,green,gold,purple,red,gray,orange. scene/body/head/eyes/mouth/primitives must use only these primitive ids: ${SCENE_PRIMITIVES.join(', ')}. ${DRAWING_PROMPT} Use symbolic approximation for real people: never exact likeness; for George H W Bush use presidential elder-statesman cartoon cues like gray hair, suit, tie, podium, flag, elder-statesman vibe. For abstract requests, map the idea to visual metaphors.`;

function wantsSceneSpec(text = '') {
  return /\b(look like|make (you|him|it)|avatar|turn into|become|transform|change into|be a|be an|computer|sailboat|boat|car|truck|cow|animal|monster|dragon|funny idea|abstract|appearance)\b/i.test(text);
}

function fallbackSceneSpec(text = '', options = {}) {
  if (!options.skipPreset) { const preset = presetSceneSpec(text); if (preset) return preset; }
  const lower = text.toLowerCase();
  const pick = (...pairs) => pairs.find(([rx]) => rx.test(lower))?.[1];
  const scene = pick([/boat|sail|ocean|sea/, 'scene_ocean'], [/car|road|truck/, 'scene_road'], [/cow|farm|pasture/, 'scene_farm'], [/space|alien|rocket/, 'scene_space'], [/computer|robot/, 'scene_lab'], [/funny|joke|idea|abstract/, 'scene_stage'], [/bush|president|statesman/, 'scene_city']) || 'scene_sky';
  const body = pick([/computer|monitor/, 'body_monitor'], [/boat|sail/, 'body_boat'], [/car|truck/, 'body_car'], [/rocket/, 'body_rocket'], [/idea|abstract|funny/, 'body_lightbulb']) || 'body_blob';
  const head = pick([/computer|robot|car/, 'head_screen'], [/cow|animal|cat|dog/, 'head_animal'], [/bush|president|statesman/, 'head_hair']) || 'head_round';
  const eyes = pick([/computer|robot/, 'eyes_pixel'], [/car/, 'eyes_windshield'], [/funny|idea|abstract/, 'eyes_googly']) || 'eyes_cartoon';
  const mouth = pick([/car/, 'mouth_grille'], [/computer|robot/, 'mouth_screen'], [/funny|idea|abstract/, 'mouth_grin'], [/cow|animal/, 'mouth_snout']) || 'mouth_smile';
  const palette = pick([/pink/, 'pink'], [/green|cow|farm/, 'green'], [/gold|yellow|idea/, 'gold'], [/purple|space|alien/, 'purple'], [/red|car/, 'red'], [/gray|computer|bush|president/, 'gray']) || 'blue';
  return { title: lower.replace(/[^a-z0-9\s-]/g, '').split(/\s+/).slice(-5).join(' ') || 'wild idea', summary: 'Fast 3D cartoon transformation', palette, scene, body, head, eyes, mouth, primitives: [scene, body, head, eyes, mouth, 'object_spark'], layers: fallbackDrawingLayers(text) };
}

function sanitizeSceneSpec(raw, text = '', options = {}) {
  const preset = options.skipPreset ? null : presetSceneSpec(text);
  if (preset) return preset;
  const allowed = new Set(SCENE_PRIMITIVES);
  const fallback = fallbackSceneSpec(text, { skipPreset: Boolean(options.skipPreset) });
  const clean = raw && typeof raw === 'object' ? raw : {};
  const use = (value, fb) => allowed.has(value) ? value : fb;
  return {
    title: String(clean.title || fallback.title).slice(0, 48),
    summary: String(clean.summary || fallback.summary).slice(0, 140),
    palette: ['blue','pink','green','gold','purple','red','gray','orange'].includes(clean.palette) ? clean.palette : fallback.palette,
    scene: use(clean.scene, fallback.scene),
    body: use(clean.body, fallback.body),
    head: use(clean.head, fallback.head),
    eyes: use(clean.eyes, fallback.eyes),
    mouth: use(clean.mouth, fallback.mouth),
    primitives: [...new Set([...(Array.isArray(clean.primitives) ? clean.primitives : []), ...fallback.primitives].filter(x => allowed.has(x)))].slice(0, 16),
    layers: sanitizeDrawingLayers(clean.layers, text),
  };
}

async function askSceneBrain(userText, sessionId = 'demo') {
  if (!wantsSceneSpec(userText)) return null;

  if (PHASE1_BRIDGE_ENABLED) {
    const seed = crypto.createHash('sha1')
      .update(`${String(sessionId).slice(0, 64)}\n${String(userText).slice(0, 900)}`)
      .digest()
      .readUInt32BE(0);
    const raw = generatePhase1SceneSpec({ prompt: userText, seed });
    return sanitizeSceneSpec(raw, userText);
  }

  const token = await getCopilotToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetch('https://api.individual.githubcopilot.com/chat/completions', {
      method: 'POST', signal: controller.signal,
      headers: { ...ideHeaders, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: [
        { role: 'system', content: `You are a My Dude 3D cartoon avatar drawing planner. ${SCENE_SCHEMA} Return valid JSON only. The client renders your layered 3D-ish drawing recipe immediately.` },
        { role: 'user', content: userText.trim().slice(0, 900) },
      ], max_tokens: 900, temperature: 0.38, user: `mydude-scene-${String(sessionId).slice(0, 64)}` }),
    });
    if (!res.ok) throw new Error(`scene HTTP ${res.status}`);
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || '{}';
    const match = content.match(/\{[\s\S]*\}/);
    return sanitizeSceneSpec(JSON.parse(match ? match[0] : content), userText);
  } catch {
    return fallbackSceneSpec(userText);
  } finally { clearTimeout(timer); }
}


function parseJsonObject(text = '') {
  const raw = String(text || '').trim();
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    try { return JSON.parse(fenced); } catch {}
  }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const objectText = raw.slice(start, end + 1);
    try { return JSON.parse(objectText); } catch {}
  }
  throw new Error('LLM did not return a JSON object');
}

function headItemQuestionForPrompt(prompt = '', subject = '') {
  const raw = String(subject || prompt || 'the requested avatar').trim().replace(/[?.!]+$/g, '');
  const compact = raw.replace(/^(a|an|the)\s+/i, '').split(/\s+/).slice(0, 8).join(' ') || 'requested avatar';
  const article = /^[aeiou]/i.test(compact) ? 'an' : 'a';
  return `What would ${article} ${compact} have on their head?`;
}


function normalizeHeldObjectSemantic(value = '') {
  const text = String(value || '').toLowerCase();
  if (/baseball[- ]?bat|slugger|\bbat\b/.test(text)) return 'baseball-bat';
  if (/glove|mitt/.test(text)) return 'baseball-glove';
  if (/gavel|mallet/.test(text)) return 'gavel';
  if (/briefcase|\bcase\b/.test(text)) return 'briefcase';
  if (/document|paper|folder/.test(text)) return 'documents';
  if (/racket|racquet/.test(text)) return 'racket';
  return '';
}
function replacementObjectFallbackForPrompt(prompt = '', badObject = '') {
  const text = `${prompt} ${badObject}`.toLowerCase();
  const bad = normalizeHeldObjectSemantic(badObject);
  if (/baseball/.test(text) && bad !== 'baseball-glove') return 'baseball-glove';
  if (/judge|court|lawyer|legal/.test(text) && bad !== 'documents') return 'documents';
  if (/business|office|lawyer/.test(text) && bad !== 'briefcase') return 'briefcase';
  if (/tennis|racket|racquet/.test(text) && bad !== 'tennis-ball') return 'tennis-ball';
  return 'small badge';
}

async function recommendReplacementHeldObject(prompt = '', designBrief = {}, badObject = '') {
  const badLabel = heldObjectLabel(badObject);
  const fullPromptContext = {
    userPrompt: String(prompt || '').slice(0, 1200),
    llmExpandedPrompt: String(designBrief?.expandedPrompt || '').slice(0, 1800),
    subject: String(designBrief?.subject || '').slice(0, 240),
    visualChecklist: Array.isArray(designBrief?.visualChecklist) ? designBrief.visualChecklist.slice(0, 14) : [],
  };
  const userContent = `The ${badLabel} (the first object tried) in the hand didn't work. What else would you recommend to put in this character's hand?

Full prompt + LLM looped expanded prompt:
${JSON.stringify(fullPromptContext, null, 2)}

It cannot be a ${badLabel}. Choose exactly one simple replacement hand-held object that naturally fits the character described in the prompt and can be rendered clearly by a cute mascot avatar. Return strict JSON with keys: object, reason, renderingNotes. Do not choose the failed object or a synonym of it.`;
  try {
    const result = await callTest5Chat({
      system: 'You are a /test5 visual fallback art director. Return STRICT JSON only. Pick one replacement hand-held object that naturally fits the prompt, is not the failed object, and is visually easier to render clearly. No markdown or prose.',
      userContent,
      temperature: 0.42,
      maxTokens: 450,
      stage: 'replacement-object',
    });
    const parsed = parseJsonObject(result.content);
    let object = String(parsed.object || parsed.replacementObject || '').trim().slice(0, 80);
    const normalizedBad = normalizeHeldObjectSemantic(badObject);
    const normalizedObject = normalizeHeldObjectSemantic(object);
    if (!object || (normalizedBad && normalizedObject === normalizedBad) || object.toLowerCase().includes(badLabel.toLowerCase())) {
      object = replacementObjectFallbackForPrompt(prompt, badObject);
    }
    return {
      provider: result.provider,
      prompt: userContent,
      object,
      normalizedObject: normalizeHeldObjectSemantic(object),
      reason: String(parsed.reason || '').slice(0, 240),
      renderingNotes: String(parsed.renderingNotes || '').slice(0, 300),
    };
  } catch (error) {
    const object = replacementObjectFallbackForPrompt(prompt, badObject);
    return {
      provider: 'local/replacement-object-fallback',
      prompt: userContent,
      object,
      normalizedObject: normalizeHeldObjectSemantic(object),
      reason: `LLM replacement-object recommendation failed, so used deterministic prompt-fitting fallback for ${String(prompt || 'avatar').slice(0, 80)}.`,
      renderingNotes: `Render ${object} large, simple, attached to one hand, and readable from silhouette alone.`,
      error: String(error?.message || error).slice(0, 300),
    };
  }
}


function inferHeldObjectSemanticFromCharacter(character = {}) {
  const primitives = Array.isArray(character?.customPrimitives) ? character.customPrimitives : [];
  const held = primitives.filter(p => p?.held === true || ['leftHand','rightHand'].includes(p?.anchor));
  const heldText = held.map(p => `${p.groupId || ''} ${p.id || ''} ${p.label || ''} ${p.shape || ''}`).join(' ');
  return normalizeHeldObjectSemantic(heldText);
}

function heldObjectLabel(value = '') {
  return String(value || 'unclear held object').replace(/-/g, ' ');
}

function isHeldObjectRequirement(value = '', badObject = '') {
  const text = String(value || '').toLowerCase();
  const bad = heldObjectLabel(badObject).toLowerCase();
  return /held|hand-held|prop|tool|bat|glove|mitt|gavel|briefcase|document|paper|folder|racket|racquet|wand|staff|mallet|stick|sword/.test(text) || (bad && text.includes(bad));
}

function buildHeldObjectRetryPlan(prompt = '', designBrief = {}, character = {}, options = {}) {
  const currentObject = inferHeldObjectSemanticFromCharacter(character) || normalizeHeldObjectSemantic(`${prompt} ${designBrief?.expandedPrompt || ''} ${(designBrief?.visualChecklist || []).join(' ')}`);
  const requested = Boolean(options?.enabled || options?.heldObjectFallback || options?.objectFallback || options?.badObject || options?.badHeldObject || options?.dropObject || options?.dropHeldObject || options?.replacementObject || options?.askForReplacement);
  const badObject = normalizeHeldObjectSemantic(options?.badObject || options?.badHeldObject || currentObject) || currentObject;
  const mode = String(options?.mode || options?.action || '').toLowerCase();
  const dropObject = Boolean(options?.dropObject || options?.dropHeldObject || mode === 'drop' || mode === 'drop-object' || mode === 'without-object');
  const replacementRequested = Boolean(options?.askForReplacement || options?.replacementObject || mode.includes('replacement') || mode.includes('replace') || mode.includes('alternate')) && !dropObject;
  const replacementObject = normalizeHeldObjectSemantic(options?.replacementObject || options?.targetObject || options?.alternateObject || '') || String(options?.replacementObject || options?.targetObject || options?.alternateObject || '').trim();
  const attempt = Math.max(1, Math.min(3, Number(options?.attempt || 1) || 1));
  const maxAttempts = Math.max(1, Math.min(3, Number(options?.maxAttempts || 3) || 3));
  const action = dropObject ? 'drop-held-object' : replacementRequested ? 'replacement-held-object' : 'retry-same-object';
  const targetObject = dropObject ? '' : replacementRequested ? replacementObject : (badObject || currentObject);
  return {
    requested,
    currentObject,
    badObject,
    replacementObject,
    replacementRecommendation: options?.replacementRecommendation || null,
    targetObject,
    action,
    attempt,
    maxAttempts,
    firstFallbackAfterAttempts: 3,
    finalDropAfterReplacementAttempts: 3,
    instruction: !requested ? '' : dropObject
      ? `Final visual fallback: the original held ${heldObjectLabel(badObject)} and the replacement-object run both failed honest screenshot inspection. Render the avatar without any hand-held object; preserve the prompt identity through headwear, clothing, colors, expression, and body-attached details.`
      : replacementRequested
        ? (replacementObject
          ? `First fallback replacement retry ${attempt}/${maxAttempts}: the original held ${heldObjectLabel(badObject)} failed three screenshot-inspected tries. Render the replacement hand-held ${heldObjectLabel(replacementObject)} clearly, attached to one hand. If this replacement also fails after three tries, the next step is to render without any held object.`
          : `First fallback replacement retry ${attempt}/${maxAttempts}: the original held ${heldObjectLabel(badObject)} failed three screenshot-inspected tries. Ask what else this character would naturally have in their hand, choose one simple different hand-held object, and render that replacement clearly. Do not render the failed ${heldObjectLabel(badObject)}. If this replacement also fails after three tries, the next step is to render without any held object.`)
        : `Visual retry ${attempt}/${maxAttempts}: the held ${heldObjectLabel(targetObject)} did not read clearly in the screenshot. Try the same object again, not an alternate object yet. Make it oversized, simple, connected to one hand, and recognizable from silhouette alone. If it still fails after three tries, the first fallback is to ask for a different hand-held object that fits the character.`,
  };
}

function applyHeldObjectRetryToBrief(designBrief = {}, retryPlan = {}) {
  if (!retryPlan?.requested) return designBrief;
  const badLabel = heldObjectLabel(retryPlan.badObject || retryPlan.currentObject);
  const checklist = Array.isArray(designBrief.visualChecklist) ? designBrief.visualChecklist : [];
  const details = Array.isArray(designBrief.requiredDetails) ? designBrief.requiredDetails : [];
  const renderable = Array.isArray(designBrief.requiredRenderableDetails) ? designBrief.requiredRenderableDetails : [];
  if (retryPlan.action === 'drop-held-object') {
    return {
      ...designBrief,
      expandedPrompt: `${designBrief.expandedPrompt || ''} Final visual fallback: the hand-held ${badLabel} failed after three honest screenshot inspections. Render the character WITHOUT any hand-held object or tool. Keep the avatar prompt-faithful through non-held visible cues such as headwear, clothing, colors, expression, body shape, markings, and shoes.`,
      visualChecklist: [
        `Final visual fallback: no hand-held object; preserve prompt identity without the failed ${badLabel}`,
        ...checklist.filter(item => !isHeldObjectRequirement(item, retryPlan.badObject)),
      ].slice(0, 14),
      requiredDetails: details.filter(item => !isHeldObjectRequirement(item, retryPlan.badObject)).slice(0, 8),
      requiredRenderableDetails: renderable.filter(item => !isHeldObjectRequirement(`${item?.id || ''} ${item?.label || ''}`, retryPlan.badObject)),
    };
  }
  const label = heldObjectLabel(retryPlan.targetObject || retryPlan.badObject || retryPlan.currentObject);
  if (retryPlan.action === 'replacement-held-object') {
    const replacementText = retryPlan.targetObject
      ? `Render the replacement hand-held ${heldObjectLabel(retryPlan.targetObject)} clearly.`
      : `Ask what else this character would naturally have in their hand, choose one simple different replacement hand-held object, and render it clearly.`;
    return {
      ...designBrief,
      expandedPrompt: `${designBrief.expandedPrompt || ''} First fallback after screenshot inspection: the original hand-held ${badLabel} failed the initial three visual tries. ${replacementText} Do not render the failed ${badLabel}. Keep it attached to one hand, simple, oversized, and readable from silhouette alone. If this replacement object fails after three screenshot-inspected tries, remove hand-held objects entirely.`,
      visualChecklist: [
        `First fallback replacement ${retryPlan.attempt || 1}/${retryPlan.maxAttempts || 3}: choose/render a different prompt-fitting hand-held object instead of the failed ${badLabel}`,
        ...checklist.filter(item => !isHeldObjectRequirement(item, retryPlan.badObject)),
      ].slice(0, 14),
      requiredDetails: [
        retryPlan.targetObject ? `clear replacement hand-held ${heldObjectLabel(retryPlan.targetObject)}` : 'clear replacement hand-held object naturally fitting this character',
        ...details.filter(item => !isHeldObjectRequirement(item, retryPlan.badObject)),
      ].slice(0, 8),
      requiredRenderableDetails: renderable.filter(item => !isHeldObjectRequirement(`${item?.id || ''} ${item?.label || ''}`, retryPlan.badObject)),
    };
  }
  return {
    ...designBrief,
    expandedPrompt: `${designBrief.expandedPrompt || ''} Visual retry ${retryPlan.attempt || 1}/${retryPlan.maxAttempts || 3}: the previous hand-held ${label} did not read clearly in the screenshot. Render the SAME ${label} again, not an alternate object yet. Make the object large, uncluttered, attached to one hand, with a clear silhouette and distinctive subparts. Baseball bat example: one continuous long tapered barrel, narrow handle, knob, and wood cues.`,
    visualChecklist: [
      `Visual retry ${retryPlan.attempt || 1}/${retryPlan.maxAttempts || 3}: same object, clearer hand-held ${label}; if third try still fails, ask for a different prompt-fitting hand object`,
      ...checklist,
    ].slice(0, 14),
    requiredDetails: [
      `clear hand-held ${label}`,
      ...details,
    ].slice(0, 8),
  };
}

function dropHeldObjectsFromReactCssCharacter(character = {}, retryPlan = {}) {
  if (retryPlan?.action !== 'drop-held-object') return character;
  const bad = retryPlan.badObject || retryPlan.currentObject || '';
  const filteredPrimitives = (Array.isArray(character.customPrimitives) ? character.customPrimitives : []).filter(item => {
    const text = `${item?.groupId || ''} ${item?.id || ''} ${item?.label || ''}`;
    if (item?.held === true && ['leftHand','rightHand'].includes(item?.anchor)) return false;
    return !isHeldObjectRequirement(text, bad);
  });
  const filteredParts = (Array.isArray(character.parts) ? character.parts : []).filter(part => !['wand','staff','tool','prop'].includes(String(part?.type || '').toLowerCase()) && !isHeldObjectRequirement(`${part?.type || ''} ${part?.label || ''}`, bad));
  return {
    ...character,
    parts: filteredParts,
    customPrimitives: filteredPrimitives,
    notes: [...(Array.isArray(character.notes) ? character.notes : []), `Final visual fallback removed failed hand-held ${heldObjectLabel(bad)} after three same-object tries.`].slice(0, 12),
  };
}

function test5ExpanderSystemPrompt() {
  return `You are the /test5 My Dude avatar art director. Expand a short user request into a detailed, renderer-aware avatar design brief.
Return STRICT JSON only. No markdown, comments, HTML, SVG, CSS, JavaScript, image URLs, base64, or prose.
The next LLM will convert your brief into controlled SceneSpec layers, so your job is to add all missing visual details while staying compatible with the My Dude renderer.
Required JSON shape:
{
  "title": "Short Avatar Name",
  "expandedPrompt": "A rich art-direction prompt with subject, silhouette, colors, expression, accessories, markings, and polish details.",
  "subject": "main character concept",
  "mood": "one phrase",
  "palettePlan": { "primary": "...", "secondary": "...", "accent": "..." },
  "styleTags": ["cute mascot", "glossy SVG", "blue-avatar quality"],
  "visualChecklist": ["8 to 12 concrete visual details"],
  "requiredDetails": ["at least 4 prompt-specific details"],
  "requiredRenderableDetails": [{ "id": "detail_id", "label": "visible detail", "acceptableShapes": ["shapeName"], "acceptableSockets": ["socket.name"], "minimumCount": 1 }],
  "forbiddenDetails": ["raw SVG", "HTML", "unvalidated custom shapes", "external images"],
  "qualityConstraints": ["oversized expressive head", "compact connected body", "readable silhouette", "valid renderer sockets only"]
}
Rules:
- Preserve the user's concept, but add the missing details in the background.
- Include at least one anatomy detail, one color/material detail, one expression detail, and one body-attached accessory/marking/clothing detail.
- For every prompt, explicitly ask in visualChecklist: "Head item question: What would a/an <prompt subject> have on their head?" Example: alien => "What would an alien have on their head?".
- Then explicitly answer in visualChecklist: "Head item decision: yes/no — <reason and exact attached head item if yes>" for whether the requested character would naturally have something on its head. If yes, specify the attached head item (baseball cap with curved front brim, crown, helmet, antenna, hair/headband, etc.); if no, say no and rely on native head/anatomy details.
- Do not invent ceremonial/legal headwear for judges. Judges should read through robe, glasses/hair when relevant, courtroom seriousness, and a hand-held gavel/document, not a generic "judicial hat".
- For baseball prompts, if a cap is chosen, call it a "baseball cap with rounded crown, panel seams, top button, and curved front brim". Do not let it degrade into a flat rectangle hat.
- For now, do NOT request detached scene objects, loose balls, floating props, or sticker-like objects. Every requested detail must be attached to the avatar: in a hand, on the head, on torso/clothes, or on feet.
- Favor details that can be represented as attached mascot parts: alien antenna, glasses, baseball cap, suit/tie/robe, badge, scarf, boots, hooves, claws, or a hand-held tool/briefcase/staff/gavel/bat/glove with a clear grip.
- requiredRenderableDetails is a contract. Include only details that can be checked against layers. For star goggles, require glasses plus star/spark near eyes. For rocket boots, require two boot layers and flame/spark accents. For fox, require ears, snout, and tail.
- Keep it cute, centered, and at the same polish level as the default blue My Dude avatar.`;
}

function test5SystemPrompt(designBrief = {}) {
  const briefText = JSON.stringify(designBrief || {}, null, 2).slice(0, 5000);
  return `You are the live /test5 My Dude avatar drawing engine. You dynamically create a NEW polished avatar drawing recipe from the expanded art direction brief.
Return STRICT JSON only. No markdown, comments, HTML, SVG, CSS, JavaScript, image URLs, base64, or prose.
The browser renders your JSON as glossy SVG parts. You must use the controlled drawing grammar; do not invent arbitrary geometry.
${SCENE_SCHEMA}
Expanded design brief to implement:
${briefText}
Extra /test5 rules:
- Do not copy a named preset. Make a fresh composition for this exact prompt and expanded brief.
- Keep the My Dude quality bar: oversized expressive head, compact body, connected limbs, glossy dimensional materials, readable silhouette.
- Create a detailed avatar, not a sparse placeholder: minimum 10 layers when possible, maximum 28 layers.
- Include every prompt-specific requiredRenderableDetails item using valid renderer parts; the backend rejects recipes whose layers do not cover required details.
- Required layers must use exact shape names, not roles: {"shape":"mascotBody","role":"part","attach":{"socket":"body.center"}}, {"shape":"mascotHead","role":"part","attach":{"socket":"head.center"}}, two eye layers with role:"eye", and exactly one mouth layer with role:"mouth" attached to head.mouth.
- Use exact renderer shape names only. For dragon use mascotBody+mascotHead+softHorn+wing+claw; for scientist goggles use glasses; for robot use screen/panel/pixelEye/mouthScreen. Never invent names like dragon, goggles, smile, arm, leftEye, body.
- Accessories/details must attach to valid sockets. Prefer head.leftHorn/rightHorn for antenna/horns, head.leftEar/rightEar for ears, body.front/body.patchLeft/body.patchRight for body details.
- If a detail such as headphones is not a single renderer part, compose it from valid shapes such as arc/ring/circle/panel/spark when available, or use glasses/antenna/spark/patch as a safe visual proxy.
- Max 28 layers. Use x/y only as small local offsets from sockets.
Example minimal valid layer list: [{"shape":"mascotBody","anchor":"free","x":0,"y":0,"scale":[0.62,0.6],"rotate":0,"material":"glossyPurple","role":"part","z":2,"attach":{"socket":"body.center"}},{"shape":"mascotHead","anchor":"free","x":0,"y":0,"scale":[0.94,0.84],"rotate":0,"material":"glossyPurple","role":"part","z":8,"attach":{"socket":"head.center"}},{"shape":"stubbyArm","anchor":"free","x":0,"y":0,"scale":[0.22,0.46],"rotate":-10,"material":"glossyPurple","role":"part","z":5,"attach":{"socket":"body.leftHand"}},{"shape":"stubbyArm","anchor":"free","x":0,"y":0,"scale":[0.22,0.46],"rotate":10,"material":"glossyPurple","role":"part","z":5,"attach":{"socket":"body.rightHand"}},{"shape":"cuteEye","anchor":"free","x":0,"y":0,"scale":[0.24,0.24],"rotate":0,"material":"softWhite","role":"eye","z":20,"attach":{"socket":"head.leftEye"}},{"shape":"cuteEye","anchor":"free","x":0,"y":0,"scale":[0.24,0.24],"rotate":0,"material":"softWhite","role":"eye","z":20,"attach":{"socket":"head.rightEye"}},{"shape":"mouthSmile","anchor":"free","x":0,"y":18,"scale":[0.38,0.2],"rotate":0,"material":"charcoalRubber","role":"mouth","z":31,"attach":{"socket":"head.mouth"}}]`;
}

async function callTest5Chat({ system, userContent, temperature = 0.38, maxTokens = 1800, stage = 'avatar' }) {
  if (process.env.OPENAI_API_KEY) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userContent },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI test5 ${stage} failed: HTTP ${res.status}: ${(await res.text()).slice(0, 220)}`);
    const json = await res.json();
    return { provider: `openai/${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`, content: json?.choices?.[0]?.message?.content || '{}' };
  }

  const token = await getCopilotToken();
  const res = await fetch('https://api.individual.githubcopilot.com/chat/completions', {
    method: 'POST',
    headers: { ...ideHeaders, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      user: `mydude-test5-${stage}`,
    }),
  });
  if (!res.ok) throw new Error(`Copilot test5 ${stage} failed: HTTP ${res.status}: ${(await res.text()).slice(0, 220)}`);
  const json = await res.json();
  return { provider: `github-copilot/${MODEL}`, content: json?.choices?.[0]?.message?.content || '{}' };
}

function promptPassCueQuestion(prompt = '', brief = {}) {
  const subject = String(brief?.subject || prompt || 'this character').trim() || 'this character';
  return `Prompt-pass cue question: To make ${subject} unmistakable in the screenshot, what is one clearly visible thing to put on the head, hand/hands, feet, clothing/body, neck, or body-attached area? Choose prompt-natural cues; prefer worn/attached cues over fragile held props when held objects fail.`;
}

function promptPassCueDecision(prompt = '', brief = {}) {
  const text = `${prompt || ''} ${brief?.subject || ''} ${brief?.expandedPrompt || ''}`.toLowerCase();
  const cues = [];
  if (/(female|girl|woman|lady)/.test(text)) cues.push('female cue: visible hair shape or ponytail/headband plus fitted/clearly styled uniform/clothing; color alone is not enough');
  if (/(baseball|slugger|batter|pitcher|catcher)/.test(text)) cues.push('baseball cue: cap plus jersey front/number/stripes, cleats, and optionally glove/bat only if it survives inspection');
  if (/alien|extraterrestrial|martian|ufo/.test(text)) cues.push('alien cue: paired antennae/nonhuman eyes/green or unusual skin');
  if (/(robot|android|mech)/.test(text)) cues.push('robot cue: screen/panel head, bolts, segmented limbs');
  if (/wizard|magic|mage/.test(text)) cues.push('wizard cue: hat/robe/belt plus wand or stars if readable');
  if (!cues.length) cues.push('choose the most prompt-specific attached cue on head, clothing/body, neck, feet, or hands before relying on a held prop');
  return `Prompt-pass cue decision: ${cues.join('; ')}`;
}

function normalizeDesignBrief(raw, prompt) {
  const fallback = {
    title: `${prompt.split(/\s+/).slice(0, 5).join(' ') || 'Custom'} Buddy`,
    expandedPrompt: `Create a polished My Dude-style avatar for: ${prompt}. Add a big expressive head, compact body, readable eyes, one mouth, glossy materials, connected limbs, and 4 prompt-specific visual details.`,
    subject: prompt,
    mood: 'playful and friendly',
    palettePlan: { primary: 'glossy blue', secondary: 'soft white', accent: 'cyan glow' },
    styleTags: ['cute mascot', 'glossy SVG', 'blue-avatar quality'],
    visualChecklist: ['oversized head', 'compact body', 'two expressive eyes', 'one small smile', 'connected arms', 'connected feet', 'one accessory', 'one accent detail', 'prompt-pass cue question', 'prompt-pass cue decision'],
    requiredDetails: ['prompt-specific subject feature', 'prompt-specific color/material', 'prompt-specific accessory', 'prompt-specific marking/accent'],
    requiredRenderableDetails: [],
    forbiddenDetails: ['raw SVG', 'HTML', 'JavaScript', 'external images'],
    qualityConstraints: ['oversized expressive head', 'compact connected body', 'readable silhouette', 'valid renderer sockets only'],
  };
  if (!raw || typeof raw !== 'object') return fallback;
  const brief = { ...fallback, ...raw };
  brief.title = String(brief.title || fallback.title).slice(0, 90);
  brief.expandedPrompt = String(brief.expandedPrompt || fallback.expandedPrompt).slice(0, 1800);
  brief.subject = String(brief.subject || prompt).slice(0, 180);
  for (const key of ['styleTags', 'visualChecklist', 'requiredDetails', 'forbiddenDetails', 'qualityConstraints']) {
    brief[key] = Array.isArray(brief[key]) ? brief[key].map(v => String(v).slice(0, 180)).filter(Boolean).slice(0, key === 'visualChecklist' ? 18 : 8) : fallback[key];
  }
  if (!brief.visualChecklist.length) brief.visualChecklist = fallback.visualChecklist;
  const headQuestion = headItemQuestionForPrompt(prompt, brief.subject);
  if (!brief.visualChecklist.some(item => /head item question/i.test(item))) {
    brief.visualChecklist.unshift(`Head item question: ${headQuestion}`);
  }
  if (!brief.visualChecklist.some(item => /head item decision/i.test(item))) {
    const promptText = `${prompt || ''} ${brief.subject || ''} ${brief.expandedPrompt || ''}`.toLowerCase();
    const isJudgePrompt = /\b(judge|courtroom|judicial|gavel)\b/.test(promptText);
    const isBaseballPrompt = /\b(baseball|slugger|batter|pitcher|catcher)\b/.test(promptText);
    const likelyHeadItem = !isJudgePrompt && (/\b(hat|helmet|crown|cap|hood|headband|antenna|horn|hair|visor|goggles|glasses|mushroom|wizard|alien|robot|pirate|chef|king|queen)\b/.test(promptText) || isBaseballPrompt);
    const answer = isJudgePrompt ? 'no — judges usually do not wear hats; use robe/glasses/hair and a hand-held gavel instead' : isBaseballPrompt ? 'yes — baseball cap with rounded crown, panel seams, top button, and curved front brim' : likelyHeadItem ? 'yes — choose an attached, prompt-natural head detail/headwear' : 'no — no natural head item requested; keep head clean except anatomy';
    brief.visualChecklist.unshift(`Head item decision: ${answer}`);
  }
  if (!brief.visualChecklist.some(item => /prompt-pass cue question/i.test(String(item || '')))) {
    brief.visualChecklist.unshift(promptPassCueQuestion(prompt, brief));
  }
  if (!brief.visualChecklist.some(item => /prompt-pass cue decision/i.test(String(item || '')))) {
    brief.visualChecklist.unshift(promptPassCueDecision(prompt, brief));
  }
  const checklistText = `${prompt || ''} ${brief.subject || ''} ${brief.expandedPrompt || ''}`.toLowerCase();
  if (/\b(judge|courtroom|judicial|gavel)\b/.test(checklistText)) {
    brief.visualChecklist = brief.visualChecklist.map(item => /head item decision/i.test(String(item || ''))
      ? 'Head item decision: no — judges usually do not wear hats; use robe/glasses/hair and a hand-held gavel instead'
      : item);
  } else if (/\b(baseball|slugger|batter|pitcher|catcher)\b/.test(checklistText)) {
    brief.visualChecklist = brief.visualChecklist.map(item => /head item decision/i.test(String(item || ''))
      ? 'Head item decision: yes — baseball cap with rounded crown, panel seams, top button, and curved front brim'
      : item);
  }
  brief.visualChecklist = brief.visualChecklist.slice(0, 18);
  if (!brief.requiredDetails.length) brief.requiredDetails = fallback.requiredDetails;
  brief.requiredRenderableDetails = normalizeRenderableDetails(brief.requiredRenderableDetails, prompt, brief);
  return brief;
}

async function expandTest5Prompt(prompt) {
  const headQuestion = headItemQuestionForPrompt(prompt);
  const userContent = `User avatar request: ${prompt.trim().slice(0, 1200)}\nHeadwear planning question to answer in visualChecklist: ${headQuestion}\nExpand it into the required JSON art direction brief. Add all missing details in the background.`;
  const result = await callTest5Chat({ system: test5ExpanderSystemPrompt(), userContent, temperature: 0.52, maxTokens: 1300, stage: 'expand' });
  const designBrief = normalizeDesignBrief(parseJsonObject(result.content), prompt);
  return { ...result, designBrief };
}

async function callTest5Llm(prompt, designBrief, repairNote = '') {
  const userContent = `${repairNote ? `Repair this previous validation failure: ${repairNote}\n\n` : ''}Original user prompt: ${prompt.trim().slice(0, 900)}\nExpanded prompt: ${String(designBrief?.expandedPrompt || '').slice(0, 1800)}\nVisual checklist: ${(designBrief?.visualChecklist || []).join('; ')}\nReturn one SceneSpec JSON object now.`;
  return callTest5Chat({ system: test5SystemPrompt(designBrief), userContent, temperature: repairNote ? 0.12 : 0.36, maxTokens: 2100, stage: repairNote ? 'repair' : 'draw' });
}

async function generateTest5SceneSpec(prompt, designBrief, repairNote = '') {
  return callTest5Llm(prompt, designBrief, repairNote);
}

function test5ReactCssSystemPrompt(designBrief = {}) {
  const briefText = JSON.stringify(designBrief || {}, null, 2).slice(0, 5000);
  return `You are GPT-5.5/Hermes recreating the original blue My Dude build method for /test5.
The original was not an image generator or an OpenClaw dependency: it was a hand-coded React/CSS mascot scaffold with tuned head/body proportions, shine, eyes, one mouth, antenna/ears/accessories, arms/legs, and CSS variables.
Return STRICT JSON only. No markdown, raw JSX, raw CSS text, HTML, SVG, JavaScript, image URLs, or base64.
You are authoring a SAFE React/CSS character blueprint that our existing React component will render through a fixed hand-coded scaffold.
Expanded design brief:
${briefText}
Required JSON shape:
{
  "componentName": "ShortPascalName",
  "styleSystem": "my-dude-react-css-scaffold",
  "title": "Short character name",
  "summary": "One sentence about the generated hand-coded character",
  "cssVariables": {
    "--dude-primary": "#38bdf8",
    "--dude-secondary": "#60a5fa",
    "--dude-accent": "#93c5fd",
    "--dude-eye": "#e0f2fe",
    "--dude-panel": "rgba(255,255,255,.18)",
    "--dude-mouth": "#0f172a",
    "--dude-body": "#1e293b",
    "--dude-arm": "#60a5fa",
    "--dude-hand": "#facc15",
    "--dude-leg": "#1e293b",
    "--dude-foot": "#facc15"
  },
  "headShape": "rounded|animal|helmet|screen|mushroom|crown",
  "bodyShape": "compact|round|suited|robot|robe|pilot",
  "expression": "friendly|sleepy|focused|excited|curious",
  "parts": [
    { "type": "ear", "side": "left", "label": "fox ear", "tone": "primary" },
    { "type": "glasses", "label": "star goggles", "tone": "accent" }
  ],
  "customPrimitives": [
    { "id": "briefcase-body", "groupId": "briefcase", "label": "lawyer briefcase body", "anchor": "rightHand", "shape": "rect", "x": 42, "y": 34, "width": 84, "height": 56, "rotate": -8, "tone": "dark", "outline": true, "held": true, "gripX": 0.5, "gripY": 0.08 },
    { "id": "briefcase-handle", "groupId": "briefcase", "label": "briefcase handle through hand", "anchor": "rightHand", "shape": "arc", "x": 26, "y": 8, "width": 42, "height": 34, "rotate": -8, "tone": "accent", "outline": true, "held": true, "gripX": 0.5, "gripY": 0.25 }
  ],
  "notes": ["which details are custom to the prompt"]
}
Rules:
- Think like the original blue-dude React/CSS author: first lock a polished mascot scaffold, then customize CSS variables and named div parts.
- Keep a single connected character, not floating stickers. For now, do not create balls or detached objects at all.
- Include prompt-specific parts when relevant: alien antenna, glasses, hat, suit/tie, boots, flame, wand, badge, scarf, spots, stripes, panel, robe, helmet.
- For any prompt-specific held object or clothing detail that is not already one of those named scaffold parts, create it in customPrimitives from safe geometric atoms, anchored only to rightHand/leftHand/headTop/bodyFront/leftFoot/rightFoot. Do not collapse it to a generic badge. Compose multiple customPrimitives when needed (for example a briefcase = rect body + arc handle; a tennis racket = ring head + capsule handle + string lines; shoe = capsule + sole stripe).
- Hand-held customPrimitives MUST use anchor leftHand or rightHand, the same groupId for all pieces of the same object, held:true, plus gripX/gripY on the handle/grip piece. The renderer solves placement for the whole group so the chosen grip point is inside the hand; x/y are local coordinates within the object group, not free screen coordinates. The renderer draws a hand clasp above held groups.
- Before deciding headShape/parts, ask the brief's exact headwear question: "What would a/an <prompt subject> have on their head?" Use the Head item question and Head item decision checklist items.
- Before finalizing parts/customPrimitives, ask the Prompt-pass cue question: "what one visible cue on head, hand/hands, feet, clothing/body, neck, or body-attached area would make this prompt pass screenshot inspection?" Then actually render that cue as a visible part/customPrimitive. This is generic for any prompt: if the prompt identity is weak or a held prop fails, strengthen attached/worn cues instead of relying on metadata.
- Inspect every zone in the blueprint mentally before returning: head, face, neck, body/clothing, both hands, both feet, and near-foot area. Remove or replace stray foot/hand artifacts and stray artifacts around the feet/hands that do not serve the prompt.
- If Head item decision says yes, the blueprint MUST visibly put that exact thing on the head using part type hat/helmet/crown/antenna/glasses or customPrimitives anchored to headTop/headLeft/headRight. Do not merely mention it in notes/checklist.
- If Head item decision says no, do not invent unrelated headwear.
- Hats/headwear must use part type hat/helmet/crown/antenna or customPrimitives anchored to headTop/headLeft/headRight. Clothing must use bodyShape suited/robe/pilot, bodyFront primitives, or stripe/badge/scarf parts. Footwear must use boot parts or leftFoot/rightFoot primitives.
- For mushroom prompts, do not stop at headShape:"mushroom". Include explicit parts {"type":"mushroomCap"}, {"type":"mushroomGills"}, and at least two {"type":"spot"} cap markings; avoid animal ears, snout, tail, and wings unless the user explicitly asks for them.
- Always decide explicit colors for body, arms, hands, legs, and feet in cssVariables. Wizard bodies should normally read as a robe/body color distinct from skin/hand color; do not leave limbs to inherit random accent colors.
- For mushroom wizards specifically: treat the visible body/torso and legs as a wizard robe (deep indigo/navy/purple), arms as robe sleeves, and hands/feet or stem-like exposed parts as pale mushroom-stem cream/blue. The blue should primarily belong to the mushroom cap unless the user asks for blue robe/body.
- For held props such as wand/staff/sword, put side:"left" or side:"right" so the renderer can anchor the item inside a hand. For worn props such as boots/flames, use side:"left" and side:"right" pairs.
- Use 4 to 12 parts. Prefer fewer polished readable parts over clutter.
- Do not output raw code; this JSON is the receipt for the hand-coded React/CSS scaffold.`;
}

function fallbackReactCssCharacter(prompt = '', designBrief = {}) {
  const text = `${prompt} ${designBrief.expandedPrompt || ''}`.toLowerCase();
  const isFox = /\bfox\b/.test(text);
  const isRobot = /robot|screen|computer/.test(text);
  const isWizard = /wizard|magic|wand|staff/.test(text);
  const isPilot = /pilot|aviator|rocket/.test(text);
  const isMushroom = /mushroom|toadstool|fungus/.test(text);
  const isAlien = /\balien|extraterrestrial|martian|ufo/.test(text);
  const isJudge = /\b(judge|courtroom|judicial|gavel)\b/.test(text);
  const isLawyer = /lawyer|attorney|legal|briefcase|suit|tie/.test(text) && !isJudge;
  const isBaseball = /\b(baseball|slugger|batter|pitcher|catcher)\b/.test(text);
  const primary = isFox ? '#fb923c' : isAlien ? '#34d399' : isBaseball ? '#2563eb' : /purple|wizard|space/.test(text) && !isMushroom ? '#a78bfa' : /green/.test(text) ? '#34d399' : /pink/.test(text) ? '#f472b6' : '#38bdf8';
  const parts = [];
  const customPrimitives = [];
  const add = (type, label, opts = {}) => parts.push({ type, label, tone: opts.tone || 'primary', side: opts.side || 'center' });
  const custom = (id, label, anchor, shape, opts = {}) => customPrimitives.push({
    id, label, anchor, shape,
    x: opts.x || 0, y: opts.y || 0,
    width: opts.width || 44, height: opts.height || 44,
    rotate: opts.rotate || 0,
    tone: opts.tone || 'accent',
    outline: opts.outline !== false,
    held: opts.held === true,
    gripX: opts.gripX,
    gripY: opts.gripY,
    groupId: opts.groupId,
  });
  if (isMushroom) {
    add('mushroomCap', 'wide blue mushroom cap', { tone: 'primary' });
    add('mushroomGills', 'visible cap gills underneath', { tone: 'secondary' });
    add('spot', 'left white cap spot', { side: 'left', tone: 'eye' });
    add('spot', 'right white cap spot', { side: 'right', tone: 'eye' });
  }
  if (isFox || /\b(cat|dog|animal)\b/.test(text)) { add('ear', 'left animal ear', { side: 'left' }); add('ear', 'right animal ear', { side: 'right' }); add('snout', 'soft snout', { tone: 'cream' }); add('tail', 'curved tail', { side: 'right' }); }
  if (isAlien) { add('antenna', 'left alien antenna attached to head', { side: 'left', tone: 'accent' }); add('antenna', 'right alien antenna attached to head', { side: 'right', tone: 'accent' }); add('spot', 'subtle alien cheek marking', { side: 'left', tone: 'accent' }); }
  if (/goggle|glasses|visor/.test(text) || isLawyer) add('glasses', isLawyer ? 'lawyer glasses' : 'prompt eyewear', { tone: 'dark' });
  if (/star/.test(text)) { add('star', 'left star accent', { side: 'left', tone: 'accent' }); add('star', 'right star accent', { side: 'right', tone: 'accent' }); }
  if (/boot/.test(text)) { add('boot', 'left boot', { side: 'left', tone: 'dark' }); add('boot', 'right boot', { side: 'right', tone: 'dark' }); }
  if (/flame|rocket/.test(text)) { add('flame', 'left rocket flame', { side: 'left', tone: 'accent' }); add('flame', 'right rocket flame', { side: 'right', tone: 'accent' }); }
  if (isWizard) { add('hat', 'soft wizard hat', { tone: 'accent' }); add('wand', 'tiny glowing staff', { side: 'right', tone: 'accent' }); add('robe', 'simple robe panel', { tone: 'secondary' }); }
  if (isBaseball) {
    const wantsGloveFallback = /visual retry|avoid baseball bat|baseball glove|catcher's mitt|catchers mitt|\bmitt\b/.test(text) && !/must use.*bat/.test(text);
    add('hat', 'baseball cap with rounded crown panel seams top button and curved front brim', { tone: 'accent' });
    add('stripe', 'baseball jersey front stripe', { tone: 'eye' });
    if (wantsGloveFallback) {
      custom('baseball-glove-palm', 'hand-held baseball glove palm', 'rightHand', 'oval', { x: 28, y: -6, width: 74, height: 64, rotate: 8, tone: 'accent', held: true, gripX: 0.5, gripY: 0.68, groupId: 'baseball-glove' });
      custom('baseball-glove-thumb', 'baseball glove thumb lobe', 'rightHand', 'oval', { x: 62, y: -12, width: 34, height: 42, rotate: -28, tone: 'accent', held: true, gripX: 0.32, gripY: 0.72, groupId: 'baseball-glove' });
      custom('baseball-glove-web', 'baseball glove webbing', 'rightHand', 'rect', { x: 16, y: -18, width: 40, height: 30, rotate: 6, tone: 'dark', held: true, gripX: 0.5, gripY: 0.75, groupId: 'baseball-glove' });
    } else {
      custom('baseball-bat-barrel', 'hand-held baseball bat barrel', 'rightHand', 'capsule', { x: 26, y: -34, width: 18, height: 96, rotate: -31, tone: 'cream', held: true, gripX: 0.5, gripY: 0.88, groupId: 'baseball-bat' });
      custom('baseball-bat-handle', 'baseball bat handle gripped by hand', 'rightHand', 'capsule', { x: 8, y: 16, width: 10, height: 58, rotate: -31, tone: 'dark', held: true, gripX: 0.5, gripY: 0.72, groupId: 'baseball-bat' });
    }
  }
  if (isJudge) { add('glasses', 'round old-lady judge glasses', { tone: 'dark' }); add('robe', 'black judicial robe', { tone: 'dark' }); custom('judge-gavel-head', 'hand-held judge gavel head', 'rightHand', 'rect', { x: 32, y: -44, width: 58, height: 24, rotate: -22, tone: 'dark', held: true, gripX: 0.5, gripY: 0.5, groupId: 'gavel' }); custom('judge-gavel-handle', 'judge gavel handle gripped by hand', 'rightHand', 'capsule', { x: 12, y: 12, width: 14, height: 82, rotate: -22, tone: 'accent', held: true, gripX: 0.5, gripY: 0.82, groupId: 'gavel' }); }
  if (isRobot) { add('antenna', 'left robot antenna attached to head', { side: 'left', tone: 'accent' }); add('antenna', 'right robot antenna attached to head', { side: 'right', tone: 'accent' }); add('panel', 'screen body panel', { tone: 'accent' }); }
  if (isPilot) add('scarf', 'pilot scarf', { tone: 'accent' });
  if (isLawyer) {
    add('badge', 'gold legal lapel badge', { tone: 'accent' });
    add('stripe', 'courtroom tie stripe', { tone: 'dark' });
    custom('lawyer-briefcase-body', 'lawyer briefcase body', 'rightHand', 'rect', { x: 42, y: 34, width: 84, height: 56, rotate: -8, tone: 'dark', held: true, gripX: 0.5, gripY: 0.08, groupId: 'briefcase' });
    custom('lawyer-briefcase-handle', 'briefcase handle gripped by hand', 'rightHand', 'arc', { x: 25, y: 8, width: 42, height: 34, rotate: -8, tone: 'accent', held: true, gripX: 0.5, gripY: 0.25, groupId: 'briefcase' });
  }
  if (!parts.length) { add('badge', 'prompt badge attached to torso', { tone: 'accent' }); }
  const mushroomStem = '#dbeafe';
  const wizardRobe = isMushroom ? '#312e81' : '#1e293b';
  const wizardLimb = isMushroom ? '#4338ca' : primary;
  const wizardHandsFeet = isMushroom ? mushroomStem : '#facc15';
  return {
    componentName: `${slugify(designBrief.title || prompt).split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('').slice(0, 32) || 'Custom'}Dude`,
    styleSystem: 'my-dude-react-css-scaffold',
    title: String(designBrief.title || `${prompt.slice(0, 42)} Buddy`).slice(0, 80),
    summary: String(designBrief.expandedPrompt || `Hand-coded React/CSS My Dude character for ${prompt}`).slice(0, 220),
    cssVariables: {
      '--dude-primary': primary,
      '--dude-secondary': /gold|yellow|star/.test(text) ? '#facc15' : primary,
      '--dude-accent': /flame|rocket/.test(text) ? '#fb923c' : /star|gold|yellow/.test(text) ? '#facc15' : '#93c5fd',
      '--dude-eye': /sleepy/.test(text) ? '#e0f2fe' : '#f8fafc',
      '--dude-panel': 'rgba(255,255,255,.18)',
      '--dude-mouth': '#0f172a',
      '--dude-body': isWizard || isJudge ? wizardRobe : isLawyer ? '#111827' : primary,
      '--dude-arm': isWizard || isJudge ? wizardLimb : isLawyer ? '#1f2937' : primary,
      '--dude-hand': isWizard ? wizardHandsFeet : primary,
      '--dude-leg': isWizard || isJudge ? wizardRobe : isLawyer ? '#111827' : primary,
      '--dude-foot': isWizard || isJudge ? wizardHandsFeet : isLawyer ? '#0f172a' : primary,
    },
    headShape: isMushroom ? 'mushroom' : isFox ? 'animal' : isRobot ? 'screen' : 'rounded',
    bodyShape: isRobot ? 'robot' : isWizard || isJudge ? 'robe' : isLawyer ? 'suited' : isPilot ? 'pilot' : 'compact',
    expression: /sleepy/.test(text) ? 'sleepy' : /focus|angry/.test(text) ? 'focused' : /excited|happy/.test(text) ? 'excited' : 'friendly',
    parts: parts.slice(0, 12),
    customPrimitives: customPrimitives.slice(0, 18),
    notes: (designBrief.visualChecklist || []).slice(0, 8),
  };
}

function suppressUnrequestedAnimalParts(parts = [], prompt = '', designBrief = {}) {
  const text = `${prompt} ${designBrief.expandedPrompt || ''}`.toLowerCase();
  const animalRequested = /\b(fox|cat|dog|wolf|animal|puppy|kitten|tail|ear|ears|snout|wing|wings|angel|bird|bat|dragon)\b/.test(String(prompt || '').toLowerCase());
  if (animalRequested) return parts;
  const animalish = new Set(['ear', 'tail', 'snout', 'wing', 'horn']);
  return parts.filter(part => !animalish.has(part.type));
}

function headItemDecisionWantsVisibleHeadItem(designBrief = {}) {
  const decision = (Array.isArray(designBrief.visualChecklist) ? designBrief.visualChecklist : [])
    .find(item => /head item decision/i.test(String(item || '')));
  return /head item decision:\s*yes\b/i.test(String(decision || ''));
}

function validateReactCssFaithfulness(character = {}, prompt = '', designBrief = {}) {
  const text = `${prompt} ${designBrief.expandedPrompt || ''} ${(designBrief.visualChecklist || []).join(' ')}`.toLowerCase();
  const parts = Array.isArray(character.parts) ? character.parts : [];
  const customPrimitives = Array.isArray(character.customPrimitives) ? character.customPrimitives : [];
  const has = (type, side) => parts.some(part => part.type === type && (!side || part.side === side));
  const hasVisibleHeadItem = () => {
    const headPartTypes = new Set(['hat','helmet','crown','antenna','glasses','mushroomCap','mushroomGills','horn']);
    return parts.some(part => headPartTypes.has(part.type)) || customPrimitives.some(p => ['headTop','headLeft','headRight','head'].includes(p.anchor));
  };
  const failures = [];
  if (headItemDecisionWantsVisibleHeadItem(designBrief) && !hasVisibleHeadItem()) failures.push('Head item decision says yes, so the React/CSS blueprint must visibly render that head item on headTop/headLeft/headRight or as hat/helmet/crown/antenna/glasses');
  if (/\b(alien|extraterrestrial|martian|ufo)\b/.test(text) && (!has('antenna', 'left') || !has('antenna', 'right'))) failures.push('alien prompts must include explicit left and right antenna parts so both are visible and attached to the head');
  if (/mushroom|toadstool|fungus/.test(text)) {
    if (character.headShape !== 'mushroom') failures.push('mushroom prompt must use headShape:"mushroom"');
    if (!has('mushroomCap')) failures.push('mushroom prompt must include mushroomCap part for a wide cap silhouette');
    if (!has('mushroomGills')) failures.push('mushroom prompt must include mushroomGills part for underside/gills');
    if (parts.filter(part => part.type === 'spot').length < 2) failures.push('mushroom prompt must include at least two cap spot parts');
    const forbidden = suppressUnrequestedAnimalParts(parts, prompt, designBrief).length !== parts.length;
    if (forbidden) failures.push('mushroom/non-animal prompt must not include unrequested dog/animal ears, snout, tail, horns, or wings');
  }
  if (/wand|staff|sword|lantern/.test(text) && !parts.some(part => ['wand'].includes(part.type) && ['left','right'].includes(part.side))) failures.push('held wand/staff must have side left/right so it can attach to a hand');
  if (/boot/.test(text) && (!has('boot', 'left') || !has('boot', 'right'))) failures.push('boots must include left and right foot-worn boot parts');
  const customText = customPrimitives.map(p => `${p.label || ''} ${p.id || ''} ${p.anchor || ''} ${p.shape || ''}`).join(' ').toLowerCase();
  if (/tennis|racket|racquet/.test(text) && !/racket|racquet/.test(customText)) failures.push('tennis prompt must include a hand-held customPrimitives racket instead of a generic badge');
  if (/lawyer|attorney|court|legal|briefcase/.test(text) && !/briefcase|case|document|legal|gavel/.test(customText)) failures.push('lawyer/judge prompt must include a hand-held legal prop such as a briefcase, document, or gavel');
  if (/baseball/.test(text) && /\b(glove|mitt|bat)\b/.test(text) && !/\b(glove|mitt|bat)\b/.test(customText)) failures.push('baseball prompt that mentions a glove or bat must render it as a hand-held custom primitive, not as a generic badge');
  if (/\b(ball|orb|bubble|planet)\b/.test(customText)) failures.push('for now React/CSS custom primitives must not include balls or detached round props');
  if (customPrimitives.some(p => ['root','body','bodyFront','head'].includes(p.anchor) && /prop|tool|case|racket|wand|staff|briefcase|document|gavel|bat|glove|mitt/.test(`${p.label || ''} ${p.id || ''}`.toLowerCase()))) failures.push('held objects such as bats, gloves, gavels, rackets, documents, and briefcases must be anchored to leftHand or rightHand, not floating on root/body/bodyFront/head');
  return { ok: failures.length === 0, failures };
}

function primitiveHintsFromUnknownParts(sourceParts = []) {
  const hints = [];
  const push = (id, label, anchor, shape, opts = {}) => hints.push({
    id, label, anchor, shape,
    x: opts.x || 0, y: opts.y || 0,
    width: opts.width || 44, height: opts.height || 44,
    rotate: opts.rotate || 0,
    tone: opts.tone || 'accent',
    outline: opts.outline !== false,
    held: opts.held === true,
    gripX: opts.gripX,
    gripY: opts.gripY,
    groupId: opts.groupId,
  });
  for (const part of sourceParts) {
    const text = `${part?.type || ''} ${part?.label || ''}`.toLowerCase();
    const side = part?.side === 'left' ? 'left' : part?.side === 'right' ? 'right' : '';
    if (/racket|racquet/.test(text)) {
      const anchor = side === 'left' ? 'leftHand' : 'rightHand';
      push(`${slugify(text)}-head`, part?.label || 'racket head', anchor, 'ring', { x: side === 'left' ? -58 : 58, y: -52, width: 78, height: 100, rotate: side === 'left' ? 18 : -18 });
      push(`${slugify(text)}-handle`, `${part?.label || 'racket'} handle`, anchor, 'capsule', { x: side === 'left' ? -24 : 24, y: 18, width: 16, height: 92, rotate: side === 'left' ? 20 : -20, tone: 'dark' });
    } else if (/ball|orb|bubble|planet/.test(text)) {
      continue;
    } else if (/briefcase|case|document|folder/.test(text)) {
      const anchor = side === 'left' ? 'leftHand' : 'rightHand';
      push(`${slugify(text)}-body`, part?.label || 'hand-held briefcase body', anchor, 'rect', { x: side === 'left' ? -42 : 42, y: 34, width: 84, height: 56, rotate: side === 'left' ? 8 : -8, tone: 'dark', held: true, gripX: 0.5, gripY: 0.08, groupId: slugify(text).replace(/-(body|handle)$/,'') || 'briefcase' });
      push(`${slugify(text)}-handle`, `${part?.label || 'briefcase'} handle`, anchor, 'arc', { x: side === 'left' ? -25 : 25, y: 8, width: 42, height: 34, rotate: side === 'left' ? 8 : -8, tone: 'accent', held: true, gripX: 0.5, gripY: 0.25, groupId: slugify(text).replace(/-(body|handle)$/,'') || 'briefcase' });
    } else if (/shoe|sneaker|skate/.test(text)) {
      push(slugify(text), part?.label || 'custom shoe', side === 'right' ? 'rightFoot' : 'leftFoot', 'capsule', { x: side === 'right' ? 10 : -10, y: 14, width: 72, height: 28, rotate: side === 'right' ? 8 : -8 });
    } else if (/headband|band|visor/.test(text)) {
      push(slugify(text), part?.label || 'head band', 'headTop', 'capsule', { y: 54, width: 176, height: 18, rotate: -3, tone: part?.tone || 'accent' });
    }
    if (hints.length >= 12) break;
  }
  return hints;
}

function sanitizeCustomPrimitives(rawPrimitives = [], fallbackPrimitives = [], hintPrimitives = []) {
  const allowedAnchors = new Set(['head','headTop','headLeft','headRight','body','bodyFront','leftHand','rightHand','leftFoot','rightFoot','leftEye','rightEye']);
  const allowedShapes = new Set(['circle','oval','capsule','ring','line','rect','triangle','star','arc']);
  const allowedTones = new Set(['primary','secondary','accent','cream','dark','eye']);
  const source = Array.isArray(rawPrimitives) && rawPrimitives.length ? rawPrimitives : [];
  const combined = [...source, ...hintPrimitives, ...(Array.isArray(fallbackPrimitives) ? fallbackPrimitives : [])];
  const clamp = (value, min, max, fb = 0) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : fb));
  const seen = new Set();
  const out = [];
  for (const primitive of combined) {
    if (!primitive || typeof primitive !== 'object') continue;
    const label = String(primitive.label || primitive.id || 'custom primitive').replace(/[<>]/g, '').slice(0, 80);
    const labelText = `${label} ${primitive.id || ''}`.toLowerCase();
    if (/\b(ball|orb|bubble|planet)\b/.test(labelText)) continue;
    const id = slugify(primitive.id || label || `primitive-${out.length + 1}`) || `primitive-${out.length + 1}`;
    const semanticKey = `${label.toLowerCase().replace(/\b(left|right|the|a|an|gripped|through|by|hand)\b/g, '').replace(/[^a-z0-9]+/g, '-')}|${primitive.anchor || ''}|${primitive.shape || ''}`;
    if (seen.has(id) || seen.has(semanticKey)) continue;
    seen.add(id);
    seen.add(semanticKey);
    out.push({
      id,
      label,
      anchor: allowedAnchors.has(primitive.anchor) ? primitive.anchor : 'bodyFront',
      shape: allowedShapes.has(primitive.shape) ? primitive.shape : 'oval',
      x: clamp(primitive.x, -180, 180),
      y: clamp(primitive.y, -180, 180),
      width: clamp(primitive.width, 4, 180, 44),
      height: clamp(primitive.height, 4, 180, 44),
      rotate: clamp(primitive.rotate, -180, 180),
      tone: allowedTones.has(primitive.tone) ? primitive.tone : 'accent',
      outline: primitive.outline !== false,
      held: primitive.held === true || ['leftHand','rightHand'].includes(primitive.anchor),
      gripX: clamp(primitive.gripX, 0, 1, 0.5),
      gripY: clamp(primitive.gripY, 0, 1, 0.5),
      groupId: slugify(primitive.groupId || label.replace(/\b(left|right|the|a|an|gripped|through|by|hand|body|handle|head|shaft|blade|strap|page|screen)\b/ig, '')) || id.replace(/-(body|handle|head|shaft|blade|strap|page|screen)$/i, ''),
    });
    if (out.length >= 18) break;
  }
  return out;
}

function sanitizeReactCssCharacter(raw, prompt = '', designBrief = {}) {
  const fallback = fallbackReactCssCharacter(prompt, designBrief);
  const clean = raw && typeof raw === 'object' ? raw : {};
  const validColor = (value, fb) => {
    const v = String(value || '').trim();
    return /^(#[0-9a-f]{3,8}|rgba?\([^)]{1,80}\)|hsla?\([^)]{1,80}\))$/i.test(v) ? v.slice(0, 90) : fb;
  };
  const allowedVars = ['--dude-primary','--dude-secondary','--dude-accent','--dude-eye','--dude-panel','--dude-mouth','--dude-body','--dude-arm','--dude-hand','--dude-leg','--dude-foot'];
  const cssVariables = {};
  for (const key of allowedVars) cssVariables[key] = validColor(clean.cssVariables?.[key], fallback.cssVariables[key]);
  const promptText = `${prompt} ${designBrief.expandedPrompt || ''}`.toLowerCase();
  const isMushroomWizard = /\b(mushroom|toadstool|fungus)\b/.test(promptText) && /\b(wizard|magic|wand|staff)\b/.test(promptText);
  const isJudge = /\b(judge|courtroom|judicial|gavel)\b/.test(promptText);
  const isLawyer = /\b(lawyer|attorney|legal|briefcase|suit|tie)\b/.test(promptText) && !isJudge;
  const isAlien = /\b(alien|extraterrestrial|martian|ufo)\b/.test(promptText);
  if (isMushroomWizard) {
    cssVariables['--dude-body'] = '#312e81';
    cssVariables['--dude-arm'] = '#4338ca';
    cssVariables['--dude-hand'] = '#dbeafe';
    cssVariables['--dude-leg'] = '#312e81';
    cssVariables['--dude-foot'] = '#dbeafe';
  } else if (isLawyer || isJudge) {
    cssVariables['--dude-body'] = '#111827';
    cssVariables['--dude-arm'] = '#1f2937';
    cssVariables['--dude-leg'] = '#111827';
    cssVariables['--dude-foot'] = '#0f172a';
    if (isAlien) cssVariables['--dude-hand'] = '#34d399';
  }
  const oneOf = (value, allowed, fb) => allowed.includes(value) ? value : fb;
  const allowedPartTypes = new Set(['ear','tail','snout','horn','wing','hat','glasses','star','boot','flame','wand','badge','scarf','antenna','spot','stripe','panel','robe','helmet','crown','spark','mushroomCap','mushroomGills']);
  const allowedSides = new Set(['left','right','center']);
  const allowedTones = new Set(['primary','secondary','accent','cream','dark','eye']);
  const sourceParts = Array.isArray(clean.parts) && clean.parts.length ? [...clean.parts] : [];
  const primitiveHints = primitiveHintsFromUnknownParts(sourceParts.filter(part => !allowedPartTypes.has(part?.type)));
  for (const fallbackPart of fallback.parts) {
    if (!sourceParts.some(part => part?.type === fallbackPart.type && (part?.side || 'center') === (fallbackPart.side || 'center'))) sourceParts.push(fallbackPart);
  }
  const mappedParts = sourceParts.map((part, index) => ({
    type: allowedPartTypes.has(part?.type) ? part.type : 'badge',
    side: allowedSides.has(part?.side) ? part.side : 'center',
    tone: allowedTones.has(part?.tone) ? part.tone : 'primary',
    label: String(part?.label || `${part?.type || 'detail'} ${index + 1}`).replace(/[<>]/g, '').slice(0, 80),
  })).slice(0, 16);
  const parts = suppressUnrequestedAnimalParts(mappedParts, prompt, designBrief).slice(0, 12);
  const customPrimitives = sanitizeCustomPrimitives(clean.customPrimitives, fallback.customPrimitives, primitiveHints);
  return {
    kind: 'react-css-character',
    componentName: String(clean.componentName || fallback.componentName).replace(/[^A-Za-z0-9]/g, '').slice(0, 40) || fallback.componentName,
    styleSystem: 'my-dude-react-css-scaffold',
    title: String(clean.title || fallback.title).replace(/[<>]/g, '').slice(0, 90),
    summary: String(clean.summary || fallback.summary).replace(/[<>]/g, '').slice(0, 240),
    cssVariables,
    headShape: oneOf(clean.headShape, ['rounded','animal','helmet','screen','mushroom','crown'], fallback.headShape),
    bodyShape: isMushroomWizard || isJudge ? 'robe' : oneOf(clean.bodyShape, ['compact','round','suited','robot','robe','pilot'], fallback.bodyShape),
    expression: oneOf(clean.expression, ['friendly','sleepy','focused','excited','curious'], fallback.expression),
    parts: parts.length ? parts : fallback.parts,
    customPrimitives,
    notes: (Array.isArray(clean.notes) ? clean.notes : fallback.notes).map(n => String(n).replace(/[<>]/g, '').slice(0, 140)).filter(Boolean).slice(0, 8),
  };
}

async function generateTest5ReactCssCharacter(prompt, designBrief, repairNote = '') {
  const userContent = `${repairNote ? `Repair this blueprint issue: ${repairNote}\n\n` : ''}Original user prompt: ${prompt.trim().slice(0, 900)}\nExpanded prompt: ${String(designBrief?.expandedPrompt || '').slice(0, 1800)}\nVisual checklist: ${(designBrief?.visualChecklist || []).join('; ')}\nReturn one safe React/CSS character blueprint JSON object now.`;
  try {
    const result = await callTest5Chat({ system: test5ReactCssSystemPrompt(designBrief), userContent, temperature: repairNote ? 0.18 : 0.48, maxTokens: 1500, stage: repairNote ? 'react-css-repair' : 'react-css' });
    const rawReactCssCharacter = parseJsonObject(result.content);
    return { ...result, rawReactCssCharacter, reactCssCharacter: sanitizeReactCssCharacter(rawReactCssCharacter, prompt, designBrief) };
  } catch (error) {
    return { provider: 'local/react-css-fallback', content: String(error?.message || error), rawReactCssCharacter: null, reactCssCharacter: sanitizeReactCssCharacter(null, prompt, designBrief) };
  }
}

async function generateFaithfulTest5ReactCssCharacter(prompt, designBrief) {
  const reactCssRepairNotes = [];
  let result = await generateTest5ReactCssCharacter(prompt, designBrief);
  let faithfulness = validateReactCssFaithfulness(result.reactCssCharacter, prompt, designBrief);
  for (let attempt = 0; !faithfulness.ok && attempt < 2; attempt += 1) {
    const note = `${faithfulness.failures.join('; ')}. Return corrected JSON only. Preserve the prompt, remove unrequested animal traits, and use renderer parts that satisfy the failure.`;
    reactCssRepairNotes.push(note);
    result = await generateTest5ReactCssCharacter(prompt, designBrief, note);
    faithfulness = validateReactCssFaithfulness(result.reactCssCharacter, prompt, designBrief);
  }
  if (!faithfulness.ok) {
    reactCssRepairNotes.push(`deterministic sanitize fallback applied: ${faithfulness.failures.join('; ')}`);
    result = { ...result, reactCssCharacter: sanitizeReactCssCharacter(null, prompt, designBrief) };
    faithfulness = validateReactCssFaithfulness(result.reactCssCharacter, prompt, designBrief);
  }
  return { ...result, reactCssFaithfulness: faithfulness, reactCssRepairNotes };
}

function renderableDetail(id, label, acceptableShapes, acceptableSockets = [], minimumCount = 1) {
  return { id, label, acceptableShapes, acceptableSockets, minimumCount };
}

function inferRequiredRenderableDetails(prompt = '', brief = {}) {
  const text = `${prompt} ${brief.expandedPrompt || ''} ${(brief.visualChecklist || []).join(' ')} ${(brief.requiredDetails || []).join(' ')}`.toLowerCase();
  const details = [];
  const add = (detail) => { if (!details.some(d => d.id === detail.id)) details.push(detail); };
  if (/fox|cat|dog|wolf|animal/.test(text)) add(renderableDetail('animal_ears', 'visible animal/fox ears', ['animalEar', 'softEar'], ['head.leftEar', 'head.rightEar'], 2));
  if (/fox|dog|wolf|cat|tail/.test(text)) add(renderableDetail('tail', 'visible tail', ['tail'], ['body.back', 'body.leftHand', 'body.rightHand'], 1));
  if (/fox|dog|wolf|cat|snout/.test(text)) add(renderableDetail('snout', 'animal snout', ['snout'], ['head.mouth'], 1));
  if (/goggle|glasses|visor|headphone|headphones/.test(text)) add(renderableDetail('eyewear', 'visible goggles/glasses/headphones proxy', ['glasses', 'sunglasses', 'panel', 'wire'], ['head.center', 'head.leftEye', 'head.rightEye'], 1));
  if (/star goggle|star-shaped|star goggles|star/.test(text)) add(renderableDetail('star_accents', 'star accents', ['star', 'spark', 'starEye'], ['head.leftEye', 'head.rightEye', 'head.center', 'body.front'], 2));
  if (/rocket boot|boots|boot/.test(text)) add(renderableDetail('boots', 'boots on both feet', ['boot'], ['body.leftFoot', 'body.rightFoot'], 2));
  if (/rocket boot|flame|jet|rocket/.test(text)) add(renderableDetail('flame_accents', 'rocket/flame accents', ['flame', 'spark', 'rocket'], ['body.leftFoot', 'body.rightFoot', 'body.front'], 2));
  if (/pilot|aviator|scarf/.test(text)) add(renderableDetail('pilot_scarf_or_badge', 'pilot scarf or badge', ['tie', 'bowtie', 'flag', 'badge', 'rope'], ['body.front'], 1));
  if (/wizard|magic|staff|wand/.test(text)) add(renderableDetail('magic_staff', 'wand or staff', ['wand', 'spark', 'star'], ['body.leftHand', 'body.rightHand', 'body.front'], 1));
  if (/dj|music|drummer|song|headphone/.test(text)) add(renderableDetail('music_details', 'music notes or audio gear', ['musicNote', 'microphone', 'glasses', 'spark'], ['body.front', 'head.center', 'head.leftEye', 'head.rightEye'], 1));
  if (/dragon|demon|horn/.test(text)) add(renderableDetail('horns', 'horns', ['softHorn', 'horn'], ['head.leftHorn', 'head.rightHorn'], 2));
  if (/dragon|bird|bat|wing/.test(text)) add(renderableDetail('wings', 'wings', ['wing'], ['body.leftShoulder', 'body.rightShoulder'], 2));
  return details.slice(0, 8);
}

function normalizeRenderableDetails(details = [], prompt = '', brief = {}) {
  const inferred = inferRequiredRenderableDetails(prompt, brief);
  const normalized = [];
  const add = (detail) => {
    if (!detail || typeof detail !== 'object') return;
    const acceptableShapes = (Array.isArray(detail.acceptableShapes) ? detail.acceptableShapes : []).filter(s => DRAWING_SHAPES.has(s));
    if (!acceptableShapes.length) return;
    const acceptableSockets = (Array.isArray(detail.acceptableSockets) ? detail.acceptableSockets : []).filter(s => ATTACHMENT_SOCKET_NAMES.has(s));
    const id = slugify(detail.id || detail.label || acceptableShapes.join('-'));
    if (normalized.some(d => d.id === id)) return;
    normalized.push({
      id,
      label: String(detail.label || id).slice(0, 120),
      acceptableShapes,
      acceptableSockets,
      minimumCount: Math.max(1, Math.min(8, Number(detail.minimumCount) || 1)),
    });
  };
  for (const detail of details) add(detail);
  for (const detail of inferred) add(detail);
  const animalRequestedByUser = /\b(fox|cat|dog|wolf|animal|puppy|kitten|tail|ear|ears|snout|wing|wings|angel|bird|bat|dragon|horn|horns)\b/.test(String(prompt || '').toLowerCase());
  const filtered = animalRequestedByUser ? normalized : normalized.filter(detail => !/animal|ear|snout|tail|wing|horn/.test(`${detail.id} ${detail.label}`.toLowerCase()));
  return filtered.slice(0, 10);
}

function validateDetailCoverage(designBrief = {}, scene = {}) {
  const layers = Array.isArray(scene?.layers) ? scene.layers : [];
  const required = Array.isArray(designBrief.requiredRenderableDetails) ? designBrief.requiredRenderableDetails : [];
  const checks = required.map(detail => {
    const matches = layers.filter(layer => {
      const shapeOk = detail.acceptableShapes?.includes(layer.shape);
      const socketOk = !detail.acceptableSockets?.length || detail.acceptableSockets.includes(layer.attach?.socket);
      return shapeOk && socketOk;
    });
    return { id: detail.id, label: detail.label, ok: matches.length >= detail.minimumCount, count: matches.length, minimumCount: detail.minimumCount, layers: matches.map(l => l.id || `${l.shape}:${l.attach?.socket || ''}`) };
  });
  const missingRequiredDetails = checks.filter(c => !c.ok).map(c => c.id);
  return { ok: missingRequiredDetails.length === 0, checks, missingRequiredDetails };
}

function test5Layer(shape, socket, material, { x = 0, y = 0, scale = [0.25, 0.25], rotate = 0, z = 14, role = 'part' } = {}) {
  return { shape, anchor: 'free', x, y, scale, rotate, material, opacity: 1, role, z, attach: { socket }, id: `enrich-${shape}-${socket.replace(/[^a-z0-9]/gi, '-')}-${Math.round(x)}-${Math.round(y)}-${Math.round(z)}` };
}

function ensurePromptDetails(prompt = '', designBrief = {}, scene = {}) {
  const text = `${prompt} ${designBrief.expandedPrompt || ''} ${(designBrief.visualChecklist || []).join(' ')}`.toLowerCase();
  const userText = String(prompt || '').toLowerCase();
  const next = { ...scene, layers: Array.isArray(scene.layers) ? [...scene.layers] : [] };
  const enrichments = [];
  const has = (shape, socket) => next.layers.some(l => l.shape === shape && (!socket || l.attach?.socket === socket));
  const add = (reason, layer) => {
    if (!DRAWING_SHAPES.has(layer.shape) || !DRAWING_MATERIALS.has(layer.material) || !ATTACHMENT_SOCKET_NAMES.has(layer.attach?.socket)) return;
    if (has(layer.shape, layer.attach.socket) && ['mascotBody','mascotHead','cuteEye','mouthSmile','mouthGrin'].includes(layer.shape)) return;
    next.layers.push(layer);
    enrichments.push({ reason, shape: layer.shape, socket: layer.attach.socket, id: layer.id });
  };
  const primary = /orange|fox/.test(text) ? 'glossyOrange' : materialForText(text);
  if (/\b(fox|cat|dog|wolf|animal)\b/.test(userText)) {
    if (!has('animalEar', 'head.leftEar') && !has('softEar', 'head.leftEar')) add('animal ears', test5Layer('animalEar', 'head.leftEar', primary, { scale: [0.28, 0.34], rotate: -16, z: 7 }));
    if (!has('animalEar', 'head.rightEar') && !has('softEar', 'head.rightEar')) add('animal ears', test5Layer('animalEar', 'head.rightEar', primary, { scale: [0.28, 0.34], rotate: 16, z: 7 }));
    if (!has('snout', 'head.mouth')) add('animal snout', test5Layer('snout', 'head.mouth', 'warmCream', { y: -4, scale: [0.38, 0.24], z: 23 }));
  }
  if (/\b(fox|dog|wolf|cat|tail)\b/.test(userText) && !has('tail', 'body.back')) add('tail', test5Layer('tail', 'body.back', primary, { x: 66, y: 4, scale: [0.42, 0.72], rotate: 28, z: 1 }));
  if (/goggle|glasses|visor|headphone|headphones/.test(text) && !has('glasses', 'head.center') && !has('sunglasses', 'head.center')) add('eyewear', test5Layer('glasses', 'head.center', 'chrome', { y: -4, scale: [0.58, 0.34], z: 22 }));
  if (/star goggle|star-shaped|star goggles|star/.test(text)) {
    if (!has('star', 'head.leftEye')) add('star accent', test5Layer('star', 'head.leftEye', 'glossyGold', { x: -6, y: -14, scale: [0.13, 0.13], rotate: -10, z: 24 }));
    if (!has('star', 'head.rightEye')) add('star accent', test5Layer('star', 'head.rightEye', 'glossyGold', { x: 6, y: -14, scale: [0.13, 0.13], rotate: 10, z: 24 }));
  }
  if (/rocket boot|boots|boot/.test(text)) {
    if (!has('boot', 'body.leftFoot')) add('boots', test5Layer('boot', 'body.leftFoot', 'chrome', { y: 8, scale: [0.28, 0.24], rotate: -8, z: 7 }));
    if (!has('boot', 'body.rightFoot')) add('boots', test5Layer('boot', 'body.rightFoot', 'chrome', { y: 8, scale: [0.28, 0.24], rotate: 8, z: 7 }));
  }
  if (/rocket boot|flame|jet|rocket/.test(text)) {
    if (!has('flame', 'body.leftFoot')) add('flame accents', test5Layer('flame', 'body.leftFoot', 'flame', { y: 34, scale: [0.18, 0.28], rotate: 180, z: 6 }));
    if (!has('flame', 'body.rightFoot')) add('flame accents', test5Layer('flame', 'body.rightFoot', 'flame', { y: 34, scale: [0.18, 0.28], rotate: 180, z: 6 }));
  }
  if (/pilot|aviator|scarf/.test(text) && !has('tie', 'body.front') && !has('badge', 'body.front')) add('pilot scarf/badge', test5Layer('tie', 'body.front', 'glossyRed', { y: -18, scale: [0.28, 0.28], rotate: -18, z: 12 }));
  if (/wizard|magic|staff|wand/.test(text) && !has('wand', 'body.rightHand')) add('magic staff', test5Layer('wand', 'body.rightHand', 'wood', { x: 18, y: -8, scale: [0.32, 0.5], rotate: -22, z: 13 }));
  if (/dj|music|drummer|song|headphone/.test(text) && !next.layers.some(l => ['musicNote','microphone'].includes(l.shape))) add('music detail', test5Layer('musicNote', 'body.front', 'neon', { x: 52, y: -50, scale: [0.28, 0.28], rotate: 8, z: 15 }));
  if (/\b(dragon|demon|horn|horns)\b/.test(userText)) {
    if (!has('softHorn', 'head.leftHorn') && !has('horn', 'head.leftHorn')) add('horns', test5Layer('softHorn', 'head.leftHorn', 'warmCream', { scale: [0.24, 0.32], rotate: -12, z: 7 }));
    if (!has('softHorn', 'head.rightHorn') && !has('horn', 'head.rightHorn')) add('horns', test5Layer('softHorn', 'head.rightHorn', 'warmCream', { scale: [0.24, 0.32], rotate: 12, z: 7 }));
  }
  if (/dragon|bird|bat|wing|angel/.test(userText)) {
    if (!has('wing', 'body.leftShoulder')) add('wings', test5Layer('wing', 'body.leftShoulder', primary, { scale: [0.34, 0.38], rotate: -24, z: 1 }));
    if (!has('wing', 'body.rightShoulder')) add('wings', test5Layer('wing', 'body.rightShoulder', primary, { scale: [0.34, 0.38], rotate: 24, z: 1 }));
  }
  next.layers = next.layers.slice(0, 28);
  return { sceneSpec: next, enrichments };
}

function coerceTest5RawScene(raw, prompt = '') {
  if (!raw || typeof raw !== 'object') return raw;
  const shapeAliases = new Map(Object.entries({
    body: 'mascotBody', body_blob: 'mascotBody', mascot: 'mascotBody', torso: 'mascotBody', belly: 'bodyPatch', bellyPatch: 'bodyPatch',
    head: 'mascotHead', head_round: 'mascotHead', head_dragon: 'mascotHead', face: 'mascotHead',
    arm: 'stubbyArm', leftArm: 'stubbyArm', rightArm: 'stubbyArm', limb_arm: 'stubbyArm', flipper: 'stubbyArm',
    leg: 'stubbyLeg', leftLeg: 'stubbyLeg', rightLeg: 'stubbyLeg', limb_leg: 'stubbyLeg',
    foot: 'hoof', feet: 'hoof', bootFoot: 'boot', boot: 'boot',
    eye: 'cuteEye', leftEye: 'cuteEye', rightEye: 'cuteEye', eyes_cartoon: 'cuteEye', eyes_googly: 'googlyEye', eyes_pixel: 'pixelEye',
    smile: 'mouthSmile', mouth: 'mouthSmile', mouth_smile: 'mouthSmile', mouth_grin: 'mouthGrin', beak: 'mouthSmile',
    limb_claw: 'claw', claw: 'claw', paw: 'paw', hand: 'mitten', mittenHand: 'mitten',
    accessory_antenna: 'antenna', antennaOrb: 'antenna', accessory_goggles: 'glasses', goggles: 'glasses', glasses: 'glasses', headphones: 'glasses', headphone: 'glasses',
    texture_spots: 'bodyPatch', spot: 'spot', spots: 'spot', texture_stripes: 'stripe', stripe: 'stripe',
    accessory_hat: 'topHat', hat: 'topHat', wizardHat: 'topHat', accessory_crown: 'crown', crown: 'crown', accessory_wand: 'wand', staff: 'wand', wand: 'wand',
    musicNote: 'musicNote', music: 'musicNote', note: 'musicNote', glow: 'spark', sparkle: 'spark', star: 'star', badge: 'badge', panel: 'panel', screen: 'screen',
    horn: 'softHorn', horns: 'softHorn', wing: 'wing', wings: 'wing', tail: 'tail', tails: 'tail', foxTail: 'tail', scarf: 'tie', pilotScarf: 'tie', aviatorScarf: 'tie', ear: 'softEar', ears: 'softEar',
  }));
  const materialAliases = new Map(Object.entries({
    silver: 'chrome', gray: 'chrome', grey: 'chrome', glossyGray: 'chrome', glossyGrey: 'chrome', glossySlate: 'chrome', chrome: 'chrome', black: 'charcoalRubber', white: 'softWhite', cyan: 'neon', blue: 'glossyBlue', purple: 'glossyPurple', orange: 'glossyOrange', gold: 'glossyGold', yellow: 'glossyGold', green: 'glossyGreen', red: 'glossyRed', pink: 'glossyPink',
  }));
  const socketAliases = new Map(Object.entries({
    'head.top': 'head.center', 'head.left': 'head.leftEar', 'head.right': 'head.rightEar', 'face.leftEye': 'head.leftEye', 'face.rightEye': 'head.rightEye', 'face.mouth': 'head.mouth',
    'body.belly': 'body.front', 'body.chest': 'body.front', 'body.left': 'body.patchLeft', 'body.right': 'body.patchRight', 'body.tail': 'body.back', 'leftEye': 'head.leftEye', 'rightEye': 'head.rightEye',
  }));
  const layers = Array.isArray(raw.layers) ? raw.layers.map((layer, index) => {
    const next = { ...layer };
    next.shape = shapeAliases.get(next.shape) || next.shape;
    next.material = materialAliases.get(next.material) || next.material;
    if (!DRAWING_MATERIALS.has(next.material)) next.material = materialForText(`${prompt} ${next.material || ''} ${next.shape || ''}`);
    if (next.role && !['eye', 'mouth'].includes(next.role)) next.role = 'part';
    if ((next.shape === 'mascotBody' || next.shape === 'mascotHead') && next.role !== 'eye' && next.role !== 'mouth') next.role = 'part';
    const text = `${next.id || ''} ${next.anchor || ''} ${next.attach?.socket || ''} ${next.shape || ''} ${index}`;
    const side = /right/i.test(text) ? 'right' : /left/i.test(text) ? 'left' : index % 2 ? 'right' : 'left';
    if (!next.attach || typeof next.attach !== 'object') next.attach = {};
    if (next.attach.socket) next.attach.socket = socketAliases.get(String(next.attach.socket)) || next.attach.socket;
    if (!ATTACHMENT_SOCKET_NAMES.has(String(next.attach.socket || ''))) delete next.attach.socket;
    if (!next.attach.socket) {
      if (next.shape === 'mascotBody') next.attach.socket = 'body.center';
      else if (next.shape === 'mascotHead') next.attach.socket = 'head.center';
      else if (next.role === 'eye' || /Eye$/.test(next.shape)) next.attach.socket = side === 'right' ? 'head.rightEye' : 'head.leftEye';
      else if (next.role === 'mouth' || /^mouth|snout|beak/.test(next.shape)) next.attach.socket = 'head.mouth';
      else if (/antenna|horn/i.test(next.shape)) next.attach.socket = side === 'right' ? 'head.rightHorn' : 'head.leftHorn';
      else if (/ear/i.test(next.shape)) next.attach.socket = side === 'right' ? 'head.rightEar' : 'head.leftEar';
      else if (/arm|claw|paw|mitten|flipper/.test(next.shape)) next.attach.socket = side === 'right' ? 'body.rightHand' : 'body.leftHand';
      else if (/leg|hoof|boot/.test(next.shape)) next.attach.socket = side === 'right' ? 'body.rightFoot' : 'body.leftFoot';
      else if (/glasses|screen|panel|button|tie|badge|wand|spark/.test(next.shape)) next.attach.socket = 'body.front';
      else if (/patch|spot|stripe/.test(next.shape)) next.attach.socket = side === 'right' ? 'body.patchRight' : 'body.patchLeft';
      else if (/tail/.test(next.shape)) next.attach.socket = 'body.back';
      else if (/wing/.test(next.shape)) next.attach.socket = side === 'right' ? 'body.rightShoulder' : 'body.leftShoulder';
    }
    if (!next.attach.socket) delete next.attach;
    return next;
  }) : [];
  const ensured = [...layers].filter(layer => DRAWING_SHAPES.has(layer.shape));
  const addLayer = (layer) => ensured.push({ anchor: 'free', x: 0, y: 0, rotate: 0, opacity: 1, ...layer });
  const primaryMaterial = materialForText(prompt);
  if (!ensured.some(l => l.shape === 'mascotBody')) addLayer({ shape: 'mascotBody', scale: [0.62, 0.6], material: primaryMaterial, role: 'part', z: 2, attach: { socket: 'body.center' } });
  if (!ensured.some(l => l.shape === 'mascotHead')) addLayer({ shape: 'mascotHead', scale: [0.94, 0.84], material: primaryMaterial, role: 'part', z: 8, attach: { socket: 'head.center' } });
  if (ensured.filter(l => l.role === 'eye').length < 2) {
    addLayer({ shape: /robot|pixel|screen/i.test(prompt) ? 'pixelEye' : 'cuteEye', scale: [0.24, 0.24], material: 'softWhite', role: 'eye', z: 20, attach: { socket: 'head.leftEye' } });
    addLayer({ shape: /robot|pixel|screen/i.test(prompt) ? 'pixelEye' : 'cuteEye', scale: [0.24, 0.24], material: 'softWhite', role: 'eye', z: 20, attach: { socket: 'head.rightEye' } });
  }
  if (ensured.filter(l => l.role === 'mouth').length !== 1) {
    for (const layer of ensured.filter(l => l.role === 'mouth').slice(1)) layer.role = 'part';
    if (!ensured.some(l => l.role === 'mouth')) addLayer({ shape: /robot|screen/i.test(prompt) ? 'mouthScreen' : 'mouthSmile', x: 0, y: 18, scale: [0.38, 0.2], material: 'charcoalRubber', role: 'mouth', z: 31, attach: { socket: 'head.mouth' } });
  }
  return { ...raw, title: raw.title || `${prompt.slice(0, 48)} Buddy`, layers: ensured.slice(0, 28) };
}

function validateTest5Scene(scene) {
  const errors = [];
  const layers = Array.isArray(scene?.layers) ? scene.layers : [];
  if (!scene || typeof scene !== 'object') errors.push('scene is not an object');
  if (!layers.length) errors.push('scene.layers is empty');
  if (!layers.some(l => l.shape === 'mascotBody')) errors.push('missing mascotBody layer');
  if (!layers.some(l => l.shape === 'mascotHead')) errors.push('missing mascotHead layer');
  if (layers.filter(l => l.role === 'eye').length < 2) errors.push('need at least two role:"eye" layers');
  if (layers.filter(l => l.role === 'mouth').length !== 1) errors.push('need exactly one role:"mouth" layer');
  if (layers.length > 28) errors.push('too many layers; max 28');
  for (const layer of layers) {
    if (!DRAWING_SHAPES.has(layer.shape)) errors.push(`invalid shape ${layer.shape}`);
    if (!DRAWING_MATERIALS.has(layer.material)) errors.push(`invalid material ${layer.material}`);
    if (layer.attach?.socket && !ATTACHMENT_SOCKET_NAMES.has(layer.attach.socket)) errors.push(`invalid socket ${layer.attach.socket}`);
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)].slice(0, 12) };
}

function slugify(text = '') {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 56) || 'avatar';
}


function test5OptionEnabled(value, fallback = true) {
  if (value === false) return false;
  if (value === true) return true;
  if (value == null || value === '') return fallback;
  return !/^(0|false|off|no)$/i.test(String(value));
}

async function saveTest5Artifact({ prompt, designBrief, expandedContent, provider, rawContent, rawSceneSpec, sceneSpec, rawReactCssCharacterContent, rawReactCssCharacter, reactCssCharacter, reactCssFaithfulness, reactCssRepairNotes, validation, coverage, enrichments, repairs, visualRetryPlan, options = {} }) {
  const createdAt = new Date().toISOString();
  const stamp = createdAt.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const relPath = `artifacts/test5/generated/${stamp}-${slugify(prompt)}.json`;
  const absPath = path.join(REPO_ROOT, relPath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  const artifact = {
    prompt,
    userPrompt: prompt,
    createdAt,
    provider,
    expandedPrompt: designBrief?.expandedPrompt || '',
    designBrief,
    visualChecklist: designBrief?.visualChecklist || [],
    requiredDetails: designBrief?.requiredDetails || [],
    expandedContent,
    rawContent,
    rawSceneSpec,
    sanitizedSceneSpec: sceneSpec,
    rawReactCssCharacterContent,
    rawReactCssCharacter,
    reactCssCharacter,
    reactCssFaithfulness,
    reactCssRepairNotes,
    validation,
    coverage,
    enrichments,
    visualRetryPlan,
    options: {
      enrichmentEnabled: options.enrichmentEnabled !== false,
      coverageMode: options.coverageMode || 'enforced',
      commitRequested: options.commit !== false,
      heldObjectFallback: options.heldObjectFallback || options.objectFallback || null,
      visualRetryPlan: options.visualRetryPlan || visualRetryPlan || null,
    },
    repairs,
  };
  await fs.writeFile(absPath, JSON.stringify(artifact, null, 2), 'utf8');

  let commit = { attempted: false, ok: false, enabled: options.commit !== false && process.env.TEST5_AUTO_COMMIT !== '0', push: { attempted: false, ok: false, enabled: options.commit !== false && process.env.TEST5_AUTO_PUSH === '1' } };
  if (commit.enabled) {
    commit.attempted = true;
    try {
      const msg = `test5: add generated avatar ${slugify(prompt).slice(0, 40)}`;
      await execFileAsync('git', ['add', relPath], { cwd: REPO_ROOT, timeout: 15_000 });
      await execFileAsync('git', ['commit', '-m', msg, '--', relPath], { cwd: REPO_ROOT, timeout: 30_000 });
      const { stdout } = await execFileAsync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO_ROOT, timeout: 10_000 });
      commit = { ...commit, ok: true, hash: stdout.trim(), message: msg };
      if (commit.push.enabled) {
        commit.push.attempted = true;
        try {
          await execFileAsync('git', ['push', 'origin', 'HEAD:main'], { cwd: REPO_ROOT, timeout: 90_000 });
          commit.push.ok = true;
        } catch (error) {
          commit.push.ok = false;
          commit.push.error = String(error?.stderr || error?.message || error).slice(0, 500);
        }
      }
    } catch (error) {
      commit = { ...commit, ok: false, error: String(error?.stderr || error?.message || error).slice(0, 500) };
    }
  }
  return { relPath, absPath, artifact, commit };
}

async function generateTest5Avatar(prompt, options = {}) {
  const expanded = await expandTest5Prompt(prompt);
  let designBrief = expanded.designBrief;
  const requestedFallback = options.heldObjectFallback || options.objectFallback || {};
  let effectiveFallback = requestedFallback;
  let replacementRecommendation = null;
  const fallbackMode = String(requestedFallback?.mode || requestedFallback?.action || '').toLowerCase();
  const needsReplacementRecommendation = Boolean(requestedFallback?.askForReplacement || fallbackMode.includes('replacement') || fallbackMode.includes('replace') || fallbackMode.includes('alternate')) && !requestedFallback?.replacementObject && !requestedFallback?.targetObject && !requestedFallback?.dropObject && !requestedFallback?.dropHeldObject;
  if (needsReplacementRecommendation) {
    const badObject = normalizeHeldObjectSemantic(requestedFallback?.badObject || requestedFallback?.badHeldObject || '') || String(requestedFallback?.badObject || requestedFallback?.badHeldObject || 'failed held object');
    replacementRecommendation = await recommendReplacementHeldObject(prompt, designBrief, badObject);
    effectiveFallback = {
      ...requestedFallback,
      replacementObject: replacementRecommendation.normalizedObject || replacementRecommendation.object,
      replacementRecommendation,
    };
  }
  const initialRetryPlan = buildHeldObjectRetryPlan(prompt, designBrief, null, effectiveFallback);
  if (initialRetryPlan.requested) {
    designBrief = applyHeldObjectRetryToBrief(designBrief, initialRetryPlan);
    designBrief.requiredRenderableDetails = normalizeRenderableDetails(designBrief.requiredRenderableDetails, prompt, designBrief);
  }
  const characterResult = await generateFaithfulTest5ReactCssCharacter(prompt, designBrief);
  let reactCssCharacter = characterResult.reactCssCharacter;
  const visualRetryPlan = buildHeldObjectRetryPlan(prompt, designBrief, reactCssCharacter, effectiveFallback);
  reactCssCharacter = dropHeldObjectsFromReactCssCharacter(reactCssCharacter, visualRetryPlan);
  let first = await generateTest5SceneSpec(prompt, designBrief);
  let rawSceneSpec = coerceTest5RawScene(parseJsonObject(first.content), prompt);
  let validation = validateTest5Scene(rawSceneSpec);
  let sceneSpec = null;
  let repairs = 0;
  let provider = `${expanded.provider}${replacementRecommendation ? ` + ${replacementRecommendation.provider}` : ''} + ${characterResult.provider} + ${first.provider}`;
  let rawContent = first.content;
  const enrichmentEnabled = options.enrichmentEnabled !== false;
  const coverageMode = options.coverageMode || (enrichmentEnabled ? 'enforced' : 'report-only');
  let coverage = { ok: false, checks: [], missingRequiredDetails: [] };
  let enrichments = [];

  if (!validation.ok) {
    repairs = 1;
    const repaired = await generateTest5SceneSpec(prompt, designBrief, validation.errors.join('; '));
    provider = `${expanded.provider}${replacementRecommendation ? ` + ${replacementRecommendation.provider}` : ''} + ${characterResult.provider} + ${repaired.provider}`;
    rawContent = repaired.content;
    rawSceneSpec = coerceTest5RawScene(parseJsonObject(repaired.content), prompt);
    validation = validateTest5Scene(rawSceneSpec);
  }
  if (!validation.ok) throw new Error(`Generated raw SceneSpec failed validation: ${validation.errors.join('; ')}`);
  sceneSpec = sanitizeSceneSpec(rawSceneSpec, prompt, { skipPreset: true });
  validation = validateTest5Scene(sceneSpec);
  if (!validation.ok) throw new Error(`Sanitized SceneSpec failed validation: ${validation.errors.join('; ')}`);

  coverage = validateDetailCoverage(designBrief, sceneSpec);
  if (!coverage.ok && enrichmentEnabled) {
    const enriched = ensurePromptDetails(prompt, designBrief, sceneSpec);
    sceneSpec = sanitizeSceneSpec(enriched.sceneSpec, prompt, { skipPreset: true });
    enrichments = enriched.enrichments;
    validation = validateTest5Scene(sceneSpec);
    if (!validation.ok) throw new Error(`Enriched SceneSpec failed validation: ${validation.errors.join('; ')}`);
    coverage = validateDetailCoverage(designBrief, sceneSpec);
  }
  if (!coverage.ok && coverageMode !== 'report-only') {
    repairs += 1;
    const repaired = await generateTest5SceneSpec(prompt, designBrief, `Structurally valid but missing required visual detail coverage: ${coverage.missingRequiredDetails.join(', ')}. Add actual renderable layers for those details. Return the full corrected SceneSpec.`);
    provider = `${expanded.provider}${replacementRecommendation ? ` + ${replacementRecommendation.provider}` : ''} + ${characterResult.provider} + ${repaired.provider}`;
    rawContent = repaired.content;
    rawSceneSpec = coerceTest5RawScene(parseJsonObject(repaired.content), prompt);
    validation = validateTest5Scene(rawSceneSpec);
    if (!validation.ok) throw new Error(`Coverage repair raw SceneSpec failed validation: ${validation.errors.join('; ')}`);
    sceneSpec = sanitizeSceneSpec(rawSceneSpec, prompt, { skipPreset: true });
    if (enrichmentEnabled) {
      const enriched = ensurePromptDetails(prompt, designBrief, sceneSpec);
      sceneSpec = sanitizeSceneSpec(enriched.sceneSpec, prompt, { skipPreset: true });
      enrichments = [...enrichments, ...enriched.enrichments];
    }
    validation = validateTest5Scene(sceneSpec);
    coverage = validateDetailCoverage(designBrief, sceneSpec);
  }
  if (!coverage.ok && coverageMode !== 'report-only') throw new Error(`Generated avatar failed detail coverage: ${coverage.missingRequiredDetails.join('; ')}`);

  const saved = await saveTest5Artifact({ prompt, designBrief, expandedContent: expanded.content, provider, rawContent, rawSceneSpec, sceneSpec, rawReactCssCharacterContent: characterResult.content, rawReactCssCharacter: characterResult.rawReactCssCharacter, reactCssCharacter, reactCssFaithfulness: characterResult.reactCssFaithfulness, reactCssRepairNotes: characterResult.reactCssRepairNotes, validation, coverage, enrichments, repairs, visualRetryPlan, options: { ...options, enrichmentEnabled, coverageMode, visualRetryPlan } });
  return { ok: true, prompt, userPrompt: prompt, expandedPrompt: designBrief.expandedPrompt, designBrief, reactCssCharacter, reactCssFaithfulness: characterResult.reactCssFaithfulness, reactCssRepairNotes: characterResult.reactCssRepairNotes || [], visualChecklist: designBrief.visualChecklist || [], requiredDetails: designBrief.requiredDetails || [], requiredRenderableDetails: designBrief.requiredRenderableDetails || [], coverage, enrichments, visualRetryPlan, options: { enrichmentEnabled, coverageMode, commitRequested: options.commit !== false, visualRetryPlan }, provider, rawSceneSpec, sceneSpec, validation, repairs, artifactPath: saved.relPath, commit: saved.commit };
}

async function readJsonBody(req, maxBytes = 64_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('request body too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function handleTest5Avatar(req, res) {
  try {
    const body = await readJsonBody(req);
    const prompt = String(body.prompt || '').trim().slice(0, 1200);
    if (!prompt) {
      res.writeHead(400, corsHeaders());
      res.end(JSON.stringify({ ok: false, error: 'prompt_required' }));
      return;
    }
    const enrichmentEnabled = test5OptionEnabled(body.enrichment ?? body.enableEnrichment ?? process.env.TEST5_ENABLE_ENRICHMENT, true);
    const coverageMode = String(body.coverageMode || (enrichmentEnabled ? 'enforced' : 'report-only'));
    const commit = body.commit === false ? false : true;
    const heldObjectFallback = body.heldObjectFallback || body.objectFallback || null;
    const result = await generateTest5Avatar(prompt, { enrichmentEnabled, coverageMode, commit, heldObjectFallback });
    res.writeHead(200, corsHeaders());
    res.end(JSON.stringify(result));
  } catch (error) {
    res.writeHead(502, corsHeaders());
    res.end(JSON.stringify({ ok: false, error: String(error?.message || error) }));
  }
}

const defaultServerConfig = Object.freeze({
  basePersona: `You are My Dude, a live cartoon avatar speaker.
You are warm, buddy-like, funny, relaxed, and conversational.
You speak out loud, so be natural and easy to listen to.
No markdown unless the user asks. No stage directions. No code unless the user asks.
Do not ask what you should look like unless the user is already talking about changing the avatar.
Do not force follow-up questions. Do not end with a question unless the user explicitly asks you to ask one or a clarification is required. Never add rhetorical tag questions like 'right?', 'eh?', 'what now?', or 'what shall we do?'. If the user says not to ask follow-up questions, obey that as a hard rule.
If the user asks how you should act, talk, or vibe, adopt that style immediately and keep it until Reset.`,
  defaultProfile: {
    name: 'My Dude',
    voice: 'warm buddy',
    style: ['spoken', 'playful', 'encouraging'],
    appearancePrompt: '',
    userWants: '',
  },
  maxTokens: 220,
  temperature: 0.78,
});

let basePersona = defaultServerConfig.basePersona;

const ideHeaders = {
  Accept: 'application/json',
  'Editor-Version': 'vscode/1.99.0',
  'Editor-Plugin-Version': 'copilot-chat/0.26.0',
  'Copilot-Integration-Id': 'vscode-chat',
  'User-Agent': 'GitHubCopilotChat/0.26.0',
  'OpenAI-Intent': 'conversation-panel',
};

function corsHeaders() {
  return {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': ALLOWED_ORIGIN,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}

async function loadServerConfig() {
  try {
    const config = JSON.parse(await fs.readFile(SERVER_CONFIG_PATH, 'utf8'));
    basePersona = config.basePersona || defaultServerConfig.basePersona;
    return { ...defaultServerConfig, ...config, basePersona };
  } catch {
    await fs.mkdir(AGENT_DIR, { recursive: true });
    await fs.writeFile(SERVER_CONFIG_PATH, JSON.stringify(defaultServerConfig, null, 2), 'utf8');
    basePersona = defaultServerConfig.basePersona;
    return defaultServerConfig;
  }
}

async function ensureAgentFiles() {
  const serverConfig = await loadServerConfig();
  await fs.mkdir(AGENT_DIR, { recursive: true });
  const soulPath = path.join(AGENT_DIR, 'SOUL.md');
  const personalityPath = path.join(AGENT_DIR, 'PERSONALITY.json');
  if (!existsSync(soulPath)) await fs.writeFile(soulPath, `# My Dude Speaker Soul\n\n${basePersona}\n`, 'utf8');
  if (!existsSync(personalityPath)) {
    await fs.writeFile(personalityPath, JSON.stringify({
      name: 'My Dude',
      model: `github-copilot/${MODEL}`,
      ...(serverConfig.defaultProfile || defaultServerConfig.defaultProfile),
      updatedAt: new Date().toISOString(),
    }, null, 2), 'utf8');
  }
}

async function loadPersonality() {
  await ensureAgentFiles();
  try {
    return JSON.parse(await fs.readFile(path.join(AGENT_DIR, 'PERSONALITY.json'), 'utf8'));
  } catch {
    return { ...defaultServerConfig.defaultProfile };
  }
}

function inferPersonalityUpdate(text, current = {}) {
  const lower = text.toLowerCase();
  const next = { ...defaultServerConfig.defaultProfile, ...current, updatedAt: new Date().toISOString() };
  next.lastUserUtterance = text;
  if (/look like|make (you|him|it)|avatar|robot|cat|alien|glasses|hat|blue|green|red|purple|gold|yellow/i.test(text)) {
    next.appearancePrompt = text;
  }
  if (/act like|talk like|sound like|personality|be more|be a|you are|your vibe|your soul/i.test(text)) {
    next.userWants = text;
    if (lower.includes('funny')) next.style = [...new Set([...(next.style || []), 'funny'])];
    if (lower.includes('calm')) next.style = [...new Set([...(next.style || []), 'calm'])];
    if (lower.includes('hype') || lower.includes('excited')) next.style = [...new Set([...(next.style || []), 'hype'])];
    if (lower.includes('sarcastic')) next.style = [...new Set([...(next.style || []), 'lightly sarcastic'])];
    if (lower.includes('kid') || lower.includes('child')) next.style = [...new Set([...(next.style || []), 'kid-friendly'])];
  }
  return next;
}

async function persistPersonalityFromUser(text, sessionId = 'demo', clientProfile = null) {
  const current = sessionProfiles.get(sessionId) || clientProfile || { ...defaultServerConfig.defaultProfile };
  const next = inferPersonalityUpdate(text, current);
  sessionProfiles.set(sessionId, next);
  await fs.writeFile(path.join(AGENT_DIR, 'PERSONALITY.json'), JSON.stringify(next, null, 2), 'utf8');
  await fs.writeFile(path.join(AGENT_DIR, 'SOUL.md'), `# My Dude Speaker Soul\n\n${basePersona}\n\n## Current user-shaped identity\n- Voice: ${next.voice || 'warm buddy'}\n- Style: ${(next.style || []).join(', ')}\n- Appearance request: ${next.appearancePrompt || 'not set yet'}\n- Personality request: ${next.userWants || 'not set yet'}\n- Last updated: ${next.updatedAt}\n`, 'utf8');
  await fs.writeFile(path.join(AGENT_DIR, 'last-user-request.txt'), `${new Date().toISOString()}\n${text}\n`, 'utf8');
  return next;
}

function readGithubToken() {
  const profiles = JSON.parse(readFileSync(AUTH_PROFILE, 'utf8')).profiles || {};
  const profile = profiles['github-copilot:github'];
  if (!profile?.token) throw new Error('Missing github-copilot auth profile');
  return profile.token;
}

async function getCopilotToken() {
  if (copilotTokenCache && copilotTokenCache.expiresAt - Date.now() > 300_000) return copilotTokenCache.token;
  const githubToken = readGithubToken();
  const res = await fetch('https://api.github.com/copilot_internal/v2/token', {
    headers: { ...ideHeaders, Authorization: `Bearer ${githubToken}` },
  });
  if (!res.ok) throw new Error(`Copilot token exchange failed: HTTP ${res.status}`);
  const json = await res.json();
  copilotTokenCache = { token: json.token, expiresAt: (json.expires_at || 0) * 1000 };
  return copilotTokenCache.token;
}

function fallbackReply(text) {
  if (/blue|robot|glass/i.test(text)) return 'Oh dude, a blue robot with glasses is absolutely the vibe.';
  if (/reset|start over/i.test(text)) return 'Fresh start, dude. I am listening.';
  return 'I hear you, dude.';
}

function canAskQuestion(userText = '', personality = {}) {
  const combined = `${userText} ${personality.userWants || ''}`.toLowerCase();
  if (/do not ask|don't ask|no follow[- ]?up|no questions/.test(combined)) return false;
  return /ask me|ask a question|question me|clarify|interview me/.test(combined);
}

function sanitizeReply(text = '', userText = '', personality = {}) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (!clean) return clean;
  if (canAskQuestion(userText, personality)) return clean;
  const parts = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
  const kept = parts.filter(part => {
    const trimmed = part.trim();
    if (trimmed.endsWith('?')) return false;
    if (/\b(shall we|right|eh|yeah|okay|savvy)\b[.!?]?$/i.test(trimmed)) return false;
    if (/^(what|who|when|where|why|how|which|tell me|share)\b/i.test(trimmed)) return false;
    return true;
  });
  return (kept.length ? kept : parts.map(part => part.replace(/\?+$/g, '.'))).join(' ').replace(/\s+/g, ' ').trim();
}

async function askBrain(userText, sessionId = 'demo', options = {}) {
  const serverConfig = await loadServerConfig();
  const cleanUserText = userText.trim().slice(0, 1200);
  const personality = await persistPersonalityFromUser(cleanUserText, sessionId, options.clientProfile);
  const token = await getCopilotToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const system = `${basePersona}\n\nYou may use these speech-director tags only when helpful: [warm], [happy], [excited], [curious], [thinking], [calm], [whisper], [emphasis], [slow], [fast], [normal], [pause:250], [beat], [breath]. Use 1-4 tags max.\n\nCurrent sticky conversation profile:\n${JSON.stringify(personality, null, 2)}`;
    const instruction = typeof options.instruction === 'string' ? options.instruction.trim().slice(0, 1000) : '';
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: instruction ? `${cleanUserText}\n\nResponse guidance: ${instruction}` : cleanUserText },
    ];
    const res = await fetch('https://api.individual.githubcopilot.com/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        ...ideHeaders,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: serverConfig.maxTokens || 220,
        temperature: serverConfig.temperature ?? 0.78,
        stream: Boolean(options.onDelta),
        user: `mydude-${String(sessionId).slice(0, 64)}`,
      }),
    });
    if (!res.ok) {
      const raw = await res.text();
      throw new Error(`Copilot chat failed: HTTP ${res.status}: ${raw.slice(0, 180)}`);
    }
    let text = '';
    if (options.onDelta && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamBuffer = '';
      const flushStream = (force = false) => {
        const sentencePattern = /^([\s\S]*?[.!?]+)(\s+|$)/;
        let match;
        while ((match = streamBuffer.match(sentencePattern)) || (force && streamBuffer.trim())) {
          const rawChunk = match ? match[1] : streamBuffer;
          streamBuffer = match ? streamBuffer.slice(match[0].length) : '';
          const safeChunk = sanitizeReply(rawChunk, cleanUserText, personality);
          if (safeChunk) options.onDelta(`${safeChunk} `);
          if (!match) break;
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) {
              text += delta;
              streamBuffer += delta;
              flushStream(false);
            }
          } catch {}
        }
      }
      flushStream(true);
    } else {
      const raw = await res.text();
      const json = JSON.parse(raw);
      text = json.choices?.[0]?.message?.content || '';
    }
    text = sanitizeReply((text || fallbackReply(cleanUserText)).trim().replace(/\s+/g, ' '), cleanUserText, personality);
    return { ok: true, model: `github-copilot/${MODEL}`, text, personality };
  } finally {
    clearTimeout(timer);
  }
}

function wsAccept(key) {
  return crypto.createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
}

function sendWs(socket, payload) {
  const data = Buffer.from(JSON.stringify(payload));
  let header;
  if (data.length < 126) header = Buffer.from([0x81, data.length]);
  else if (data.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81; header[1] = 126; header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(data.length), 2);
  }
  socket.write(Buffer.concat([header, data]));
}

function decodeWsFrame(buffer) {
  if (buffer.length < 6) return null;
  const opcode = buffer[0] & 0x0f;
  if (opcode === 0x8) return { close: true };
  let length = buffer[1] & 0x7f;
  let offset = 2;
  if (length === 126) { length = buffer.readUInt16BE(offset); offset += 2; }
  else if (length === 127) { length = Number(buffer.readBigUInt64BE(offset)); offset += 8; }
  const masked = Boolean(buffer[1] & 0x80);
  if (!masked) return null;
  const mask = buffer.subarray(offset, offset + 4); offset += 4;
  const payload = buffer.subarray(offset, offset + length);
  const out = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i += 1) out[i] = payload[i] ^ mask[i % 4];
  return { text: out.toString('utf8') };
}

async function handleWsMessage(socket, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return sendWs(socket, { type: 'error', error: 'bad_json' }); }
  if (msg.type === 'ping') return sendWs(socket, { type: 'pong', time: new Date().toISOString() });
  if (msg.type === 'reset') {
    sessionProfiles.delete(msg.sessionId || 'demo');
    return sendWs(socket, { type: 'reset', ok: true });
  }
  if (msg.type !== 'say' || typeof msg.text !== 'string' || !msg.text.trim()) return sendWs(socket, { type: 'error', error: 'expected_say_text' });
  const started = Date.now();
  sendWs(socket, { type: 'thinking', model: `github-copilot/${MODEL}` });
  try {
    const scenePromise = askSceneBrain(msg.text.trim().slice(0, 1200), msg.sessionId);
    const reply = await askBrain(msg.text.trim().slice(0, 1200), msg.sessionId, {
      instruction: msg.instruction,
      clientProfile: msg.personality && typeof msg.personality === 'object' ? msg.personality : null,
      onDelta: (delta) => sendWs(socket, { type: 'delta', text: delta, elapsedMs: Date.now() - started }),
    });
    const sceneSpec = await scenePromise;
    if (sceneSpec) sendWs(socket, { type: 'scene', sceneSpec, elapsedMs: Date.now() - started });
    sendWs(socket, { type: 'reply', ...reply, sceneSpec, elapsedMs: Date.now() - started });
  } catch (error) {
    sendWs(socket, { type: 'reply', ok: false, model: `github-copilot/${MODEL}`, text: fallbackReply(msg.text), elapsedMs: Date.now() - started, error: String(error.message || error) });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }
  if (req.method === 'POST' && req.url?.startsWith('/test5/avatar')) {
    await handleTest5Avatar(req, res);
    return;
  }
  if (req.url?.startsWith('/health')) {
    await ensureAgentFiles();
    const body = JSON.stringify({
      ok: true,
      service: 'mydude-demo2-openclaw-bridge',
      status: 'phase-4-open-conversation-online',
      brain: `github-copilot/${MODEL}`,
      agentDir: AGENT_DIR,
      ws: '/speak',
      time: new Date().toISOString(),
    });
    res.writeHead(200, corsHeaders());
    res.end(body);
    return;
  }
  res.writeHead(404, corsHeaders());
  res.end(JSON.stringify({ ok: false, error: 'not_found' }));
});

server.on('upgrade', (req, socket) => {
  if (!req.url?.startsWith('/speak')) return socket.destroy();
  const key = req.headers['sec-websocket-key'];
  if (!key) return socket.destroy();
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${wsAccept(key)}`,
    `Access-Control-Allow-Origin: ${ALLOWED_ORIGIN}`,
    '',
    '',
  ].join('\r\n'));
  sendWs(socket, { type: 'ready', model: `github-copilot/${MODEL}` });
  socket.on('data', (buffer) => {
    const frame = decodeWsFrame(buffer);
    if (frame?.close) return socket.end();
    if (frame?.text) handleWsMessage(socket, frame.text);
  });
});

await ensureAgentFiles();
server.listen(PORT, '127.0.0.1', () => {
  console.log(`mydude bridge listening on http://127.0.0.1:${PORT} using github-copilot/${MODEL}`);
});
