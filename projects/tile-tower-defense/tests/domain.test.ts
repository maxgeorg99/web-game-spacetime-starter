import { existsSync } from 'node:fs';
import { launch, advanceProjectiles } from '../shared/game/projectiles';
import { restoreState } from '../shared/game/save';
import { describe, expect, test } from 'bun:test';
import {
  balance,
  towers,
  units,
  skillTrees,
  uiIcons,
  waves,
  validateCatalog,
  road,
} from '../shared/config';
import {
  command,
  effectiveStats,
  expansionCells,
  fresh,
  income,
  position,
} from '../shared/game/rules';
import { step } from '../shared/game/combat';
import type { State } from '../shared/game/model';

function settle(s: State) {
  for (let i = 0; i < 4000 && s.phase === 'combat'; i++) {
    step(s);
  }
  expect(s.phase).not.toBe('combat');
}
describe('content integrity', () => {
  test('catalog validates and round-trips as plain data', () => {
    expect(() => validateCatalog()).not.toThrow();
    expect(JSON.parse(JSON.stringify(towers))).toEqual(towers);
  });
  test('every road segment is an adjacent grid cell', () => {
    for (let i = 1; i < road.length; i++) {
      expect(Math.abs(road[i].x - road[i - 1].x) + Math.abs(road[i].y - road[i - 1].y)).toBe(1);
    }
  });
});
describe('commands are atomic and constrained', () => {
  test('road, occupied, missing and unaffordable builds reject without mutation', () => {
    let s = fresh();
    const saved = JSON.stringify(s);
    expect(() => command(s, { type: 'build', kind: 'watchtower', ...road[0] })).toThrow();
    expect(JSON.stringify(s)).toBe(saved);
    expect(() => command(s, { type: 'build', kind: 'watchtower', x: 40, y: 40 })).toThrow();
    s = command(s, { type: 'build', kind: 'watchtower', x: 0, y: -1 });
    expect(() => command(s, { type: 'build', kind: 'watchtower', x: 0, y: -1 })).toThrow();
    s.gold = 0;
    expect(() => command(s, { type: 'build', kind: 'catapult', x: 2, y: 0 })).toThrow();
  });
  test('skill prerequisites, cap, cost and additive stats apply per tower', () => {
    let s = command(fresh(), { type: 'build', kind: 'watchtower', x: 0, y: -1 });
    s.gold = 1000;
    const id = s.towers[0].id;
    expect(() => command(s, { type: 'upgrade', tower: id, node: 'volley' })).toThrow('Requires');
    for (let i = 0; i < 3; i++) {
      s = command(s, { type: 'upgrade', tower: id, node: 'quick-string' });
    }
    expect(s.gold).toBe(940);
    expect(() => command(s, { type: 'upgrade', tower: id, node: 'quick-string' })).toThrow(
      'Max rank',
    );
    s = command(s, { type: 'upgrade', tower: id, node: 'volley' });
    expect(effectiveStats(s.towers[0]).cooldown).toBeCloseTo(0.7 / 1.7);
    s = command(s, { type: 'build', kind: 'watchtower', x: 2, y: 0 });
    expect(effectiveStats(s.towers[1]).cooldown).toBe(0.7);
    s = command(s, { type: 'sell', tower: id });
    expect(s.gold).toBe(895 - 50 + Math.floor(155 * 0.65));
  });
  test('recruit costs meat, cannot recruit enemies or exceed cap', () => {
    let s = fresh();
    s = command(s, { type: 'recruit', kind: 'squire' });
    expect(s.meat).toBe(11);
    expect(s.recruits[0].progress).toBe(road.length - 1);
    expect(() => command(s, { type: 'recruit', kind: 'goblin' })).toThrow();
    s.meat = 0;
    expect(() => command(s, { type: 'recruit', kind: 'squire' })).toThrow();
    s.meat = 1000;
    while (s.recruits.length < balance.maxRecruits) {
      s = command(s, { type: 'recruit', kind: 'squire' });
    }
    expect(() => command(s, { type: 'recruit', kind: 'squire' })).toThrow('full');
  });
  test('draft requires offered kind, adjacent empty cell and correct phase', () => {
    let s = fresh();
    expect(() => command(s, { type: 'expand', kind: 'forest', x: 3, y: 0 })).toThrow();
    s.phase = 'draft';
    s.offers = ['forest'];
    expect(() => command(s, { type: 'expand', kind: 'farm', x: 3, y: 0 })).toThrow();
    expect(() => command(s, { type: 'expand', kind: 'forest', x: 4, y: 4 })).toThrow();
    expect(() => command(s, { type: 'expand', kind: 'forest', x: 0, y: 0 })).toThrow();
    s = command(s, { type: 'expand', kind: 'forest', x: 3, y: 0 });
    expect(s.phase).toBe('prepare');
    expect(income(s).gold).toBe(balance.waveGold + 12);
    expect(() => command(s, { type: 'build', kind: 'watchtower', x: 3, y: 0 })).toThrow();
  });
  test('cannot restart a live run or build during combat', () => {
    const s = command(fresh(), { type: 'start' });
    expect(() => command(s, { type: 'restart' })).toThrow();
    expect(() => command(s, { type: 'build', kind: 'watchtower', x: 0, y: -1 })).toThrow();
  });
});
describe('shared combat', () => {
  test('wave preview matches spawn queue exactly', () => {
    const s = command(fresh(), { type: 'start' });
    expect(s.queue.length).toBe(waves[0].groups.reduce((n, g) => n + g.count, 0));
    step(s);
    expect(s.enemies[0].kind).toBe(waves[0].groups[0].unit);
  });
  test('recruits march backwards, fight, take damage and retire', () => {
    let s = command(fresh(), { type: 'recruit', kind: 'squire' });
    s = command(s, { type: 'start' });
    s.spawnIn = 100;
    s.queue = ['goblin'];
    step(s);
    expect(s.recruits[0].progress).toBeLessThan(road.length - 1);
    s.recruits[0].progress = 5;
    s.enemies = [
      { id: 999, kind: 'raider', progress: 5.2, health: 115, maxHealth: 115, cooldown: 0 },
    ];
    step(s);
    expect(s.enemies[0].health).toBeLessThan(115);
    expect(s.recruits[0].health).toBeLessThan(110);
    expect(s.recruits[0].progress).toBe(5);
    s.enemies = [];
    s.recruits[0].progress = 0.01;
    step(s);
    expect(s.recruits).toHaveLength(0);
    expect(s.retired).toBe(1);
  });
  test('kills reward once and splash hits neighboring enemies', () => {
    let s = fresh();
    s.gold = 1000;
    s = command(s, { type: 'build', kind: 'catapult', x: 0, y: -1 });
    s = command(s, { type: 'start' });
    s.queue = ['goblin'];
    s.spawnIn = 100;
    s.enemies = [0, 0.2].map((p, i) => ({
      id: 100 + i,
      kind: 'goblin' as const,
      progress: 2 + p,
      health: 20,
      maxHealth: 45,
      cooldown: 0,
    }));
    const gold = s.gold;
    step(s);
    expect(s.kills).toBe(0); // A launch is not an impact.
    for (let tick = 0; tick < 20 && s.kills < 2; tick++) {
      step(s);
    }
    expect(s.kills).toBe(2);
    expect(s.gold).toBe(gold + 14);
    step(s);
    expect(s.gold).toBe(gold + 14);
  });
  test('defeat beats victory and freezes simulation', () => {
    const s = fresh();
    s.phase = 'combat';
    s.lives = 1;
    s.enemies = [{ id: 1, kind: 'brute', progress: 12, health: 300, maxHealth: 300, cooldown: 0 }];
    step(s);
    expect(String(s.phase)).toBe('lost');
    const copy = JSON.stringify(s);
    step(s);
    expect(JSON.stringify(s)).toBe(copy);
    expect(command(s, { type: 'restart' })).toEqual(fresh());
  });
  test('a basic defense clears wave one, earns income once, and offers expansion', () => {
    let s = command(fresh(), { type: 'build', kind: 'watchtower', x: 0, y: -1 });
    s = command(s, { type: 'build', kind: 'watchtower', x: 0, y: 1 });
    s = command(s, { type: 'start' });
    settle(s);
    expect(s.phase).toBe('draft');
    expect(s.wave).toBe(1);
    expect(s.meat).toBe(balance.startMeat + balance.waveMeat);
    const saved = JSON.stringify(s);
    step(s);
    expect(JSON.stringify(s)).toBe(saved);
    expect(expansionCells(s).length).toBeGreaterThan(0);
  });
  test('JSON reconstruction produces identical results', () => {
    const s = command(fresh(), { type: 'start' }),
      copy = JSON.parse(JSON.stringify(s));
    for (let i = 0; i < 120; i++) {
      step(s);
      step(copy);
    }
    expect(copy).toEqual(s);
    expect(position(12)).toEqual(road[12]);
  });
  test('a full run is winnable using only starting resources and earned income', () => {
    let s = fresh();
    const spots = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: 2, y: 0 },
      { x: -2, y: 1 },
      { x: 2, y: -1 },
      { x: -2, y: 0 },
    ];
    for (let wave = 0; wave < waves.length; wave++) {
      for (const spot of spots) {
        if (s.gold >= 50 && !s.towers.some((tower) => tower.x === spot.x && tower.y === spot.y)) {
          s = command(s, { type: 'build', kind: 'watchtower', ...spot });
        }
      }
      for (const tower of s.towers) {
        while (s.gold >= 25 && (s.towers.find((t) => t.id === tower.id)!.ranks.barbed ?? 0) < 3) {
          s = command(s, { type: 'upgrade', tower: tower.id, node: 'barbed' });
        }
      }
      while (s.meat >= 5 && s.recruits.length < balance.maxRecruits) {
        s = command(s, { type: 'recruit', kind: 'squire' });
      }
      s = command(s, { type: 'start' });
      settle(s);
      if (s.phase === 'draft') {
        s = command(s, { type: 'expand', kind: 'forest', ...expansionCells(s)[0] });
      }
    }
    expect(s.phase).toBe('won');
    expect(s.wave).toBe(waves.length);
  });
});

