/** Display thresholds only; these do not modify combat or unit balance. */
export const unitHighlights = {
  fastSpeed: 0.938,
  slowSpeed: 0.625,
  toughHealth: 100,
  highKeepDamage: 3,
} as const;

/** Reuse the source pack's movement, durability and siege art for trait badges. */
export const unitTraitIcons = {
  fast: 'speed',
  slow: 'speed',
  tough: 'health',
  siege: 'keep-damage',
} as const;
