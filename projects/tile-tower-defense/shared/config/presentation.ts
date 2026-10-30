/** UI assets are data too: previews and controls should not hard-code content-specific paths. */
export const uiIcons = {
  gold: 'icons/gold',
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
