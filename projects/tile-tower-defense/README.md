# Tiled Tower Defense — Tile Tower Defense

Phaser + TypeScript + SpacetimeDB. Independent persistent worlds, each with four floating islands, tower upgrades, tile drafting and eight recruitable soldiers sent by airship. Thirty-two additional Bevy unit definitions remain enemies.

## Play

Open http://127.0.0.1:5175, choose a captain name, then join/resume a world or create one. Multiplayer is the only browser mode. The menu shows provisioning and connection status with retry controls.

- Build towers on empty meadow and select them to purchase skill ranks.
- Recruit one of eight soldiers, choose an opponent and send an airship.
- Start neutral waves; the preview stays beneath resources. Draft land after victories.
- Drag or use arrow keys to pan, scroll to zoom, and use island/Home/World view shortcuts.
- Use the settings menu to return to Sessions. Your world and island stay saved.
- Mute or adjust music/effects in settings. Audio starts after interaction and pauses in background tabs.

## Run locally

Use SpacetimeDB CLI/server **2.14.0**, matching the pinned client and module SDKs. See the [IDC architecture](docs/SESSIONS.md#idc-slot-reporting).

```sh
bun install --frozen-lockfile
bun run server                 # persistent server, port 3106
bun run coordinator:publish    # session directory / captain profiles
bun run provisioner            # trusted worker; keep running
bun run dev                    # Vite, port 5175
```

Use separate terminals for long-running processes. See [session setup and architecture](docs/SESSIONS.md) for configuration and restart behavior. Create new worlds from the menu; the worker configures IDC automatically. The game assets, audio, configs, both modules and worker all live in this project. The Bevy source is not a runtime dependency.

For multiple captains in one browser, use `/?captain=2`, `/?captain=3`, and `/?captain=4`; enter the same session from the menu. Keep browser tokens and `.local/spacetimedb` to retain identity and saved worlds.

## Code and content

- `shared/config/`: editable serializable TS content, balance, skill trees, art manifests and sound mix.
- `shared/game/`: rendering-free commands and fixed-step simulation.
- `spacetimedb/`: game module deployed separately per world.
- `coordinator/`: session directory, captain names and activity.
- `scripts/provisioner.ts`: local trusted provisioning worker.
- `src/`: multiplayer menu, connections, Phaser island rendering and HUD/audio.

Read [ROADMAP.md](ROADMAP.md) and [content authoring](docs/CONTENT.md) before the next session. Generated bindings live in `src/module_bindings` and `src/coordinator_bindings`; regenerate rather than editing them.

## Checks

```sh
bun run format
bun run check
bun run test:server  # legacy solo integration suite, not coordinator coverage
```

Agents format files and ask before running automated verification. The IDC integration suite is available as `bun run test:idc` with an isolated `TEST_IDC_HOST`; browser playtesting is separate. Module generation/publishing bundles code but is not a substitute for type checking or gameplay verification.

## Current scope

Four permanent island seats per world; further visitors spectate. Fixed road, independent economies and repeating neutral waves. Existing saved defenders remain supported, while the Recruit tab always sends purchases to another island. Monster special abilities and armor matrices are not implemented. Only units with source faction variants change sprite colors; others use their original art and captain-colored health bars. Portrait borders are removed.

Worlds persist independently. One provisioner handles up to 32 registered worlds, four creations per captain identity. Names are display labels. Account recovery, private worlds, deployment rollouts, world sleeping and multi-host allocation remain future work. Activity is recorded for a later 30-day cleanup job; nothing is deleted automatically.

Art/audio are copied from the Bevy project and shared asset pack; retain upstream licenses/credits when distributing.

## Localization and mobile controls

Edit the English UI/content catalogs under `src/i18n/locales/en`; see [Localization](docs/LOCALIZATION.md) for typed keys, plural counts and adding languages.

On phones, drag to pan and pinch to zoom. Use **Hide actions** to free the battlefield. Recruit cards scroll sideways; selecting a tower opens a scrollable upgrade sheet. Compact layouts live in `src/responsive.css`, including safe-area spacing and a landscape side dock.
