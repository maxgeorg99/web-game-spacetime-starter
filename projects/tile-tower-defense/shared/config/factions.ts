import { factionUnitSheets } from './unit-art';
/** Asset-pack identities shared by world markers, buildings and armies. */
export const factions = {
  blue: { avatar: 'factions/blue/captain', color: 0x438ed1 },
  yellow: { avatar: 'factions/yellow/captain', color: 0xe2b832 },
  red: { avatar: 'factions/red/captain', color: 0xd65353 },
  purple: { avatar: 'factions/purple/captain', color: 0x9a65c9 },
} as const;
export type Faction = keyof typeof factions;
export const factionUnits: Record<string, { size: number; frames: number }> = {
  ...factionUnitSheets,
  squire: { size: 192, frames: 6 },
  ranger: { size: 192, frames: 4 },
  guardian: { size: 320, frames: 6 },
};
export const factionBuildings = [
  'keep',
  'archer',
  'cannon',
  'barracks',
  'catapult',
  'catapult-avatar',
  'airship',
  'mage-arcane',
  'mage-frost',
  'mage-fire',
  'mage-lightning',
];
// Warfare catapult strips: 256px square frames, no margin or spacing.
export const factionTowerSheets = {
  'catapult-fire': { size: 256, frames: 9 },
  'catapult-load': { size: 256, frames: 4 },
};
export const factionPortraits = new Set(
  Object.keys(factionUnitSheets).map((key) => key.replace('units/', 'avatars/')),
);
export function factionArt(key: string, faction: Faction): string {
  return key in factionUnits ||
    key in factionTowerSheets ||
    factionBuildings.includes(key) ||
    (faction !== 'red' && factionPortraits.has(key))
    ? `factions/${faction}/${key}`
    : key;
}
