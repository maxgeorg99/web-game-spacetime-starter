import { Identity } from 'spacetimedb';
import type { RunReport } from '../../shared/game/statistics';
import { resultRetentionSeconds } from '../../shared/config/lifecycle';
import { schema, table, t, SenderError } from 'spacetimedb/server';
import { cleanName } from '../../shared/game/names';

const administrator = table(
  { name: 'administrator' },
  { id: t.u32().primaryKey(), owner: t.identity() },
);
const captain = table(
  { name: 'captain', public: true },
  {
    owner: t.identity().primaryKey(),
    name: t.string(),
  },
);
const session = table(
  { name: 'session', public: true },
  {
    id: t.u32().primaryKey().autoInc(),
    name: t.string(),
    creator: t.identity(),
    database: t.string(),
    uri: t.string(),
    status: t.string(),
    message: t.string(),
    version: t.u32(),
    createdAt: t.timestamp(),
    lastActivity: t.timestamp(),
  },
);
const membership = table(
  { name: 'membership', public: true },
  {
    key: t.string().primaryKey(),
    sessionId: t.u32(),
    owner: t.identity(),
    lastSeen: t.timestamp(),
  },
);
const slots = table(
  { name: 'slots', public: true },
  {
    sessionId: t.u32().primaryKey(),
    claimed: t.u32(),
    capacity: t.u32(),
    updatedAt: t.timestamp(),
  },
);
// Private, durable leases survive overlapping serverless invocations.
const provisionLease = table(
  { name: 'provision_lease' },
  { sessionId: t.u32().primaryKey(), attempt: t.string(), expiresAt: t.u64() },
);
// Only the publisher binds a database identity to a session. IDC carries that identity as sender.
const worldReporter = table(
  { name: 'world_reporter' },
  { sessionId: t.u32().primaryKey(), identity: t.identity().unique() },
);
// Private reports outlive world/session cleanup; each captain subscribes to their own view.
const runReport = table(
  {
    name: 'run_report',
    indexes: [{ accessor: 'by_owner', algorithm: 'btree', columns: ['owner'] }],
  },
  {
    key: t.string().primaryKey(),
    owner: t.identity(),
    sessionName: t.string(),
    finishedAt: t.timestamp(),
    report: t.string(),
  },
);
const db = schema({
  runReport,
  administrator,
  captain,
  session,
  membership,
  slots,
  provisionLease,
  worldReporter,
});
export default db;
export const init = db.init((ctx) => {
  ctx.db.administrator.insert({ id: 1, owner: ctx.sender });
});
export const set_name = db.reducer({ name: t.string() }, (ctx, args) => {
  let name: string;
  try {
    name = cleanName(args.name);
  } catch (error) {
    throw new SenderError(String(error));
  }
  const row = { owner: ctx.sender, name };
  if (ctx.db.captain.owner.find(ctx.sender)) {
    ctx.db.captain.owner.update(row);
  } else {
    ctx.db.captain.insert(row);
  }
});
export const create_session = db.reducer({ name: t.string() }, (ctx, args) => {
  if (!ctx.db.captain.owner.find(ctx.sender)) {
    throw new SenderError('Choose your captain name first.');
  }
  if ([...ctx.db.session.iter()].filter((row) => row.status !== 'finished').length >= 32) {
    throw new SenderError('Session capacity reached.');
  }
  const owned = [...ctx.db.session.iter()].filter(
    (row) => row.creator.isEqual(ctx.sender) && row.status !== 'finished',
  );
  if (owned.length >= 4) {
    throw new SenderError('You can create up to four persistent sessions.');
  }
  let name: string;
  try {
    name = cleanName(args.name, 'Session name', 40);
  } catch (error) {
    throw new SenderError(String(error));
  }
  const row = ctx.db.session.insert({
    id: 0,
    name,
    creator: ctx.sender,
    database: '',
    uri: '',
    status: 'pending',
    message: '',
    version: 1,
    createdAt: ctx.timestamp,
    lastActivity: ctx.timestamp,
  });
  ctx.db.session.id.update({
    ...row,
    database: `tile-td-${ctx.identity.toHexString().slice(0, 12)}-${row.id}`,
  });
});
export const visit_session = db.reducer({ id: t.u32() }, (ctx, args) => {
  const row = ctx.db.session.id.find(args.id);
  if (!row || row.status !== 'ready' || !ctx.db.captain.owner.find(ctx.sender)) {
    throw new SenderError('Choose a captain name and a ready session.');
  }
  const key = `${row.id}:${ctx.sender.toHexString()}`;
  const member = { key, sessionId: row.id, owner: ctx.sender, lastSeen: ctx.timestamp };
  if (ctx.db.membership.key.find(key)) {
    ctx.db.membership.key.update(member);
  } else {
    ctx.db.membership.insert(member);
  }
  ctx.db.session.id.update({ ...row, lastActivity: ctx.timestamp });
});
export const retry_session = db.reducer({ id: t.u32() }, (ctx, args) => {
  const row = ctx.db.session.id.find(args.id);
  if (!row || !row.creator.isEqual(ctx.sender) || row.status !== 'failed') {
    throw new SenderError('Only the creator can retry a failed session.');
  }
  ctx.db.session.id.update({ ...row, status: 'pending', message: '' });
});
// Only the trusted publisher identity may register or complete provisioning.
export const register_world = db.reducer(
  { name: t.string(), database: t.string(), uri: t.string() },
  (ctx, args) => {
    if (!ctx.db.administrator.id.find(1)?.owner.isEqual(ctx.sender)) {
      throw new SenderError('Administrator only.');
    }
    if ([...ctx.db.session.iter()].some((row) => row.database === args.database)) {
      return;
    }
    ctx.db.session.insert({
      id: 0,
      ...args,
      creator: ctx.sender,
      status: 'ready',
      message: '',
      version: 1,
      createdAt: ctx.timestamp,
      lastActivity: ctx.timestamp,
    });
  },
);
export const provision_result = db.reducer(
  { id: t.u32(), ready: t.bool(), uri: t.string() },
  (ctx, args) => {
    if (!ctx.db.administrator.id.find(1)?.owner.isEqual(ctx.sender)) {
      throw new SenderError('Administrator only.');
    }
    const row = ctx.db.session.id.find(args.id);
    if (!row || row.status !== 'pending') {
      return;
    }
    ctx.db.session.id.update({
      ...row,
      status: args.ready ? 'ready' : 'failed',
      uri: args.uri,
      message: args.ready ? '' : 'World creation failed. You can retry.',
      lastActivity: ctx.timestamp,
    });
  },
);

