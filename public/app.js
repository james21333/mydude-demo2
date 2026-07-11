import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── ASSET LIBRARY CATALOG ────────────────────────────────────────────────────
// Each entry: { id, name, path, category, color (hex for fallback), fallback (shape type) }
const ASSET_LIBRARY = [
  // Characters
  { id:'char_knight',    name:'Knight',       path:'/assets/kenney/characters/knight.glb',    category:'Characters', color:0x90CAF9, fallback:'humanoid' },
  { id:'char_wizard',    name:'Wizard',       path:'/assets/kenney/characters/wizard.glb',    category:'Characters', color:0xCE93D8, fallback:'humanoid' },
  { id:'char_archer',    name:'Archer',       path:'/assets/kenney/characters/archer.glb',    category:'Characters', color:0x80CBC4, fallback:'humanoid' },
  { id:'char_skeleton',  name:'Skeleton',     path:'/assets/kenney/characters/skeleton.glb',  category:'Characters', color:0xECEFF1, fallback:'humanoid' },
  { id:'char_barbarian', name:'Barbarian',    path:'/assets/kenney/characters/barbarian.glb', category:'Characters', color:0xFFCC80, fallback:'humanoid' },
  { id:'char_paladin',   name:'Paladin',      path:'/assets/kenney/characters/paladin.glb',   category:'Characters', color:0xFFF9C4, fallback:'humanoid' },
  // Items
  { id:'item_sword',     name:'Sword',        path:'/assets/kenney/items/sword.glb',          category:'Items',      color:0xFFD54F, fallback:'weapon'   },
  { id:'item_shield',    name:'Shield',       path:'/assets/kenney/items/shield.glb',         category:'Items',      color:0x90A4AE, fallback:'shield'   },
  { id:'item_potion',    name:'Potion',       path:'/assets/kenney/items/potion_red.glb',     category:'Items',      color:0xEF9A9A, fallback:'item'     },
  { id:'item_chest',     name:'Chest',        path:'/assets/kenney/items/chest.glb',          category:'Items',      color:0xA1887F, fallback:'box'      },
  { id:'item_torch',     name:'Torch',        path:'/assets/kenney/items/torch.glb',          category:'Items',      color:0xFF8A65, fallback:'item'     },
  { id:'item_key',       name:'Key',          path:'/assets/kenney/items/key_gold.glb',       category:'Items',      color:0xFFD54F, fallback:'item'     },
  { id:'item_barrel',    name:'Barrel',       path:'/assets/kenney/items/barrel.glb',         category:'Items',      color:0xA1887F, fallback:'barrel'   },
  { id:'item_crate',     name:'Crate',        path:'/assets/kenney/items/crate.glb',          category:'Items',      color:0xBCAAA4, fallback:'box'      },
  // Nature
  { id:'nature_tree_oak',  name:'Oak Tree',   path:'/assets/kenney/nature/tree_oak.glb',      category:'Nature',     color:0x2E7D32, fallback:'tree'     },
  { id:'nature_tree_pine', name:'Pine Tree',  path:'/assets/kenney/nature/tree_pine.glb',     category:'Nature',     color:0x1B5E20, fallback:'tree_pine'},
  { id:'nature_rock_lg',   name:'Large Rock', path:'/assets/kenney/nature/rock_large.glb',    category:'Nature',     color:0x546E7A, fallback:'rock_lg'  },
  { id:'nature_rock_sm',   name:'Small Rock', path:'/assets/kenney/nature/rock_small.glb',    category:'Nature',     color:0x607D8B, fallback:'rock_sm'  },
  { id:'nature_bush',      name:'Bush',       path:'/assets/kenney/nature/bush.glb',          category:'Nature',     color:0x388E3C, fallback:'bush'     },
  { id:'nature_flower',    name:'Flower',     path:'/assets/kenney/nature/flower.glb',        category:'Nature',     color:0xF48FB1, fallback:'flower'   },
  { id:'nature_stump',     name:'Tree Stump', path:'/assets/kenney/nature/stump.glb',         category:'Nature',     color:0x6D4C41, fallback:'stump'    },
  // Castle
  { id:'castle_wall',       name:'Wall',         path:'/assets/kenney/castle/wall_straight.glb', category:'Castle', color:0x90A4AE, fallback:'wall'     },
  { id:'castle_wall_corner',name:'Wall Corner',  path:'/assets/kenney/castle/wall_corner.glb',   category:'Castle', color:0x90A4AE, fallback:'wall'     },
  { id:'castle_tower_round',name:'Round Tower',  path:'/assets/kenney/castle/tower_round.glb',   category:'Castle', color:0x78909C, fallback:'tower_rd' },
  { id:'castle_tower_sq',   name:'Square Tower', path:'/assets/kenney/castle/tower_square.glb',  category:'Castle', color:0x78909C, fallback:'tower_sq' },
  { id:'castle_gate',       name:'Gate',         path:'/assets/kenney/castle/gate.glb',          category:'Castle', color:0x78909C, fallback:'gate'     },
  { id:'castle_floor',      name:'Stone Floor',  path:'/assets/kenney/castle/floor_stone.glb',   category:'Castle', color:0xB0BEC5, fallback:'slab'     },
  { id:'castle_stairs',     name:'Stairs',       path:'/assets/kenney/castle/stairs.glb',        category:'Castle', color:0xB0BEC5, fallback:'stairs'   },
  // Space
  { id:'space_rocket',    name:'Rocket',       path:'/assets/kenney/space/rocket_small.glb',  category:'Space',  color:0xECEFF1, fallback:'rocket'   },
  { id:'space_satellite', name:'Satellite',    path:'/assets/kenney/space/satellite.glb',     category:'Space',  color:0xB0BEC5, fallback:'sat'      },
  { id:'space_asteroid',  name:'Asteroid',     path:'/assets/kenney/space/asteroid.glb',      category:'Space',  color:0x546E7A, fallback:'asteroid' },
  { id:'space_planet',    name:'Planet',       path:'/assets/kenney/space/planet.glb',        category:'Space',  color:0x7986CB, fallback:'planet'   },
  { id:'space_crater',    name:'Crater',       path:'/assets/kenney/space/crater.glb',        category:'Space',  color:0x546E7A, fallback:'crater'   },
  // Urban
  { id:'urban_bldg_low',  name:'Low Building', path:'/assets/kenney/urban/building_low.glb',  category:'Urban',  color:0xB0BEC5, fallback:'bldg_lo'  },
  { id:'urban_bldg_tall', name:'Tall Building',path:'/assets/kenney/urban/building_tall.glb', category:'Urban',  color:0x90A4AE, fallback:'bldg_hi'  },
  { id:'urban_road',      name:'Road',         path:'/assets/kenney/urban/road_straight.glb', category:'Urban',  color:0x37474F, fallback:'road'     },
  { id:'urban_car',       name:'Car',          path:'/assets/kenney/urban/car.glb',           category:'Urban',  color:0xEF5350, fallback:'car'      },
  { id:'urban_lamp',      name:'Lamp Post',    path:'/assets/kenney/urban/lamp_post.glb',     category:'Urban',  color:0xFFD54F, fallback:'lamp'     },
  { id:'urban_bench',     name:'Bench',        path:'/assets/kenney/urban/bench.glb',         category:'Urban',  color:0xA1887F, fallback:'bench'    },
];

