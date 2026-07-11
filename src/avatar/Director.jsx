// Director — maps the existing DemoApp avatar/scene-spec state into the
// BuddyAvatar JSON schema, then renders BuddyAvatar.
import React, { useMemo } from 'react';
import { BuddyAvatar } from './BuddyAvatar.jsx';

const SCENE_PALETTES = {
  blue:   ['#38bdf8', '#2563eb', '#dbeafe'],
  pink:   ['#f472b6', '#be185d', '#fff1f2'],
  green:  ['#34d399', '#047857', '#dcfce7'],
  gold:   ['#facc15', '#b45309', '#fef9c3'],
  purple: ['#a78bfa', '#6d28d9', '#ede9fe'],
  red:    ['#fb7185', '#be123c', '#ffe4e6'],
  orange: ['#fb923c', '#c2410c', '#ffedd5'],
  gray:   ['#94a3b8', '#334155', '#f8fafc'],
};

function deriveState(avatar, status) {
  if (!avatar) {
    return { character: 'casual', item: 'none', expression: 'happy', scene_element: 'none' };
  }

  const prompt = (avatar.prompt || avatar.title || '').toLowerCase();
  const scene  = (avatar.scene  || '').toLowerCase();
  const body   = (avatar.body   || '').toLowerCase();

  // ── character ──────────────────────────────────────────────────────────────
  const character =
    /wizard|magic|wand|sorcerer|witch/.test(prompt) ? 'wizard' :
    /hero|knight|warrior|sword|shield/.test(prompt) ? 'hero'   :
    /scientist|lab|flask|potion|robot|computer|monitor/.test(prompt) ||
    body.includes('monitor') ? 'scientist' : 'casual';

  // ── item ───────────────────────────────────────────────────────────────────
  const item =
    /staff|wand|wizard/.test(prompt)            ? 'staff'  :
    /sword|knight|hero|warrior/.test(prompt)    ? 'sword'  :
    /tablet|ipad|iphone/.test(prompt)           ? 'tablet' :
    /flask|potion|scientist|lab/.test(prompt)   ? 'flask'  :
    /book/.test(prompt)                         ? 'book'   :
    /shield/.test(prompt)                       ? 'shield' : 'none';

  // ── scene_element ──────────────────────────────────────────────────────────
  const scene_element =
    scene.includes('forest') || scene.includes('farm')       ? 'forest'   :
    scene.includes('lab')    || scene.includes('office')     ? 'lab'      :
    scene.includes('city')   || scene.includes('stage')      ? 'city'     :
    scene.includes('space')  || scene.includes('planet')     ? 'space'    :
    scene.includes('ocean')  || scene.includes('underwater') ? 'ocean'    :
    scene.includes('castle')                                 ? 'castle'   :
    scene.includes('mountain')                               ? 'mountain' : 'none';

  // ── expression — driven by status ─────────────────────────────────────────
  const expression =
    status === 'building'  ? 'thinking' :
    status === 'speaking'  ? 'excited'  :
    status === 'listening' ? 'happy'    : 'happy';

  return { character, item, expression, scene_element };
}

export function Director({ avatar, mouthPhase = 0, status = 'idle', voiceTheme = {} }) {
  const state = useMemo(() => deriveState(avatar, status), [avatar, status]);

  const palette = SCENE_PALETTES[avatar?.palette] || SCENE_PALETTES.blue;
  // voiceTheme can override the primary colour (e.g. Paulina pink voice)
  const primaryColor = voiceTheme.bot  || palette[0];
  const darkColor    = voiceTheme.bot  || palette[1];
  const lightColor   = voiceTheme.eye  || palette[2];

  const isBuilt = Boolean(avatar);

  return (
    <div className={`avatar-card ${status} ${isBuilt ? 'built' : 'unbuilt'}`}>
      <BuddyAvatar
        state={state}
        mouthPhase={mouthPhase}
        status={status}
        primaryColor={primaryColor}
        darkColor={darkColor}
        lightColor={lightColor}
      />
    </div>
  );
}
