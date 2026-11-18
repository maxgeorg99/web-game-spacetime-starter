import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { accountAuth } from '../shared/config/auth';
import './auth-page.css';

// The complete OIDC transaction lives on this stable, top-level origin, including
// when the game itself runs inside itch.io. No third-party cookie dependency.
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
    if (!window.opener) {
      message.textContent =
        'Your browser disconnected the sign-in window. Open the game directly and sign in there.';
      home.hidden = false;
      await manager.removeUser();
      return;
    }
    window.opener.postMessage(
      {
        type: 'tile-td:account',
        nonce: state.nonce,
        token: user.id_token,
        expiresAt: user.profile.exp * 1000,
      },
      state.origin,
    );
    await manager.removeUser();
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
  history.replaceState(null, '', location.pathname);
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
