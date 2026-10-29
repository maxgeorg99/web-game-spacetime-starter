# Vercel deployment

The frontend stays available on itch.io. Vercel hosts a copy of the frontend plus `POST /api/provision?id=<sessionId>`. Maincloud owns the coordinator and saved worlds. There is no continuous production worker after cutover.

## Provisioning

The browser first creates a pending session through the coordinator. It sends its own SpacetimeDB bearer token to Vercel. The endpoint calls `authorize_provision` with that token, then uses the private publisher token to acquire a ten-minute durable lease. Only the creator can request provisioning; the existing four-world-per-identity and 32-world directory caps still apply. Anonymous identities are not a strong anti-abuse boundary; keep the global cap for this prototype.

The deployment builds the game module once with SpacetimeDB CLI 2.10.2. The function publishes its JS bundle over HTTP with `host_type=Js`. No CLI or compiler runs in a request. A retry checks whether the named world already exists and never republishes it. Failed or uncertain requests retain the lease; the creator can retry after ten minutes. This is on-demand recovery, not an autonomous background queue.

The open menu reads public `world_slots` rows directly every 15 seconds. Existing coordinator slot reporting remains available for local worker development. The production menu uses `VITE_PROVISIONER_URL`; Vercel builds set it to `/api/provision`, while itch.io needs the absolute production URL.

## Accounts and secrets

The local project is linked to `maxigeorgmg-7735s-projects/tiled-tower-defense`. Vercel holds `SPACETIME_ADMIN_TOKEN` as a sensitive production variable. Keep it out of all `VITE_` variables.

GitHub Actions requires `SPACETIME_ADMIN_TOKEN`, `BUTLER_API_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`. After filling `.env.provisioner` and linking Vercel, `bun run secrets:github` uploads these without printing their values. The Vercel token belongs to the linked project’s team/account and must be renewed before expiry.

Set repository variable `VITE_PROVISIONER_URL` to the stable production alias plus `/api/provision`. Do not use a preview URL: preview protection can prevent itch.io from calling it. Production must allow players to reach the endpoint without Vercel login; player authorization is enforced by the endpoint itself.

## First cutover

1. Stop the existing Maincloud provisioner; the old worker does not participate in serverless leases. Leave the local development worker alone.
2. Publish the updated coordinator with `--delete-data=never` (no reset). This adds private leases and HTTP authorization/completion reducers without replacing public session tables.
3. Deploy Vercel production and record its stable alias.
4. Configure the GitHub repository provisioner URL variable and rebuild/publish itch.io with that URL.
5. When verification is authorized, exercise create, duplicate create, retry, join and slot refresh against the deployed system.

The initial cutover requires production publishing approval. Local automated verification was explicitly skipped by the user. Vercel still runs its mandatory build, including the existing build script’s type checks.

## Push releases

`.github/workflows/tile-tower-defense-release.yml` runs for changes to this project on `main`, or manually. It requires release configuration, runs the existing CI checks, builds itch.io, publishes the coordinator without data deletion, deploys Vercel and finally uploads itch.io. Releases are serialized. GitHub environment `production` may apply any repository-configured protection rules.

No git push or commit is performed by these setup scripts. Avoid enabling a second Vercel Git auto-deploy pipeline; GitHub Actions owns release ordering.

New worlds receive the module bundled in the latest Vercel deployment. Existing worlds retain their current module and data; a future explicit fleet migration is needed to update their game rules. Deployments do not delete worlds or implement the planned 30-day cleanup.

## Deployment record — 2026-10-29

Production coordinator updated without deleting data; only the private lease table was added. The old Maincloud worker was stopped, and the local development worker remains running. Vercel deployment `dpl_Bx2eaWpNuL9wVGyHE3JhA6Rvxbqx` reached READY at https://tiled-tower-defense.vercel.app. Repository variable `VITE_PROVISIONER_URL` and `.env.production` now point to its `/api/provision` endpoint.

The Vercel and itch.io production builds passed, including their required TypeScript checks. The initial Vercel attempt found missing module declarations in the credential scripts; these were fixed before the successful deployment. Separate lint, unit/integration tests and browser/gameplay verification were not run, as requested. The release workflow changes are local until committed and pushed.

itch.io upload completed and processing succeeded: `maxgeorg99/tiled-tower-defense:html5`, build `2247444`, version `vercel-cutover-20261029`.
