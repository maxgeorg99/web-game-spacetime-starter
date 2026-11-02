import { matchOutcome } from '../shared/game/outcome';
import { launch, advanceProjectiles } from '../shared/game/projectiles';
import { position } from '../shared/game/rules';
import { damageMatrix } from '../shared/config/damage';
import { bevyUnits, recruitableUnits } from '../shared/config/bevy-units';
import { expect, test } from 'bun:test';
import { freshWorld, joinWorld, worldCommand, stepWorld } from '../shared/game/world';
import { stepComs, chooseComAction } from '../shared/game/com';
import { fresh } from '../shared/game/rules';
import { towers } from '../shared/config';
import { comCaptains } from '../shared/config/com';

function soloWithCom() {
  return worldCommand(joinWorld(freshWorld(), 'alice'), 'alice', 0, { type: 'add-com' });
}

test('only the host manages COM seats in the lobby and removal frees a human seat', () => {
  let world = joinWorld(soloWithCom(), 'bob');
  expect(world.seats[1].com).toBeDefined();
  expect(world.seats[1].state).toEqual(fresh(true));
  expect(world.seats[2].owner).toBe('bob');
  expect(() => worldCommand(world, 'bob', 0, { type: 'add-com' })).toThrow('host');
  expect(() => worldCommand(world, 'bob', 0, { type: 'remove-com', target: 1 })).toThrow('host');
  expect(() => worldCommand(world, 'alice', 0, { type: 'add-com' })).toThrow('changed');
  expect(() => worldCommand(world, 'alice', 1, { type: 'remove-com', target: 2 })).toThrow(
    'COM player',
  );
  world = worldCommand(world, 'alice', 1, { type: 'add-com' });
  expect(() => worldCommand(world, 'alice', 2, { type: 'add-com' })).toThrow('occupied');
  world = worldCommand(world, 'alice', 2, { type: 'remove-com', target: 1 });
  world = joinWorld(world, 'carol');
  expect(world.seats[1].owner).toBe('carol');
  expect(world.seats[1].com).toBeUndefined();
  world = worldCommand(world, 'alice', 3, { type: 'begin' });
  expect(() => worldCommand(world, 'alice', 4, { type: 'remove-com', target: 3 })).toThrow('lobby');
  expect(() => worldCommand(world, 'alice', 4, { type: 'add-com' })).toThrow('lobby');
});

test('solo COMs draft, pay for towers and upgrades, and send paid expeditions on the server clock', () => {
  let world = soloWithCom();
  const lobby = JSON.stringify(world);
  expect(stepComs(world)).toBe(false);
  expect(JSON.stringify(world)).toBe(lobby);
  world = worldCommand(world, 'alice', 1, { type: 'begin' });
  for (let tick = 0; tick < 20; tick++) {
    stepComs(world);
  }
  expect(world.seats[1].state.expansions).toBe(1);
  expect(world.seats[1].state.phase).toBe('prepare');
  expect(world.seats[0].state.expansions).toBe(0);
  let spentMeat = 0;
  let raids = 0;
  for (let tick = 0; tick < 180; tick++) {
    const nextFlight = world.nextFlight;
    stepComs(world);
    for (const flight of world.flights.filter((flight) => flight.id >= nextFlight)) {
      const unit = recruitableUnits.find((unit) => unit.id === flight.unit)!;
      spentMeat += unit.meatCost * flight.count;
      raids++;
      expect(flight.to).toBe(0);
    }
    stepWorld(world);
  }
  const com = world.seats[1];
  expect(com.state.towers.length).toBeGreaterThanOrEqual(2);
  expect(
    com.state.towers.some((tower) => Object.values(tower.ranks).some((rank) => rank > 0)),
  ).toBe(true);
  expect(com.state.gold).toBe(
    fresh().gold - com.state.towers.reduce((sum, tower) => sum + tower.spent, 0),
  );
  expect(raids).toBeGreaterThan(0);
  expect(com.state.meat).toBe(fresh().meat - spentMeat);
  expect(world.seats[0].sequence).toBe(2);
});

