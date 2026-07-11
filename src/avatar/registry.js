// Avatar asset registry — maps JSON state strings to Phosphor icon components.
// Tree-shaking in Vite ensures only imported icons land in the bundle.
import {
  Sword, MagicWand, DeviceTablet, Flask, BookOpen, Shield,
  Tree, Buildings, Globe, Waves, CastleTurret, Mountains,
  Robot, User, Alien, Ghost, Star,
} from '@phosphor-icons/react';

// Character body configs — colour overrides and body-shape variant
export const CHARACTER_CONFIG = {
  wizard:    { bodyVariant: 'round',  accentShape: 'hat' },
  hero:      { bodyVariant: 'strong', accentShape: 'badge' },
  scientist: { bodyVariant: 'square', accentShape: 'glasses' },
  casual:    { bodyVariant: 'round',  accentShape: 'none' },
};

// Items held by the character (right-hand side)
export const ITEM_REGISTRY = {
  staff:  MagicWand,
  sword:  Sword,
  tablet: DeviceTablet,
  flask:  Flask,
  book:   BookOpen,
  shield: Shield,
  none:   null,
};

// Scene backdrop icons (faded, top-right corner)
export const SCENE_REGISTRY = {
  forest:  Tree,
  lab:     Flask,
  city:    Buildings,
  space:   Globe,
  ocean:   Waves,
  castle:  CastleTurret,
  mountain: Mountains,
  none:    null,
};
