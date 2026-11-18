import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { accountAuth } from '../shared/config/auth';
import './auth-page.css';
import { deliverHandoff, handoffChannel, validHandoff } from './auth-handoff';

// Both bridge and provider callback use this top-level origin, including on itch.io.
const manager = new UserManager({
  authority: accountAuth.issuer,
  client_id: accountAuth.clientId,
  redirect_uri: `${location.origin}/auth/callback.html`,
  post_logout_redirect_uri: `${location.origin}/`,
  response_type: 'code',
  scope: 'openid profile',
  automaticSilentRenew: false,
  loadUserInfo: false,
  stateStore: new WebStorageStateStore({ store: sessionStorage }),
  userStore: new WebStorageStateStore({ store: sessionStorage }),
});
const message = document.getElementById('auth-message')!;
const home = document.getElementById('auth-home')!;
async function run() {
  if (location.pathname.endsWith('/callback.html')) {
    const user = await manager.signinRedirectCallback();
    history.replaceState(null, '', location.pathname);
    const state = user.state as { origin?: string; nonce?: string } | undefined;
    if (!state?.origin || !state.nonce || !user.id_token || !user.profile.exp) {
      throw Error('Incomplete sign-in response. Please try again.');
    }
    try {
      await deliverHandoff({
        type: 'tile-td:account',
        nonce: state.nonce,
        token: user.id_token,
        expiresAt: user.profile.exp * 1000,
      });
    } finally {
      await manager.removeUser();
    }
    message.textContent = 'Signed in. You can close this window and return to your game.';
    window.close();
    return;
  }
  const params = new URLSearchParams(location.hash.slice(1));
  const origin = params.get('origin');
  const nonce = params.get('nonce');
  if (!origin || !nonce || !/^[a-f0-9-]{36}$/.test(nonce)) {
    throw Error('Start sign-in from the game.');
  }
  const url = new URL(origin);
  const allowed =
    url.origin === location.origin ||
    url.origin === accountAuth.productionOrigin ||
    (url.protocol === 'https:' && url.hostname.endsWith('.itch.zone'));
  if (!allowed || url.origin !== origin) {
    throw Error('Unsupported game origin.');
  }
  const provider = new URLSearchParams(location.search).get('provider') === '1';
  history.replaceState(null, '', location.pathname);
  if (!provider) {
    if (!window.opener) {
      throw Error('Start sign-in from the game.');
    }
    const game = window.opener as Window;
    const channel = new BroadcastChannel(handoffChannel(nonce));
    const button = document.createElement('button');
    button.textContent = 'Continue to sign in';
    message.textContent =
      'Keep this window open. Your sign-in will return to the game automatically.';
    message.after(button);
    const timeout = setTimeout(() => {
      channel.close();
      button.remove();
      message.textContent = 'Sign-in timed out. Close this window and start again from the game.';
      home.hidden = false;
    }, 300_000);
    window.addEventListener(
      'pagehide',
      () => {
        clearTimeout(timeout);
        channel.close();
      },
      { once: true },
    );
    channel.onmessage = (event) => {
      if (!validHandoff(event.data, nonce) || game.closed) {
        return;
      }
      channel.postMessage({ type: 'tile-td:received', nonce });
      game.postMessage(event.data, origin);
      message.textContent = 'Signed in. Return to your game.';
      button.remove();
    };
    button.onclick = () => {
      const next = new URL('/auth/index.html?provider=1', location.origin);
      next.hash = new URLSearchParams({ origin, nonce }).toString();
      // Deliberately independent: the callback returns through BroadcastChannel.
      window.open(next, '_blank', 'noopener');
      button.textContent = 'Open sign-in again';
    };
    return;
  }
  await manager.clearStaleState();
  await manager.signinRedirect({
    state: { origin, nonce },
    nonce: crypto.randomUUID(),
  });
}
void run().catch(() => {
  // Never render provider responses, URLs or tokens into errors.
  message.textContent =
    'Sign-in did not finish. Close this window and start sign-in again from the game.';
  home.hidden = false;
});
