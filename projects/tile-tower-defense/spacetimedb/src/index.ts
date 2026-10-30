import { cleanName } from '../../shared/game/names';
import {
  freshWorld,
  joinWorld,
  worldCommand,
  stepWorld,
  type WorldState,
  type WorldAction,
} from '../../shared/game/world';
import { restoreState } from '../../shared/game/save';
import { schema, table, t, SenderError } from 'spacetimedb/server';
import { ScheduleAt } from 'spacetimedb';
import { balance, validateCatalog } from '../../shared/config';
import { fresh, command } from '../../shared/game/rules';
import { step } from '../../shared/game/combat';
import type { State } from '../../shared/game/model';
import coordinator from './remote_bindings/coordinator';

// M1: bounded single-island aggregate. Split tables when multiplayer/replication requires it.
const island = table(
  { name: 'island', public: true },
  {
    owner: t.identity().primaryKey(),
    state: t.string(),
    sequence: t.u32(),
    updated: t.timestamp(),
  },
);
const clock = table(
  { name: 'clock' },
  { scheduledId: t.u64().primaryKey().autoInc(), scheduledAt: t.scheduleAt() },
);
const world = table(
  { name: 'world', public: true },
  {
    id: t.u32().primaryKey(),
    state: t.string(),
    revision: t.u32(),
    updated: t.timestamp(),
  },
);
const reportingAdministrator = table(
  { name: 'reporting_administrator' },
  { id: t.u32().primaryKey(), owner: t.identity() },
);
const reporting = table(
  { name: 'reporting' },
  {
    id: t.u32().primaryKey(),
    target: coordinator.identity(),
    lastClaimed: t.u32(),
    nextReportAt: t.u64(),
    pending: t.bool(),
    lastError: t.string(),
  },
);
const slotOutbox = coordinator.outbox.receiveWorldSlots({ name: 'slot_outbox' });
const db = schema({
  island,
  clock,
  world,
  reportingAdministrator,
  reporting,
  slotOutbox,
});
export default db;
export const init = db.init((ctx) => {
  validateCatalog();
  ctx.db.reportingAdministrator.insert({ id: 1, owner: ctx.sender });
  ctx.db.clock.insert({
    scheduledId: 0n,
    scheduledAt: ScheduleAt.interval(BigInt(balance.tickSeconds * 1_000_000)),
  });
});

// Only the publisher recorded by init can configure the reporting target.
export const configure_reporting = db.reducer(
  { target: coordinator.identity() },
  (ctx, { target }) => {
    if (!ctx.db.reportingAdministrator.id.find(1)?.owner.isEqual(ctx.sender)) {
      throw new SenderError('Reporting publisher only.');
    }
    const existing = ctx.db.reporting.id.find(1);
    if (existing) {
      if (!existing.target.isEqual(target)) {
        throw new SenderError('Reporting target cannot be replaced while messages may be pending.');
      }
      return;
    }
    ctx.db.reporting.insert({
      id: 1,
      target,
      lastClaimed: 5,
      nextReportAt: 0n,
      pending: false,
      lastError: '',
    });
  },
);

