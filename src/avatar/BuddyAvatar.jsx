import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ITEM_REGISTRY, SCENE_REGISTRY } from './registry.js';

const SPRING_FAST = { type: 'spring', stiffness: 420, damping: 28 };
const SPRING_MED  = { type: 'spring', stiffness: 240, damping: 24 };
const SPRING_SLOW = { type: 'spring', stiffness: 140, damping: 20 };

// ─── Eye shapes per expression ───────────────────────────────────────────────

function Eyes({ expression }) {
  if (expression === 'happy') return (
    <g>
      <path d="M-22 0 Q-14 -10 -6 0"  stroke="#0f172a" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
      <path d="M6 0  Q14 -10 22 0"    stroke="#0f172a" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
    </g>
  );
  if (expression === 'sad') return (
    <g>
      <path d="M-22 -4 Q-14 4 -6 -4"  stroke="#0f172a" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
      <path d="M6 -4  Q14 4  22 -4"   stroke="#0f172a" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
    </g>
  );
  if (expression === 'excited') return (
    <g>
      <circle cx="-14" cy="0" r="8" fill="#0f172a"/>
      <circle cx="14"  cy="0" r="8" fill="#0f172a"/>
      <circle cx="-11" cy="-3" r="3" fill="#fff"/>
      <circle cx="17"  cy="-3" r="3" fill="#fff"/>
    </g>
  );
  if (expression === 'thinking') return (
    <g>
      <line x1="-22" y1="-2" x2="-6"  y2="-2" stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round"/>
      <circle cx="14" cy="-2" r="8" fill="#0f172a"/>
      <circle cx="17" cy="-5" r="3"  fill="#fff"/>
    </g>
  );
  // default — friendly dots
  return (
    <g>
      <circle cx="-14" cy="0" r="7" fill="#0f172a"/>
      <circle cx="14"  cy="0" r="7" fill="#0f172a"/>
      <circle cx="-11" cy="-2" r="2.5" fill="#fff"/>
      <circle cx="17"  cy="-2" r="2.5" fill="#fff"/>
    </g>
  );
}

// ─── Mouth shapes ─────────────────────────────────────────────────────────────

function Mouth({ expression, phase }) {
  if (phase === 2) return (
    <g>
      <ellipse rx="20" ry="18" fill="#0f172a"/>
      <ellipse cx="0"  cy="8" rx="12" ry="6" fill="#f472b6" opacity="0.65"/>
    </g>
  );
  if (phase === 1) return (
    <ellipse rx="18" ry="10" fill="#0f172a"/>
  );
  if (expression === 'sad') return (
    <path d="M-16 4 Q0 -8 16 4" fill="none" stroke="#0f172a" strokeWidth="4" strokeLinecap="round"/>
  );
  if (expression === 'thinking') return (
    <g>
      <path d="M-10 0 Q0 5 10 0" fill="none" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round"/>
      <circle cx="22" cy="-12" r="4.5" fill="#0f172a" opacity="0.55"/>
      <circle cx="30" cy="-22" r="3"   fill="#0f172a" opacity="0.35"/>
      <circle cx="36" cy="-30" r="2"   fill="#0f172a" opacity="0.2"/>
    </g>
  );
  // happy / excited / default
  return <path d="M-18 -2 Q0 14 18 -2" fill="#0f172a"/>;
}

// ─── Character body shapes ────────────────────────────────────────────────────

function BodyShape({ variant, fill, stroke }) {
  if (variant === 'strong') return (
    <path
      d="M56 118 C36 110 28 98 32 162 C34 192 60 218 100 220 C140 218 166 192 168 162 C172 98 164 110 144 118 C132 113 116 108 100 108 C84 108 68 113 56 118 Z"
      fill={fill} stroke={stroke} strokeWidth={3}
    />
  );
  if (variant === 'square') return (
    <path
      d="M50 120 C32 116 24 104 30 162 C32 192 60 218 100 220 C140 218 168 192 170 162 C176 104 168 116 150 120 C138 116 120 110 100 110 C80 110 62 116 50 120 Z"
      fill={fill} stroke={stroke} strokeWidth={3}
    />
  );
  // round (default for wizard, casual)
  return (
    <path
      d="M60 120 C40 114 32 102 36 162 C38 192 62 218 100 220 C138 218 162 192 164 162 C168 102 160 114 140 120 C128 116 114 110 100 110 C86 110 72 116 60 120 Z"
      fill={fill} stroke={stroke} strokeWidth={3}
    />
  );
}

