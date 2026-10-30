# Independent persistent worlds

## Decision

One coordinator database runs the coordinator module; every world is a separate deployment of the game module. Clients maintain a small coordinator subscription and connect to exactly one world for gameplay. The local default `tile-tower-defense-world` database is registered as Fresh islands. Old pre-release worlds were reset for the IDC-only cutover.

SpacetimeDB explicitly recommends externally orchestrated databases per room/match in its [FAQ](https://spacetimedb.com/docs/intro/faq/). Its [database documentation](https://spacetimedb.com/docs/databases/) distinguishes module code from independently deployed databases. Our persistent-world direction benefits from independent state, execution and version rollout boundaries. This does not automatically distribute CPU across machines: the current local deployments share one host. The directory stores a URI so future placement can use different hosts.

## Components

- `api/provision.ts`: production on-demand publisher; registers each new world's identity and configures its IDC target before completing the provisioning lease.
- `coordinator/src/index.ts`: captain profiles, session directory, create/retry requests, membership history and activity timestamps.
- `spacetimedb/src/index.ts`: authoritative four-island world. One deployment per session; no session discriminator inside combat state.
- `scripts/provisioner.ts`: trusted operator process that observes pending sessions, publishes the game module using the operator's CLI credentials and marks requests ready/failed.
- `src/session-menu.ts`: captain naming, create/join/resume, connection errors and retry.
- `src/store.ts`: selected-world connection and command adapter. Generation guards discard callbacks from a previous connection; leaving clears presentation state but preserves the server world.

## Provisioning lifecycle

A named captain requests a named session. The coordinator assigns a deterministic database name and a pending row. The worker publishes to that database, registers its IDC identity, configures its coordinator target and registers the public WebSocket address. The menu then enables Join. Failed provisioning can be retried by its creator. A crash between publishing and marking ready leaves the request pending; repeating publish against the same name preserves saved state. No code path uses database clearing/deletion.

Run **one worker per coordinator** for this first implementation. Multiple-worker leases and automatic deployment-version rollout are future work. Creation is bounded to 32 registered worlds and four requests per creator. Failed requests still count toward capacity. These are prototype bounds, not production identity-based abuse protection.

Only the coordinator's original publisher identity can register existing worlds or report provisioning results. Run the worker under that same CLI profile. The browser gets no publishing token and cannot choose deployment commands. The worker uses argument arrays, restricts generated database names and never executes session names as shell code.

## Identity and names

Each captain uses one coordinator identity/token stored in the browser. New world connections reuse that token. The old world-specific token is preferred when present, preserving original island ownership. The `?captain=2` development parameter selects a separate browser identity, as before.

Captain names are validated in both modules (2–24 characters); session names are 2–40. Name changes apply to a world when entering it again. Names are display labels, not authentication or globally unique handles. World islands and target lists show names with faction portraits. A fifth identity can spectate. Resume means the identity has previously visited the world; it can also resume spectating.

## Activity and future cleanup

The coordinator records `createdAt`, `lastActivity` and membership `lastSeen`. Entering a world updates activity; a focused, visible gameplay tab sends a heartbeat once a minute. World simulation ticks do not refresh directory activity. A browser crash therefore stops heartbeats naturally. The future 30-day cleanup job can use these timestamps, after deciding warnings, backups and deletion semantics. **No cleanup or automatic deletion is implemented now.**

Worlds remain disk-backed and can be revisited. Currently, combat/flights continue while the server runs even without connected players. Server downtime pauses simulation. Sleeping/waking worlds and offline progression are separate future decisions.

## Development startup

From the project directory, in separate terminals where appropriate:

```sh
bun run server
bun run coordinator:publish
bun run provisioner
bun run dev
```

Create a world from the menu; the provisioner publishes and configures it. Preserve `.local/spacetimedb` and browser tokens between ordinary development sessions. Use the same operator CLI identity across restarts. The provisioner requires that the coordinator is published; it reconnects if unavailable. If the worker is stopped, creation requests remain Preparing until it resumes.

Browser configuration: `VITE_SPACETIME_URI` and `VITE_COORDINATOR_DB` (`.env.example`). Worker configuration: `SPACETIME_SERVER`, `SPACETIME_COORDINATOR`, `SPACETIME_PUBLIC_URI`. A remotely hosted browser needs reachable HTTPS/WSS services; localhost is development only.

When updating schemas, regenerate both binding folders via `spacetime:generate` and `coordinator:generate`. Publishing the game module updates only the named database: do not assume existing worlds automatically receive newer code. The directory's version field is a foundation for deliberate upgrades, not an implemented rollout system.

## Verification pending

The current automated results are below; manual gameplay verification is separate. Manual review flow: choose a name, enter Fresh islands, return to Sessions, create a second world, join it from two captain tabs, confirm separate balances/islands and visible names, reconnect, and resume each world. Stop/restart the provisioner during a pending request to exercise recovery; use a disposable session for this. Before public hosting, add live integration coverage for administrator authorization, isolated world state and provisioning failure recovery.

## IDC slot reporting

SpacetimeDB 2.14.0 is required for the client, coordinator, world modules and host. Worlds send occupancy changes and 30-second heartbeats directly to the coordinator through typed outboxes. Both databases must be on the same server. Actual delivery has been verified locally and on Maincloud.

The publisher registers an immutable mapping from world database identity to session. `receive_world_slots` derives the session from the authenticated sender, with no caller-supplied session ID. The world's `init` records its publisher privately; only that identity can configure its coordinator target. Setup is idempotent and cannot redirect pending calls to a different coordinator.

The simulation scheduler sends the latest occupancy on the next tick after a change. At most one outbox call is pending per world. Its private result callback releases the pending flag; returned errors are stored privately and retried with a fresh snapshot after 30 seconds. Transport-level pending calls remain the runtime's responsibility. IDC callers do not need a JWT, and neither module defines connection hooks that reject them.

The browser reads only the coordinator's slot subscription. Reports older than 60 seconds are labeled as last reported; the menu refreshes that label on a timer without making HTTP requests to worlds. Missing reports remain unknown. There is no polling fallback, public world slot table or administrator slot-report reducer. Occupancy reports do not change session activity or cleanup timestamps.

### Generation and deployment

Run `bun run idc:generate`, then `bun run spacetime:generate` and `bun run coordinator:generate`. The IDC command uses `--bindings module` against local coordinator source. Generated receiver bindings under `spacetimedb/src/remote_bindings` are committed and excluded from formatting/lint. Regenerate and republish senders whenever receiver parameters change.

Publish the coordinator first, then deploy the Vercel bundle or restart the local worker. Both provisioners must register the world identity and configure IDC before marking a session ready. Setup errors remain retryable; no compatibility branch silently accepts a world without reporting.

### Pre-release reset decision — 2026-10-30

The user authorized discarding old worlds locally and on Maincloud, resetting the session directories and deploying the IDC-only version. Save-preserving compatibility for old worlds is intentionally removed. This is a one-time pre-release reset, not an automatic deletion policy. Future ordinary provisioning still preserves a world on retries.

Reset scope was limited to the three worlds listed in the local coordinator and the one world listed in the hosted coordinator. Unrelated databases were not touched. The local default database was recreated as Fresh islands with IDC configured. Resetting the directories also clears captain profiles and membership history; choose a captain name again after reloading.

### Verification

The simplified version passed all three TypeScript checks, lint, 31 domain/world/localization tests, the production frontend build and real two-world IDC integration. The IDC test exercises publisher-only configuration, authenticated reports, isolation, idempotent setup, occupancy changes, heartbeat refresh and recovery after receiver rejection. A separate disposable Maincloud pair confirmed hosted delivery and was deleted afterward. The existing frontend chunk-size warning remains.

To repeat IDC verification, generate/build both modules, start an isolated server, then run `TEST_IDC_HOST=http://127.0.0.1:<port> bun run test:idc`. The test requires a loopback URL and leaves uniquely named disposable databases in that isolated directory; it skips without the environment variable. `bun run test:server` separately checks the solo flow with `TEST_SPACETIME_URI` and `TEST_SPACETIME_DB` pointing to a disposable database.