export const register_world_reporter = db.reducer(
  { sessionId: t.u32(), identity: t.identity() },
  (ctx, args) => {
    if (!ctx.db.administrator.id.find(1)?.owner.isEqual(ctx.sender)) {
      throw new SenderError('Administrator only.');
    }
    if (!ctx.db.session.id.find(args.sessionId)) {
      throw new SenderError('Unknown session.');
    }
    const existing = ctx.db.worldReporter.sessionId.find(args.sessionId);
    if (existing) {
      if (!existing.identity.isEqual(args.identity)) {
        throw new SenderError('World reporter identity cannot be replaced.');
      }
      return;
    }
    ctx.db.worldReporter.insert(args);
  },
);

export const receive_world_slots = db.reducer(
  { claimed: t.u32(), capacity: t.u32() },
  (ctx, args) => {
    const reporter = ctx.db.worldReporter.identity.find(ctx.sender);
    if (!reporter || !ctx.db.session.id.find(reporter.sessionId)) {
      throw new SenderError('Registered world only.');
    }
    const session = ctx.db.session.id.find(reporter.sessionId)!;
    if (args.capacity === 0 && args.claimed === 0) {
      if (session.status === 'ready') {
        ctx.db.session.id.update({ ...session, status: 'finished', lastActivity: ctx.timestamp });
        ctx.db.slots.sessionId.delete(session.id);
      }
      return;
    }
    if (session.status === 'finished') {
      return;
    }
    if (args.capacity < 2 || args.capacity > 4 || args.claimed > args.capacity) {
      throw new SenderError('Invalid world capacity.');
    }
    const row = { ...args, sessionId: reporter.sessionId, updatedAt: ctx.timestamp };
    if (ctx.db.slots.sessionId.find(row.sessionId)) {
      ctx.db.slots.sessionId.update(row);
    } else {
      ctx.db.slots.insert(row);
    }
  },
);

