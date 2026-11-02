import { expect, test } from 'bun:test';
import {
  configureWorldReporting,
  databaseIdentity,
  identityArgument,
} from '../scripts/lib/world-reporting';

const host = process.env.TEST_IDC_HOST;
const integration = host ? test : test.skip;

integration(
  'IDC authenticates worlds, reports occupancy, bounds failures and recovers',
  async () => {
    if (!host || !/^http:\/\/127\.0\.0\.1:\d+$/.test(host)) {
      throw Error('TEST_IDC_HOST must be an isolated loopback server.');
    }
    const suffix = crypto.randomUUID().slice(0, 8);
    const coordinator = `idc-directory-${suffix}`;
    const worldA = `idc-world-a-${suffix}`;
    const worldB = `idc-world-b-${suffix}`;
    const adminResponse = await fetch(`${host}/v1/identity`, { method: 'POST' });
    expect(adminResponse.ok).toBe(true);
    const { token } = (await adminResponse.json()) as { token: string };
    expect(token).toBeString();
    const authorization = `Bearer ${token}`;
    async function publish(database: string, path: string) {
      const response = await fetch(`${host}/v1/database/${database}?host_type=Js`, {
        method: 'PUT',
        headers: { Authorization: authorization, 'Content-Type': 'application/octet-stream' },
        body: await Bun.file(path).arrayBuffer(),
      });
      if (!response.ok) {
        throw Error(`Publish failed: ${await response.text()}`);
      }
    }
    async function call(database: string, reducer: string, args: unknown[], auth = authorization) {
      return fetch(`${host}/v1/database/${database}/call/${reducer}`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
    }
    async function ok(database: string, reducer: string, args: unknown[]) {
      const response = await call(database, reducer, args);
      if (!response.ok) {
        throw Error(`${reducer}: ${await response.text()}`);
      }
    }
    async function query(database: string, sql: string): Promise<unknown[][]> {
      const response = await fetch(`${host}/v1/database/${database}/sql`, {
        method: 'POST',
        headers: { Authorization: authorization, 'Content-Type': 'text/plain' },
        body: sql,
      });
      if (!response.ok) {
        throw Error(`SQL: ${await response.text()}`);
      }
      const result = (await response.json()) as { rows: unknown[][] }[];
      return result[0].rows;
    }
    async function until(check: () => Promise<boolean>, timeout = 10_000) {
      const start = Date.now();
      while (!(await check())) {
        if (Date.now() - start > timeout) {
          throw Error('IDC state timeout');
        }
        await Bun.sleep(100);
      }
    }
    await publish(coordinator, 'coordinator/dist/bundle.js');
    await publish(worldA, 'spacetimedb/dist/bundle.js');
    await publish(worldB, 'spacetimedb/dist/bundle.js');
    await ok(coordinator, 'register_world', ['A', worldA, host.replace('http:', 'ws:')]);
    await ok(coordinator, 'register_world', ['B', worldB, host.replace('http:', 'ws:')]);
    const sessions = await query(coordinator, 'SELECT id, database FROM session');
    const idA = sessions.find((row) => row[1] === worldA)![0] as number;
    const idB = sessions.find((row) => row[1] === worldB)![0] as number;
    const target = identityArgument(await databaseIdentity(host, coordinator));
    // Ordinary callers (even the publisher) cannot impersonate a world on the IDC reducer.
    expect((await call(coordinator, 'receive_world_slots', [4, 4])).ok).toBe(false);
    const strangerResponse = await fetch(`${host}/v1/identity`, { method: 'POST' });
    const stranger = (await strangerResponse.json()) as { token: string; identity: string };
    expect(
      (await call(worldA, 'configure_reporting', [target], `Bearer ${stranger.token}`)).ok,
    ).toBe(false);
    expect(
      (
        await call(
          coordinator,
          'register_world_reporter',
          [idA, target],
          `Bearer ${stranger.token}`,
        )
      ).ok,
    ).toBe(false);
    expect(await configureWorldReporting(host, coordinator, worldA, idA, authorization)).toBe(true);
    // Setup is idempotent after a provisioner loses its response.
    expect(await configureWorldReporting(host, coordinator, worldA, idA, authorization)).toBe(true);
    await until(
      async () =>
        (
          await query(coordinator, `SELECT claimed FROM slots WHERE session_id = ${idA}`)
        )[0]?.[0] === 0,
    );
    await ok(worldA, 'world_enter', ['Captain A']);
    await until(
      async () =>
        (
          await query(coordinator, `SELECT claimed FROM slots WHERE session_id = ${idA}`)
        )[0]?.[0] === 1,
    );
    // A second world cannot update the first world's slot row or replace its trusted identity.
    const senderB = identityArgument(await databaseIdentity(host, worldB));
    expect((await call(coordinator, 'register_world_reporter', [idA, senderB])).ok).toBe(false);
    // Deliver before registration to exercise a completed error and delayed fresh-message retry.
    await ok(worldB, 'configure_reporting', [target]);
    await until(async () =>
      String((await query(worldB, 'SELECT last_error FROM reporting'))[0]?.[0]).includes(
        'Registered world only',
      ),
    );
    expect((await query(worldB, 'SELECT * FROM slot_outbox')).length).toBeLessThanOrEqual(1);
    await ok(coordinator, 'register_world_reporter', [idB, senderB]);
    await until(
      async () =>
        (
          await query(coordinator, `SELECT claimed FROM slots WHERE session_id = ${idB}`)
        )[0]?.[0] === 0,
      40_000,
    );
    expect(
      (await query(coordinator, `SELECT claimed FROM slots WHERE session_id = ${idA}`))[0]?.[0],
    ).toBe(1);
    await until(
      async () => (await query(worldB, 'SELECT last_error FROM reporting'))[0]?.[0] === '',
    );
    // A publisher-registered test sender exercises terminal reports without waiting for combat.
    const terminal = `idc-terminal-${suffix}`;
    await ok(coordinator, 'register_world', ['Terminal', terminal, host.replace('http:', 'ws:')]);
    const terminalId = (await query(coordinator, 'SELECT id, database FROM session')).find(
      (row) => row[1] === terminal,
    )![0] as number;
    await ok(coordinator, 'register_world_reporter', [
      terminalId,
      identityArgument(stranger.identity),
    ]);
    const report = (claimed: number, capacity: number) =>
      call(coordinator, 'receive_world_slots', [claimed, capacity], `Bearer ${stranger.token}`);
    expect((await call(coordinator, 'receive_world_slots', [0, 0])).ok).toBe(false);
    expect((await report(2, 4)).ok).toBe(true);
    expect((await report(0, 0)).ok).toBe(true);
    expect(
      (await query(coordinator, `SELECT status FROM session WHERE id = ${terminalId}`))[0][0],
    ).toBe('finished');
    expect(
      await query(coordinator, `SELECT * FROM slots WHERE session_id = ${terminalId}`),
    ).toHaveLength(0);
    const retiredAt = JSON.stringify(
      await query(coordinator, `SELECT last_activity FROM session WHERE id = ${terminalId}`),
    );
    expect((await report(2, 4)).ok).toBe(true);
    expect((await report(0, 0)).ok).toBe(true);
    expect(
      JSON.stringify(
        await query(coordinator, `SELECT last_activity FROM session WHERE id = ${terminalId}`),
      ),
    ).toBe(retiredAt);
    expect(
      await query(coordinator, `SELECT * FROM slots WHERE session_id = ${terminalId}`),
    ).toHaveLength(0);
    await ok(coordinator, 'set_name', ['Test captain']);
    expect((await call(coordinator, 'authorize_cleanup', [terminalId])).ok).toBe(false);
    expect((await call(coordinator, 'visit_session', [terminalId])).ok).toBe(false);
    // Heartbeats keep unchanged occupancy fresh without browser polling.
    const first = JSON.stringify(
      await query(coordinator, `SELECT updated_at FROM slots WHERE session_id = ${idA}`),
    );
    await until(
      async () =>
        JSON.stringify(
          await query(coordinator, `SELECT updated_at FROM slots WHERE session_id = ${idA}`),
        ) !== first,
      40_000,
    );
  },
  100_000,
);
