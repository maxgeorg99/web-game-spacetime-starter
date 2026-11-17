# Biome selection and campaigns — proposed plan

Status: All four biomes are implemented: Sky Islands, Volcano, Deep Ocean and Highlands. Lint, all three TypeScript targets and 92 unit tests pass. Local coordinator updated; new worlds are published from current source by the running provisioner. Browser verification, live-server integration tests and full-campaign balance playtesting remain pending.

## Player experience

The host chooses one biome for the whole match in the existing pre-match lobby, alongside COM management. All human and COM islands use the same campaign and environment. Every connected player sees the selection; only the host can change it. Starting the match locks the selection, including across reconnects.

Use one compact Biome button showing a landscape thumbnail and name. It opens four visual choices: Sky Islands, Volcano, Deep Ocean and Highlands. Each card needs only its thumbnail, name and “20 waves”; a selected border/check identifies the choice. Show the selected environment live behind the lobby. Keep COM controls and Start match visible, including on narrow screens. Guests see the same selection as read-only. No biome descriptions, extra stat tables or persistent selector during combat.

Sky Islands stays the default and preserves the current campaign. Proposed new environments:

| Biome      | Terrain and background                                                                                    | Existing enemy roster direction                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Volcano    | Charcoal/basalt land, warm stone roads, ember-red cracks, smoke and distant lava glow                     | Pyromancers, demons, cerberus, dragons, stone golems                                      |
| Deep Ocean | Blue-green reef/stone platforms, pale readable paths, deep navy water, restrained currents and light rays | Paddle fish, harpoon fish, turtles, snakes, supplemented by existing compatible creatures |
| Highlands  | Ochre earth, slate cliffs, moss accents, mountain silhouettes and mist                                    | Dwarves, bears, minotaurs, ogres, stone golems, gryphons                                  |

Deep Ocean is an environmental theme around playable platforms; existing ground movement, towers and airships remain usable. True underwater movement, swimming and replacing airships would be a separate feature. Enemy themes are art/composition choices, not new fire immunity or other unimplemented powers.

## Current integration points

- `shared/config/waves.ts` contains one 20-wave array.
- `shared/game/rules.ts` uses it to create spawn queues and finish campaigns; `shared/game/combat.ts` separately reads its health multipliers and spawn intervals.
- `shared/game/world.ts` owns lobby permissions, COM creation, joining, shared starts and campaign cycling.
- `src/ui.ts`, `src/views.ts` and `src/i18n/content.ts` assume one campaign for previews and the field guide.
- `src/IslandView.ts` mixes tile-config colors with hard-coded road, cliff, outline and expansion-preview colors.
- `src/IslandAtmosphere.ts` creates one cached sky/cloud theme from `shared/config/presentation.ts`.
- Worlds persist JSON snapshots. The existing `world_act` transport already carries an action name and a `kind` string suitable for a biome ID; no new reducer signature is expected.

## Implementation sequence

### 1. Shared content and save contract

Add typed biome definitions under `shared/config/biomes.ts` and explicit campaigns under `shared/config/campaigns/`. Each biome maps a stable ID to a versioned campaign ID and a presentation theme. Keep the current wave IDs/compositions intact as the original campaign. Author exactly 20 waves per new campaign (60 new waves in total).

Add an optional selected biome ID to `WorldState`. Add an optional campaign ID to island `State` so existing pure simulation functions can resolve their campaign from saved state. The server derives island campaign IDs from the world's selected biome; clients cannot submit independent campaign changes. One shared campaign resolver supplies queue creation, spawning, completion, previews and guide content. Avoid a mutable global “selected waves” array because the process handles independent worlds.

Missing fields on old saves resolve to Sky Islands/current campaign. Unknown IDs from new commands are rejected; unknown persisted campaign IDs should surface an incompatibility instead of silently playing a different campaign. Keep released campaign versions available while saves reference them. Joining, adding/removing COMs and restarting legacy runs must preserve the resolved campaign correctly.

### 2. Authoritative lobby selection

Add a `set-biome` world action using `kind` for the biome ID. Validate host ownership, lobby phase, valid ID and existing sequence checks. Apply the selection and derived campaign to all seats in one authoritative update, including empty slots that may later be claimed. New humans/COMs inherit the selection. Begin locks the current selection atomically; a racing later selection is rejected.

