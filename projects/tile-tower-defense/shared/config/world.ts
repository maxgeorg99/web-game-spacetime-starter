import { bevyUnits } from './bevy-units';
import { factions } from './factions';
/** Screen-space offsets for island renderers, separate from each island's logical tile coordinates. */
export const lobbyCapacities = [4, 8, 16] as const;
export type LobbyCapacity = (typeof lobbyCapacities)[number];
const originalIslands = [
  { slot: 0, x: -1500, y: -1100, faction: 'blue', color: factions.blue.color },
  { slot: 1, x: 1500, y: -1100, faction: 'yellow', color: factions.yellow.color },
  { slot: 2, x: -1500, y: 1100, faction: 'red', color: factions.red.color },
  { slot: 3, x: 1500, y: 1100, faction: 'purple', color: factions.purple.color },
] as const;
/** Keep the original four origins stable; grow outward without overlapping expanded islands. */
export const worldIslands = [
  ...originalIslands,
  ...Array.from({ length: 12 }, (_, index) => {
    const slot = index + 4;
    const positions = [
      [-4500, -1100],
      [4500, -1100],
      [-4500, 1100],
      [4500, 1100],
      [-4500, -3300],
      [-1500, -3300],
      [1500, -3300],
      [4500, -3300],
      [-4500, 3300],
      [-1500, 3300],
      [1500, 3300],
      [4500, 3300],
    ];
    const faction = originalIslands[slot % 4].faction;
    return {
      slot,
      x: positions[index][0],
      y: positions[index][1],
      faction,
      color: factions[faction].color,
    };
  }),
];
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
