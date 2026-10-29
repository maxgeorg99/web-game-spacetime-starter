# Four-island world handoff

Implementation is ready for manual playtesting, with automated verification pending user approval.

## Model

One public `world` row contains four permanent seats and bounded active flights. Identity owns a seat; commands use a per-seat sequence so another island's actions do not invalidate yours. A scheduled server clock advances all occupied islands and flights at the shared fixed step. Clients subscribe to the world and render each island independently. Simulation and content remain shared TypeScript.

The single Recruit roster purchases one of eight soldier types with meat and always targets an opponent. Separate recruitment was removed; existing saved defenders remain active. Arrival creates enemy fighters at path progress zero, using expedition bounty and keep damage. Incoming raids run defenses during preparation and drafting without granting neutral-wave completion income. Airships targeting a defeated keep are removed. Restart is blocked while that island has unresolved flights.

## Persistence

`bun run server` uses `.local/spacetimedb` on port 3106. Keep this directory to retain world data. The new database is `tile-tower-defense-world`; the earlier solo database remains separate. No idle cleanup or seat release exists yet. Reconnect by reloading with the same browser token and captain query. There is no catch-up simulation during server downtime.

## Manual playtest

1. Open the four captain URLs in README. Check each claims a different island.
2. Build and start a neutral wave on one island; watch it from another tab.
3. Pan, zoom and use Home/Overview. Keep the resource HUD and orders tied to your island.
4. Send a unit to an opponent. Watch eight-second travel and arrival at Incoming.
5. Send multiple passengers; observe staggered spawning and meat deduction.
6. Defend a raid between neutral waves; check kills grant bounty without wave income.
7. Reload a captain; inspect its saved buildings/resources and ownership.
8. Restart the local server with the same data directory; reload clients and inspect saved state.
9. Open a fifth distinct captain; check spectator access and disabled orders.

## Next decisions

Playtest economy and raid pressure before adding more systems. Current neutral waves repeat unchanged after wave five. Decide on seat recovery/release, defeat consequences and long-term wave scaling before public play. Touch gestures, public hosting, matchmaking, multiple worlds and richer airship art remain future work. The whole-world snapshot is intentionally simple for four seats; split tables only if measured replication costs justify it.

The new domain tests are in `tests/world.test.ts`. `test:server` still targets the legacy solo reducers; it does not verify the new world transport. A live world integration suite is follow-up work.