export const on_slot_report = db.reducer(
  { onResult: slotOutbox },
  { row: slotOutbox.rowType, result: t.result(t.unit(), t.string()) },
  (ctx, { row, result }) => {
    const config = ctx.db.reporting.id.find(1);
    if (!config || !config.target.isEqual(row.target)) {
      return;
    }
    ctx.db.reporting.id.update({
      ...config,
      pending: false,
      // A failed result is final. The scheduled tick sends a fresh snapshot after backoff.
      lastClaimed: 'err' in result ? 5 : row.claimed,
      nextReportAt: ctx.timestamp.microsSinceUnixEpoch + 30_000_000n,
      lastError: 'err' in result ? result.err.slice(0, 500) || 'Slot report failed.' : '',
    });
  },
);
export const join = db.reducer((ctx) => {
  if (ctx.db.island.owner.find(ctx.sender)) {
    return;
  }
  if (ctx.db.island.count() >= 64n) {
    throw new SenderError('Island capacity reached.');
  }
  ctx.db.island.insert({
    owner: ctx.sender,
    state: JSON.stringify(fresh()),
    sequence: 0,
    updated: ctx.timestamp,
  });
});
export const act = db.reducer(
  {
    sequence: t.u32(),
    action: t.string(),
    kind: t.string(),
    x: t.i32(),
    y: t.i32(),
    tower: t.u32(),
    node: t.string(),
  },
  (ctx, args) => {
    const row = ctx.db.island.owner.find(ctx.sender);
    if (!row) {
      throw new SenderError('Join your island first.');
    }
    if (row.sequence !== args.sequence) {
      throw new SenderError('Another command changed your island. Try again.');
    }
    try {
      const current: State = restoreState(row.state);
      let next: State;
      switch (args.action) {
        case 'build':
          next = command(current, { type: 'build', kind: args.kind, x: args.x, y: args.y });
          break;
        case 'expand':
          next = command(current, { type: 'expand', kind: args.kind, x: args.x, y: args.y });
          break;
        case 'recruit':
          next = command(current, { type: 'recruit', kind: args.kind });
          break;
        case 'upgrade':
          next = command(current, { type: 'upgrade', tower: args.tower, node: args.node });
          break;
        case 'sell':
          next = command(current, { type: 'sell', tower: args.tower });
          break;
        case 'start':
          next = command(current, { type: 'start' });
          break;
        case 'restart':
          next = command(current, { type: 'restart' });
          break;
        default:
          throw Error('Unknown command.');
      }
      ctx.db.island.owner.update({
        ...row,
        state: JSON.stringify(next),
        sequence: row.sequence + 1,
        updated: ctx.timestamp,
      });
    } catch (error) {
      throw new SenderError(error instanceof Error ? error.message : 'Invalid command.');
    }
  },
);
export const tick = db.reducer({ onSchedule: clock }, { timer: clock.rowType }, (ctx) => {
  if (!ctx.sender.isEqual(ctx.identity)) {
    throw new SenderError('Only the scheduler advances combat.');
  }
  const shared = ctx.db.world.id.find(1);
  const worldState: WorldState | undefined = shared ? JSON.parse(shared.state) : undefined;
  if (shared && worldState && stepWorld(worldState)) {
    ctx.db.world.id.update({
      ...shared,
      state: JSON.stringify(worldState),
      revision: shared.revision + 1,
      updated: ctx.timestamp,
    });
  }
  const claimed = worldState?.seats.filter((seat) => seat.owner).length ?? 0;
  const config = ctx.db.reporting.id.find(1);
  if (
    config &&
    !config.pending &&
    (ctx.timestamp.microsSinceUnixEpoch >= config.nextReportAt ||
      (!config.lastError && config.lastClaimed !== claimed))
  ) {
    ctx.db.slotOutbox.insert({ msgId: 0n, target: config.target, claimed, capacity: 4 });
    ctx.db.reporting.id.update({ ...config, pending: true });
  }
  for (const row of ctx.db.island.iter()) {
    if (worldState?.seats.some((seat) => seat.owner === row.owner.toHexString())) {
      continue;
    }
    const s: State = restoreState(row.state);
    if (s.phase === 'combat') {
      step(s);
      ctx.db.island.owner.update({ ...row, state: JSON.stringify(s), updated: ctx.timestamp });
    } else if (
      ctx.timestamp.microsSinceUnixEpoch - row.updated.microsSinceUnixEpoch >
      86_400_000_000n
    ) {
      ctx.db.island.owner.delete(row.owner);
    }
  }
});

// The world is created lazily so publishing over an existing solo database needs no destructive reset.
export const world_join = db.reducer((ctx) => {
  const row = ctx.db.world.id.find(1);
  const current: WorldState = row ? JSON.parse(row.state) : freshWorld();
  const previous = ctx.db.island.owner.find(ctx.sender);
  const next = joinWorld(
    current,
    ctx.sender.toHexString(),
    previous ? restoreState(previous.state) : undefined,
  );
  if (row && next === current) {
    return;
  }
  const value = {
    id: 1,
    state: JSON.stringify(next),
    revision: (row?.revision ?? 0) + 1,
    updated: ctx.timestamp,
  };
  if (row) {
    ctx.db.world.id.update(value);
  } else {
    ctx.db.world.insert(value);
  }
});
export const world_act = db.reducer(
  {
    sequence: t.u32(),
    action: t.string(),
    kind: t.string(),
    x: t.i32(),
    y: t.i32(),
    tower: t.u32(),
    node: t.string(),
    target: t.u32(),
    count: t.u32(),
  },
  (ctx, args) => {
    const row = ctx.db.world.id.find(1);
    if (!row) {
      throw new SenderError('Join the shared world first.');
    }
    try {
      const action = { ...args, type: args.action } as WorldAction;
      const next = worldCommand(
        JSON.parse(row.state),
        ctx.sender.toHexString(),
        args.sequence,
        action,
      );
      ctx.db.world.id.update({
        ...row,
        state: JSON.stringify(next),
        revision: row.revision + 1,
        updated: ctx.timestamp,
      });
    } catch (error) {
      throw new SenderError(error instanceof Error ? error.message : 'Invalid world order.');
    }
  },
);

export const world_enter = db.reducer({ name: t.string() }, (ctx, args) => {
  let name: string;
  try {
    name = cleanName(args.name);
  } catch (error) {
    throw new SenderError(String(error));
  }
  const row = ctx.db.world.id.find(1);
  const current: WorldState = row ? JSON.parse(row.state) : freshWorld();
  const previous = ctx.db.island.owner.find(ctx.sender);
  const next = joinWorld(
    current,
    ctx.sender.toHexString(),
    previous ? restoreState(previous.state) : undefined,
    name,
  );
  if (row && next === current) {
    return;
  }
  const value = {
    id: 1,
    state: JSON.stringify(next),
    revision: (row?.revision ?? 0) + 1,
    updated: ctx.timestamp,
  };
  if (row) {
    ctx.db.world.id.update(value);
  } else {
    ctx.db.world.insert(value);
  }
});
