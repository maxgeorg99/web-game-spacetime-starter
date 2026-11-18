import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { InMemoryWebStorage } from 'oidc-client-ts';
import { AccountAuth } from '../src/account-auth';
import {
  accountClaims,
  AccountRenewalRequired,
  refreshAccount,
  type AccountSession,
} from '../src/account-refresh';
import { accountAuth } from '../shared/config/auth';
import { validHandoff } from '../src/auth-handoff';

describe('account handoff', () => {
  const nonce = 'transaction-nonce';
  const message = () => ({
    type: 'tile-td:account',
    nonce,
    token: 'test-token',
    expiresAt: Date.now() + 60_000,
  });
  test('accepts a current result for the pending transaction', () => {
    expect(validHandoff(message(), nonce)).toBe(true);
    expect(validHandoff({ ...message(), refreshToken: 'refresh-token' }, nonce)).toBe(true);
  });
  test('rejects other transactions and message types', () => {
    expect(validHandoff(message(), 'other')).toBe(false);
    expect(validHandoff({ ...message(), type: 'tile-td:received' }, nonce)).toBe(false);
  });
  test('rejects expired or malformed credentials', () => {
    for (const value of [
      null,
      {},
      { ...message(), token: '' },
      { ...message(), token: 'x'.repeat(32769) },
      { ...message(), expiresAt: Date.now() },
      { ...message(), expiresAt: Infinity },
      { ...message(), expiresAt: '9999999999999' },
      { ...message(), refreshToken: '' },
      { ...message(), refreshToken: 123 },
      { ...message(), refreshToken: 'x'.repeat(32769) },
    ]) {
      expect(validHandoff(value, nonce)).toBe(false);
    }
  });
});

const key = 'tile-td:account-session';
function session(
  expiresAt = Date.now() + 45_000,
  refreshToken: string | undefined = 'refresh-one',
): AccountSession {
  const payload = {
    iss: accountAuth.issuer,
    aud: accountAuth.clientId,
    sub: 'captain',
    exp: Math.floor(expiresAt / 1000),
    iat: Math.floor(Date.now() / 1000),
  };
  return {
    token: `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.test`,
    expiresAt: payload.exp * 1000,
    refreshToken,
  };
}