test('COM cadence survives serialization and stops for defeated captains and finished matches', () => {
  const world = worldCommand(soloWithCom(), 'alice', 1, { type: 'begin' });
  stepComs(world);
  const restored = JSON.parse(JSON.stringify(world));
  for (let tick = 0; tick < 150; tick++) {
    stepComs(world);
    stepWorld(world);
    stepComs(restored);
    stepWorld(restored);
  }
  expect(restored).toEqual(world);
  world.seats[1].state.phase = 'lost';
  const eliminated = JSON.stringify(world.seats[1]);
  expect(stepComs(world)).toBe(false);
  expect(JSON.stringify(world.seats[1])).toBe(eliminated);
  stepWorld(world);
  expect(world.round?.phase).toBe('finished');
  expect(stepComs(world)).toBe(false);
});

test('COM policy respects resources, traffic limits, and targets other COMs in free-for-all', () => {
  let world = worldCommand(soloWithCom(), 'alice', 1, { type: 'add-com' });
  world = worldCommand(world, 'alice', 2, { type: 'begin' });
  world.round = { phase: 'combat', remaining: 0 };
  const com = world.seats[1];
  com.state.phase = 'combat';
  com.com!.raidIn = 0;
  world.seats[0].state.phase = 'lost';
  const raid = chooseComAction(world, com);
  expect(raid?.type).toBe('send');
  if (raid?.type !== 'send') {
    throw Error('Expected a raid');
  }
  expect(raid.target).toBe(2);
  world.seats[2].state.phase = 'lost';
  world.seats[0].state.phase = 'combat';
  const fallback = chooseComAction(world, com);
  expect(fallback?.type === 'send' && fallback.target).toBe(0);
  com.state.meat = 0;
  expect(chooseComAction(world, com)).toBeUndefined();
  com.state.meat = 100;
  world.flights = Array.from({ length: 3 }, (_, id) => ({
    id,
    from: 1,
    to: 0,
    unit: 'warrior',
    remaining: 1,
    count: 1,
    elapsed: 0,
    nextSpawn: 0,
  }));
  expect(chooseComAction(world, com)).toBeUndefined();
  world.flights = [
    { id: 1, from: 2, to: 0, unit: 'warrior', remaining: 48, count: 48, elapsed: 0, nextSpawn: 0 },
  ];
  expect(chooseComAction(world, com)).toBeUndefined();
  world.round.phase = 'prepare';
  com.state.phase = 'prepare';
  com.state.gold = Math.min(...towers.map((tower) => tower.cost)) - 1;
  expect(chooseComAction(world, com)).toBeUndefined();
});

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
  world.seats.forEach((s, i) => expect(s.state.tiles.length).toBe(lengths[i] + 9));
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

test('captain selection validates unique identities and persists names and world-specific seeds', () => {
  let world = joinWorld(freshWorld(1234), 'alice');
  world = worldCommand(world, 'alice', 0, { type: 'add-com', kind: 'mara' });
  expect(world.seats[1].name).toBe('Mara Stoneguard');
  expect(world.seats[1].com?.captain).toBe('mara');
  expect(() => worldCommand(world, 'alice', 1, { type: 'add-com', kind: 'mara' })).toThrow(
    'available',
  );
  expect(() => worldCommand(world, 'alice', 1, { type: 'add-com', kind: 'unknown' })).toThrow(
    'available',
  );
  const another = worldCommand(joinWorld(freshWorld(9876), 'alice'), 'alice', 0, {
    type: 'add-com',
    kind: 'mara',
  });
  expect(another.seats[1].com?.seed).not.toBe(world.seats[1].com?.seed);
  const oldSeed = world.seats[1].com?.seed;
  world = worldCommand(world, 'alice', 1, { type: 'remove-com', target: 1 });
  world = worldCommand(world, 'alice', 2, { type: 'add-com', kind: 'mara' });
  expect(world.seats[1].com?.seed).not.toBe(oldSeed);
});