// Validate the caller through SpacetimeDB; the HTTP endpoint never trusts decoded JWT claims.
export const authorize_provision = db.reducer({ id: t.u32() }, (ctx, { id }) => {
  const row = ctx.db.session.id.find(id);
  if (!row || !row.creator.isEqual(ctx.sender)) {
    throw new SenderError('Only the creator may provision this world.');
  }
});
export const claim_provision = db.reducer(
  { id: t.u32(), attempt: t.string() },
  (ctx, { id, attempt }) => {
    if (!ctx.db.administrator.id.find(1)?.owner.isEqual(ctx.sender)) {
      throw new SenderError('Administrator only.');
    }
    const row = ctx.db.session.id.find(id);
    if (!row || row.status !== 'pending' || attempt.length !== 36) {
      throw new SenderError('World is not pending.');
    }
    const lease = ctx.db.provisionLease.sessionId.find(id);
    if (lease && lease.expiresAt > ctx.timestamp.microsSinceUnixEpoch) {
      throw new SenderError('World creation is already running.');
    }
    // Longer than Vercel's five-minute function limit and the outbound publish timeout.
    const next = {
      sessionId: id,
      attempt,
      expiresAt: ctx.timestamp.microsSinceUnixEpoch + 600_000_000n,
    };
    if (lease) {
      ctx.db.provisionLease.sessionId.update(next);
    } else {
      ctx.db.provisionLease.insert(next);
    }
  },
);
export const complete_provision = db.reducer(
  { id: t.u32(), attempt: t.string(), uri: t.string() },
  (ctx, { id, attempt, uri }) => {
    if (!ctx.db.administrator.id.find(1)?.owner.isEqual(ctx.sender)) {
      throw new SenderError('Administrator only.');
    }
    const row = ctx.db.session.id.find(id);
    const lease = ctx.db.provisionLease.sessionId.find(id);
    if (!row || row.status !== 'pending' || lease?.attempt !== attempt) {
      throw new SenderError('Provisioning lease changed.');
    }
    ctx.db.session.id.update({
      ...row,
      status: 'ready',
      uri,
      message: '',
      lastActivity: ctx.timestamp,
    });
    ctx.db.provisionLease.sessionId.delete(id);
  },
);

/** Remove one test session from the directory; database deletion is an operator action. */
export const remove_session = db.reducer({ id: t.u32() }, (ctx, { id }) => {
  if (!ctx.db.administrator.id.find(1)?.owner.isEqual(ctx.sender)) {
    throw new SenderError('Administrator only.');
  }
  const row = ctx.db.session.id.find(id);
  if (!row) {
    return;
  }
  if (row.status === 'pending') {
    throw new SenderError('Wait for provisioning to finish before removing this session.');
  }
  for (const member of [...ctx.db.membership.iter()]) {
    if (member.sessionId === id) {
      ctx.db.membership.key.delete(member.key);
    }
  }
  ctx.db.slots.sessionId.delete(id);
  ctx.db.provisionLease.sessionId.delete(id);
  ctx.db.worldReporter.sessionId.delete(id);
  ctx.db.session.id.delete(id);
});

/** Any named captain may trigger idempotent cleanup, but only after the world's terminal report. */
export const authorize_cleanup = db.reducer({ id: t.u32() }, (ctx, { id }) => {
  const row = ctx.db.session.id.find(id);
  if (
    !ctx.db.captain.owner.find(ctx.sender) ||
    !row ||
    row.status !== 'finished' ||
    ctx.timestamp.microsSinceUnixEpoch - row.lastActivity.microsSinceUnixEpoch <
      BigInt(resultRetentionSeconds) * 1_000_000n
  ) {
    throw new SenderError('Finished world is not ready for cleanup.');
  }
});

export const my_run_reports = db.view(
  { name: 'my_run_reports', public: true },
  t.array(runReport.rowType),
  (ctx) => [...ctx.db.runReport.by_owner.filter(ctx.sender)],
);

/** Only a publisher-registered world may submit immutable final results. */
export const receive_run_reports = db.reducer({ reports: t.string() }, (ctx, { reports }) => {
  const reporter = ctx.db.worldReporter.identity.find(ctx.sender);
  const session = reporter && ctx.db.session.id.find(reporter.sessionId);
  if (!session) {
    throw new SenderError('Registered world only.');
  }
  if (reports.length > 100_000) {
    throw new SenderError('Report too large.');
  }
  const rows = JSON.parse(reports) as RunReport[];
  if (
    !Array.isArray(rows) ||
    rows.length > 4 ||
    rows.some(
      (row) =>
        row.version !== 1 ||
        !/^[a-f0-9]{64}$/i.test(row.owner) ||
        !['victory', 'defeat', 'draw'].includes(row.outcome) ||
        row.statistics?.version !== 1,
    )
  ) {
    throw new SenderError('Invalid run report.');
  }
  for (const report of rows) {
    const key = `${ctx.sender.toHexString()}:${report.owner}`;
    if (ctx.db.runReport.key.find(key)) {
      continue;
    }
    const owner = Identity.fromString(report.owner);
    ctx.db.runReport.insert({
      key,
      owner,
      sessionName: session.name,
      finishedAt: ctx.timestamp,
      report: JSON.stringify(report),
    });
    const history = [...ctx.db.runReport.by_owner.filter(owner)].sort((a, b) =>
      a.finishedAt.microsSinceUnixEpoch < b.finishedAt.microsSinceUnixEpoch
        ? -1
        : a.finishedAt.microsSinceUnixEpoch > b.finishedAt.microsSinceUnixEpoch
          ? 1
          : a.key.localeCompare(b.key),
    );
    for (const old of history.slice(0, Math.max(0, history.length - 50))) {
      ctx.db.runReport.key.delete(old.key);
    }
  }
});
