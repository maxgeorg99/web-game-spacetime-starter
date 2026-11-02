import { balance, towers, tileDef, treeDef, waves } from '../config';
import { recruitableUnits } from '../config/bevy-units';
import { comBalance, comCaptain } from '../config/com';
import { worldBalance } from '../config/world';
import { pathFor } from './paths';
import {
  distance,
  effectiveStats,
  expansionCells,
  onRoad,
  placementEffect,
  sameCell,
  upgradeFailure,
} from './rules';
import { worldCommand, type WorldAction, type WorldSeat, type WorldState } from './world';

/** Integer-only mixing; the saved seed is the sole source of variation. No Math.random. */
export function nextComSeed(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}
function roll(seed: number, salt: number): number {
  let value = (seed ^ Math.imul(salt + 1, 2654435761)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 2246822507);
  value = Math.imul(value ^ (value >>> 13), 3266489909);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}
function pick<T>(choices: { value: T; score: number }[], seed: number): T | undefined {
  // Restrict variation to useful candidates; personality weights still dominate preferences.
  return choices
    .map((choice, i) => ({
      ...choice,
      rank: choice.score * (1 - comBalance.variation / 2 + roll(seed, i) * comBalance.variation),
    }))
    .filter((choice) => choice.score > 0)
    .sort((a, b) => b.rank - a.rank)[0]?.value;
}

/** Read-only policy. The scheduler persists seed advancement after each decision. */
export function chooseComAction(world: WorldState, seat: WorldSeat): WorldAction | undefined {
  const s = seat.state;
  if (!seat.com || !seat.owner || s.phase === 'lost') {
    return;
  }
  const profile = comCaptain(seat.com.captain, seat.slot);
  const seed = seat.com.seed ?? seat.slot + 1;
  const threatened =
    s.lives / balance.keepHealth < comBalance.responseHealth ||
    world.flights.some((flight) => flight.to === seat.slot);
  if (world.round?.phase === 'draft' && s.phase === 'draft') {
    return pick(
      expansionCells(s).flatMap((cell) =>
        s.offers.map((kind) => {
          const effect = placementEffect(s, kind, cell);
          return {
            value: { type: 'expand' as const, kind, ...cell },
            score:
              1 +
              effect.gold * profile.goldWeight +
              effect.meat * profile.meatWeight +
              effect.healing * profile.healingWeight * (threatened ? 2 : 1) +
              (effect.towers + effect.hastened) * (profile.id === 'mara' ? 8 : 2),
          };
        }),
      ),
      seed,
    );
  }
  const raid = (): WorldAction | undefined => {
    if (!['prepare', 'combat'].includes(world.round?.phase ?? '') || seat.com!.raidIn > 0.000001) {
      return;
    }
    if (
      world.flights.filter((flight) => flight.from === seat.slot).length >=
      worldBalance.maxFlightsPerCaptain
    ) {
      return;
    }
    const opponents = world.seats.filter(
      (other) => other.owner && other.slot !== seat.slot && other.state.phase !== 'lost',
    );
    const units = recruitableUnits.filter((unit) => unit.meatCost <= s.meat);
    const unit = pick(
      units.map((unit) => ({
        value: unit,
        score: (profile.units as readonly string[]).includes(unit.id) ? 2 : 1,
      })),
      nextComSeed(seed),
    );
    if (!unit) {
      return;
    }
    const choices = opponents.map((opponent) => {
      const capacity =
        worldBalance.maxIncomingUnits -
        opponent.state.enemies.length -
        world.flights
          .filter((flight) => flight.to === opponent.slot)
          .reduce((sum, flight) => sum + flight.remaining, 0);
      const batch = Math.max(1, profile.raidPassengers - Math.floor(roll(seed, 99) * 2));
      const count = Math.min(
        batch,
        worldBalance.maxFlightUnits,
        capacity,
        Math.floor(s.meat / unit.meatCost),
      );
      const retaliation = world.flights.some(
        (flight) => flight.from === opponent.slot && flight.to === seat.slot,
      )
        ? 1.4
        : 1;
      return {
        value: { type: 'send' as const, target: opponent.slot, kind: unit.id, count },
        score:
          count > 0
            ? (retaliation *
                (1 + profile.targetWeakness * (1 - opponent.state.lives / balance.keepHealth))) /
              (1 + opponent.state.towers.length * 0.12)
            : 0,
      };
    });
    return pick(choices, nextComSeed(nextComSeed(seed)));
  };
  if (profile.attackFirst && !threatened && s.towers.length > 0) {
    const action = raid();
    if (action) {
      return action;
    }
  }
  if (world.round?.phase === 'prepare' && s.phase === 'prepare') {
    const desired = Math.min(
      comBalance.maxTowers,
      profile.initialTowers +
        Math.floor((s.wave + seat.cycles * waves.length) / profile.wavesPerTower) +
        (threatened ? 1 : 0),
    );
    if (s.towers.length < desired) {
      const path = pathFor(s);
      const coverage = path.map(
        (p) =>
          s.towers.filter((tower) => distance(tower, p) <= effectiveStats(tower, s).range).length,
      );
      const cells = s.tiles.filter(
        (tile) =>
          tileDef(tile.kind).buildable &&
          !onRoad(tile, s) &&
          !s.towers.some((tower) => sameCell(tile, tower)),
      );
      const choices = towers
        .filter((def) => def.cost <= s.gold)
        .flatMap((def) =>
          cells.map((cell) => {
            const stats = effectiveStats({ ...cell, kind: def.id, ranks: {} }, s);
            const coverageScore = path.reduce(
              (sum, p, i) => sum + (distance(cell, p) <= stats.range ? 1 / (1 + coverage[i]) : 0),
              0,
            );
            return {
              value: { type: 'build' as const, kind: def.id, x: cell.x, y: cell.y },
              score:
                ((coverageScore * stats.damage) / stats.cooldown / def.cost) *
                profile.towerWeights[def.id],
            };
          }),
        );
      const action = pick(choices, seed);
      if (action) {
        return action;
      }
    }
    const upgrades = s.towers.flatMap((tower) =>
      treeDef(tower.kind)
        .nodes.filter((node) => !upgradeFailure(s, tower, node.id))
        .map((node) => ({
          value: { type: 'upgrade' as const, tower: tower.id, node: node.id },
          score:
            (node.branch === profile.upgradeBranch ? 1.7 : 1) *
            (threatened && node.stat === 'damage' ? 1.5 : 1),
        })),
    );
    const upgrade = pick(upgrades, seed);
    if (upgrade) {
      return upgrade;
    }
  }
  return raid();
}

