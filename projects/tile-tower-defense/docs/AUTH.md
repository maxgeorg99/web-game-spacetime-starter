# Captain accounts — integration in progress

Public SpacetimeAuth client: `client_034zt4DiqcDiIk5LQ93O7A`.

Register these redirect URIs on that client:

- `http://127.0.0.1:5175/auth/callback.html`
- `https://tiled-tower-defense.vercel.app/auth/callback.html`

Post-logout URIs: `http://127.0.0.1:5175/` and `https://tiled-tower-defense.vercel.app/`.

Google's existing Web application OAuth client needs `https://auth.spacetimedb.com/interactions/federated/callback/google` as an authorized redirect. Discord's OAuth2 client needs `https://auth.spacetimedb.com/interactions/federated/callback/discord`. Put provider credentials in SpacetimeAuth's Identity Providers dashboard, never the game repository. Provider client IDs differ from our public SpacetimeAuth client ID.

## Current implementation

The game opens `/auth/index.html` on its local development origin or the stable Vercel production origin. The popup owns the complete authorization-code/PKCE transaction using oidc-client-ts; its callback checks the OIDC transaction then returns the ID token through an exact-origin postMessage handoff. The game checks popup source, origin and a separate random transaction nonce. It never sends tokens in URLs. Popup cancellation, timeout and blocked-popup errors are recoverable. Callback pages ship with the same Vite build, without a separate hosting project.

The coordinator adds an additive `account_profile` table populated only from SpacetimeDB-verified connection claims. It checks the SpacetimeAuth issuer and the game's client audience. Only display name and supported HTTPS Google/Discord picture URLs are public. The client uses the stored verified profile for its boarding-pass picture and initial name. No email is requested or stored. Generated coordinator bindings were regenerated.

Account tokens use session storage with an in-memory fallback. Account expiry returns to the guest connection and asks for reauthentication; silent renewal is not implemented yet. Sign out clears this game's account session, not the Google/Discord provider session. Login uses the provider’s default prompt behavior; SpacetimeAuth rejected `prompt=select_account`, so no prompt override is sent. Guest coordinator/world tokens are kept untouched; account connections explicitly override per-world guest tokens. Guest history is still separate and accessible after signing out. No guest-to-account data migration, provider-account merging, progression or achievements are implemented.

## Required before release

- User confirmed Google and Discord provider setup. Verify the client redirect allowlist during the first sign-in.
- Approved lint, all three TypeScript targets and 96 unit tests passed before the prompt fix. Real provider sign-in remains to be verified.
- Test actual Google and Discord callbacks and pictures, cancellation, expiration and sign-out/reentry.
- Test the actual itch.io embed across Chrome and Safari/iOS, including third-party storage restrictions and loss of window.opener. Current fallback explains the problem and links to the standalone game; a server-backed handoff may be needed if the opener is severed.
- Test private run-history access under guest and account identities; design explicit linking before migrating existing records.
- Publish coordinator's new table and callback routes together with the frontend only when production deployment is authorized. No production deployment has been performed for auth.

Sources: [SpacetimeAuth configuration](https://spacetimedb.com/docs/core-concepts/authentication/spacetimeauth/configuring-a-project/), [verified claims](https://spacetimedb.com/docs/core-concepts/authentication/usage/), [oidc-client-ts](https://github.com/authts/oidc-client-ts).
