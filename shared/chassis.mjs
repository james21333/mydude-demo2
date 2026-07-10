// Chassis system: four base silhouette types + creature.
// Each chassis defines a body shape, a rig (bounding box for socket math),
// and socket positions for attaching parts.

export const CHASSIS_TYPES = Object.freeze({
  creature: {
    id: 'creature',
    label: 'Creature / mascot',
    bodyShape: 'mascotBody',
    headShape: 'mascotHead',
    rig: {
      body: { cx: 0, cy: 118, rx: 92, ry: 108 },
      head: { cx: 0, cy: 38, rx: 84, ry: 70 },
    },
    sockets: {
      'body.center':        r => [r.body.cx, r.body.cy],
      'body.front':         r => [r.body.cx, r.body.cy + 2],
      'body.leftShoulder':  r => [r.body.cx - r.body.rx * 0.46, r.body.cy - r.body.ry * 0.08],
      'body.rightShoulder': r => [r.body.cx + r.body.rx * 0.46, r.body.cy - r.body.ry * 0.08],
      'body.leftHand':      r => [r.body.cx - r.body.rx * 0.52, r.body.cy + r.body.ry * 0.2],
      'body.rightHand':     r => [r.body.cx + r.body.rx * 0.52, r.body.cy + r.body.ry * 0.2],
      'body.leftHip':       r => [r.body.cx - r.body.rx * 0.25, r.body.cy + r.body.ry * 0.58],
      'body.rightHip':      r => [r.body.cx + r.body.rx * 0.25, r.body.cy + r.body.ry * 0.58],
      'body.leftFoot':      r => [r.body.cx - r.body.rx * 0.24, r.body.cy + r.body.ry * 1.04],
      'body.rightFoot':     r => [r.body.cx + r.body.rx * 0.24, r.body.cy + r.body.ry * 1.04],
      'body.patchLeft':     r => [r.body.cx - r.body.rx * 0.24, r.body.cy + r.body.ry * 0.04],
      'body.patchRight':    r => [r.body.cx + r.body.rx * 0.24, r.body.cy + r.body.ry * 0.18],
      'body.back':          r => [r.body.cx + r.body.rx * 0.64, r.body.cy + r.body.ry * 0.12],
      'head.center':        r => [r.head.cx, r.head.cy],
      'head.leftEar':       r => [r.head.cx - r.head.rx * 0.78, r.head.cy - r.head.ry * 0.02],
      'head.rightEar':      r => [r.head.cx + r.head.rx * 0.78, r.head.cy - r.head.ry * 0.02],
      'head.leftHorn':      r => [r.head.cx - r.head.rx * 0.32, r.head.cy - r.head.ry * 0.66],
      'head.rightHorn':     r => [r.head.cx + r.head.rx * 0.32, r.head.cy - r.head.ry * 0.66],
      'head.leftEye':       r => [r.head.cx - r.head.rx * 0.27, r.head.cy - r.head.ry * 0.07],
      'head.rightEye':      r => [r.head.cx + r.head.rx * 0.27, r.head.cy - r.head.ry * 0.07],
      'head.mouth':         r => [r.head.cx, r.head.cy + r.head.ry * 0.34],
      'head.patchLeft':     r => [r.head.cx - r.head.rx * 0.42, r.head.cy + r.head.ry * 0.18],
    },
  },

  horizontal: {
    id: 'horizontal',
    label: 'Horizontal (car, boat, train, snake)',
    bodyShape: 'chassisHorizontal',
    headShape: null,
    rig: {
      body: { cx: 0, cy: 100, rx: 160, ry: 70 },
    },
    sockets: {
      'body.center':        r => [r.body.cx, r.body.cy],
      'body.front':         r => [r.body.cx + r.body.rx * 0.7, r.body.cy],
      'body.back':          r => [r.body.cx - r.body.rx * 0.7, r.body.cy],
      'body.top':           r => [r.body.cx, r.body.cy - r.body.ry * 0.9],
      'body.underside':     r => [r.body.cx, r.body.cy + r.body.ry * 0.9],
      'body.leftEnd':       r => [r.body.cx - r.body.rx * 0.95, r.body.cy],
      'body.rightEnd':      r => [r.body.cx + r.body.rx * 0.95, r.body.cy],
      // face lives on the front of the body (no separate head)
      'head.center':        r => [r.body.cx + r.body.rx * 0.35, r.body.cy - r.body.ry * 0.15],
      'head.leftEye':       r => [r.body.cx + r.body.rx * 0.2, r.body.cy - r.body.ry * 0.35],
      'head.rightEye':      r => [r.body.cx + r.body.rx * 0.5, r.body.cy - r.body.ry * 0.35],
      'head.mouth':         r => [r.body.cx + r.body.rx * 0.35, r.body.cy + r.body.ry * 0.15],
      // attachment points along the underside for wheels/legs
      'body.leftFoot':      r => [r.body.cx - r.body.rx * 0.55, r.body.cy + r.body.ry * 1.0],
      'body.rightFoot':     r => [r.body.cx + r.body.rx * 0.55, r.body.cy + r.body.ry * 1.0],
      'body.leftHip':       r => [r.body.cx - r.body.rx * 0.55, r.body.cy + r.body.ry * 0.7],
      'body.rightHip':      r => [r.body.cx + r.body.rx * 0.55, r.body.cy + r.body.ry * 0.7],
      'body.patchLeft':     r => [r.body.cx - r.body.rx * 0.3, r.body.cy],
      'body.patchRight':    r => [r.body.cx + r.body.rx * 0.3, r.body.cy],
    },
  },

  vertical: {
    id: 'vertical',
    label: 'Vertical (rocket, tree, bottle, lamp)',
    bodyShape: 'chassisVertical',
    headShape: null,
    rig: {
      body: { cx: 0, cy: 100, rx: 70, ry: 140 },
    },
    sockets: {
      'body.center':        r => [r.body.cx, r.body.cy],
      'body.front':         r => [r.body.cx, r.body.cy],
      'body.top':           r => [r.body.cx, r.body.cy - r.body.ry * 0.85],
      'body.bottom':        r => [r.body.cx, r.body.cy + r.body.ry * 0.85],
      'body.leftSide':      r => [r.body.cx - r.body.rx * 0.9, r.body.cy],
      'body.rightSide':     r => [r.body.cx + r.body.rx * 0.9, r.body.cy],
      // face is in the upper third
      'head.center':        r => [r.body.cx, r.body.cy - r.body.ry * 0.35],
      'head.leftEye':       r => [r.body.cx - r.body.rx * 0.28, r.body.cy - r.body.ry * 0.42],
      'head.rightEye':      r => [r.body.cx + r.body.rx * 0.28, r.body.cy - r.body.ry * 0.42],
      'head.mouth':         r => [r.body.cx, r.body.cy - r.body.ry * 0.18],
      // limb-like attachments on the sides
      'body.leftShoulder':  r => [r.body.cx - r.body.rx * 0.9, r.body.cy - r.body.ry * 0.2],
      'body.rightShoulder': r => [r.body.cx + r.body.rx * 0.9, r.body.cy - r.body.ry * 0.2],
      'body.leftHand':      r => [r.body.cx - r.body.rx * 1.0, r.body.cy + r.body.ry * 0.1],
      'body.rightHand':     r => [r.body.cx + r.body.rx * 1.0, r.body.cy + r.body.ry * 0.1],
      'body.leftFoot':      r => [r.body.cx - r.body.rx * 0.4, r.body.cy + r.body.ry * 0.95],
      'body.rightFoot':     r => [r.body.cx + r.body.rx * 0.4, r.body.cy + r.body.ry * 0.95],
      'body.patchLeft':     r => [r.body.cx - r.body.rx * 0.25, r.body.cy + r.body.ry * 0.15],
      'body.patchRight':    r => [r.body.cx + r.body.rx * 0.25, r.body.cy + r.body.ry * 0.15],
    },
  },

  circular: {
    id: 'circular',
    label: 'Circular (sun, planet, coin, eyeball)',
    bodyShape: 'chassisCircular',
    headShape: null,
    rig: {
      body: { cx: 0, cy: 100, rx: 110, ry: 110 },
    },
    sockets: {
      'body.center':        r => [r.body.cx, r.body.cy],
      'body.front':         r => [r.body.cx, r.body.cy],
      // clock positions around the rim
      'body.12':            r => [r.body.cx, r.body.cy - r.body.ry * 0.95],
      'body.3':             r => [r.body.cx + r.body.rx * 0.95, r.body.cy],
      'body.6':             r => [r.body.cx, r.body.cy + r.body.ry * 0.95],
      'body.9':             r => [r.body.cx - r.body.rx * 0.95, r.body.cy],
      // face is centered
      'head.center':        r => [r.body.cx, r.body.cy - r.body.ry * 0.05],
      'head.leftEye':       r => [r.body.cx - r.body.rx * 0.25, r.body.cy - r.body.ry * 0.2],
      'head.rightEye':      r => [r.body.cx + r.body.rx * 0.25, r.body.cy - r.body.ry * 0.2],
      'head.mouth':         r => [r.body.cx, r.body.cy + r.body.ry * 0.2],
      // map existing mascot socket names to rim positions for compatibility
      'body.leftShoulder':  r => [r.body.cx - r.body.rx * 0.85, r.body.cy - r.body.ry * 0.35],
      'body.rightShoulder': r => [r.body.cx + r.body.rx * 0.85, r.body.cy - r.body.ry * 0.35],
      'body.leftHand':      r => [r.body.cx - r.body.rx * 0.95, r.body.cy + r.body.ry * 0.15],
      'body.rightHand':     r => [r.body.cx + r.body.rx * 0.95, r.body.cy + r.body.ry * 0.15],
      'body.leftFoot':      r => [r.body.cx - r.body.rx * 0.5, r.body.cy + r.body.ry * 0.9],
      'body.rightFoot':     r => [r.body.cx + r.body.rx * 0.5, r.body.cy + r.body.ry * 0.9],
      'body.patchLeft':     r => [r.body.cx - r.body.rx * 0.3, r.body.cy + r.body.ry * 0.05],
      'body.patchRight':    r => [r.body.cx + r.body.rx * 0.3, r.body.cy + r.body.ry * 0.05],
      'body.top':           r => [r.body.cx, r.body.cy - r.body.ry * 0.95],
    },
  },

  square: {
    id: 'square',
    label: 'Square / flat (screen, stamp, book, sign)',
    bodyShape: 'chassisSquare',
    headShape: null,
    rig: {
      body: { cx: 0, cy: 100, rx: 110, ry: 100 },
    },
    sockets: {
      'body.center':        r => [r.body.cx, r.body.cy],
      'body.front':         r => [r.body.cx, r.body.cy],
      // four corners
      'body.topLeft':       r => [r.body.cx - r.body.rx * 0.85, r.body.cy - r.body.ry * 0.85],
      'body.topRight':      r => [r.body.cx + r.body.rx * 0.85, r.body.cy - r.body.ry * 0.85],
      'body.bottomLeft':    r => [r.body.cx - r.body.rx * 0.85, r.body.cy + r.body.ry * 0.85],
      'body.bottomRight':   r => [r.body.cx + r.body.rx * 0.85, r.body.cy + r.body.ry * 0.85],
      // four edge midpoints
      'body.top':           r => [r.body.cx, r.body.cy - r.body.ry * 0.9],
      'body.bottom':        r => [r.body.cx, r.body.cy + r.body.ry * 0.9],
      'body.leftEdge':      r => [r.body.cx - r.body.rx * 0.9, r.body.cy],
      'body.rightEdge':     r => [r.body.cx + r.body.rx * 0.9, r.body.cy],
      // face is centered
      'head.center':        r => [r.body.cx, r.body.cy - r.body.ry * 0.05],
      'head.leftEye':       r => [r.body.cx - r.body.rx * 0.25, r.body.cy - r.body.ry * 0.2],
      'head.rightEye':      r => [r.body.cx + r.body.rx * 0.25, r.body.cy - r.body.ry * 0.2],
      'head.mouth':         r => [r.body.cx, r.body.cy + r.body.ry * 0.22],
      // mascot-compatible attachment points
      'body.leftShoulder':  r => [r.body.cx - r.body.rx * 0.95, r.body.cy - r.body.ry * 0.2],
      'body.rightShoulder': r => [r.body.cx + r.body.rx * 0.95, r.body.cy - r.body.ry * 0.2],
      'body.leftHand':      r => [r.body.cx - r.body.rx * 1.0, r.body.cy + r.body.ry * 0.2],
      'body.rightHand':     r => [r.body.cx + r.body.rx * 1.0, r.body.cy + r.body.ry * 0.2],
      'body.leftFoot':      r => [r.body.cx - r.body.rx * 0.4, r.body.cy + r.body.ry * 1.0],
      'body.rightFoot':     r => [r.body.cx + r.body.rx * 0.4, r.body.cy + r.body.ry * 1.0],
      'body.patchLeft':     r => [r.body.cx - r.body.rx * 0.3, r.body.cy + r.body.ry * 0.05],
      'body.patchRight':    r => [r.body.cx + r.body.rx * 0.3, r.body.cy + r.body.ry * 0.05],
    },
  },
});

