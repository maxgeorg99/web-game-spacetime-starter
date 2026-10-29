# Independent persistent worlds

## Decision

One coordinator database runs the coordinator module; every world is a separate deployment of the game module. Clients maintain a small coordinator subscription and connect to exactly one world for gameplay. The existing `tile-tower-defense-world` database is registered as Original islands, without clearing or moving its saved state.

SpacetimeDB explicitly recommends externally orchestrated databases per room/match in its [FAQ](https://spacetimedb.com/docs/intro/faq/). Its [database documentation](https://spacetimedb.com/docs/databases/) distinguishes module code from independently deployed databases. Our persistent-world direction benefits from independent state, execution and version rollout boundaries. This does not automatically distribute CPU across machines: the current local deployments share one host. The directory stores a URI so future placement can use different hosts.

## Components

- `coordinator/src/index.ts`: captain profiles, session directory, create/retry requests, membership history and activity timestamps.
- `spacetimedb/src/index.ts`: authoritative four-island world. One deployment per session; no session discriminator inside combat state.
- `scripts/provisioner.ts`: trusted operator process that observes pending sessions, publishes the game module using the operator's CLI credentials and marks requests ready/failed.
- `src/session-menu.ts`: captain naming, create/join/resume, connection errors and retry.
- `src/store.ts`: selected-world connection and command adapter. Generation guards discard callbacks from a previous connection; leaving clears presentation state but preserves the server world.

## Provisioning lifecycle

A named captain requests a named session. The coordinator assigns a deterministic database name and a pending row. The worker publishes to that database and registers the public WebSocket address. The menu then enables Join. Failed provisioning can be retried by its creator. A crash between publishing and marking ready leaves the request pending; repeating publish against the same name preserves saved state. No code path uses database clearing/deletion.

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
bun run server:publish
spacetime call tile-tower-defense-coordinator register_world '"Original islands"' '"tile-tower-defense-world"' '"ws://127.0.0.1:3106"' --server http://127.0.0.1:3106
bun run provisioner
bun run dev
```

Registration is idempotent. Preserve `.local/spacetimedb` and browser tokens. Use the same operator CLI identity across restarts. The provisioner requires that the coordinator is published; it reconnects if unavailable. If the worker is stopped, creation requests remain Preparing until it resumes.

Browser configuration: `VITE_SPACETIME_URI` and `VITE_COORDINATOR_DB` (`.env.example`). Worker configuration: `SPACETIME_SERVER`, `SPACETIME_COORDINATOR`, `SPACETIME_PUBLIC_URI`. A remotely hosted browser needs reachable HTTPS/WSS services; localhost is development only.

When updating schemas, regenerate both binding folders via `spacetime:generate` and `coordinator:generate`. Publishing the game module updates only the named database: do not assume existing worlds automatically receive newer code. The directory's version field is a foundation for deliberate upgrades, not an implemented rollout system.

## Verification pending

No automated checks or browser playthrough were run for this change. Manual review flow: choose a name, enter Original islands, return to Sessions, create a second world, join it from two captain tabs, confirm separate balances/islands and visible names, reconnect, and resume each world. Stop/restart the provisioner during a pending request to exercise recovery; use a disposable session for this. Before public hosting, add live integration coverage for administrator authorization, isolated world state and provisioning failure recovery.
