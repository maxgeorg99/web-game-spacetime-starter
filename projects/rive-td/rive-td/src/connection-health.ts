export async function connectionHealth(uri: string, database: string, request: typeof fetch = fetch): Promise<{ ok: boolean; message: string }> {
  const url = new URL(uri);
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
  url.pathname = `/v1/database/${encodeURIComponent(database)}/identity`;
  url.search = '';
  try {
    const response = await request(url, { signal: AbortSignal.timeout(3000) });
    if (response.status === 404) return { ok: false, message: `Database "${database}" is missing on ${url.origin}. From rive-td/, run: spacetime publish ${database} --server ${url.origin} --module-path spacetimedb --yes` };
    if (!response.ok) return { ok: false, message: `SpacetimeDB returned HTTP ${response.status}. Check that the configured server and database are correct.` };
    return { ok: true, message: 'Database ready.' };
  } catch {
    return { ok: false, message: `Cannot reach SpacetimeDB at ${url.origin}. Start the database server, then click Reconnect.` };
  }
}
