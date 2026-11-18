/** Public OIDC settings. Provider secrets belong only in the SpacetimeAuth dashboard. */
export const accountAuth = {
  issuer: 'https://auth.spacetimedb.com/oidc',
  clientId: 'client_034zt4DiqcDiIk5LQ93O7A',
  productionOrigin: 'https://tiled-tower-defense.vercel.app',
} as const;

export function profilePicture(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) {
    return '';
  }
  // Pure validation also runs inside the database runtime; no browser URL APIs.
  const supported =
    /^https:\/\/(?:[a-z0-9-]+\.)*googleusercontent\.com(?:[/?#][^\s]*)?$|^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)(?:[/?#][^\s]*)?$/i;
  return supported.test(value) ? value : '';
}

/** Only call with the JWT claims verified by SpacetimeDB, never a browser-supplied payload. */
export function verifiedAccountProfile(
  issuer: string,
  audience: readonly string[],
  claims: Record<string, unknown>,
) {
  if (issuer !== accountAuth.issuer) {
    return undefined;
  }
  if (!audience.includes(accountAuth.clientId)) {
    throw Error('Invalid account audience.');
  }
  const raw =
    typeof claims.preferred_username === 'string' ? claims.preferred_username : claims.name;
  const displayName =
    typeof raw === 'string'
      ? raw
          .replace(/[<>\p{Cc}\p{Cf}]/gu, '')
          .trim()
          .slice(0, 24)
      : '';
  return { displayName, picture: profilePicture(claims.picture) };
}
