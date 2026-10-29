import { factionUnitSheets } from './unit-art';
/** Asset-pack identities shared by world markers, buildings and armies. */
export const factions = {
  blue: { avatar: 'factions/blue/captain', name: 'Blue', color: 0x438ed1 },
  yellow: { avatar: 'factions/yellow/captain', name: 'Yellow', color: 0xe2b832 },
  red: { avatar: 'factions/red/captain', name: 'Red', color: 0xd65353 },
  purple: { avatar: 'factions/purple/captain', name: 'Purple', color: 0x9a65c9 },
} as const;
export type Faction = keyof typeof factions;
export const factionUnits: Record<string, { size: number; frames: number }> = {
  ...factionUnitSheets,
  squire: { size: 192, frames: 6 },
  ranger: { size: 192, frames: 4 },
  guardian: { size: 320, frames: 6 },
};
export const factionBuildings = ['keep', 'archer', 'cannon', 'barracks'];
export function factionArt(key: string, faction: Faction): string {
  return key in factionUnits || factionBuildings.includes(key) ? `factions/${faction}/${key}` : key;
}
