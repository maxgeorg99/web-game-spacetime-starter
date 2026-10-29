import { assetUrl } from './assets';
import { unitSheets } from '../shared/config/unit-art';
import { factions, factionUnits, factionBuildings, factionArt } from '../shared/config/factions';
/** Measured strips, square frames, no gaps. Rive experiment art + shared Tiny Swords units. */
export const sheets: Record<string, { size: number; frames: number }> = {
  ...unitSheets,
  forest: { size: 256, frames: 6 },
  raider: { size: 192, frames: 8 },
  swarm: { size: 192, frames: 5 },
  siege: { size: 320, frames: 7 },
  squire: { size: 192, frames: 8 },
  ranger: { size: 192, frames: 6 },
  guardian: { size: 320, frames: 12 },
};
export const images = ['keep', 'archer', 'cannon', 'barracks', 'mill', 'rock', 'arrow'];
for (const faction of Object.keys(factions) as (keyof typeof factions)[]) {
  for (const [unit, sheet] of Object.entries(factionUnits)) {
    sheets[factionArt(unit, faction)] = sheet;
  }
  images.push(...factionBuildings.map((key) => factionArt(key, faction)));
}
export function portrait(key: string) {
  const sheet = sheets[key];
  return sheet
    ? `<span class="portrait" style="background-image:url('${assetUrl(`art/${key}.png`)}');background-size:${sheet.frames * 100}% 100%" aria-hidden="true"></span>`
    : `<img class="portrait" src="${assetUrl(`art/${key}.png`)}" alt="">`;
}