// ── THREE.JS SCENE SETUP ─────────────────────────────────────────────────────
const canvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

function vw() { return window.innerWidth  || canvas.clientWidth  || document.documentElement.clientWidth  || 1280; }
function vh() { return window.innerHeight || canvas.clientHeight || document.documentElement.clientHeight || 720; }

renderer.setSize(vw(), vh());

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060a12);
scene.fog = new THREE.FogExp2(0x060a12, 0.018);

const camera = new THREE.PerspectiveCamera(55, vw() / vh(), 0.1, 200);
camera.position.set(0, 4, 9);
camera.lookAt(0, 1.5, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 2;
controls.maxDistance = 80;
controls.target.set(0, 1.5, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0x2a3f60, 1.2);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
sunLight.position.set(10, 18, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 80;
sunLight.shadow.camera.left = -24;
sunLight.shadow.camera.right = 24;
sunLight.shadow.camera.top = 24;
sunLight.shadow.camera.bottom = -24;
sunLight.shadow.bias = -0.0008;
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x4060ff, 0.5);
fillLight.position.set(-10, 6, -12);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0x002244, 0.3);
rimLight.position.set(0, -4, -10);
scene.add(rimLight);

// Grid
const gridHelper = new THREE.GridHelper(60, 60, 0x1a2840, 0x0f1c2e);
gridHelper.position.y = 0.002;
scene.add(gridHelper);

// Ground plane
const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshLambertMaterial({ color: 0x070d1a, transparent: true, opacity: 0.85 })
);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

window.addEventListener('resize', () => {
  camera.aspect = vw() / vh();
  camera.updateProjectionMatrix();
  renderer.setSize(vw(), vh());
});