export const CHASSIS_IDS = Object.keys(CHASSIS_TYPES);

export function classifyChassis(text = '') {
  const l = text.toLowerCase();
  if (/car|truck|bus|train|boat|sail|ship|plane|airplane|submarine|canoe|kayak|skateboard|surfboard|snake|worm|crocodile|alligator|lizard|fish|whale|shark|dolphin|sausage|hot ?dog|baguette|guitar|violin|sword|pencil|ruler|bridge|couch|sofa|bench|taxi|ambulance|helicopter/.test(l)) return 'horizontal';
  if (/rocket|tree|bottle|lamp|candle|lighthouse|tower|skyscraper|building|cactus|mushroom|pencil|torch|missile|pillar|column|totem|giraffe|flamingo|trophy|exclamation|thermometer|chess|pawn/.test(l)) return 'vertical';
  if (/sun|moon|planet|earth|globe|ball|coin|medal|clock|wheel|donut|cookie|pizza|pie|eyeball|atom|bubble|balloon|orange|apple|peach|cherry|watermelon|snowball|crystal ball|disco|record|vinyl|compass|shield/.test(l)) return 'circular';
  if (/computer|monitor|screen|tv|television|tablet|phone|book|stamp|sign|flag|painting|photo|picture|frame|window|door|card|envelope|ticket|note|page|poster|billboard|calendar|calculator|keyboard|gameboy|console|fridge|washing machine|microwave|oven|toaster/.test(l)) return 'square';
  return 'creature';
}

export function chassisRigPoint(chassisId, socketName) {
  const chassis = CHASSIS_TYPES[chassisId];
  if (!chassis) return [0, 0];
  const socketFn = chassis.sockets[socketName];
  if (!socketFn) return [0, 0];
  return socketFn(chassis.rig);
}
