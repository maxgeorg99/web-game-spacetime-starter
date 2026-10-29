import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

const host = 'https://maincloud.spacetimedb.com';
const coordinator = 'tiled-tower-defense';

/** Only registered, creator-authorized pending sessions can spend publishing credentials. */
export default async function provision(req: IncomingMessage, res: ServerResponse) {
  // itch.io serves games from CDN iframe origins. Bearer authentication, not cookies, is used.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  const reply = (status: number, message: string) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message }));
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }
  if (req.method !== 'POST') {
    reply(405, 'Use POST.');
    return;
  }
  const rawId = new URL(req.url ?? '/', 'http://localhost').searchParams.get('id') ?? '';
  if (!/^[1-9]\d{0,9}$/.test(rawId) || Number(rawId) > 0xffffffff) {
    reply(400, 'Invalid session.');
    return;
  }
  const id = Number(rawId);
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ') || authorization.length > 8192) {
    reply(401, 'Connect to the session directory first.');
    return;
  }
  const token = process.env.SPACETIME_ADMIN_TOKEN;
  if (!token) {
    reply(503, 'Provisioning is not configured.');
    return;
  }
  const admin = `Bearer ${token}`;
  const call = (reducer: string, args: unknown[], auth = admin) =>
    fetch(`${host}/v1/database/${coordinator}/call/${reducer}`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(15_000),
    });
  try {
    const allowed = await call('authorize_provision', [id], authorization);
    if (!allowed.ok) {
      reply(403, 'Only the world creator can start provisioning.');
      return;
    }
    const directory = await fetch(`${host}/v1/database/${coordinator}/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: `SELECT database, status FROM session WHERE id = ${id}`,
      signal: AbortSignal.timeout(15_000),
    });
    if (!directory.ok) {
      throw Error('Directory unavailable');
    }
    const rows = (await directory.json()) as { rows: [string, string][] }[];
    const [database, status] = rows[0]?.rows[0] ?? [];
    if (status === 'ready') {
      reply(200, 'World ready.');
      return;
    }
    if (status !== 'pending' || !/^tile-td-[a-f0-9]{12}-\d+$/.test(database ?? '')) {
      reply(409, 'Retry this world from the session menu.');
      return;
    }
    // Read before claiming so a missing deployment artifact does not hold a lease.
    const bundle = await readFile(join(process.cwd(), 'spacetimedb/dist/bundle.js'));
    const attempt = randomUUID();
    const claimed = await call('claim_provision', [id, attempt]);
    if (!claimed.ok) {
      reply(409, 'World creation is already running. If interrupted, retry in ten minutes.');
      return;
    }
    // A previous invocation may have published successfully before losing its connection.
    // Never republish or migrate an existing world as part of a retry.
    const existing = await fetch(`${host}/v1/database/${database}/schema?version=9`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (existing.status === 404) {
      const published = await fetch(`${host}/v1/database/${database}?host_type=Js`, {
        method: 'PUT',
        headers: { Authorization: admin, 'Content-Type': 'application/octet-stream' },
        body: new Uint8Array(bundle),
        signal: AbortSignal.timeout(180_000),
      });
      if (!published.ok) {
        throw Error(`Publish status ${published.status}`);
      }
    } else if (!existing.ok) {
      throw Error(`World lookup status ${existing.status}`);
    }
    const completed = await call('complete_provision', [
      id,
      attempt,
      host.replace('https:', 'wss:'),
    ]);
    if (!completed.ok) {
      throw Error(`Completion status ${completed.status}`);
    }
    reply(200, 'World ready.');
  } catch {
    // Never leak upstream bodies or credentials. An uncertain publish keeps its durable lease.
    reply(
      503,
      'World creation was interrupted. Retry in ten minutes; your world will be preserved.',
    );
  }
}