// ── BLUE DUDE ────────────────────────────────────────────────────────────────
function createBlueDude() {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshPhongMaterial({ color: 0x2196F3, emissive: 0x0D47A1, emissiveIntensity: 0.25, shininess: 90 });
  const headMat = new THREE.MeshPhongMaterial({ color: 0x42A5F5, emissive: 0x1565C0, emissiveIntensity: 0.25, shininess: 110 });
  const eyeWhite = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, shininess: 60 });
  const eyeDark  = new THREE.MeshPhongMaterial({ color: 0x111122 });
  const mouthMat = new THREE.MeshPhongMaterial({ color: 0x0a2a6e, emissive: 0x000033 });

  const mk = (geo, mat, py) => { const m = new THREE.Mesh(geo, mat); m.position.y = py; m.castShadow = true; return m; };

  // Body
  const body = mk(new THREE.CapsuleGeometry(0.55, 0.85, 8, 16), bodyMat, 1.02);
  g.add(body);

  // Head
  const head = new THREE.Group();
  head.add(mk(new THREE.SphereGeometry(0.52, 20, 14), headMat, 0));
  head.position.set(0, 2.28, 0);
  g.add(head);

  // Eyes
  function makeEye(x) {
    const eye = new THREE.Group();
    eye.add(mk(new THREE.SphereGeometry(0.14, 12, 10), eyeWhite, 0));
    const pupil = mk(new THREE.SphereGeometry(0.085, 8, 8), eyeDark, 0);
    pupil.position.z = 0.09;
    eye.add(pupil);
    eye.position.set(x, 0.06, 0.44);
    return eye;
  }
  const leftEye  = makeEye(-0.19);
  const rightEye = makeEye( 0.19);
  head.add(leftEye);
  head.add(rightEye);

  // Mouth (torus arc = smile)
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.038, 6, 14, Math.PI),
    mouthMat
  );
  mouth.position.set(0, -0.17, 0.46);
  mouth.rotation.z = Math.PI;
  head.add(mouth);

  g.position.set(0, 0, 0);
  scene.add(g);
  return { group: g, head, leftEye, rightEye, mouth, body };
}

const blueDude = createBlueDude();

let dudeClock = 0;
let lastFrame = 0;
let speaking = false;
function animate() {
  lastFrame = performance.now();
  requestAnimationFrame(animate);
  dudeClock += 0.016;

  // Idle / speaking animation
  const isSpeaking = speaking;
  const bobSpeed = isSpeaking ? 4.0 : 0.9;
  const bobAmp   = isSpeaking ? 0.07 : 0.028;
  const swayAmp  = isSpeaking ? 0.10 : 0.04;
  blueDude.group.position.y = Math.sin(dudeClock * bobSpeed) * bobAmp;
  blueDude.head.rotation.y  = Math.sin(dudeClock * 0.65) * swayAmp * 2;
  blueDude.head.rotation.z  = Math.sin(dudeClock * 0.4)  * swayAmp * 0.5;

  // Mouth opens/closes when speaking
  if (isSpeaking) {
    blueDude.mouth.scale.y = 0.5 + 0.5 * Math.abs(Math.sin(dudeClock * 9));
  } else {
    blueDude.mouth.scale.y += (1 - blueDude.mouth.scale.y) * 0.12;
  }

  // Blink
  const blinkCycle = dudeClock % 4.2;
  const blink = blinkCycle > 3.9 ? Math.max(0.05, 1 - ((blinkCycle - 3.9) / 0.15)) : 1;
  blueDude.leftEye.scale.y  = blink;
  blueDude.rightEye.scale.y = blink;

  controls.update();
  renderer.render(scene, camera);
}
animate();

// Fallback render loop for environments where rAF is suppressed (automation, headless)
setInterval(() => {
  if (performance.now() - lastFrame > 150) {
    controls.update();
    renderer.render(scene, camera);
  }
}, 100);

