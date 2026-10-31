import { bevyUnits } from './bevy-units';
import { factions } from './factions';
/** Screen-space offsets for island renderers, separate from each island's logical tile coordinates. */
export const worldIslands = [
  { slot: 0, x: -850, y: -560, faction: 'blue', color: factions.blue.color },
  { slot: 1, x: 850, y: -560, faction: 'yellow', color: factions.yellow.color },
  { slot: 2, x: -850, y: 620, faction: 'red', color: factions.red.color },
  { slot: 3, x: 850, y: 620, faction: 'purple', color: factions.purple.color },
] as const;
export const worldBalance = {
  draftSeconds: 10,
  preparationSeconds: 20,
  flightSeconds: 8,
  landingInterval: 0.65,
  maxFlightUnits: 6,
  maxFlightsPerCaptain: 3,
  maxIncomingUnits: 48,
} as const;
export const expeditions = [
  ...bevyUnits.map((unit) => ({
    unit: unit.id,
    meatCost: unit.meatCost,
    keepDamage: unit.leak,
    bounty: unit.reward,
  })),
  // Retained for already-saved legacy flights. Hidden from the new roster.
  { unit: 'squire', meatCost: 5, keepDamage: 2, bounty: 5 },
  { unit: 'ranger', meatCost: 4, keepDamage: 1, bounty: 4 },
  { unit: 'guardian', meatCost: 9, keepDamage: 4, bounty: 9 },
] as const;
