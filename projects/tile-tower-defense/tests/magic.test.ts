import { describe, test, expect } from 'bun:test';
import { command, fresh, effectiveStats, position } from '../shared/game/rules';
import {
  mageAspect,
  magePoints,
  magicSpell,
  applyMagic,
  tickMagic,
  migrateMages,
} from '../shared/game/magic';
import { advanceProjectiles, launch } from '../shared/game/projectiles';
import { step } from '../shared/game/combat';
import { restoreState } from '../shared/game/save';
import { unitDef } from '../shared/config';
import type { Fighter, Tower } from '../shared/game/model';

function mage(): Tower {
  return {
    id: 1,
    kind: 'sentinel',
    x: 0,
    y: -1,
    ranks: {},
    cooldown: 0,
    spent: 120,
    magicVersion: 1,
  };
}
function enemy(id: number, progress = 0, health = 1000): Fighter {
  return { id, kind: 'goblin', progress, health, maxHealth: health, cooldown: 0 };
}
function mastered(school: string): Tower {
  return {
    ...mage(),
    casts: school === 'lightning' ? 4 : 5,
    ranks: {
      [`${school}-attune`]: 3,
      [`${school}-duration`]: 3,
      [`${school}-power`]: 3,
      [`${school}-capstone`]: 1,
    },
  };
}

