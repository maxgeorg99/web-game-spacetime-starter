import {
  InMemoryWebStorage,
  OidcClient,
  WebStorageStateStore,
  type UserProfile,
} from 'oidc-client-ts';
import { accountAuth } from '../shared/config/auth';

export type AccountSession = { token: string; expiresAt: number; refreshToken?: string };
export const accountScope = 'openid profile offline_access';
export class AccountRenewalRequired extends Error {}

/** Claim checks for HTTPS token responses. SpacetimeDB still verifies the JWT signature. */
export function accountClaims(token: string): UserProfile {
  try {
    const encoded = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    const profile = JSON.parse(
      new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))),
    ) as UserProfile;
    const audience = Array.isArray(profile.aud) ? profile.aud : [profile.aud];
    if (
      profile.iss !== accountAuth.issuer ||
      !audience.includes(accountAuth.clientId) ||
      typeof profile.sub !== 'string' ||
      !profile.sub ||
      !Number.isFinite(profile.exp)
    ) {
      throw new Error();
    }
    return profile;
  } catch {
    throw new AccountRenewalRequired('Invalid account response.');
  }
}

let client: OidcClient | undefined;
export async function refreshAccount(session: AccountSession): Promise<AccountSession> {
  if (!session.refreshToken) {
    throw new AccountRenewalRequired('Sign-in required.');
  }
  client ??= new OidcClient({
    authority: accountAuth.issuer,
    client_id: accountAuth.clientId,
    redirect_uri: `${accountAuth.productionOrigin}/auth/callback.html`,
    response_type: 'code',
    scope: accountScope,
    loadUserInfo: false,
    requestTimeoutInSeconds: 15,
    fetchRequestCredentials: 'omit',
    // Refresh uses a direct token request, with no cookies, popup or hidden iframe.
    stateStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
  });
  const profile = accountClaims(session.token);
  const response = await client.useRefreshToken({
    state: {
      refresh_token: session.refreshToken,
      id_token: session.token,
      profile,
      scope: accountScope,
      session_state: null,
    },
    timeoutInSeconds: 15,
  });
  const next = accountClaims(response.id_token ?? '');
  // Access-token expiry is not the expiry of the ID token used by SpacetimeDB.
  if (next.sub !== profile.sub || next.exp! <= profile.exp! || next.exp! * 1000 <= Date.now() + 30_000) {
    throw new AccountRenewalRequired('Account could not be renewed.');
  }
  return {
    token: response.id_token!,
    expiresAt: next.exp! * 1000,
    refreshToken: response.refresh_token ?? session.refreshToken,
  };
}
