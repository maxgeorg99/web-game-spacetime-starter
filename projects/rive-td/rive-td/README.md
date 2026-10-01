# Little Keep

Cooperative isometric tower defense built with a scripted Rive scene and an authoritative SpacetimeDB module. Three 19×19 battlefields, twelve waves, four tower types, ten enemy species, and up to eight players in a shared room.

## Published deployment

- itch.io project: https://maxgeorg99.itch.io/little-keep
- Maincloud database: `maxgeorg99-little-keep`
- WebSocket endpoint: `wss://maincloud.spacetimedb.com`
- Dashboard: https://spacetimedb.com/maxgeorg99-little-keep

itch.io serves static files. Browsers connect directly to Maincloud; no Bun server is required in production. On the itch.io edit page, the project must be HTML and the `html5` upload must have **This file will be played in the browser** enabled. Set visibility to Public when publishing.

Players enter the same room code. Gold, towers, keep health, waves and enemies are shared. Empty rooms pause and expire after 30 minutes. Moving to the next battlefield resets towers, gold and keep health; campaign kills carry over.

## Local development

From this directory, use three terminals:

```sh
spacetime start
```

```sh
spacetime publish rive-td --server local --module-path spacetimedb --yes
```

```sh
SPACETIMEDB_HOST=ws://127.0.0.1:3000 SPACETIMEDB_DB_NAME=rive-td bun run dev
```

Open http://127.0.0.1:5173 in multiple tabs. The browser requires `public/little-keep.riv`, created by the signing command below. Start and publish against the same local server: starting with a different `--data-dir` creates a separate database installation.

For an offline, independent native game:

```sh
~/.rive/bin/rive ../td --fit=contain
```

Native previews do not synchronize. Multiplayer is provided by the browser host and the scene's `snapshot` / `command` view-model properties.

## Release to itch.io

```sh
bun run typecheck
bun run test
bun run publish:cloud
~/.rive/bin/rive login                 # only if not already signed in
bun run rive:sign
bun run build:itch
butler push dist/itch maxgeorg99/little-keep:html5 --userversion 0.1.0
```

`dist/itch` contains only `index.html`, `client.js`, `config.json`, the signed `.riv`, and Rive's WASM files. Assets use relative URLs for itch.io iframe paths. The public configuration contains no credentials. Signing currently adds Rive's watermark because the project is not bound to a Rive editor file.

`ITCH_DATABASE` overrides the Maincloud database baked into the static build. Local `.env` settings deliberately do not override the production endpoint. Room invites include the itch.io page URL and room code because itch.io does not forward a page query into the game's iframe.

## Validation

```sh
bun run typecheck
bun run test
bun run test:multiplayer               # local server + published module required
TEST_SPACETIME_URI=wss://maincloud.spacetimedb.com TEST_SPACETIME_DB=maxgeorg99-little-keep bun run test:multiplayer
~/.rive/bin/rive ../td --verify
~/.rive/bin/rive ../td --test
```

The multiplayer test creates temporary rooms and checks contested purchases, shared combat, late joins, reconnects and empty-room pausing. Test rooms expire automatically.

## Source layout

- `shared/catalog.ts`: tower/enemy stats, maps and waves; generates `../td/catalog.luau`.
- `shared/game.ts`: deterministic server simulation and Rive snapshot encoder.
- `spacetimedb/src/index.ts`: rooms, membership, command validation and scheduled combat ticks.
- `src/client.ts`: Rive host, subscriptions and room UI.
- `src/main.ts`: local development server only.
- `scripts/build-itch.ts`: static release packaging.
- `../td/`: native Rive scene, renderer and offline Luau simulation.

Run `bun run catalog` after catalog or scene-generator changes, then verify the Rive scene. Use `bun run rive:sign` before building a new browser release. Generated SpacetimeDB bindings are refreshed with `bun run spacetime:generate`.
