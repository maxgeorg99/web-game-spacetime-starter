import { androidAuthReturn } from './android-auth-return';
import './auth-page.css';

const callback = androidAuthReturn(location.search);
// Remove the one-use code from the visible URL before opening an external app.
history.replaceState(null, '', location.pathname);
const message = document.getElementById('android-auth-status')!;
if (callback) {
  const link = document.getElementById('android-auth-return') as HTMLAnchorElement;
  link.href = callback;
  link.hidden = false;
  message.textContent = 'If the game does not reopen automatically, tap below.';
  location.replace(callback);
} else {
  message.textContent = 'Start sign-in from the Android game, then return here automatically.';
}
