import { Capacitor, registerPlugin } from '@capacitor/core';
import { accountAuth } from '../shared/config/auth';
import { AccountRenewalRequired, type AccountSession } from './account-refresh';

export interface NativeAccountDriver {
  load(): Promise<AccountSession | undefined>;
  signIn(): Promise<AccountSession>;
  refresh(): Promise<AccountSession>;
  signOut(): Promise<void>;
}

type NativeResult = { session?: AccountSession; pending?: boolean };
type Options = { issuer: string; clientId: string; redirectUri: string };
const plugin = registerPlugin<{
  getSession(options: Options): Promise<NativeResult>;
  signIn(options: Options): Promise<NativeResult>;
  refresh(options: Options): Promise<NativeResult>;
  signOut(): Promise<void>;
}>('CaptainAccount');

const options: Options = {
  issuer: accountAuth.issuer,
  clientId: accountAuth.clientId,
  redirectUri: `${accountAuth.productionOrigin}/auth/android.html`,
};

async function sessionResult(work: Promise<NativeResult>): Promise<AccountSession> {
  try {
    const result = await work;
    if (!result.session) {
      throw new AccountRenewalRequired('Sign-in required.');
    }
    return result.session;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'AUTH_REQUIRED') {
      throw new AccountRenewalRequired('Sign-in required.');
    }
    throw error;
  }
}

export const nativeAccount: NativeAccountDriver | undefined =
  Capacitor.getPlatform() === 'android'
    ? {
        async load() {
          // Capacitor restores the native activity result after process death. Wait for
          // its code exchange to finish before allowing a guest lobby connection.
          for (;;) {
            const result = await plugin.getSession(options);
            if (!result.pending) {
              return result.session;
            }
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        },
        signIn: () => sessionResult(plugin.signIn(options)),
        refresh: () => sessionResult(plugin.refresh(options)),
        signOut: () => plugin.signOut(),
      }
    : undefined;
