import { test, expect } from 'bun:test';
import { DbConnection } from '../src/module_bindings';
import type { State } from '../shared/game/model';
const uri = process.env.TEST_SPACETIME_URI ?? 'ws://127.0.0.1:3105';
const database = process.env.TEST_SPACETIME_DB ?? 'tile-tower-defense-local';
async function connect(token?: string) {
  return new Promise<{ conn: DbConnection; token: string }>((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Connect timeout')), 10000);
    DbConnection.builder()
      .withUri(uri)
      .withDatabaseName(database)
      .withToken(token)
      .onConnect((conn, _id, newToken) => {
        conn
          .subscriptionBuilder()
          .onApplied(() => {
            clearTimeout(timeout);
            resolve({ conn, token: newToken });
          })
          .onError((ctx) => {
            clearTimeout(timeout);
            reject(ctx.event);
          })
          .subscribeToAllTables();
      })
      .onConnectError((_ctx, error) => {
        clearTimeout(timeout);
        reject(error);
      })
      .build();
  });
}
const args = { sequence: 0, action: 'build', kind: 'watchtower', x: 0, y: -1, tower: 0, node: '' };
async function until(check: () => boolean, timeout = 8000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) {
      throw Error('State timeout');
    }
    await Bun.sleep(40);
  }
}
test('server owns commands, isolates identities, rejects replays, and reconnects during combat', async () => {
  const connections: DbConnection[] = [];
  try {
    const a = await connect();
    connections.push(a.conn);
    const b = await connect();
    connections.push(b.conn);
    await a.conn.reducers.join({});
    await b.conn.reducers.join({});
    const rowA = () => a.conn.db.island.owner.find(a.conn.identity!)!;
    const rowB = () => b.conn.db.island.owner.find(b.conn.identity!)!;
    await until(() => !!rowA() && !!rowB());
    const results = await Promise.allSettled([
      a.conn.reducers.act(args),
      a.conn.reducers.act(args),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    await until(() => rowA().sequence === 1);
    expect(JSON.parse(rowA().state).gold).toBe(130);
    expect(JSON.parse(rowA().state).towers).toHaveLength(1);
    expect(JSON.parse(rowB().state).towers).toHaveLength(0);
    expect(rowB().sequence).toBe(0);
    const invalid = await Promise.allSettled([
      a.conn.reducers.act({ ...args, sequence: 1, kind: 'invalid', x: 2, y: 0 }),
    ]);
    expect(invalid[0].status).toBe('rejected');
    expect(rowA().sequence).toBe(1);
    await a.conn.reducers.act({ ...args, sequence: 1, action: 'recruit', kind: 'squire' });
    await until(() => rowA().sequence === 2);
    await a.conn.reducers.act({ ...args, sequence: 2, action: 'start' });
    await until(() => {
      const s: State = JSON.parse(rowA().state);
      return s.phase === 'combat' && s.enemies.length > 0;
    });
    const before: State = JSON.parse(rowA().state);
    expect(before.recruits).toHaveLength(1);
    const identity = a.conn.identity!.toHexString();
    a.conn.disconnect();
    const restored = await connect(a.token);
    connections.push(restored.conn);
    expect(restored.conn.identity!.toHexString()).toBe(identity);
    await until(() => !!restored.conn.db.island.owner.find(restored.conn.identity!));
    const snapshot: State = JSON.parse(
      restored.conn.db.island.owner.find(restored.conn.identity!)!.state,
    );
    expect(snapshot.towers).toHaveLength(1);
    expect(snapshot.meat).toBe(11);
    expect(snapshot.phase).toBe('combat');
    await until(() => {
      const s: State = JSON.parse(
        restored.conn.db.island.owner.find(restored.conn.identity!)!.state,
      );
      return s.enemies.length > 1 || s.kills > 0;
    });
  } finally {
    for (const c of connections) {
      c.disconnect();
    }
  }
}, 30000);

test('server purchases mage branches, rejects a locked capstone and replicates spell effects', async () => {
  const { conn } = await connect();
  try {
    await conn.reducers.join({});
    const row = () => conn.db.island.owner.find(conn.identity!)!;
    await until(() => !!row());
    await conn.reducers.act({ ...args, kind: 'sentinel' });
    await until(() => row().sequence === 1);
    const tower = JSON.parse(row().state).towers[0].id;
    const lockedCapstone = await Promise.allSettled([
      conn.reducers.act({ ...args, sequence: 1, action: 'upgrade', tower, node: 'frost-capstone' }),
    ]);
    expect(lockedCapstone[0].status).toBe('rejected');
    expect(row().sequence).toBe(1);
    for (const [index, node] of ['frost-attune', 'fire-attune', 'lightning-attune'].entries()) {
      await conn.reducers.act({ ...args, sequence: index + 1, action: 'upgrade', tower, node });
      await until(() => row().sequence === index + 2);
    }
    const bought: State = JSON.parse(row().state);
    expect(bought.gold).toBe(0);
    expect(bought.towers[0].school).toBe('lightning');
    await conn.reducers.act({ ...args, sequence: 4, action: 'start' });
    await until(() => {
      const state: State = JSON.parse(row().state);
      return state.enemies.some((enemy) => !!enemy.chill && !!enemy.burn);
    });
    expect(JSON.parse(row().state).towers[0].casts).toBeGreaterThan(0);
  } finally {
    conn.disconnect();
  }
}, 30000);