describe('projectiles and presentation data', () => {
  test('all configured avatars, skill icons and projectile assets exist', () => {
    const paths = [
      ...units.map((unit) => unit.avatar),
      ...skillTrees.flatMap((tree) => tree.nodes.map((node) => node.icon)),
      ...Object.values(uiIcons),
      ...towers.map((tower) => tower.projectile.art),
    ];
    for (const path of paths) {
      expect(existsSync(new URL(`../public/art/${path}.png`, import.meta.url))).toBe(true);
    }
  });
  test('flight delays damage, follows a moving target, and impacts exactly once', () => {
    const state = fresh();
    const target = {
      id: 99,
      kind: 'raider' as const,
      progress: 2,
      health: 115,
      maxHealth: 115,
      cooldown: 0,
    };
    state.enemies.push(target);
    launch(state, { x: 0, y: 0 }, target, { art: 'arrow', speed: 2 }, 20, 0, true, 48);
    advanceProjectiles(state, 0.1);
    expect(target.health).toBe(115);
    expect(state.projectiles.length).toBe(1);
    target.progress = 3;
    for (let i = 0; i < 30; i++) {
      advanceProjectiles(state, 0.1);
    }
    expect(target.health).toBe(95);
    expect(state.projectiles).toHaveLength(0);
    expect(state.impacts).toHaveLength(1);
  });
  test('a dead target does not receive repeated damage or strand projectiles', () => {
    const state = fresh();
    const target = {
      id: 99,
      kind: 'goblin' as const,
      progress: 2,
      health: 0,
      maxHealth: 45,
      cooldown: 0,
    };
    state.enemies.push(target);
    launch(state, { x: 0, y: 0 }, target, { art: 'arrow', speed: 7 }, 20, 0, true, 48);
    for (let i = 0; i < 20; i++) {
      advanceProjectiles(state, 0.1);
    }
    expect(target.health).toBe(0);
    expect(state.projectiles).toHaveLength(0);
  });
  test('ranged recruits launch arrows instead of instant damage', () => {
    let state = command(fresh(), { type: 'recruit', kind: 'ranger' });
    state = command(state, { type: 'start' });
    state.spawnIn = 100;
    state.recruits[0].progress = 6;
    state.enemies = [
      { id: 99, kind: 'raider', progress: 5, health: 115, maxHealth: 115, cooldown: 0 },
    ];
    step(state);
    expect(state.enemies[0].health).toBe(115);
    expect(state.projectiles).toHaveLength(1);
  });
  test('version-one saves retain economy and towers during projectile migration', () => {
    const old = { ...fresh(), version: 1, shots: [] };
    const migrated = restoreState(JSON.stringify(old));
    expect(migrated.version).toBe(2);
    expect(migrated.gold).toBe(balance.startGold);
    expect(migrated.projectiles).toEqual([]);
    expect('shots' in migrated).toBe(false);
    expect(() => restoreState('{"version":99}')).toThrow('Unsupported');
  });
});
