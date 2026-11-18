# Captain accounts

Public SpacetimeAuth client: `client_034zt4DiqcDiIk5LQ93O7A`.

Register these redirect URIs on that client:

- `http://127.0.0.1:5175/auth/callback.html`
- `https://tiled-tower-defense.vercel.app/auth/callback.html`

Post-logout URIs: `http://127.0.0.1:5175/` and `https://tiled-tower-defense.vercel.app/`.

Google's existing Web application OAuth client needs `https://auth.spacetimedb.com/interactions/federated/callback/google` as an authorized redirect. Discord's OAuth2 client needs `https://auth.spacetimedb.com/interactions/federated/callback/discord`. Put provider credentials in SpacetimeAuth's Identity Providers dashboard, never the game repository. Provider client IDs differ from our public SpacetimeAuth client ID.

## Current implementation

The game opens `/auth/index.html` on its local development origin or the stable Vercel production origin. This bridge stays connected to the game and never navigates to a provider. The player clicks Continue to sign in to open an independent provider window. That window owns the complete authorization-code/PKCE transaction using oidc-client-ts. Its callback validates the OIDC transaction and sends the ID token through a nonce-specific BroadcastChannel to the same-origin, top-level bridge. The bridge validates the result and forwards it through an exact-origin postMessage handoff; the game checks the bridge window source, origin and transaction nonce. This tolerates a provider severing window.opener and avoids third-party storage dependencies for the channel. Tokens are not placed in URLs or persisted by the bridge. Callback delivery waits for an acknowledgement with a bounded retry/timeout. Callback pages ship with the same Vite build, without a separate hosting project.

The coordinator adds an additive `account_profile` table populated only from SpacetimeDB-verified connection claims. It checks the SpacetimeAuth issuer and the game's client audience. Only display name and supported HTTPS Google/Discord picture URLs are public. The client uses the stored verified profile for its boarding-pass picture and initial name. No email is requested or stored. Generated coordinator bindings were regenerated.

Account tokens use session storage with an in-memory fallback. Account expiry returns to the guest connection and asks for reauthentication; silent renewal is not implemented yet. Sign out clears this game's account session, not the Google/Discord provider session. Login uses the provider’s default prompt behavior; SpacetimeAuth rejected `prompt=select_account`, so no prompt override is sent. Guest coordinator/world tokens are kept untouched; account connections explicitly override per-world guest tokens. Guest history is still separate and accessible after signing out. No guest-to-account data migration, provider-account merging, progression or achievements are implemented.

## Required before release

- User confirmed successful local Google and Discord sign-in after correcting the Google provider configuration.
- Bridge fix: lint, all three TypeScript targets and 99 unit tests passed. Chromium verified delivery from an opener-less callback to a sandboxed cross-origin iframe using synthetic credentials; real hosted provider login still needs retesting.
- Verify production Google and Discord callbacks and pictures, cancellation, expiration and sign-out/reentry. Local provider sign-in is user-confirmed.
- Test the actual itch.io embed across Chrome and Safari/iOS, including third-party storage restrictions and loss of window.opener. The stable bridge handles provider opener loss. Verify that the embed allows its initial popup and that the browser permits BroadcastChannel between the two top-level auth pages.
- Test private run-history access under guest and account identities; design explicit linking before migrating existing records.
- Production deployment authorized on 2026-11-18. The main-branch release workflow publishes the coordinator without resetting saves, then Vercel and itch.io. Confirm that workflow succeeds before considering production updated.

Sources: [SpacetimeAuth configuration](https://spacetimedb.com/docs/core-concepts/authentication/spacetimeauth/configuring-a-project/), [verified claims](https://spacetimedb.com/docs/core-concepts/authentication/usage/), [oidc-client-ts](https://github.com/authts/oidc-client-ts).

## itch.io opener isolation investigation (2026-11-18)

User subsequently confirmed the itch.io sign-in issue is fixed.

Reproduced the immediate generic error in Chrome on the live itch.io page with release `7d77bbe` deployed successfully. The initial Vercel bridge has `window.opener === null`, before the provider flow starts. Both the itch.io project page and its `html.itch.zone` game response send `Cross-Origin-Opener-Policy: same-origin`; the project also sends `Cross-Origin-Embedder-Policy: credentialless` and the game sends `require-corp`. The actual iframe has no sandbox attribute. The earlier synthetic sandbox test did not reproduce these hosting headers.

itch.io's [SharedArrayBuffer support setting](https://itch.io/t/2025776/experimental-sharedarraybuffer-support) adds these headers. [COOP isolation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy) severs the initial cross-origin popup connection, so keeping the bridge on Vercel cannot preserve its game opener. Changing only Vercel headers cannot remove the opener's isolation policy.

Recommended hosting fix: disable **SharedArrayBuffer support** under **Edit game → Embed options → Frame options**. No SharedArrayBuffer, Atomics or cross-origin isolation dependency was found in the authored game code. Changing this setting can change the game CDN origin; existing guest identities in browser storage may consequently be unavailable on the new origin. After saving, verify the new CDN origin passes the bridge's origin allowlist and retest actual account login and return to the iframe.

Approved verification: intercepted responses only in a dedicated Chrome test session to remove COOP/COEP from the project and game pages. The unchanged deployed bridge then retained its opener, displayed Continue to sign in, and navigated the provider tab to SpacetimeAuth. No provider credentials were submitted and no complete account handoff was verified in this investigation. All three `tests/auth.test.ts` tests passed. Live itch.io settings and production code were not changed.

## In-game captain profile images

`world_enter` copies the provider picture from verified account claims into the seat's optional `picture` field, refreshing it on rejoin. World navigation shows that photo to all players, preserving the faction border; guests, COMs, older saves and unavailable images use the existing captain art. Provider URLs use the same allowlist as menu portraits. No reducer/table signatures changed. Deployment requires the frontend and world module; existing worlds need a save-preserving module update and player re-entry to populate photos. All three TypeScript targets and 34 targeted auth/world tests passed. Browser avatar rendering and server integration were not exercised.
