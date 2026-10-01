export async function connectionHealth(uri: string, database: string, request: typeof fetch = fetch): Promise<{ ok: boolean; message: string }> {
  const url = new URL(uri);
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
  url.pathname = `/v1/database/${encodeURIComponent(database)}/identity`;
  url.search = '';
  try {
    const response = await request(url, { signal: AbortSignal.timeout(8000) });
    const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
    if (response.status === 404 && !local) return { ok: false, message: 'The game server is not available yet. Please try again shortly.' };
    if (response.status === 404) return { ok: false, message: `Database "${database}" is missing on ${url.origin}. From rive-td/, run: spacetime publish ${database} --server ${url.origin} --module-path spacetimedb --yes` };
    if (!response.ok) return { ok: false, message: `SpacetimeDB returned HTTP ${response.status}. Check that the configured server and database are correct.` };
    return { ok: true, message: 'Database ready.' };
  } catch {
    return { ok: false, message: ['localhost','127.0.0.1','[::1]'].includes(url.hostname) ? `Cannot reach SpacetimeDB at ${url.origin}. Start the database server, then click Reconnect.` : 'Cannot reach the game server. Check your internet connection, then click Reconnect.' };
  }
}