// ─── Wizard hat accent ────────────────────────────────────────────────────────

function WizardHat({ fill, stroke }) {
  return (
    <g>
      <polygon points="100,18 72,60 128,60" fill={fill} stroke={stroke} strokeWidth="2.5"/>
      <ellipse cx="100" cy="62" rx="30" ry="8" fill={fill} stroke={stroke} strokeWidth="2.5"/>
    </g>
  );
}

// ─── Scientist glasses accent ─────────────────────────────────────────────────

function Glasses({ stroke }) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="2.5">
      <circle cx="86" cy="84" r="11"/>
      <circle cx="114" cy="84" r="11"/>
      <line x1="97" y1="84" x2="103" y2="84"/>
      <line x1="75" y1="84" x2="65" y2="80"/>
      <line x1="125" y1="84" x2="135" y2="80"/>
    </g>
  );
}

// ─── Main BuddyAvatar component ───────────────────────────────────────────────

export function BuddyAvatar({
  state = {},
  mouthPhase = 0,
  status = 'idle',
  primaryColor = '#38bdf8',
  darkColor    = '#2563eb',
  lightColor   = '#dbeafe',
}) {
  const {
    character    = 'casual',
    item         = 'none',
    expression   = 'happy',
    scene_element = 'none',
  } = state;

  const ItemIcon  = ITEM_REGISTRY[item]  ?? null;
  const SceneIcon = SCENE_REGISTRY[scene_element] ?? null;

  const isSpeaking  = status === 'speaking';
  const isListening = status === 'listening';
  const isBuilding  = status === 'building';

  const gradId  = `buddy-grad-${character}`;
  const fillRef = `url(#${gradId})`;

  const bodyBob = isSpeaking
    ? { y: [0, -6, 0, -4, 0], transition: { repeat: Infinity, duration: 0.5, ease: 'easeInOut' } }
    : isListening
    ? { y: [0, -3, 0],         transition: { repeat: Infinity, duration: 2.6, ease: 'easeInOut' } }
    : isBuilding
    ? { rotate: [-2, 2, -2],   transition: { repeat: Infinity, duration: 0.8, ease: 'easeInOut' } }
    : { y: 0, rotate: 0 };

  // Wizard hat only in wizard mode
  const showHat     = character === 'wizard';
  const showGlasses = character === 'scientist';

  const variant = character === 'hero' ? 'strong' : character === 'scientist' ? 'square' : 'round';

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

      {/* ── Scene backdrop ── */}
      <AnimatePresence>
        {SceneIcon && (
          <motion.div
            key={scene_element}
            style={{ position: 'absolute', top: 6, right: 8, lineHeight: 0 }}
            initial={{ opacity: 0, scale: 0.5, rotate: -25 }}
            animate={{ opacity: 0.18, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.4, rotate: 25 }}
            transition={SPRING_MED}
          >
            <Suspense fallback={null}>
              <SceneIcon size={88} color={darkColor} weight="fill"/>
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Character SVG ── */}
      <motion.svg
        viewBox="0 0 200 240"
        style={{ width: '100%', maxWidth: 260, display: 'block', overflow: 'visible' }}
        animate={bodyBob}
      >
        <defs>
          <radialGradient id={gradId} cx="34%" cy="24%" r="76%">
            <stop offset="0%"   stopColor={lightColor} stopOpacity="0.95"/>
            <stop offset="48%"  stopColor={primaryColor}/>
            <stop offset="100%" stopColor={darkColor}/>
          </radialGradient>
          <filter id="buddy-shadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={darkColor} floodOpacity="0.22"/>
          </filter>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="100" cy="234" rx="54" ry="10" fill="#000" opacity="0.10"/>

        {/* Body */}
        <AnimatePresence mode="wait">
          <motion.g
            key={`body-${character}`}
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1,    opacity: 1 }}
            exit={{ scale: 0.75,    opacity: 0 }}
            transition={SPRING_MED}
            filter="url(#buddy-shadow)"
          >
            <BodyShape variant={variant} fill={fillRef} stroke={darkColor}/>
          </motion.g>
        </AnimatePresence>

        {/* Left arm */}
        <motion.g
          style={{ transformOrigin: '45px 130px' }}
          animate={isSpeaking ? { rotate: [-6, 14, -6], transition: { repeat: Infinity, duration: 0.55, ease: 'easeInOut' } } : { rotate: 0 }}
        >
          <ellipse cx="45" cy="148" rx="13" ry="26" fill={fillRef} stroke={darkColor} strokeWidth="2.5"/>
        </motion.g>

        {/* Right arm */}
        <motion.g
          style={{ transformOrigin: '155px 130px' }}
          animate={isSpeaking ? { rotate: [6, -10, 6], transition: { repeat: Infinity, duration: 0.55, ease: 'easeInOut', delay: 0.15 } } : { rotate: 0 }}
        >
          <ellipse cx="155" cy="148" rx="13" ry="26" fill={fillRef} stroke={darkColor} strokeWidth="2.5"/>
        </motion.g>

        {/* Head */}
        <motion.g filter="url(#buddy-shadow)">
          <ellipse cx="100" cy="82" rx="52" ry="48" fill={fillRef} stroke={darkColor} strokeWidth="3"/>
          {/* Shine */}
          <ellipse cx="82" cy="65" rx="18" ry="8" fill="#fff" opacity="0.32"/>
        </motion.g>

        {/* Wizard hat */}
        <AnimatePresence>
          {showHat && (
            <motion.g
              key="hat"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0,   opacity: 1 }}
              exit={{ y: -20,    opacity: 0 }}
              transition={SPRING_MED}
            >
              <WizardHat fill={darkColor} stroke={darkColor}/>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Eyes */}
        <AnimatePresence mode="wait">
          <motion.g
            key={expression}
            transform="translate(100 80)"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0,    opacity: 0 }}
            transition={SPRING_FAST}
          >
            <Eyes expression={expression}/>
          </motion.g>
        </AnimatePresence>

        {/* Scientist glasses */}
        <AnimatePresence>
          {showGlasses && (
            <motion.g
              key="glasses"
              initial={{ opacity: 0, scaleX: 0.5 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0,    scaleX: 0.5 }}
              transition={SPRING_FAST}
            >
              <Glasses stroke={darkColor}/>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Mouth */}
        <motion.g
          transform="translate(100 102)"
          animate={{ scaleY: mouthPhase === 2 ? 1.7 : mouthPhase === 1 ? 1.25 : 1 }}
          transition={{ type: 'spring', stiffness: 650, damping: 24 }}
        >
          <AnimatePresence mode="wait">
            <motion.g
              key={`${expression}-${mouthPhase > 0 ? 'open' : 'closed'}`}
              initial={{ scaleX: 0.5, opacity: 0 }}
              animate={{ scaleX: 1,   opacity: 1 }}
              exit={{ scaleX: 0.5,    opacity: 0 }}
              transition={SPRING_FAST}
            >
              <Mouth expression={expression} phase={mouthPhase}/>
            </motion.g>
          </AnimatePresence>
        </motion.g>

        {/* Legs */}
        <ellipse cx="82"  cy="200" rx="16" ry="21" fill={fillRef} stroke={darkColor} strokeWidth="2.5"/>
        <ellipse cx="118" cy="200" rx="16" ry="21" fill={fillRef} stroke={darkColor} strokeWidth="2.5"/>

        {/* Feet */}
        <ellipse cx="80"  cy="218" rx="22" ry="10" fill={darkColor} opacity="0.88"/>
        <ellipse cx="120" cy="218" rx="22" ry="10" fill={darkColor} opacity="0.88"/>
      </motion.svg>

      {/* ── Item icon (outside SVG, right side) ── */}
      <AnimatePresence>
        {ItemIcon && (
          <motion.div
            key={item}
            style={{ position: 'absolute', right: '4%', top: '38%', lineHeight: 0 }}
            initial={{ x: 36, opacity: 0, rotate: 35 }}
            animate={{ x: 0,  opacity: 1, rotate: 0 }}
            exit={{ x: 36,    opacity: 0, rotate: -25 }}
            transition={SPRING_MED}
          >
            <Suspense fallback={null}>
              <motion.div
                animate={isSpeaking ? { rotate: [-5, 8, -5], transition: { repeat: Infinity, duration: 0.7 } } : { rotate: 0 }}
              >
                <ItemIcon size={46} color={primaryColor} weight="fill"/>
              </motion.div>
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