// ── FALLBACK GEOMETRY ────────────────────────────────────────────────────────
function makeFallback(entry) {
  const color = entry?.color ?? 0x4FC3F7;
  const type  = entry?.fallback ?? 'box';
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c ?? color });
  const mesh = (geo, c, py) => { const m = new THREE.Mesh(geo, mat(c)); m.position.y = py; m.castShadow = true; m.receiveShadow = true; return m; };

  if (type === 'humanoid') {
    g.add(mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.76, 8), null, 0.38));
    g.add(mesh(new THREE.SphereGeometry(0.21, 8, 6), null, 0.96));
    const arm = (sx) => { const a = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.48, 6), null, 0.44); a.position.x = sx * 0.37; a.rotation.z = sx * -0.35; return a; };
    g.add(arm(-1)); g.add(arm(1));
  } else if (type === 'weapon') {
    g.add(mesh(new THREE.BoxGeometry(0.07, 0.85, 0.05), null, 0.52));
    g.add(mesh(new THREE.BoxGeometry(0.28, 0.06, 0.06), null, 0.16));
  } else if (type === 'shield') {
    g.add(mesh(new THREE.BoxGeometry(0.45, 0.6, 0.08), null, 0.3));
  } else if (type === 'tree') {
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.65, 6), 0x5D4037, 0.32));
    g.add(mesh(new THREE.SphereGeometry(0.52, 7, 5), null, 0.98));
  } else if (type === 'tree_pine') {
    g.add(mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 6), 0x5D4037, 0.3));
    g.add(mesh(new THREE.ConeGeometry(0.52, 0.88, 7), null, 0.92));
    g.add(mesh(new THREE.ConeGeometry(0.36, 0.72, 7), null, 1.42));
  } else if (type === 'rock_lg') {
    const r = mesh(new THREE.DodecahedronGeometry(0.55, 0), null, 0.38);
    r.scale.set(1.2, 0.8, 1.0); g.add(r);
  } else if (type === 'rock_sm') {
    const r = mesh(new THREE.DodecahedronGeometry(0.28, 0), null, 0.18);
    r.scale.set(1.1, 0.75, 0.9); g.add(r);
  } else if (type === 'bush') {
    const b = mesh(new THREE.SphereGeometry(0.38, 7, 5), null, 0.25);
    b.scale.set(1.5, 0.9, 1.3); g.add(b);
  } else if (type === 'flower') {
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 5), 0x388E3C, 0.14));
    g.add(mesh(new THREE.SphereGeometry(0.1, 6, 5), null, 0.34));
  } else if (type === 'stump') {
    g.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.28, 8), null, 0.14));
  } else if (type === 'barrel') {
    g.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.44, 10), null, 0.22));
  } else if (type === 'wall') {
    g.add(mesh(new THREE.BoxGeometry(2.0, 1.4, 0.32), null, 0.7));
  } else if (type === 'tower_rd') {
    g.add(mesh(new THREE.CylinderGeometry(0.48, 0.52, 2.4, 9), null, 1.2));
    g.add(mesh(new THREE.ConeGeometry(0.58, 0.58, 9), null, 2.69));
  } else if (type === 'tower_sq') {
    g.add(mesh(new THREE.BoxGeometry(0.88, 2.6, 0.88), null, 1.3));
    const cap = mesh(new THREE.BoxGeometry(0.96, 0.22, 0.96), null, 2.71); g.add(cap);
  } else if (type === 'gate') {
    g.add(mesh(new THREE.BoxGeometry(2.4, 0.5, 0.32), null, 1.7));
    const lp = mesh(new THREE.BoxGeometry(0.36, 1.6, 0.32), null, 0.8); lp.position.x = -1.02; g.add(lp);
    const rp = mesh(new THREE.BoxGeometry(0.36, 1.6, 0.32), null, 0.8); rp.position.x =  1.02; g.add(rp);
  } else if (type === 'slab') {
    g.add(mesh(new THREE.BoxGeometry(2.0, 0.1, 2.0), null, 0.05));
  } else if (type === 'stairs') {
    for (let i = 0; i < 4; i++) {
      const s = mesh(new THREE.BoxGeometry(1.0, 0.18, 0.32), null, i * 0.18 + 0.09);
      s.position.z = -i * 0.32; g.add(s);
    }
  } else if (type === 'rocket') {
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.24, 1.2, 8), null, 0.6));
    g.add(mesh(new THREE.ConeGeometry(0.2, 0.42, 8), null, 1.41));
    g.add(mesh(new THREE.ConeGeometry(0.1, 0.22, 4), 0xEF5350, 0));
  } else if (type === 'sat') {
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), null, 0.15));
    const wing = mesh(new THREE.BoxGeometry(0.8, 0.04, 0.22), 0xB0BEC5, 0.15);
    g.add(wing);
  } else if (type === 'asteroid') {
    const a = mesh(new THREE.DodecahedronGeometry(0.5, 0), null, 0.5);
    a.scale.set(1.3, 0.9, 1.1); g.add(a);
  } else if (type === 'planet') {
    g.add(mesh(new THREE.SphereGeometry(0.7, 14, 10), null, 0.7));
  } else if (type === 'crater') {
    const cr = mesh(new THREE.CylinderGeometry(0.7, 0.5, 0.14, 12), null, 0.07);
    cr.scale.set(1, 0.5, 1); g.add(cr);
  } else if (type === 'bldg_lo') {
    g.add(mesh(new THREE.BoxGeometry(1.8, 1.4, 1.8), null, 0.7));
    const roof = mesh(new THREE.ConeGeometry(1.4, 0.55, 4), null, 1.67); roof.rotation.y = Math.PI/4; g.add(roof);
  } else if (type === 'bldg_hi') {
    g.add(mesh(new THREE.BoxGeometry(1.2, 4.0, 1.2), null, 2.0));
  } else if (type === 'road') {
    g.add(mesh(new THREE.BoxGeometry(2.0, 0.06, 4.0), 0x2E3440, 0.03));
  } else if (type === 'car') {
    g.add(mesh(new THREE.BoxGeometry(1.6, 0.42, 0.82), null, 0.32));
    g.add(mesh(new THREE.BoxGeometry(0.92, 0.34, 0.7), null, 0.61));
    const wm = mat(0x1a1a1a);
    for (const [wx, wz] of [[-0.56, 0.36], [-0.56, -0.36], [0.56, 0.36], [0.56, -0.36]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.14, 10), wm);
      w.rotation.z = Math.PI/2; w.position.set(wx, 0.19, wz); w.castShadow = true; g.add(w);
    }
  } else if (type === 'lamp') {
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), 0x546E7A, 0.9));
    const top = mesh(new THREE.SphereGeometry(0.12, 6, 5), color, 1.86); top.scale.set(1, 0.7, 1); g.add(top);
  } else if (type === 'bench') {
    g.add(mesh(new THREE.BoxGeometry(0.8, 0.06, 0.3), null, 0.32));
    for (const bx of [-0.3, 0.3]) {
      const l = mesh(new THREE.BoxGeometry(0.06, 0.32, 0.3), null, 0.16); l.position.x = bx; g.add(l);
    }
  } else {
    // default box
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), null, 0.25));
  }

  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return g;
}

