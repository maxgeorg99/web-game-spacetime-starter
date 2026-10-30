import {
  balance,
  road,
  tiles,
  towerDef,
  treeDef,
  unitDef,
  tileDef,
  waves,
  type TileId,
} from '../config';
import type { Command, Point, State, Tower } from './model';
export const sameCell = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const onRoad = (p: Point) => road.some((v) => sameCell(p, v));
export function fresh(): State {
  const land: State['tiles'] = [];
  for (let y = -2; y <= 2; y++) {
    for (let x = -2; x <= 2; x++) {
      land.push({ x, y, kind: 'meadow' });
    }
  }
  return {
    version: 2,
    phase: 'prepare',
    wave: 0,
    gold: balance.startGold,
    meat: balance.startMeat,
    lives: balance.keepHealth,
    tiles: land,
    towers: [],
    enemies: [],
    recruits: [],
    offers: [],
    queue: [],
    spawnIn: 0,
    nextId: 1,
    kills: 0,
    retired: 0,
    projectiles: [],
    impacts: [],
  };
}
export function position(progress: number): Point {
  const i = Math.min(road.length - 1, Math.max(0, Math.floor(progress))),
    a = road[i],
    b = road[Math.min(i + 1, road.length - 1)],
    f = Math.max(0, progress - i);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}
export function effectiveStats(tower: Pick<Tower, 'kind' | 'ranks'>) {
  const base = towerDef(tower.kind),
    mods = { damage: 0, range: 0, attackSpeed: 0, splash: 0 };
  for (const node of treeDef(tower.kind).nodes) {
    mods[node.stat] += node.perRank * (tower.ranks[node.id] ?? 0);
  }
  return {
    damage: base.damage * (1 + mods.damage),
    range: base.range * (1 + mods.range),
    cooldown: base.cooldown / (1 + mods.attackSpeed),
    splash: base.splash + mods.splash,
  };
}
export function expansionCells(s: State): Point[] {
  if (s.tiles.length >= balance.maxTiles) {
    return [];
  }
  const cells = new Map<string, Point>();
  for (const tile of s.tiles) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const p = { x: tile.x + dx, y: tile.y + dy };
      if (
        Math.abs(p.x) <= balance.islandRadius &&
        Math.abs(p.y) <= balance.islandRadius &&
        !s.tiles.some((t) => sameCell(t, p))
      ) {
        cells.set(`${p.x},${p.y}`, p);
      }
    }
  }
  return [...cells.values()];
}
export function income(s: State) {
  return s.tiles.reduce<{ gold: number; meat: number }>(
    (sum, t) => ({
      gold: sum.gold + tileDef(t.kind).goldIncome,
      meat: sum.meat + tileDef(t.kind).meatIncome,
    }),
    { gold: balance.waveGold, meat: balance.waveMeat },
  );
}
export type UpgradeFailure =
  | { kind: 'unknown' }
  | { kind: 'maxed' }
  | { kind: 'prerequisite'; skill: string; rank: number }
  | { kind: 'gold'; amount: number };

export function upgradeFailure(s: State, tower: Tower, nodeId: string): UpgradeFailure | undefined {
  const node = treeDef(tower.kind).nodes.find((n) => n.id === nodeId);
  if (!node) {
    return { kind: 'unknown' };
  }
  if ((tower.ranks[node.id] ?? 0) >= node.maxRank) {
    return { kind: 'maxed' };
  }
  if (node.requires && (tower.ranks[node.requires.id] ?? 0) < node.requires.rank) {
    return { kind: 'prerequisite', skill: node.requires.id, rank: node.requires.rank };
  }
  if (s.gold < node.goldCost) {
    return { kind: 'gold', amount: node.goldCost };
  }
}