describe('account renewal', () => {
  let storage: InMemoryWebStorage;
  let auth: AccountAuth | undefined;
  const originals = new Map<string, PropertyDescriptor | undefined>();
  beforeEach(() => {
    for (const name of ['window', 'document', 'sessionStorage']) {
      originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    }
    storage = new InMemoryWebStorage();
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: new EventTarget() });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: Object.assign(new EventTarget(), { hidden: false }),
    });
  });
  afterEach(() => {
    auth?.dispose();
    auth = undefined;
    mock.restore();
    for (const [name, descriptor] of originals) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, name);
      }
    }
  });
  const save = (value: AccountSession) => sessionStorage.setItem(key, JSON.stringify(value));

  test('renews before ID-token expiry without invoking account-change/leave behavior', async () => {
    save(session());
    const renewed = session(Date.now() + 3_600_000, 'refresh-two');
    const refresh = mock(async () => renewed);
    auth = new AccountAuth(refresh);
    auth.onChange = mock();
    auth.onRenewed = mock();
    // The saved token is already within the renewal margin: exercise the timer itself.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(auth.token).toBe(renewed.token);
    expect(auth.onChange).not.toHaveBeenCalled();
    expect(auth.onRenewed).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.getItem(key)!)).toEqual(renewed);
  });

  test('concurrent coordinator and world requests share one rotating refresh', async () => {
    save(session());
    let complete!: (value: AccountSession) => void;
    const refresh = mock(
      () =>
        new Promise<AccountSession>((resolve) => {
          complete = resolve;
        }),
    );
    auth = new AccountAuth(refresh);
    const first = auth.getToken();
    const second = auth.getToken();
    const renewed = session(Date.now() + 3_600_000, 'rotated');
    complete(renewed);
    expect(await first).toBe(renewed.token);
    expect(await second).toBe(renewed.token);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('temporary failures retain the account and recover without a guest transition', async () => {
    const initial = session();
    save(initial);
    const renewed = session(Date.now() + 3_600_000);
    const refresh = mock(async () => renewed).mockRejectedValueOnce(new TypeError('Offline'));
    auth = new AccountAuth(refresh);
    auth.onChange = mock();
    expect(await auth.getToken()).toBe(initial.token);
    expect(auth.needsSignIn).toBe(false);
    expect(auth.error).not.toBe('');
    expect(await auth.getToken()).toBe(renewed.token);
    expect(auth.error).toBe('');
    expect(auth.onChange).not.toHaveBeenCalled();
  });

  test('expired sessions can refresh after reload; failed requests never return expired tokens', async () => {
    const initial = session(Date.now() - 60_000);
    save(initial);
    const renewed = session(Date.now() + 3_600_000);
    const refresh = mock(async () => renewed).mockRejectedValueOnce(new TypeError('Offline'));
    auth = new AccountAuth(refresh);
    await expect(auth.getToken()).rejects.toThrow();
    expect(auth.token).toBe(initial.token);
    expect(auth.needsSignIn).toBe(false);
    expect(await auth.getToken()).toBe(renewed.token);
  });

  test('revoked refresh requests sign-in but does not leave the active account', async () => {
    const initial = session();
    save(initial);
    auth = new AccountAuth(async () => {
      throw { error: 'invalid_grant' };
    });
    auth.onChange = mock();
    await expect(auth.getToken()).rejects.toThrow();
    expect(auth.needsSignIn).toBe(true);
    expect(auth.token).toBe(initial.token);
    expect(auth.onChange).not.toHaveBeenCalled();
    expect(JSON.parse(storage.getItem(key)!).refreshToken).toBeUndefined();
  });

  test('legacy logins without refresh tokens ask for reauthentication without signing out', async () => {
    const initial = { ...session(), refreshToken: undefined };
    save(initial);
    auth = new AccountAuth();
    await expect(auth.getToken()).rejects.toThrow();
    expect(auth.needsSignIn).toBe(true);
    expect(auth.token).toBe(initial.token);
  });

  test('a late refresh cannot restore a signed-out session', async () => {
    save(session());
    let complete!: (value: AccountSession) => void;
    auth = new AccountAuth(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const pending = auth.getToken();
    auth.signOut();
    complete(session(Date.now() + 3_600_000));
    await expect(pending).rejects.toThrow();
    expect(auth.token).toBeUndefined();
    expect(storage.getItem(key)).toBeFalsy();
  });

  test('focus after suspension checks token expiry immediately', async () => {
    const initial = session(Date.now() + 3_600_000);
    save(initial);
    const refresh = mock(async () => session(Date.now() + 3_600_000));
    auth = new AccountAuth(refresh);
    const now = initial.expiresAt;
    spyOn(Date, 'now').mockReturnValue(now);
    window.dispatchEvent(new Event('focus'));
    await auth.getToken();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('storage denial does not discard a renewed in-memory session', async () => {
    save(session());
    const renewed = session(Date.now() + 3_600_000);
    auth = new AccountAuth(async () => renewed);
    spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('Storage denied');
    });
    expect(await auth.getToken()).toBe(renewed.token);
    expect(auth.needsSignIn).toBe(false);
  });

  test('OIDC refresh rotates credentials and uses ID-token expiry rather than access-token expiry', async () => {
    const initial = session();
    const renewed = session(Date.now() + 3_600_000, 'refresh-two');
    const fetchResponse: typeof fetch = Object.assign(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith('/.well-known/openid-configuration')) {
          return Response.json({
            issuer: accountAuth.issuer,
            token_endpoint: `${accountAuth.issuer}/token`,
          });
        }
        const params = new URLSearchParams(String(init?.body));
        expect(params.get('grant_type')).toBe('refresh_token');
        expect(params.get('refresh_token')).toBe('refresh-one');
        expect(params.get('client_id')).toBe(accountAuth.clientId);
        expect(params.get('client_secret')).toBeNull();
        return Response.json({
          id_token: renewed.token,
          refresh_token: renewed.refreshToken,
          access_token: 'access',
          token_type: 'Bearer',
          expires_in: 42,
          scope: 'openid profile offline_access',
        });
      },
      { preconnect: fetch.preconnect },
    );
    const request = spyOn(globalThis, 'fetch').mockImplementation(fetchResponse);
    expect(await refreshAccount(initial)).toEqual(renewed);
    expect(request).toHaveBeenCalled();
  });

  test('OIDC refresh refuses another subject and an unchanged expired ID token', async () => {
    const initial = session(Date.now() - 60_000);
    const renewed = session(Date.now() + 3_600_000);
    const claims = { ...accountClaims(renewed.token), sub: 'other-captain' };
    const other = `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.test`;
    const response = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        id_token: other,
        access_token: 'access',
        token_type: 'Bearer',
        scope: 'openid profile offline_access',
      }),
    );
    await expect(refreshAccount(initial)).rejects.toThrow();
    response.mockResolvedValue(
      Response.json({
        access_token: 'access',
        token_type: 'Bearer',
        scope: 'openid profile offline_access',
      }),
    );
    await expect(refreshAccount(initial)).rejects.toBeInstanceOf(AccountRenewalRequired);
  });
});
