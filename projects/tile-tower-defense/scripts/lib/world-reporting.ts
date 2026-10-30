/** Public metadata is resolved at runtime: database names are not IDC target identities. */
export async function databaseIdentity(host: string, database: string): Promise<string> {
  const response = await fetch(`${host}/v1/database/${encodeURIComponent(database)}/identity`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw Error(`Database identity lookup failed (${response.status}).`);
  }
  const identity = (await response.text()).trim();
  if (!/^[a-f0-9]{64}$/i.test(identity)) {
    throw Error('Invalid database identity response.');
  }
  return identity;
}

export const identityArgument = (identity: string) => ({ __identity__: `0x${identity}` });

/** IDC setup is required; failures leave provisioning retryable. */
export async function configureWorldReporting(
  host: string,
  coordinator: string,
  database: string,
  sessionId: number,
  authorization: string,
) {
  const [target, sender] = await Promise.all([
    databaseIdentity(host, coordinator),
    databaseIdentity(host, database),
  ]);
  async function call(db: string, reducer: string, args: unknown[]) {
    const response = await fetch(`${host}/v1/database/${encodeURIComponent(db)}/call/${reducer}`, {
      method: 'POST',
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw Error(`Reporting setup ${reducer} failed (${response.status}).`);
    }
  }
  await call(coordinator, 'register_world_reporter', [sessionId, identityArgument(sender)]);
  await call(database, 'configure_reporting', [identityArgument(target)]);
  return true;
}