test('personalities prefer different openings and saved seeds vary legal placements', () => {
  const openings = new Set<string>();
  for (const captain of comCaptains) {
    const placements = new Set<string>();
    for (let seed = 1; seed <= 32; seed++) {
      const world = worldCommand(joinWorld(freshWorld(seed), 'alice'), 'alice', 0, {
        type: 'add-com',
        kind: captain.id,
      });
      world.round = { phase: 'prepare', remaining: 20 };
      const seat = world.seats[1];
      const action = chooseComAction(world, seat);
      expect(action?.type).toBe('build');
      if (action?.type !== 'build') {
        throw Error('Expected an opening tower');
      }
      openings.add(action.kind);
      placements.add(JSON.stringify(action));
      const before = JSON.stringify(world);
      expect(chooseComAction(world, seat)).toEqual(action);
      expect(JSON.stringify(world)).toBe(before);
      expect(() => worldCommand(world, seat.owner!, seat.sequence, action)).not.toThrow();
    }
    expect(placements.size).toBeGreaterThan(1);
  }
  expect(openings.size).toBe(3);
});

test('old COM saves gain a named captain without losing their island or resetting timers', () => {
  const world = soloWithCom();
  const seat = world.seats[1];
  seat.com = { decisionIn: 0.4, raidIn: 8 };
  seat.name = 'COM 2';
  seat.state.gold = 73;
  expect(stepComs(world)).toBe(true);
  expect(seat.name).toBe('Rook Emberwake');
  expect(seat.com.captain).toBe('rook');
  expect(seat.com.raidIn).toBe(8);
  expect(seat.state.gold).toBe(73);
  expect(stepComs(world)).toBe(false);
});

test('typed splash damage evaluates each defense once and legacy shots retain flat damage', () => {
  const state = fresh();
  state.enemies = ['turtle', 'archer', 'monk'].map((kind, index) => ({
    id: index + 1,
    kind: kind as 'turtle' | 'archer' | 'monk',
    progress: 0,
    health: 100,
    maxHealth: 100,
    cooldown: 0,
  }));
  const start = position(0, state);
  launch(
    state,
    start,
    state.enemies[0],
    { art: 'rock', speed: 4 },
    20,
    1,
    true,
    0,
    undefined,
    'blunt',
  );
  advanceProjectiles(state, 0.1);
  expect(state.enemies.map((unit) => unit.health)).toEqual([75, 83, 78]);
  launch(state, start, state.enemies[0], { art: 'arrow', speed: 7 }, 20, 0, true, 0);
  advanceProjectiles(state, 0.1);
  expect(state.enemies[0].health).toBe(55);
});

test('reference damage matrix and all imported unit types are valid', () => {
  expect(damageMatrix).toEqual({
    blunt: { armor: 1.25, agility: 0.85, mystical: 1.1 },
    pierce: { armor: 0.8, agility: 1.25, mystical: 0.9 },
    divine: { armor: 1, agility: 0.9, mystical: 1.3 },
    magic: { armor: 0.85, agility: 1.1, mystical: 1.25 },
  });
  for (const unit of bevyUnits) {
    expect(damageMatrix[unit.attackType][unit.defenseType]).toBeGreaterThan(0);
  }
});

test('match results distinguish elimination, victory and spectators', () => {
  const world = joinWorld(soloWithCom(), 'bob');
  world.round = { phase: 'combat', remaining: 0 };
  expect(matchOutcome(world, 0)).toBeUndefined();
  expect(matchOutcome(world, null)).toBeUndefined();
  world.seats[0].state.phase = 'lost';
  stepWorld(world);
  expect(matchOutcome(world, 0)).toBe('defeat');
  expect(world.round.phase).not.toBe('finished');
  world.seats[1].state.phase = 'lost';
  stepWorld(world);
  expect(world.round.phase).toBe('finished');
  expect(matchOutcome(world, 2)).toBe('victory');
  expect(matchOutcome(world, 3)).toBeUndefined();
});

test('the last human defeat stops multiple surviving COMs and freezes the result', () => {
  const world = worldCommand(soloWithCom(), 'alice', 1, { type: 'add-com' });
  world.round = { phase: 'combat', remaining: 0 };
  world.seats[0].state.phase = 'lost';
  expect(stepWorld(world)).toBe(true);
  expect(world.round.phase).toBe('finished');
  expect(matchOutcome(world, 0)).toBe('defeat');
  const result = JSON.stringify(world);
  expect(stepWorld(world)).toBe(false);
  expect(stepComs(world)).toBe(false);
  expect(JSON.stringify(world)).toBe(result);
});
