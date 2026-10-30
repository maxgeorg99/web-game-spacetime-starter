import { tiles, type TileId } from '../config/island';
import { discoveries } from '../config/drafting';
import type { State } from './model';

/** Stable offers: generated once by authority and stored in the snapshot, never on hover. */
export function draftOffers(s: State): TileId[] {
  const depth = Math.max(s.wave, s.tiles.length - 24);
  let seed = (s.kills * 7919 + s.nextId * 104729 + s.tiles.length * 1543 + depth * 31) >>> 0;
  for (const tile of s.tiles)
    seed = (Math.imul(seed, 31) + tile.x * 17 + tile.y * 13 + tile.kind.length) >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pool = tiles.filter((tile) => discoveries[tile.id].unlock <= depth).map((tile) => tile.id);
  const offers: TileId[] = [];
  // One discovery slot guarantees variety; two open slots preserve meaningful common choices.
  for (let slot = 0; slot < 3; slot++) {
    const candidates = pool.filter(
      (id) => !offers.includes(id) && (slot !== 0 || discoveries[id].rarity !== 'common'),
    );
    let roll = random() * candidates.reduce((sum, id) => sum + discoveries[id].weight, 0);
    const picked =
      candidates.find((id) => {
        roll -= discoveries[id].weight;
        return roll < 0;
      }) ?? candidates[candidates.length - 1];
    offers.push(picked);
  }
  return offers;
}