// ── GLTF LOADER + CACHE ──────────────────────────────────────────────────────
const gltfLoader = new GLTFLoader();
const gltfCache  = new Map(); // path → THREE.Group (master clone)

function loadAsset(path) {
  if (gltfCache.has(path)) {
    return Promise.resolve(gltfCache.get(path).clone());
  }
  const entry = ASSET_LIBRARY.find(a => a.path === path);
  return new Promise((resolve) => {
    gltfLoader.load(
      path,
      (gltf) => {
        const root = gltf.scene;
        root.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
        gltfCache.set(path, root);
        resolve(root.clone());
      },
      undefined,
      () => {
        // Fallback to geometry
        const fb = makeFallback(entry);
        gltfCache.set(path, fb);
        resolve(fb.clone());
      }
    );
  });
}

// ── SCENE OBJECT MANAGER ─────────────────────────────────────────────────────
const sceneObjects = new Map(); // trackId → { group, assetPath, position, rotation, scale, label }

const DEG2RAD = Math.PI / 180;

function applyTransform(group, pos, rot, scl) {
  group.position.set(pos?.x ?? 0, pos?.y ?? 0, pos?.z ?? 0);
  group.rotation.set((rot?.x ?? 0) * DEG2RAD, (rot?.y ?? 0) * DEG2RAD, (rot?.z ?? 0) * DEG2RAD);
  group.scale.set(scl?.x ?? 1, scl?.y ?? 1, scl?.z ?? 1);
}

