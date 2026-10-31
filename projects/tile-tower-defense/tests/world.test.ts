import { bevyUnits, recruitableUnits } from '../shared/config/bevy-units';
import { expect, test } from 'bun:test';
import { freshWorld, joinWorld, worldCommand, stepWorld } from '../shared/game/world';

function twoCaptains() {
  const world = freshWorld();
  delete world.round; // Existing independent-world save compatibility.
  return joinWorld(joinWorld(world, 'alice'), 'bob');
}

test('multiplayer placeholder tower fields do not turn other orders into tower commands', () => {
  const payload = { tower: 0, node: '', target: 0, count: 0, x: 0, y: -1, kind: '' };
  let world = twoCaptains();
  world = worldCommand(world, 'alice', 0, {
    ...payload,
    type: 'build',
    kind: 'watchtower',
  });
  expect(world.seats[0].state.towers).toHaveLength(1);
  expect(() =>
    worldCommand(world, 'alice', 1, { ...payload, type: 'recruit', kind: 'warrior' }),
  ).toThrow('Choose an opponent');
  world = worldCommand(world, 'alice', 1, { ...payload, type: 'start' });
  expect(world.seats[0].state.phase).toBe('combat');
  expect(() => worldCommand(world, 'bob', 0, { type: 'sell', tower: 999 })).toThrow(
    'Tower not found.',
  );
});

test('four permanent seats, idempotent reconnect, then spectators', () => {
  let world = freshWorld();
  for (const owner of ['alice', 'bob', 'carol', 'dave']) {
    world = joinWorld(world, owner);
  }
  expect(joinWorld(world, 'alice')).toBe(world);
  expect(joinWorld(world, 'eve')).toBe(world);
  expect(world.seats.filter((seat) => seat.owner)).toHaveLength(4);
  expect(() => worldCommand(world, 'eve', 0, { type: 'start' })).toThrow('full');
});
test('sending is paid once and rejects self targets and invalid passengers', () => {
  const world = twoCaptains();
  expect(() =>
    worldCommand(world, 'alice', 0, { type: 'send', target: 0, kind: 'warrior', count: 1 }),
  ).toThrow();
  expect(() =>
    worldCommand(world, 'alice', 0, { type: 'send', target: 1, kind: 'warrior', count: 0 }),
  ).toThrow();
  const next = worldCommand(world, 'alice', 0, {
    type: 'send',
    target: 1,
    kind: 'warrior',
    count: 2,
  });
  expect(next.seats[0].state.meat).toBe(6);
  expect(world.seats[0].state.meat).toBe(16);
  expect(next.seats[1].sequence).toBe(0);
  expect(() =>
    worldCommand(next, 'alice', 0, { type: 'send', target: 1, kind: 'warrior', count: 1 }),
  ).toThrow('changed');
});
test('airships arrive at the entrance and raids damage keeps outside neutral waves', () => {
  const world = worldCommand(twoCaptains(), 'alice', 0, {
    type: 'send',
    target: 1,
    kind: 'warrior',
    count: 2,
  });
  for (let tick = 0; tick < 70; tick++) {
    stepWorld(world);
  }
  expect(world.seats[1].state.enemies).toHaveLength(0);
  for (let tick = 0; tick < 15; tick++) {
    stepWorld(world);
  }
  expect(world.seats[1].state.enemies.length).toBeGreaterThan(0);
  expect(world.seats[1].state.enemies[0].progress).toBeLessThan(1);
  expect(world.seats[1].state.phase).toBe('prepare');
  for (let tick = 0; tick < 250; tick++) {
    stepWorld(world);
  }
  expect(world.seats[1].state.lives).toBe(18);
  expect(world.seats[1].state.wave).toBe(0);
  expect(world.flights).toHaveLength(0);
});
test('between-wave defense cannot award neutral wave income', () => {
  let world = twoCaptains();
  world = worldCommand(world, 'bob', 0, { type: 'build', kind: 'watchtower', x: 0, y: -1 });
  world = worldCommand(world, 'alice', 0, { type: 'send', target: 1, kind: 'archer', count: 1 });
  for (let tick = 0; tick < 350; tick++) {
    stepWorld(world);
  }
  expect(world.seats[1].state.gold).toBe(138);
  expect(world.seats[1].state.wave).toBe(0);
  expect(world.seats[1].state.phase).toBe('prepare');
});

