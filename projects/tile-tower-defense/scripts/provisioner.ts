import { DbConnection } from '../src/coordinator_bindings';

// Trusted local worker. CLI publishing credentials stay in the operator's CLI profile.
// Run exactly one worker per coordinator. Publishing a deterministic name makes retries resumable.
const server = process.env.SPACETIME_SERVER ?? 'http://127.0.0.1:3106';
const coordinator = process.env.SPACETIME_COORDINATOR ?? 'tile-tower-defense-coordinator';
const connectionUri = server === 'maincloud' ? 'https://maincloud.spacetimedb.com' : server;
const publicUri = process.env.SPACETIME_PUBLIC_URI ?? connectionUri.replace(/^http/, 'ws');
const project = new URL('..', import.meta.url).pathname;
async function cli(args: string[]) {
  const child = Bun.spawn(['spacetime', ...args], { cwd: project, stdout: 'pipe', stderr: 'pipe' });
  const [output, errors, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) {
    throw Error(errors || output || `spacetime exited ${code}`);
  }
}
async function result(id: number, ready: boolean) {
  await cli([
    'call',
    coordinator,
    'provision_result',
    String(id),
    String(ready),
    JSON.stringify(publicUri),
    '--server',
    server,
  ]);
}
// Hosting environments inject this secret; it is never exposed to browser bundles or logs.
if (process.env.SPACETIME_ADMIN_TOKEN) {
  try {
    await cli(['login', '--token', process.env.SPACETIME_ADMIN_TOKEN]);
  } catch {
    throw Error('Could not authenticate provisioner. Check SPACETIME_ADMIN_TOKEN.');
  }
}
const lastReport = new Map<number, number>();
async function reportSlots(id: number, uri: string, database: string) {
  const endpoint = uri.replace(/^ws/, 'http').replace(/\/$/, '');
  const response = await fetch(`${endpoint}/v1/database/${encodeURIComponent(database)}/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'SELECT claimed, capacity FROM world_slots WHERE id = 1',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw Error(`Slot query returned ${response.status}`);
  }
  const results: { rows: number[][] }[] = await response.json();
  const [claimed, capacity] = results[0]?.rows[0] ?? [];
  if (!Number.isInteger(claimed) || capacity !== 4 || claimed < 0 || claimed > capacity) {
    return;
  }
  await cli([
    'call',
    coordinator,
    'report_slots',
    String(id),
    String(claimed),
    String(capacity),
    '--server',
    server,
  ]);
}
let stopped = false;
let connection: DbConnection | undefined;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    stopped = true;
    connection?.disconnect();
  });
}
console.log(`Provisioner watching ${coordinator}. Existing worlds are never cleared or deleted.`);
while (!stopped) {
  try {
    connection = await new Promise<DbConnection>((resolve, reject) => {
      const conn = DbConnection.builder()
        .withUri(connectionUri)
        .withDatabaseName(coordinator)
        .onConnect((client) => {
          client
            .subscriptionBuilder()
            .onApplied(() => resolve(client))
            .onError((event) => reject(event.event))
            .subscribe('SELECT * FROM session');
        })
        .onConnectError((_ctx, error) => reject(error))
        .build();
      connection = conn;
    });
    while (!stopped && connection.isActive) {
      for (const session of [...connection.db.session.iter()].filter(
        (row) => row.status === 'pending',
      )) {
        if (stopped) {
          break;
        }
        if (!/^tile-td-[a-f0-9]{12}-\d+$/.test(session.database)) {
          await result(session.id, false);
          continue;
        }
        console.log(`Provisioning session ${session.id}: ${session.database}`);
        try {
          await cli([
            'publish',
            session.database,
            '--server',
            server,
            '--module-path',
            'spacetimedb',
            '--yes',
          ]);
        } catch (error) {
          console.error(`Session ${session.id} publish failed:`, error);
          await result(session.id, false);
          continue;
        }
        // If this call fails, leave it pending and retry the same database after reconnect.
        await result(session.id, true);
      }
      for (const session of connection.db.session.iter()) {
        if (session.status !== 'ready' || Date.now() - (lastReport.get(session.id) ?? 0) < 15_000) {
          continue;
        }
        lastReport.set(session.id, Date.now());
        try {
          await reportSlots(session.id, session.uri, session.database);
        } catch (error) {
          console.warn(`Slots unavailable for session ${session.id}:`, String(error));
        }
      }
      await Bun.sleep(2000);
    }
  } catch (error) {
    console.error('Provisioner connection/reconciliation failed:', error);
  }
  connection?.disconnect();
  if (!stopped) {
    await Bun.sleep(3000);
  }
}
