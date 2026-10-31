import { expect, test } from 'bun:test';
import { expansionBalance } from '../shared/config/expansion';
import { road } from '../shared/config';
import { command, fresh, onRoad, position, sameCell } from '../shared/game/rules';
import { pathExtensions, pathFor } from '../shared/game/paths';
import { step } from '../shared/game/combat';
import { restoreState } from '../shared/game/save';

function drafted() {
  const state = fresh(true);
  state.phase = 'draft';
  state.offers = ['watchpost', 'forest', 'meadow'];
  return state;
}

test('direction choice extends entrance, reveals buildable land and preserves the keep', () => {
  const state = drafted(),
    option = pathExtensions(state)[0];
  const next = command(state, { type: 'expand', kind: 'watchpost', ...option.entrance });
  expect(next.path!.length).toBe(state.path!.length + expansionBalance.segmentLength);
  expect(next.path![0]).toEqual(option.entrance);
  expect(next.path!.at(-1)).toEqual(state.path!.at(-1));
  expect(next.tiles.length).toBe(state.tiles.length + option.land.length);
  expect(next.tiles.find((p) => sameCell(p, option.discovery))!.kind).toBe('watchpost');
  expect(next.offers).toEqual([]);
  expect(next.expansions).toBe(1);
  for (const p of next.path!) {
    expect(next.tiles.some((q) => sameCell(p, q))).toBe(true);
  }
  const tower = command(next, { type: 'build', kind: 'watchtower', ...option.discovery });
  expect(tower.towers[0]).toMatchObject(option.discovery);
  expect(() => command(next, { type: 'build', kind: 'watchtower', ...option.entrance })).toThrow(
    'off the road',
  );
});

test('blocked directions, invalid endpoints and repeated choices never mutate the input', () => {
  const state = drafted(),
    option = pathExtensions(state)[0];
  state.tiles.push({ ...option.path[1], kind: 'forest' });
  expect(pathExtensions(state).some((p) => sameCell(p.entrance, option.entrance))).toBe(false);
  const before = JSON.stringify(state);
  expect(() => command(state, { type: 'expand', kind: 'forest', ...option.entrance })).toThrow();
  expect(() => command(state, { type: 'expand', kind: 'forest', x: 0.5, y: 1 })).toThrow();
  expect(JSON.stringify(state)).toBe(before);
  const valid = pathExtensions(state)[0];
  const next = command(state, { type: 'expand', kind: 'forest', ...valid.entrance });
  expect(() => command(next, { type: 'expand', kind: 'forest', ...valid.entrance })).toThrow(
    'No draft',
  );
});

test('expanding during an expedition preserves fighter and projectile positions', () => {
  const state = drafted(),
    option = pathExtensions(state)[0];
  state.enemies.push({
    id: 1,
    kind: 'turtle',
    health: 50,
    maxHealth: 50,
    progress: 1.5,
    cooldown: 0,
  });
  state.recruits.push({
    id: 2,
    kind: 'archer',
    health: 50,
    maxHealth: 50,
    progress: 4.5,
    cooldown: 0,
  });
  state.projectiles.push({
    id: 3,
    art: 'arrow',
    x: 2,
    y: -1,
    speed: 5,
    target: 1,
    aim: position(1.5, state),
    damage: 1,
    splash: 0,
    ally: true,
    age: 0,
    launchHeight: 12,
  });
  const next = command(state, { type: 'expand', kind: 'meadow', ...option.entrance });
  expect(position(next.enemies[0].progress, next)).toEqual(position(1.5, state));
  expect(position(next.recruits[0].progress, next)).toEqual(position(4.5, state));
  expect(next.projectiles).toEqual(state.projectiles);
});

test('new entrance is used by spawning, tower targeting and projectile impacts', () => {
  let state = drafted();
  const option = pathExtensions(state)[0];
  state = command(state, { type: 'expand', kind: 'watchpost', ...option.entrance });
  state = command(state, { type: 'build', kind: 'watchtower', ...option.discovery });
  state = command(state, { type: 'start' });
  step(state);
  expect(state.enemies.length).toBeGreaterThan(0);
  const enemy = state.enemies[0];
  expect(
    Math.hypot(
      position(enemy.progress, state).x - option.entrance.x,
      position(enemy.progress, state).y - option.entrance.y,
    ),
  ).toBeLessThan(1);
  expect(state.projectiles.length).toBeGreaterThan(0);
  const hp = enemy.health;
  for (let i = 0; i < 20; i++) {
    step(state);
  }
  expect(state.kills > 0 || state.enemies.some((e) => e.id === enemy.id && e.health < hp)).toBe(
    true,
  );
});

test('repeated growth stays contiguous, bounded and unique across save restoration', () => {
  let state = drafted();
  let expanded = 0;
  for (let round = 0; round < 20; round++) {
    state.phase = 'draft';
    state.offers = ['meadow'];
    const option = pathExtensions(state)[0];
    if (!option) {
      break;
    }
    state = command(state, { type: 'expand', kind: 'meadow', ...option.entrance });
    state = restoreState(JSON.stringify(state));
    expanded++;
    const path = state.path!;
    expect(new Set(path.map((p) => `${p.x},${p.y}`)).size).toBe(path.length);
    expect(new Set(state.tiles.map((p) => `${p.x},${p.y}`)).size).toBe(state.tiles.length);
    for (let i = 1; i < path.length; i++) {
      expect(Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].y - path[i - 1].y)).toBe(1);
    }
    expect(
      state.tiles.every(
        (p) => Math.abs(p.x) <= expansionBalance.radius && Math.abs(p.y) <= expansionBalance.radius,
      ),
    ).toBe(true);
  }
  expect(expanded).toBeGreaterThan(5);
  const restored = restoreState(JSON.stringify(state));
  expect(pathExtensions(restored)).toEqual(pathExtensions(state));
  expect(pathFor(restoreState(JSON.stringify(fresh())))).toEqual(road);
  expect(onRoad({ x: 0, y: -2 }, state)).toBe(true);
});

test('new expanding matches keep the original starting island and road', () => {
  expect(fresh(true).tiles).toEqual(fresh().tiles);
  expect(fresh(true).path).toEqual([...road]);
  for (const option of pathExtensions(fresh(true))) {
    expect(fresh().tiles.some((p) => sameCell(p, option.entrance))).toBe(false);
  }
});

test('enemies do not leak at the old route length after expansion', () => {
  const base = drafted(),
    option = pathExtensions(base)[0];
  const state = command(base, { type: 'expand', kind: 'meadow', ...option.entrance });
  state.enemies.push({
    id: 1,
    kind: 'turtle',
    progress: road.length - 1,
    health: 50,
    maxHealth: 50,
    cooldown: 0,
  });
  const lives = state.lives;
  step(state, true, false);
  expect(state.lives).toBe(lives);
  expect(state.enemies).toHaveLength(1);
  state.enemies[0].progress = state.path!.length - 1;
  step(state, true, false);
  expect(state.lives).toBeLessThan(lives);
  expect(state.enemies).toHaveLength(0);
});
