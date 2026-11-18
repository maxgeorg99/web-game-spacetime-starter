import { accountAuth } from '../shared/config/auth';
import { t } from './i18n';

const key = 'tile-td:account-session';
type AccountSession = { token: string; expiresAt: number };
export class AccountAuth {
  private session?: AccountSession;
  private expiry?: ReturnType<typeof setTimeout>;
  private cancelPending?: () => void;
  pending = false;
  error = '';
  onChange = () => {};
  constructor() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null') as AccountSession | null;
      if (saved && typeof saved.token === 'string' && saved.expiresAt > Date.now() + 30_000) {
        this.session = saved;
      }
    } catch {
      /* Storage may be unavailable inside an embed; in-memory login still works. */
    }
    this.scheduleExpiry();
  }
  get token() {
    return this.session?.token;
  }
  private scheduleExpiry() {
    clearTimeout(this.expiry);
    if (this.session) {
      this.expiry = setTimeout(
        () => {
          this.signOut();
          this.error = t('account.expired');
          this.onChange();
        },
        Math.max(0, Math.min(2_147_483_647, this.session.expiresAt - Date.now() - 15_000)),
      );
    }
  }
  signOut() {
    this.cancelPending?.();
    this.session = undefined;
    clearTimeout(this.expiry);
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* In-memory session already cleared. */
    }
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
        if (
          typeof data.token !== 'string' ||
          data.token.length > 32_768 ||
          !Number.isFinite(data.expiresAt) ||
          data.expiresAt <= Date.now() + 30_000
        ) {
          finish(Error(t('account.failed')));
          return;
        }
        this.session = { token: data.token, expiresAt: data.expiresAt };
        try {
          sessionStorage.setItem(key, JSON.stringify(this.session));
        } catch {
          /* Keep an in-memory session. */
        }
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