/** Saved timers and seeds continue identically after serialization or a server restart. */
export function stepComs(world: WorldState): boolean {
  let changed = false;
  // Upgrade old generic COM saves in place, including lobbies. Preserve their economies.
  for (const seat of world.seats) {
    if (seat.com && (!seat.com.captain || seat.com.seed === undefined)) {
      const profile = comCaptain(seat.com.captain, seat.slot);
      seat.com.captain = profile.id;
      seat.com.seed ??= ((world.seed ?? 1) ^ Math.imul(seat.slot + 1, 2654435761)) >>> 0;
      seat.name = profile.name;
      changed = true;
    }
  }
  if (!world.round || ['lobby', 'finished'].includes(world.round.phase)) {
    return changed;
  }
  for (const slot of world.seats
    .filter((seat) => seat.com && seat.state.phase !== 'lost')
    .map((seat) => seat.slot)) {
    const seat = world.seats[slot];
    const agent = seat.com!;
    const profile = comCaptain(agent.captain, slot);
    agent.decisionIn = Math.max(0, agent.decisionIn - balance.tickSeconds);
    agent.raidIn = Math.max(0, agent.raidIn - balance.tickSeconds);
    changed = true;
    if (agent.decisionIn > 0.000001) {
      continue;
    }
    const action = chooseComAction(world, seat);
    agent.seed = nextComSeed(agent.seed!);
    agent.decisionIn = profile.decisionSeconds * (0.75 + roll(agent.seed, 101) * 0.5);
    if (!action) {
      continue;
    }
    const next = worldCommand(world, seat.owner!, seat.sequence, action);
    if (action.type === 'send') {
      next.seats[slot].com!.raidIn = profile.raidSeconds * (0.75 + roll(agent.seed, 102) * 0.5);
    }
    Object.assign(world, next);
  }
  return changed;
}
