import { magePoints, branchPoints, mageAspect, migrateMages } from './magic';
import { magicBalance, schools } from '../config/magic';
import { terrainBonuses } from '../config/drafting';
import { draftOffers } from './drafting';
import { balance, road, towerDef, treeDef, unitDef, tileDef, waves, type TileId } from '../config';
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
export function effectiveStats(
  tower: Pick<Tower, 'kind' | 'ranks'> & Partial<Point>,
  state?: State,
) {
  const base = towerDef(tower.kind),
    mods = { damage: 0, range: 0, attackSpeed: 0, splash: 0 };
  for (const node of treeDef(tower.kind).nodes) {
    if (node.stat !== 'magic') {
      mods[node.stat] += node.perRank * (tower.ranks[node.id] ?? 0);
    }
  }
  if (tower.kind === 'sentinel') {
    mods.damage += (tower.ranks['frost-power'] ?? 0) * magicBalance.frostDamagePerRank;
  }
  if (state && tower.x !== undefined && tower.y !== undefined) {
    const point = { x: tower.x, y: tower.y };
    if (state.tiles.some((tile) => tile.kind === 'watchpost' && sameCell(tile, point))) {
      mods.range += terrainBonuses.perchRange;
    }
    if (
      state.tiles.some(
        (tile) => tile.kind === 'shrine' && distance(tile, point) <= terrainBonuses.shrineRadius,
      )
    ) {
      mods.damage += terrainBonuses.shrineDamage;
    }
    if (
      state.tiles.some(
        (tile) =>
          tile.kind === 'windmill' && distance(tile, point) <= terrainBonuses.windmillRadius,
      )
    ) {
      mods.attackSpeed += terrainBonuses.windmillSpeed;
    }
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
export const adjacent = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
export function income(s: State) {
  return s.tiles.reduce(
    (sum, tile) => {
      const neighbors = s.tiles.filter((other) => adjacent(tile, other));
      const count = (kind: TileId) => neighbors.filter((other) => other.kind === kind).length;
      const def = tileDef(tile.kind);
      let gold = def.goldIncome,
        meat = def.meatIncome;
      if (tile.kind === 'forest') {
        gold += count('forest') * terrainBonuses.groveGold;
      }
      if (tile.kind === 'farm') {
        meat += count('forest') * terrainBonuses.pastureMeat;
      }
      if (tile.kind === 'quarry') {
        gold +=
          s.towers.filter((tower) => adjacent(tile, tower)).length * terrainBonuses.quarryGold;
      }
      if (tile.kind === 'orchard') {
        meat += count('farm') * terrainBonuses.orchardMeat;
      }
      return { gold: sum.gold + gold, meat: sum.meat + meat };
    },
    { gold: Number(balance.waveGold), meat: Number(balance.waveMeat) },
  );
}
/** The preview includes changed income on existing neighbors, not just the placed tile. */
export function placementEffect(s: State, kind: TileId, point: Point) {
  const after = { ...s, tiles: [...s.tiles, { ...point, kind }] };
  const beforeIncome = income(s),
    afterIncome = income(after);
  return {
    gold: afterIncome.gold - beforeIncome.gold,
    meat: afterIncome.meat - beforeIncome.meat,
    healing:
      kind === 'relic' ? Math.min(terrainBonuses.relicHealing, balance.keepHealth - s.lives) : 0,
    towers: s.towers.filter(
      (tower) => effectiveStats(tower, after).damage > effectiveStats(tower, s).damage,
    ).length,
    hastened: s.towers.filter(
      (tower) => effectiveStats(tower, after).cooldown < effectiveStats(tower, s).cooldown,
    ).length,
    range: kind === 'watchpost' ? terrainBonuses.perchRange * 100 : 0,
  };
}
export type UpgradeFailure =
  | { kind: 'points'; limit: number }
  | { kind: 'branch'; points: number }
  | { kind: 'unknown' }
  | { kind: 'maxed' }
  | { kind: 'prerequisite'; skill: string; rank: number }
  | { kind: 'gold'; amount: number };

export function upgradeFailure(s: State, tower: Tower, nodeId: string): UpgradeFailure | undefined {
  const node = treeDef(tower.kind).nodes.find((n) => n.id === nodeId);
  if (!node) {
    return { kind: 'unknown' };
  }
  const tree = treeDef(tower.kind);
  if (tree.pointLimit && magePoints(tower) >= tree.pointLimit) {
    return { kind: 'points', limit: tree.pointLimit };
  }
  if (node.branchPoints && branchPoints(tower, schools[node.branch]) < node.branchPoints) {
    return { kind: 'branch', points: node.branchPoints };
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

/** Server diagnostics use stable skill IDs; clients translate the structured reason. */
export function upgradeReason(s: State, tower: Tower, nodeId: string): string | undefined {
  const failure = upgradeFailure(s, tower, nodeId);
  switch (failure?.kind) {
    case undefined:
      return undefined;
    case 'points':
      return `This tower has a ${failure.limit}-point limit.`;
    case 'branch':
      return `Requires ${failure.points} points in this branch.`;
    case 'unknown':
      return 'Unknown skill.';
    case 'maxed':
      return 'Max rank';
    case 'prerequisite':
      return `Requires ${failure.skill} ${failure.rank}`;
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
  migrateMages(s);
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
        ...(def.id === 'sentinel' ? { magicVersion: 1 as const } : {}),
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
      if (tower!.kind === 'sentinel') {
        const preferred = schools[node.branch];
        const aspect = mageAspect({ ...tower!, school: preferred });
        if (aspect !== 'arcane') {
          tower!.school = aspect;
        }
      }
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
      if (action.kind === 'relic') {
        s.lives = Math.min(balance.keepHealth, s.lives + terrainBonuses.relicHealing);
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
    s.offers = draftOffers(s);
  } else {
    s.phase = 'prepare';
  }
}