describe('authoritative mage skills', () => {
  test('enforces prerequisites, 15-point budget, capstones and transactional failures', () => {
    let state = fresh();
    state.gold = 10000;
    state = command(state, { type: 'build', kind: 'sentinel', x: 0, y: -1 });
    const id = state.towers[0].id;
    const initial = JSON.stringify(state);
    expect(() => command(state, { type: 'upgrade', tower: id, node: 'frost-capstone' })).toThrow();
    expect(JSON.stringify(state)).toBe(initial);
    for (const [node, count] of [
      ['frost-attune', 3],
      ['frost-duration', 3],
      ['frost-power', 3],
      ['frost-capstone', 1],
      ['fire-attune', 3],
      ['fire-duration', 2],
    ] as const)
      for (let i = 0; i < count; i++) state = command(state, { type: 'upgrade', tower: id, node });
    expect(magePoints(state.towers[0])).toBe(15);
    expect(mageAspect(state.towers[0])).toBe('frost');
    const before = JSON.stringify(state);
    expect(() => command(state, { type: 'upgrade', tower: id, node: 'fire-duration' })).toThrow();
    expect(JSON.stringify(state)).toBe(before);
  });
  test('legacy Sentinel investments refund once and restore is idempotent', () => {
    const state = fresh();
    state.towers = [{ ...mage(), magicVersion: undefined, ranks: { steel: 2 }, spent: 190 }];
    const migrated = restoreState(JSON.stringify(state));
    expect(migrated.gold).toBe(state.gold + 70);
    expect(migrated.towers[0].spent).toBe(120);
    expect(migrated.towers[0].ranks).toEqual({});
    expect(migrateMages(migrated)).toBe(false);
    expect(restoreState(JSON.stringify(migrated))).toEqual(migrated);
  });
  test('chill slows authoritative movement, freeze expires and cannot be permanently refreshed', () => {
    const state = fresh();
    const target = enemy(2);
    state.enemies = [target];
    const tower = mastered('frost'),
      spell = magicSpell(tower, 20);
    applyMagic(target, spell);
    const progress = target.progress;
    step(state, true);
    expect(target.progress).toBe(progress);
    expect(target.freezeGuard).toBeGreaterThan(0);
    target.freeze = 0;
    applyMagic(target, spell);
    expect(target.freeze).toBe(0);
    step(state, true);
    expect(target.progress - progress).toBeCloseTo(unitDef('goblin').speed * 0.1 * 0.5);
    tickMagic(target, 10);
    expect(target.chill).toBeUndefined();
    expect(target.freezeGuard).toBe(0);
  });
  test('burn stacks are bounded and partial final ticks deal exactly remaining duration', () => {
    const target = enemy(2),
      spell = magicSpell(mastered('fire'), 20);
    for (let i = 0; i < 20; i++) applyMagic(target, spell);
    expect(target.burn?.stacks).toBe(4);
    const dps = target.burn!.dps * 4;
    target.burn!.remaining = 0.05;
    tickMagic(target, 0.1);
    expect(target.health).toBeCloseTo(1000 - dps * 0.05);
    expect(target.burn).toBeUndefined();
  });
  test('chain jumps are saved projectiles, lose damage and never revisit targets', () => {
    const state = fresh();
    state.nextId = 20;
    state.enemies = [enemy(2, 0), enemy(3, 0.4), enemy(4, 0.8)];
    const tower = mage();
    tower.ranks = { 'lightning-attune': 1 };
    tower.casts = 1;
    launch(
      state,
      position(0),
      state.enemies[0],
      { art: 'magic/lightning-bolt', speed: 6 },
      20,
      0,
      true,
      12,
      magicSpell(tower, 20),
    );
    for (let i = 0; i < 12; i++) advanceProjectiles(state, 0.1);
    expect(state.enemies.map((e) => e.health)).toEqual([980, 986, 990.2]);
    expect(state.projectiles).toHaveLength(0);
    expect(state.impacts.filter((impact) => impact.from)).toHaveLength(3);
  });
  test('capstone cadences are deterministic and ignition damages nearby enemies', () => {
    const frost = mastered('frost'),
      fire = mastered('fire'),
      storm = mastered('lightning');
    expect(magicSpell(frost, 20).freeze).toBe(true);
    frost.casts = 4;
    expect(magicSpell(frost, 20).freeze).toBe(false);
    expect(magicSpell(storm, 20).retention).toBe(1);
    expect(magicSpell(storm, 20).jumps).toBe(6);
    storm.casts = 3;
    expect(magicSpell(storm, 20).overcharge).toBe(false);
    const state = fresh();
    state.enemies = [enemy(2, 0), enemy(3, 0.5), enemy(4, 4)];
    launch(
      state,
      position(0),
      state.enemies[0],
      { art: 'magic/fire-bolt', speed: 6 },
      20,
      0,
      true,
      12,
      magicSpell(fire, 20),
    );
    advanceProjectiles(state, 0.1);
    expect(state.enemies.map((e) => e.health)).toEqual([960, 980, 1000]);
    expect(state.impacts[0].capstone).toBe(true);
  });
  test('a serialized mid-flight hybrid continues identically after reconnect', () => {
    const state = fresh();
    state.phase = 'combat';
    state.queue = ['goblin'];
    state.spawnIn = 100;
    const tower = mastered('frost');
    tower.ranks['fire-attune'] = 2;
    tower.ranks['lightning-attune'] = 3;
    state.enemies = [enemy(2, 0), enemy(3, 0.5)];
    launch(
      state,
      position(1),
      state.enemies[0],
      { art: 'magic/frost-bolt', speed: 6 },
      20,
      0,
      true,
      12,
      magicSpell(tower, 20),
    );
    const restored = restoreState(JSON.stringify(state));
    for (let i = 0; i < 20; i++) {
      step(state);
      step(restored);
    }
    expect(restored).toEqual(state);
  });
  test('frost power and terrain bonuses contribute to the same effective damage', () => {
    const tower = mastered('frost'),
      state = fresh();
    state.tiles.push({ x: 0, y: -3, kind: 'shrine' });
    expect(effectiveStats(tower, state).damage).toBeCloseTo(20 * (1 + 0.45 + 0.2));
  });
});

test('presentation restore does not issue local upgrade refunds', () => {
  const state = fresh();
  state.towers = [{ ...mage(), magicVersion: undefined, ranks: { steel: 1 }, spent: 155 }];
  const visible = restoreState(JSON.stringify(state), false);
  expect(visible.gold).toBe(state.gold);
  expect(visible.towers[0].ranks).toEqual({ steel: 1 });
});