async function executeSceneCommands(commands) {
  if (!Array.isArray(commands)) throw new TypeError('Expected JSON array');
  for (const cmd of commands) {
    const { id, assetPath, action } = cmd;
    const pos = cmd.position  ?? { x:0, y:0, z:0 };
    const rot = cmd.rotation  ?? { x:0, y:0, z:0 };
    const scl = cmd.scale     ?? { x:1, y:1, z:1 };
    const lbl = cmd.label     ?? (assetPath || id);

    if (action === 'add') {
      const group = await loadAsset(assetPath);
      const tid = id || `obj_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      group.userData.trackId = tid;
      applyTransform(group, pos, rot, scl);
      scene.add(group);
      sceneObjects.set(tid, { group, assetPath, position: pos, rotation: rot, scale: scl, label: lbl });

    } else if (action === 'update') {
      const entry = sceneObjects.get(id);
      if (entry) {
        const np = cmd.position ?? entry.position;
        const nr = cmd.rotation ?? entry.rotation;
        const ns = cmd.scale    ?? entry.scale;
        applyTransform(entry.group, np, nr, ns);
        entry.position = np; entry.rotation = nr; entry.scale = ns;
      }

    } else if (action === 'remove') {
      const entry = sceneObjects.get(id);
      if (entry) { scene.remove(entry.group); sceneObjects.delete(id); }
    }
  }
  saveToLocalStorage();
  refreshUI();
}

function doClearScene() {
  for (const [, e] of sceneObjects) scene.remove(e.group);
  sceneObjects.clear();
  saveToLocalStorage();
  refreshUI();
}

function refreshUI() {
  const count = sceneObjects.size;
  document.getElementById('scene-info').textContent = `${count} object${count !== 1 ? 's' : ''}`;
  const rows = Array.from(sceneObjects.entries()).map(([id, e]) => ({
    id, assetPath: e.assetPath, action: 'add',
    position: e.position, rotation: e.rotation, scale: e.scale, label: e.label
  }));
  document.getElementById('state-display').value = JSON.stringify(rows, null, 2);
}

// ── LOCAL STORAGE ────────────────────────────────────────────────────────────
const LS_KEY = 'mydude3d_v1';

function saveToLocalStorage() {
  const rows = Array.from(sceneObjects.entries()).map(([id, e]) => ({
    id, assetPath: e.assetPath, action: 'add',
    position: e.position, rotation: e.rotation, scale: e.scale, label: e.label
  }));
  try { localStorage.setItem(LS_KEY, JSON.stringify(rows)); } catch {}
}

async function restoreFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const rows = JSON.parse(raw);
    if (Array.isArray(rows) && rows.length) {
      showMsg(`Restoring ${rows.length} saved object(s)…`, 6000);
      await executeSceneCommands(rows);
      showMsg(`Restored ${rows.length} object(s) from last session.`);
    }
  } catch {}
}

// ── SYSTEM PROMPT GENERATOR ──────────────────────────────────────────────────
function buildSystemPrompt() {
  const cats = [...new Set(ASSET_LIBRARY.map(a => a.category))];
  let catalog = '';
  for (const cat of cats) {
    catalog += `\n${cat}:\n`;
    ASSET_LIBRARY.filter(a => a.category === cat).forEach(a => {
      catalog += `  "${a.path}"  →  ${a.name}\n`;
    });
  }
  return `You are an expert 3D scene director for "My Dude 3D", a real-time Three.js scene builder.

SCENE COORDINATE SYSTEM:
• Y = 0 is ground level. Positive Y is up.
• Rotation values are in DEGREES (not radians).
• Scale 1.0 is the default model size.
• The visible grid extends ~20 units from center in X and Z.

AVAILABLE ASSET PATHS:${catalog}
COMMAND SCHEMA (JSON array — each element is one scene command):
[
  {
    "id":        "unique_snake_case_id",
    "assetPath": "/assets/kenney/…",
    "action":    "add" | "update" | "remove",
    "position":  { "x": 0, "y": 0, "z": 0 },
    "rotation":  { "x": 0, "y": 0, "z": 0 },
    "scale":     { "x": 1, "y": 1, "z": 1 },
    "label":     "Human-readable name"
  }
]

RULES:
• Only use asset paths listed above.
• "id" must be unique for each object. Reuse the same id in "update" / "remove" actions.
• "add" places a new object. "update" moves/scales/rotates an existing one. "remove" deletes it.
• Y rotation of 0° faces the camera's default direction; use Y to spin objects to face each other.
• Characters: scale 0.8–1.2. Buildings/towers: 1.0–3.5. Nature: 0.6–2.5. Items: 0.7–1.5.
• Space objects realistically: trees on ground (Y=0), walls upright, nothing floating unless intended.
• When adding multiple of the same type, vary position and Y rotation.

RESPONSE FORMAT:
Speak your reply naturally. Then end EVERY response with a \`\`\`json code block containing the scene command array. Never omit the block — even for conversation, respond with an empty array [] if no scene change is needed.

EXAMPLE:
User: "Add a knight and two pine trees."
Response:
"Placing a brave knight flanked by two pines!"
\`\`\`json
[
  {"id":"knight_1","assetPath":"/assets/kenney/characters/knight.glb","action":"add","position":{"x":0,"y":0,"z":0},"rotation":{"x":0,"y":0,"z":0},"scale":{"x":1,"y":1,"z":1},"label":"Knight"},
  {"id":"pine_1","assetPath":"/assets/kenney/nature/tree_pine.glb","action":"add","position":{"x":-2.5,"y":0,"z":1},"rotation":{"x":0,"y":20,"z":0},"scale":{"x":1.2,"y":1.2,"z":1.2},"label":"Pine Tree"},
  {"id":"pine_2","assetPath":"/assets/kenney/nature/tree_pine.glb","action":"add","position":{"x":2.5,"y":0,"z":1},"rotation":{"x":0,"y":-15,"z":0},"scale":{"x":1.3,"y":1.3,"z":1.3},"label":"Pine Tree"}
]
\`\`\``;
}

// ── RESPONSE JSON EXTRACTOR ──────────────────────────────────────────────────
function extractSceneCommands(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch {}
  }
  const arr = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (arr) {
    try { return JSON.parse(arr[0]); } catch {}
  }
  return null;
}

function stripJson(text) {
  return text.replace(/```json[\s\S]*?```/gi, '').replace(/```[\s\S]*?```/gi, '').trim();
}

// ── BRIDGE WEBSOCKET ─────────────────────────────────────────────────────────
const WS_URL = 'wss://bridge2.mydude.live/speak';
let sessionId = crypto?.randomUUID?.() ?? `mydude3d-${Date.now()}`;
let bridgeSocket = null;
let fullReply = '';

function sendToBridge(userText) {
  if (bridgeSocket) { try { bridgeSocket.close(); } catch {} bridgeSocket = null; }
  fullReply = '';
  setStatus('connecting');
  showMsg('Connecting…');

  const socket = new WebSocket(WS_URL);
  bridgeSocket = socket;

  socket.onmessage = (ev) => {
    let p; try { p = JSON.parse(ev.data); } catch { return; }

    if (p.type === 'ready') {
      setStatus('building');
      showMsg('Thinking…');
      // Build a compact asset list to fit in the instruction field
      const assetLines = ASSET_LIBRARY.map(a => `${a.id}: "${a.path}"`).join(', ');
      const instruction = `You are a 3D scene JSON API. RESPOND ONLY with a short spoken reply, then a \`\`\`json code block. Never skip the \`\`\`json block. Schema: [{id,assetPath,action:"add"|"update"|"remove",position:{x,y,z},rotation:{x,y,z},scale:{x,y,z},label}]. Y=0=ground, rotation in degrees. Assets: ${assetLines}. If no change, output []. ALWAYS end with the \`\`\`json block.`;
      socket.send(JSON.stringify({
        type: 'say', sessionId, text: userText,
        instruction,
        avatar: null, personality: null,
      }));
    }

    if (p.type === 'delta' && typeof p.text === 'string') {
      fullReply += p.text;
      const display = stripJson(fullReply).slice(-240);
      if (display) showMsg(display, 8000);
    }

    if (p.type === 'reply') {
      if (p.text && !fullReply.trim()) fullReply = p.text;
      finishBridgeReply();
      if (bridgeSocket === socket) bridgeSocket = null;
    }

    if (p.type === 'error') {
      showMsg(`Bridge error: ${p.message || 'unknown'}`);
      setStatus('idle');
      if (bridgeSocket === socket) bridgeSocket = null;
    }
  };

  socket.onerror = () => { showMsg('Connection error.'); setStatus('idle'); };
  socket.onclose = () => { if (bridgeSocket === socket) bridgeSocket = null; };
}

function finishBridgeReply() {
  const commands = extractSceneCommands(fullReply);
  if (commands) {
    executeSceneCommands(commands).catch(e => showMsg(`Scene error: ${e.message}`));
  }
  const speech = stripJson(fullReply);
  if (speech) speakText(speech);
  else setStatus('listening');
}

// ── TTS ──────────────────────────────────────────────────────────────────────
let ttsUnlocked = false;
function unlockTTS() {
  if (ttsUnlocked || !window.speechSynthesis) return;
  ttsUnlocked = true;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  speechSynthesis.speak(u);
}

function speakText(text) {
  if (!window.speechSynthesis) { setStatus('listening'); if (activated) startListening(); return; }
  speechSynthesis.cancel();
  setStatus('speaking');
  speaking = true;

  // Fallback timer: animate mouth for estimated speech duration even if audio is blocked
  const wordCount = text.trim().split(/\s+/).length;
  const estimatedMs = Math.max(2500, wordCount * 380);
  let speakTimer = setTimeout(doneSpeaking, estimatedMs);

  function doneSpeaking() {
    clearTimeout(speakTimer);
    speakTimer = null;
    speaking = false;
    setStatus('listening');
    if (activated) startListening();
  }

  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.06; utter.pitch = 1.06;
  // Wait for voices to be ready
  const trySpeak = () => {
    const voices = speechSynthesis.getVoices();
    const pick = voices.find(v => /en.*GB|Google.*UK|Daniel|Samantha/i.test(v.name))
               || voices.find(v => /^en/i.test(v.lang)) || voices[0];
    if (pick) utter.voice = pick;
    utter.onend   = doneSpeaking;
    utter.onerror = doneSpeaking;
    speechSynthesis.speak(utter);
  };
  if (speechSynthesis.getVoices().length) trySpeak();
  else speechSynthesis.onvoiceschanged = trySpeak;
}

// ── SPEECH RECOGNITION ───────────────────────────────────────────────────────
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let activated = false;
let listenTimer = null;

function startListening() {
  if (!SR) { showMsg('Speech recognition unavailable — type below.'); return; }
  if (recognition) { try { recognition.abort(); } catch {} }
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (e) => {
    const text = e.results[e.results.length - 1][0].transcript.trim();
    if (!text) return;
    showMsg(`You: "${text}"`, 4000);
    speechSynthesis?.cancel?.();
    sendToBridge(text);
  };

  recognition.onend = () => {
    if (activated && currentStatus === 'listening') {
      listenTimer = setTimeout(startListening, 400);
    }
  };

  recognition.onerror = (e) => {
    if (e.error !== 'no-speech' && e.error !== 'aborted') showMsg(`Mic: ${e.error}`);
    if (activated) listenTimer = setTimeout(startListening, 800);
  };

  try { recognition.start(); } catch {}
}

function stopListening() {
  activated = false;
  clearTimeout(listenTimer);
  try { recognition?.abort(); } catch {}
  recognition = null;
}

// ── STATUS + MESSAGE ─────────────────────────────────────────────────────────
let currentStatus = 'idle';
function setStatus(s) {
  currentStatus = s;
  const el = document.getElementById('status-pill');
  el.textContent = s.toUpperCase();
  el.className = `status-pill ${s}`;
}

let msgTimer = null;
function showMsg(text, dur = 4500) {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => el.classList.remove('show'), dur);
}

