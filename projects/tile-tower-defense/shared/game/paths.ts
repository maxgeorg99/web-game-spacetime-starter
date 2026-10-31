import { road, type TileId } from '../config';
import { expansionBalance } from '../config/expansion';
import type { Land, Point, State } from './model';

export const pathFor = (state?: Pick<State, 'path'>): readonly Point[] => state?.path ?? road;
const equal = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
export interface PathExtension {
  entrance: Point;
  /** Ordered from the new entrance toward the old one. */
  path: Point[];
  land: Point[];
  discovery: Point;
}
/** Valid choices never replace buildings, special terrain, or an existing road. */
export function pathExtensions(s: State): PathExtension[] {
  if (!s.path) {
    return [];
  }
  const [entry, next] = s.path;
  const dx = entry.x - next.x,
    dy = entry.y - next.y;
  const choices: PathExtension[] = [];
  for (const direction of [
    { x: dx, y: dy },
    { x: -dy, y: dx },
    { x: dy, y: -dx },
  ]) {
    const segment = Array.from({ length: expansionBalance.segmentLength }, (_, i) => ({
      x: entry.x + direction.x * (i + 1),
      y: entry.y + direction.y * (i + 1),
    }));
    if (
      segment.some(
        (p) =>
          s.path!.some((q) => equal(p, q)) ||
          s.towers.some((q) => equal(p, q)) ||
          s.tiles.some((q) => equal(p, q) && q.kind !== 'meadow'),
      )
    ) {
      continue;
    }
    // Expand into fog rather than laying a new road across the existing island.
    // One existing meadow cell may connect a turn through the previous segment's verge.
    if (
      segment.filter((p) => !s.tiles.some((q) => equal(p, q))).length <
        expansionBalance.segmentLength - 1 ||
      s.tiles.some((p) => equal(p, segment[segment.length - 1]))
    ) {
      continue;
    }
    const patch = segment.flatMap((p) =>
      [-1, 0, 1].map((offset) => ({
        x: p.x - direction.y * offset,
        y: p.y + direction.x * offset,
      })),
    );
    if (
      patch.some(
        (p) => Math.abs(p.x) > expansionBalance.radius || Math.abs(p.y) > expansionBalance.radius,
      )
    ) {
      continue;
    }
    const land = patch.filter((p) => !s.tiles.some((q) => equal(p, q)));
    const entrance = segment[segment.length - 1];
    // Leave the entrance's two side cells free for the next directional choice.
    const discovery = [...land]
      .reverse()
      .find(
        (p) =>
          !segment.some((q) => equal(p, q)) &&
          Math.abs(p.x - entrance.x) + Math.abs(p.y - entrance.y) >= 2,
      );
    if (!discovery || s.tiles.length + land.length > expansionBalance.maxTiles) {
      continue;
    }
    choices.push({ entrance, path: segment.reverse(), land, discovery });
  }
  return choices;
}
export function extensionAt(s: State, point: Point): PathExtension | undefined {
  return pathExtensions(s).find((option) => equal(option.entrance, point));
}
export function extensionLand(option: PathExtension, kind: TileId): Land[] {
  return option.land.map((p) => ({ ...p, kind: equal(p, option.discovery) ? kind : 'meadow' }));
}
/** Prepending preserves every existing fighter's world position, including arriving expeditions. */
export function applyExtension(s: State, option: PathExtension, kind: TileId) {
  s.path = [...option.path, ...pathFor(s)];
  s.tiles.push(...extensionLand(option, kind));
  s.expansions = (s.expansions ?? 0) + 1;
  for (const fighter of [...s.enemies, ...s.recruits]) {
    fighter.progress += option.path.length;
  }
}