test('only the eight player soldiers can be purchased and lands with its sender identity', () => {
  expect(bevyUnits).toHaveLength(40);
  expect(recruitableUnits).toHaveLength(8);
  for (const unit of bevyUnits.filter((unit) => !unit.recruitable)) {
    expect(() =>
      worldCommand(twoCaptains(), 'alice', 0, { type: 'send', target: 1, kind: unit.id, count: 1 }),
    ).toThrow('eight recruitable');
  }
  for (const unit of recruitableUnits) {
    const initial = twoCaptains();
    initial.seats[0].state.meat = unit.meatCost;
    const world = worldCommand(initial, 'alice', 0, {
      type: 'send',
      target: 1,
      kind: unit.id,
      count: 1,
    });
    expect(world.seats[0].state.meat).toBe(0);
    expect(world.seats[0].state.recruits).toHaveLength(0);
    for (let tick = 0; tick < 85; tick++) {
      stepWorld(world);
    }
    const arrived = world.seats[1].state.enemies[0];
    expect(arrived.kind).toBe(unit.id);
    expect(arrived.captainSlot).toBe(0);
    expect(arrived.maxHealth).toBe(unit.health);
    expect(arrived.leak).toBe(unit.leak);
  }
});

test('captain names can change without replacing an owned island', () => {
  const world = joinWorld(freshWorld(), 'alice', undefined, 'Sky Captain');
  world.seats[0].state.gold = 77;
  const renamed = joinWorld(world, 'alice', undefined, 'Cloud Captain');
  expect(renamed.seats[0].name).toBe('Cloud Captain');
  expect(renamed.seats[0].state.gold).toBe(77);
  expect(world.seats[0].name).toBe('Sky Captain');
  expect(renamed.seats.filter((seat) => seat.owner)).toHaveLength(1);
});

test('new match waits for host and two players; reconnect survives and late joins spectate', () => {
  let world = joinWorld(freshWorld(), 'alice');
  expect(stepWorld(world)).toBe(false);
  expect(() => worldCommand(world, 'alice', 0, { type: 'begin' })).toThrow('two players');
  world = joinWorld(world, 'bob');
  expect(() => worldCommand(world, 'bob', 0, { type: 'begin' })).toThrow('host');
  expect(() =>
    worldCommand(world, 'alice', 0, { type: 'send', target: 1, kind: 'archer', count: 1 }),
  ).toThrow('not active');
  world = worldCommand(world, 'alice', 0, { type: 'begin' });
  expect(world.round?.phase).toBe('draft');
  expect(joinWorld(world, 'carol')).toBe(world);
  expect(joinWorld(world, 'alice')).toBe(world);
  expect(() => worldCommand(world, 'alice', 1, { type: 'start' })).toThrow('together');
});

test('all four players draft for ten seconds, auto-place, then launch together after twenty seconds', () => {
  let world = freshWorld();
  for (const id of ['a', 'b', 'c', 'd']) {
    world = joinWorld(world, id);
  }
  world = worldCommand(world, 'a', 0, { type: 'begin' });
  const lengths = world.seats.map((s) => s.state.tiles.length);
  for (let tick = 0; tick < 99; tick++) {
    stepWorld(world);
  }
  expect(world.round?.phase).toBe('draft');
  world = JSON.parse(JSON.stringify(world));
  stepWorld(world);
  expect(world.round?.phase).toBe('prepare');
  world.seats.forEach((s, i) => expect(s.state.tiles.length).toBe(lengths[i] + 1));
  for (let tick = 0; tick < 199; tick++) {
    stepWorld(world);
  }
  expect(world.seats.every((s) => s.state.phase === 'prepare')).toBe(true);
  stepWorld(world);
  expect(world.round?.phase).toBe('combat');
  expect(world.seats.every((s) => s.state.phase === 'combat' && s.state.queue.length > 0)).toBe(
    true,
  );
});

test('round waits for the last surviving island and does not restart eliminated islands', () => {
  let world = joinWorld(joinWorld(freshWorld(), 'a'), 'b');
  world = worldCommand(world, 'a', 0, { type: 'begin' });
  world.round = { phase: 'combat', remaining: 0 };
  world.seats[0].state.phase = 'draft';
  world.seats[1].state.phase = 'combat';
  world.seats[1].state.queue = ['turtle'];
  stepWorld(world);
  expect(world.round.phase).toBe('combat');
  world.seats[1].state.phase = 'draft';
  world.seats[1].state.enemies = [];
  world.seats[1].state.queue = [];
  stepWorld(world);
  expect(world.round.phase).toBe('draft');
  world.seats[1].state.phase = 'lost';
  stepWorld(world);
  expect(world.round.phase).toBe('finished');
  expect(() => worldCommand(world, 'b', 0, { type: 'restart' })).toThrow('not active');
});
