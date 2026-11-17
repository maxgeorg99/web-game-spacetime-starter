/** UI assets are data too: previews and controls should not hard-code content-specific paths. */
export const uiIcons = {
  gold: 'icons/gold',
  blunt: 'icons/blunt',
  pierce: 'icons/pierce',
  divine: 'icons/divine',
  magic: 'icons/magic',
  armor: 'icons/armor',
  agility: 'icons/agility',
  mystical: 'icons/mystical',
  speed: 'icons/speed',
  cooldown: 'icons/cooldown',
  'keep-damage': 'keep',

  meat: 'icons/meat',
  health: 'icons/health',
  damage: 'icons/damage',
  range: 'icons/range',
  upgrade: 'icons/upgrade',
  defense: 'icons/defense',
} as const;

/** All four 128×256 watchtower images end at pixel 230, before bottom padding. */
export const watchtowerGroundY = 230 / 256;

/** 96px PNGs; groundY is measured at the opaque footprint, ignoring transparent padding. */
export const landmarkArt: Record<string, { width: number; groundY: number }> = {
  'tiles/grove': { width: 84, groundY: 80 / 96 },
  'tiles/quarry': { width: 76, groundY: 80 / 96 },
  'tiles/orchard': { width: 76, groundY: 85 / 96 },
  'tiles/watchpost': { width: 76, groundY: 81 / 96 },
  'tiles/shrine': { width: 76, groundY: 86 / 96 },
  'tiles/relic': { width: 76, groundY: 85 / 96 },
  'tiles/windmill': { width: 76, groundY: 88 / 96 },
};

/** Statistics reuse the same visual meanings as combat and resource controls. */
export const statisticsIcons = {
  waves: 'defense',
  duration: 'cooldown',
  damage: 'damage',
  kills: 'pierce',
  leaks: 'speed',
  keepLost: 'keep-damage',
  tower: 'defense',
  invested: 'gold',
  efficiency: 'damage',
  buildGold: 'defense',
  upgradeGold: 'upgrade',
  goldEarned: 'gold',
  meatEarned: 'meat',
  upgradeShare: 'upgrade',
  sent: 'pierce',
  raidDamage: 'keep-damage',
  meatSpent: 'meat',
} as const satisfies Record<string, keyof typeof uiIcons>;

/** Quiet sky colors and cloud density, independent of authoritative gameplay. */
export const atmosphere = {
  skyTop: '#86b7c5',
  skyMiddle: '#b5d4d8',
  skyBottom: '#e0e8dc',
  cloudLight: '#f5f6e9',
  cloudShade: '#c5dadd',
  cloudCount: 18,
} as const;

/** Decorative lava jumps; pixel art is already preloaded with Mage Tower effects. */
export const lavaAtmosphere = {
  art: 'magic/fire-bolt',
  count: 6,
  flightSeconds: 2.6,
  pauseSeconds: 3.8,
  size: 44,
  trailCount: 3,
  trailDelay: 0.065,
} as const;

export const volcanoScenery = {
  colors: {
    distant: '#66505b',
    foreground: '#40333e',
    rock: '#5b4148',
    rockLit: '#80564e',
    rockShade: '#3c303c',
    facet: '#67494b',
    crater: '#342932',
    lavaShadow: '#a64d37',
    lava: '#e78d4e',
    lavaCore: '#ffd18a',
  },
  layers: [
    { x: 0.44, y: 0.52, width: 1.7, depth: -970, parallax: 0.035, zoomPower: 0.08, alpha: 0.65 },
    { x: 0.72, y: 0.62, width: 0.95, depth: -950, parallax: 0.085, zoomPower: 0.16, alpha: 0.85 },
    { x: 0.46, y: 0.91, width: 1.6, depth: -920, parallax: 0.14, zoomPower: 0.22, alpha: 0.8 },
  ],
} as const;

export const oceanScenery = {
  bubbleCount: 16,
  colors: {
    rock: ['#246076', '#224e61', '#163849'],
    kelp: ['#377c83', '#397970', '#2c625d'],
    coral: ['#558b94', '#887f8b', '#9b7c87'],
    ledge: ['#3b7484', '#3e6d79', '#315661'],
  },
  layers: [
    { x: 0.5, y: 0.6, width: 1.7, parallax: 0.035, zoomPower: 0.08 },
    { x: 0.62, y: 0.79, width: 1.5, parallax: 0.08, zoomPower: 0.15 },
    { x: 0.38, y: 0.98, width: 1.6, parallax: 0.14, zoomPower: 0.22 },
  ],
} as const;

export const highlandsScenery = {
  colors: {
    rock: ['#8ba3a6', '#6b8088', '#596b70'],
    shade: ['#768f99', '#526773', '#3e535d'],
    cap: ['#d4d8ca', '#bdc8bf', '#a3b5ae'],
    moss: ['#8ba3a6', '#6b8069', '#657a59'],
  },
  layers: [
    { x: 0.5, y: 0.5, width: 1.8, depth: -970, parallax: 0.03, zoomPower: 0.08, alpha: 0.65 },
    { x: 0.62, y: 0.7, width: 1.5, depth: -950, parallax: 0.075, zoomPower: 0.15, alpha: 0.8 },
    { x: 0.38, y: 1.02, width: 1.6, depth: -920, parallax: 0.14, zoomPower: 0.22, alpha: 0.85 },
  ],
} as const;