/** Keep the server's existing error messages; clients translate the structured reason. */
export function upgradeReason(s: State, tower: Tower, nodeId: string): string | undefined {
  const failure = upgradeFailure(s, tower, nodeId);
  switch (failure?.kind) {
    case undefined:
      return undefined;
    case 'unknown':
      return 'Unknown skill.';
    case 'maxed':
      return 'Max rank';
    case 'prerequisite':
      return `Requires ${treeDef(tower.kind).nodes.find((n) => n.id === failure.skill)!.name} ${failure.rank}`;
    case 'gold':
      return `Need ${failure.amount} gold`;
  }
}
/** Transactional domain API: failed commands never mutate the caller's snapshot. */
export function command(current: State, action: Command): State {
  if (action.type === 'restart') {
    if (current.phase !== 'won' && current.phase !== 'lost') {
      throw Error('Finish the run before restarting.');
    }
    return fresh();
  }
  if (current.phase === 'won' || current.phase === 'lost') {
    throw Error('This run has ended.');
  }
  // State is JSON data by design; SpacetimeDB's JS runtime has no structuredClone.
  const s: State = JSON.parse(JSON.stringify(current));
  // Transport payloads include placeholder fields; only these commands target a tower.
  const targetsTower = action.type === 'upgrade' || action.type === 'sell';
  const tower = targetsTower ? s.towers.find((t) => t.id === action.tower) : undefined;
  if (targetsTower && !tower) {
    throw Error('Tower not found.');
  }
  switch (action.type) {
    case 'build': {
      if (s.phase !== 'prepare') {
        throw Error('Build between waves.');
      }
      const def = towerDef(action.kind),
        tile = s.tiles.find((t) => sameCell(t, action));
      if (
        !tile ||
        !tileDef(tile.kind).buildable ||
        onRoad(tile) ||
        s.towers.some((t) => sameCell(t, tile))
      ) {
        throw Error('Choose empty buildable land off the road.');
      }
      if (s.gold < def.cost) {
        throw Error('Not enough gold.');
      }
      s.gold -= def.cost;
      s.towers.push({
        id: s.nextId++,
        kind: def.id,
        x: tile.x,
        y: tile.y,
        ranks: {},
        cooldown: 0,
        spent: def.cost,
      });
      break;
    }
    case 'upgrade': {
      if (s.phase !== 'prepare') {
        throw Error('Upgrade between waves.');
      }
      const reason = upgradeReason(s, tower!, action.node);
      if (reason) {
        throw Error(reason);
      }
      const node = treeDef(tower!.kind).nodes.find((n) => n.id === action.node)!;
      s.gold -= node.goldCost;
      tower!.spent += node.goldCost;
      tower!.ranks[node.id] = (tower!.ranks[node.id] ?? 0) + 1;
      break;
    }
    case 'sell':
      if (s.phase !== 'prepare') {
        throw Error('Sell between waves.');
      }
      s.gold += Math.floor(tower!.spent * balance.sellFraction);
      s.towers = s.towers.filter((t) => t.id !== tower!.id);
      break;
    case 'recruit': {
      if (s.phase !== 'prepare' && s.phase !== 'combat') {
        throw Error('Finish drafting first.');
      }
      const def = unitDef(action.kind);
      if (!def.recruitable) {
        throw Error('This unit cannot be recruited.');
      }
      if (s.meat < def.meatCost) {
        throw Error('Not enough meat.');
      }
      if (s.recruits.length >= balance.maxRecruits) {
        throw Error('Your army is full.');
      }
      s.meat -= def.meatCost;
      s.recruits.push({
        id: s.nextId++,
        kind: def.id,
        progress: road.length - 1,
        health: def.health,
        maxHealth: def.health,
        cooldown: 0,
      });
      break;
    }
    case 'start': {
      if (s.phase !== 'prepare') {
        throw Error('Prepare the island first.');
      }
      const wave = waves[s.wave];
      if (!wave) {
        throw Error('No wave remaining.');
      }
      s.queue = wave.groups.flatMap((g) =>
        Array.from({ length: g.count }, () => unitDef(g.unit).id),
      );
      s.spawnIn = 0;
      s.phase = 'combat';
      break;
    }
    case 'expand': {
      if (s.phase !== 'draft') {
        throw Error('No draft available.');
      }
      if (!s.offers.includes(action.kind as TileId)) {
        throw Error('Choose an offered tile.');
      }
      if (!expansionCells(s).some((p) => sameCell(p, action))) {
        throw Error('Place beside your island, inside the boundary.');
      }
      s.tiles.push({ x: action.x, y: action.y, kind: tileDef(action.kind).id });
      s.offers = [];
      s.phase = 'prepare';
      break;
    }
    default:
      throw Error('Unknown command.');
  }
  return s;
}
export function finishWave(s: State) {
  s.projectiles = [];
  s.impacts = [];
  const earned = income(s);
  s.gold += earned.gold;
  s.meat += earned.meat;
  s.wave++;
  if (s.wave >= waves.length) {
    s.phase = 'won';
  } else if (expansionCells(s).length) {
    s.phase = 'draft';
    s.offers = tiles.map((t) => t.id);
  } else {
    s.phase = 'prepare';
  }
}