// ── UI EXPORTS ───────────────────────────────────────────────────────────────
window.toggleMic = function() {
  unlockTTS();
  if (!activated) {
    activated = true;
    setStatus('listening');
    document.getElementById('mic-label').textContent = 'Stop';
    document.getElementById('mic-btn').classList.add('active');
    startListening();
  } else {
    stopListening();
    speechSynthesis?.cancel?.();
    setStatus('idle');
    document.getElementById('mic-label').textContent = 'Start';
    document.getElementById('mic-btn').classList.remove('active');
  }
};

window.sendTyped = function() {
  unlockTTS();
  const inp = document.getElementById('typed-input');
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';
  showMsg(`You: "${text}"`, 4000);
  sendToBridge(text);
};

window.onTypedKey = function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.sendTyped(); }
};

window.executeJsonInput = function() {
  const raw = document.getElementById('json-input').value.trim();
  const errEl = document.getElementById('json-error');
  errEl.style.display = 'none';
  try {
    const commands = JSON.parse(raw);
    executeSceneCommands(commands)
      .then(() => showMsg(`Executed ${commands.length} command(s).`))
      .catch(e => { errEl.textContent = e.message; errEl.style.display = 'block'; });
  } catch (e) {
    errEl.textContent = `JSON parse error: ${e.message}`;
    errEl.style.display = 'block';
  }
};

window.clearSceneUI = function() { doClearScene(); showMsg('Scene cleared.'); };

window.exportScene = function() {
  const text = document.getElementById('state-display').value;
  if (!text) return;
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([text], { type: 'application/json' })),
    download: 'mydude3d_scene.json',
  });
  a.click();
};

window.clearStorageUI = function() {
  localStorage.removeItem(LS_KEY);
  doClearScene();
  showMsg('Storage cleared.');
};

window.copyPrompt = function() {
  const text = buildSystemPrompt();
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy Prompt'; }, 2200);
  });
};

window.togglePanel = function() {
  const panel = document.getElementById('side-panel');
  const btn   = document.getElementById('panel-toggle');
  const open  = panel.classList.toggle('open');
  btn.textContent = open ? '✕' : '⚙';
};

window.switchTab = function(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  const tabs = ['prompt', 'json', 'state'];
  document.querySelectorAll('.tab-btn')[tabs.indexOf(tab)]?.classList.add('active');
  document.getElementById(`tab-${tab}`)?.classList.add('active');
};

// ── INIT ─────────────────────────────────────────────────────────────────────
document.getElementById('prompt-display').value = buildSystemPrompt();
restoreFromLocalStorage();
refreshUI();
