import { accountAuth } from '../shared/config/auth';
import { t } from './i18n';
import { validHandoff } from './auth-handoff';
import {
  accountClaims,
  AccountRenewalRequired,
  refreshAccount,
  type AccountSession,
} from './account-refresh';

const key = 'tile-td:account-session';
export class AccountAuth {
  private session?: AccountSession;
  private expiry?: ReturnType<typeof setTimeout>;
  private cancelPending?: () => void;
  private renewing?: Promise<string>;
  private revision = 0;
  private failures = 0;
  pending = false;
  needsSignIn = false;
  error = '';
  onChange = () => {};
  onRenewed = () => {};
  onStatus = () => {};
  constructor(private refresh = refreshAccount) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null') as AccountSession | null;
      if (
        saved &&
        typeof saved.token === 'string' &&
        Number.isFinite(saved.expiresAt) &&
        (saved.refreshToken === undefined ||
          (typeof saved.refreshToken === 'string' && saved.refreshToken.length > 0))
      ) {
        const claims = accountClaims(saved.token);
        saved.expiresAt = claims.exp! * 1000;
        this.session = saved;
      }
    } catch {
      /* Storage may be unavailable inside an embed; in-memory login still works. */
    }
    this.scheduleExpiry();
    window.addEventListener('online', this.wake);
    window.addEventListener('focus', this.wake);
    document.addEventListener('visibilitychange', this.wake);
  }
  private wake = () => {
    if (!document.hidden && this.session && !this.needsSignIn) {
      void this.getToken().catch(() => {});
    }
  };
  get token() {
    return this.session?.token;
  }
  get subject() {
    return this.session ? accountClaims(this.session.token).sub : undefined;
  }
  private persist() {
    try {
      if (this.session) {
        sessionStorage.setItem(key, JSON.stringify(this.session));
      } else {
        sessionStorage.removeItem(key);
      }
    } catch {
      /* Keep an in-memory session when embedded storage is unavailable. */
    }
  }
  private scheduleExpiry() {
    clearTimeout(this.expiry);
    if (this.session && !this.needsSignIn) {
      this.expiry = setTimeout(
        () => {
          void this.getToken().catch(() => {});
        },
        Math.max(0, Math.min(2_147_483_647, this.session.expiresAt - Date.now() - 60_000)),
      );
    }
  }
  async getToken(): Promise<string> {
    const session = this.session;
    if (!session || this.needsSignIn) {
      throw new AccountRenewalRequired(t('account.expired'));
    }
    if (this.renewing) {
      return this.renewing;
    }
    if (session.expiresAt > Date.now() + 60_000) {
      this.scheduleExpiry();
      return session.token;
    }
    const revision = this.revision;
    const work = this.renew(session, revision);
    this.renewing = work;
    try {
      return await work;
    } finally {
      if (this.renewing === work) {
        this.renewing = undefined;
      }
    }
  }
  private async renew(session: AccountSession, revision: number): Promise<string> {
    clearTimeout(this.expiry);
    try {
      const next = await this.refresh(session);
      if (revision !== this.revision) {
        throw new AccountRenewalRequired('Account changed.');
      }
      this.session = next;
      this.failures = 0;
      this.error = '';
      this.persist();
      this.scheduleExpiry();
      this.onRenewed();
      this.onStatus();
      return next.token;
    } catch (error) {
      if (revision !== this.revision) {
        throw error;
      }
      const code = error && typeof error === 'object' && 'error' in error ? error.error : '';
      if (
        error instanceof AccountRenewalRequired ||
        ['invalid_grant', 'invalid_client', 'unauthorized_client', 'invalid_scope'].includes(
          String(code),
        )
      ) {
        this.needsSignIn = true;
        this.error = t('account.expired');
        // Keep the account identity and active match. Never silently reconnect as a guest.
        this.session = { token: session.token, expiresAt: session.expiresAt };
        this.persist();
      } else {
        this.error = t('account.refreshRetry');
        const delay = Math.min(60_000, 5_000 * 2 ** Math.min(this.failures++, 4));
        this.expiry = setTimeout(() => {
          void this.getToken().catch(() => {});
        }, delay);
      }
      this.onStatus();
      // A transient failure need not block operations while the existing ID token is valid.
      if (!this.needsSignIn && session.expiresAt > Date.now() + 15_000) {
        return session.token;
      }
      throw new Error(this.error);
    }
  }
  signOut() {
    this.cancelPending?.();
    this.session = undefined;
    this.revision++;
    this.renewing = undefined;
    this.needsSignIn = false;
    this.failures = 0;
    this.error = '';
    clearTimeout(this.expiry);
    this.persist();
  }
  dispose() {
    this.cancelPending?.();
    this.revision++;
    clearTimeout(this.expiry);
    window.removeEventListener('online', this.wake);
    window.removeEventListener('focus', this.wake);
    document.removeEventListener('visibilitychange', this.wake);
  }
  signIn(): Promise<void> {
    if (this.pending) {
      return Promise.resolve();
    }
    const origin = import.meta.env.DEV ? location.origin : accountAuth.productionOrigin;
    const nonce = crypto.randomUUID();
    const url = new URL('/auth/index.html', origin);
    url.hash = new URLSearchParams({ origin: location.origin, nonce }).toString();
    // Open synchronously from the click to retain the browser's user activation.
    const popup = window.open(url, `captain-${nonce}`, 'popup,width=520,height=720');
    if (!popup) {
      return Promise.reject(Error(t('account.popupBlocked')));
    }
    this.pending = true;
    this.error = '';
    return new Promise((resolve, reject) => {
      let completed = false;
      const finish = (error?: Error) => {
        if (completed) {
          return;
        }
        completed = true;
        window.removeEventListener('message', receive);
        clearInterval(poll);
        clearTimeout(timeout);
        this.cancelPending = undefined;
        this.pending = false;
        popup.close();
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      const receive = (event: MessageEvent) => {
        if (event.origin !== origin || event.source !== popup) {
          return;
        }
        const data = event.data;
        if (data?.type !== 'tile-td:account' || data.nonce !== nonce) {
          return;
        }
        if (!validHandoff(data, nonce)) {
          finish(Error(t('account.failed')));
          return;
        }
        try {
          const claims = accountClaims(data.token);
          if (claims.exp! * 1000 !== data.expiresAt) {
            throw new Error();
          }
        } catch {
          finish(Error(t('account.failed')));
          return;
        }
        this.revision++;
        this.renewing = undefined;
        this.needsSignIn = false;
        this.failures = 0;
        this.session = {
          token: data.token,
          expiresAt: data.expiresAt,
          refreshToken: data.refreshToken,
        };
        this.persist();
        this.scheduleExpiry();
        finish();
      };
      const poll = setInterval(() => {
        if (popup.closed) {
          finish(Error(t('account.cancelled')));
        }
      }, 1000);
      const timeout = setTimeout(() => finish(Error(t('account.cancelled'))), 300_000);
      this.cancelPending = () => finish(Error(t('account.cancelled')));
      window.addEventListener('message', receive);
    });
  }
}