Use the existing world snapshot replication for guests, spectators and reconnects. Include biome/campaign IDs in relevant client render signatures. Keep the coordinator session directory unchanged for this first slice; selection happens inside the world lobby. Regenerate bindings only if an actual public schema/signature changes.

### 3. Playable vertical slice

Wire the selector and campaign resolver through one new biome first (Volcano), covering all 20 waves, host/guest synchronization and reconnect. Then use the same config structure for Deep Ocean and Highlands. Implement selected-campaign wave previews and guide content together with server spawning so the UI cannot promise a different enemy composition.

Preserve the current shared-match ending rules: elimination/all humans lost ends the match; surviving shared matches cycle after wave 20. Each cycle repeats the selected biome campaign. Ending or escalating at wave 20 is a separate balance decision, not an implicit part of biome selection. Solo/legacy mode retains its current completion behavior.

### 4. Visual themes

Move terrain surfaces, roads, cliff faces, edge lines and draft-extension colors into presentation themes. Apply the same theme to battlefield tiles, draft swatches/previews and field-guide terrain previews. Include the theme ID in land-render cache keys so changing biome in the lobby redraws existing land immediately.

Parameterize the background renderer, using theme-specific texture keys and bounded decorative objects. Support atmosphere replacement and cleanup when switching worlds/biomes; do not reuse the original `island-sky` cache for every environment. Respect reduced motion and preserve readable road, range, placement, faction and status colors.

Start with existing buildings and resource landmarks. Reuse suitable shared-library environmental art; prepare three selection thumbnails and small background/decor sets where needed. A polished pass may need themed landmark variants (e.g. grove against volcanic ground). Keep stable tile IDs and mechanical meanings across all themes; biome-specific tile effects, draft pools, towers and enemy abilities are outside this slice.

### 5. Campaign authoring and balance

Author wave groups, counts, order, health multiplier and spacing explicitly. Each biome needs a recognizable progression: introductory waves 1–5, mixed pressure 6–10, heavier combinations 11–15 and finales 16–20. Use concise wave labels and enemy portraits, with no flavor paragraphs.

Balance against effective enemy health after damage-type matchups, movement speed, spawn density, bounty income, keep damage and existing tower costs. A different roster changes the economy even with identical counts, so matching only total HP is insufficient. Deep Ocean has fewer existing aquatic unit types: vary composition/timing deliberately and use compatible supporting enemies; additional creature art is optional future scope.

Keep all players on the same wave composition and timing. Maintain comparable overall difficulty across biomes in the first release. Include biome/campaign identity in archived match-report JSON and display a short biome label in history; preserve compatibility with older reports and validate the optional metadata at the coordinator boundary.

### 6. Verification and rollout

Before running ad hoc checks, request approval as required by AGENTS.md. Planned coverage:

- Catalog validation: unique IDs, exactly 20 waves, valid units, positive counts/intervals, valid health multipliers and complete theme references.
- Domain cases: original-save fallback, each biome's first/last wave, spawn/preview parity, cycle handling, campaign preservation and no client ability to alter a campaign mid-match.
- World/server cases: host-only selection, invalid IDs, guests/spectators, COM inheritance, joining after selection, reconnect and selection/start ordering.
- Manual play: all four themes, draft expansion, faction and effect contrast, narrow-screen lobby, campaign previews and world switching without stale textures.
- Balance sessions for each full campaign, including COM matches; tune from results rather than declaring authored waves balanced.

Offer `bun run test:server` for the server/transport changes, running only with approval. Publish locally for playtesting when authorized. Production requires explicit authorization; deploy any coordinator report-validation change before dependent world modules. Update the new-world module and frontend together; existing world databases need a compatible module update without a reset. The installed pre-push gate remains enabled for any later authorized push.

## Scope and effort

This is a medium-sized feature with substantial content work. The campaign/lobby plumbing is straightforward; the main effort is authoring and balancing 60 waves and making three environments coherent without reducing battlefield readability. Deliver in reviewable slices: shared contract + Volcano, remaining campaigns, visual polish, verification/balance. All four environments and their 20-wave campaigns are implemented. Remaining work is manual visual review and full-campaign balance tuning.
