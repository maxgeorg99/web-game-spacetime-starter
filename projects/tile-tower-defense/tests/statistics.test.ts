import { expect, test } from 'bun:test';
import { fresh, command, finishWave } from '../shared/game/rules';
import { credit, dealDamage, statistics, towerSource } from '../shared/game/statistics';
import { applyMagic, magicSpell, tickMagic } from '../shared/game/magic';
import { advanceProjectiles, launch } from '../shared/game/projectiles';
import { freshWorld, joinWorld, stepWorld, worldCommand } from '../shared/game/world';
import { restoreState } from '../shared/game/save';
import { towerDef } from '../shared/config';
import type { Fighter } from '../shared/game/model';
const enemy = (id = 100, health = 10): Fighter => ({
  id,
  kind: 'raider',
  progress: 0,
  health,
  maxHealth: health,
  cooldown: 0,
});

test('effective damage caps overkill, credits a kill once and excludes damage to defenders', () => {
  const s = command(fresh(), { type: 'build', kind: 'watchtower', x: 0, y: -1 });
  const source = towerSource(s.towers[0]);
  const target = enemy();
  dealDamage(s, target, 100, true, source);
  dealDamage(s, target, 100, true, source);
  dealDamage(s, enemy(101), 3, false);
  expect(s.statistics!.damage).toBe(10);
  expect(s.statistics!.kills).toBe(1);
  expect(s.towers[0].statistics!.kills).toBe(1);
  expect(s.statistics!.towers.watchtower!.damage).toBe(10);
});

test('sold towers keep attribution for projectiles and aggregate contributions across reconnects', () => {
  let s = command(fresh(), { type: 'build', kind: 'watchtower', x: 0, y: -1 });
  const tower = s.towers[0];
  s.enemies = [enemy()];
  launch(
    s,
    tower,
    s.enemies[0],
    towerDef(tower.kind).projectile,
    100,
    0,
    true,
    0,
    undefined,
    undefined,
    towerSource(tower),
  );
  s = command(s, { type: 'sell', tower: tower.id });
  s = restoreState(JSON.stringify(s));
  advanceProjectiles(s, 10);
  expect(s.statistics!.towers.watchtower!.damage).toBe(10);
  expect(s.statistics!.towers.watchtower!.built).toBe(1);
  expect(s.statistics!.buildGold).toBe(towerDef(tower.kind).cost);
  expect(s.statistics!.saleGold).toBeGreaterThan(0);
  expect(s.towers).toHaveLength(0);
});

test('burn refresh credits latest applying tower and control does not double-count frozen time', () => {
  let s = fresh();
  s.gold = 1000;
  s = command(s, { type: 'build', kind: 'sentinel', x: 0, y: -1 });
  s = command(s, { type: 'build', kind: 'sentinel', x: 0, y: 1 });
  const [a, b] = s.towers;
  a.ranks = b.ranks = { 'fire-attune': 1, 'frost-attune': 1 };
  const target = enemy(100, 1000);
  applyMagic(target, magicSpell(a, 20), undefined, towerSource(a));
  applyMagic(target, magicSpell(b, 20), undefined, towerSource(b));
  target.freeze = 1;
  target.freezeSource = towerSource(a);
  tickMagic(target, 0.1, s);
  expect(a.statistics!.controlSeconds).toBeCloseTo(0.1);
  expect(a.statistics!.damage).toBe(0);
  expect(b.statistics!.damage).toBeGreaterThan(0);
  expect(b.statistics!.controlSeconds).toBe(0);
});

test('old saves are partial, new runs reset, failed purchases never change counters', () => {
  const old = fresh();
  delete old.statistics;
  expect(statistics(restoreState(JSON.stringify(old))).partial).toBe(true);
  const s = fresh();
  s.gold = 0;
  expect(() => command(s, { type: 'build', kind: 'watchtower', x: 0, y: -1 })).toThrow();
  expect(s.statistics!.buildGold).toBe(0);
  credit(s, undefined, 'damage', 12);
  finishWave(s);
  expect(s.statistics!.waves).toBe(1);
  expect(s.statistics!.goldIncome).toBeGreaterThan(0);
  s.phase = 'lost';
  expect(command(s, { type: 'restart' }).statistics!.waves).toBe(0);
});

test('raids credit actual keep damage to the sender, including capped lethal leaks', () => {
  let world = joinWorld(joinWorld(freshWorld(), 'alice'), 'bob');
  world = worldCommand(world, 'alice', 0, { type: 'begin' });
  const sender = world.seats[0],
    defender = world.seats[1];
  sender.state.meat = 1000;
  world = worldCommand(world, 'alice', 1, { type: 'send', target: 1, kind: 'warrior', count: 1 });
  expect(world.seats[0].state.statistics!.sent).toBe(1);
  expect(world.seats[0].state.statistics!.meatSpent).toBeGreaterThan(0);
  world.flights[0].elapsed = 100;
  stepWorld(world);
  expect(world.seats[0].state.statistics!.landed).toBe(1);
  const destination = world.seats[1].state;
  destination.lives = 1;
  destination.enemies[0].progress = 1000;
  destination.enemies[0].leak = 50;
  stepWorld(world);
  expect(world.seats[0].state.statistics!.raidDamage).toBe(1);
  expect(world.seats[0].state.statistics!.raidLeaks).toBe(1);
  expect(destination.statistics!.keepDamage).toBe(1);
  expect(defender.state.statistics!.keepDamage).toBe(0);
});

test('splash caps each victim separately and chained hits retain the original tower source', () => {
  let s = fresh();
  s.gold = 1000;
  s = command(s, { type: 'build', kind: 'sentinel', x: 0, y: -1 });
  const tower = s.towers[0];
  tower.ranks = { 'lightning-attune': 1 };
  s.enemies = [enemy(100, 5), enemy(101, 8), enemy(102, 50)];
  s.enemies[1].progress = 0.2;
  s.enemies[2].progress = 1;
  launch(
    s,
    tower,
    s.enemies[0],
    towerDef(tower.kind).projectile,
    20,
    0.3,
    true,
    0,
    magicSpell(tower, 20),
    undefined,
    towerSource(tower),
  );
  advanceProjectiles(s, 10);
  expect(s.statistics!.damage).toBe(13);
  expect(s.statistics!.kills).toBe(2);
  expect(s.projectiles).toHaveLength(1);
  expect(s.projectiles[0].source).toEqual(towerSource(tower));
  s = restoreState(JSON.stringify(s));
  advanceProjectiles(s, 10);
  expect(s.statistics!.damage).toBeGreaterThan(13);
  expect(s.statistics!.towers.sentinel!.damage).toBe(s.statistics!.damage);
});
