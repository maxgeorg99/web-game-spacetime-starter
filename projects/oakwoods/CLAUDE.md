# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev         # Start Vite client only (http://localhost:5173)
npm run dev:server  # Start Colyseus server only (ws://localhost:2567)
npm run dev:all     # Run both concurrently (for multiplayer)
npm run build       # Build production client bundle to dist/
npm run build:server # Compile server to server/lib/
npm run preview     # Preview production build locally
```

No test or lint commands are configured.

## Multiplayer (Colyseus)

This project is session-multiplayer via a local Colyseus server in `server/`.

- **Server**: `server/src/index.ts` boots a `WebSocketTransport` on port 2567 and defines the `oakwoods` room (`server/src/rooms/OakWoodsRoom.ts`).
- **State**: `server/src/schemas/GameState.ts` — one `PlayerState` per connected client (`x`, `y`, `facing`, `animState`, `hp`).
- **Authority model**: Each client runs Phaser physics for its own player and streams position + animation state at ~20Hz via `"input"` messages. The server owns the canonical `players` MapSchema; remote avatars are rendered from state with linear interpolation. Enemies remain client-side (each client fights their own instance).
- **Client**: `src/network/ColyseusClient.ts` wraps `colyseus.js`. Endpoint defaults to `ws://<hostname>:2567` and can be overridden with the `VITE_COLYSEUS_URL` env var.
- **Schema callbacks**: colyseus.js 0.16 requires `getStateCallbacks(room)` — use the returned `$` proxy, e.g. `$(room.state).players.onAdd(...)` and `$(player).listen("x", ...)`.

If the server is unreachable the client falls back to solo play and the HUD shows `offline (solo)`.

## Assets (Not Included)

This repo does **not** include the Oak Woods art assets (we can’t redistribute them).  
Follow `README.md` to download the pack and extract it into `public/assets/oakwoods/`.

## Architecture

This is a Phaser 3 pixel art platformer built with TypeScript and Vite.

### Game Configuration
- **Resolution**: 320×180 (pixel art scale)
- **Renderer**: Canvas with `pixelArt: true`, `roundPixels: true`
- **Physics**: Arcade with gravity {y: 900}
- **Scale**: FIT mode with CENTER_BOTH

### Scene Flow
```
BootScene → GameScene
```

**BootScene** (`src/scenes/BootScene.ts`): Loads `assets.json` manifest, queues all assets dynamically, stores manifest in registry, transitions to GameScene on load complete.

**GameScene** (`src/scenes/GameScene.ts`): Main gameplay with parallax backgrounds (3 TileSprite layers at scroll factors 0.1/0.3/0.5), procedurally-generated infinite ground tilemap, physics-based player with animation state machine.

### Asset System
Assets are declared in `public/assets/oakwoods/assets.json` with metadata for spritesheets (frame dimensions, animation definitions) and tilesets. BootScene reads this manifest and loads assets by key.

Key texture keys:
- `oakwoods-char-blue`: Character spritesheet (56×56 frames, 8×7 grid)
- `oakwoods-bg-layer1/2/3`: Parallax background layers
- `oakwoods-tileset`: 24×24 tile tileset (21×15 grid)
- `oakwoods-*`: Decoration images (shop, lamp, rocks, grass, fences, sign)

### Player Character
- Arcade physics sprite with custom hitbox (20×38, offset 18,16)
- Animations: idle (0-5), attack (8-13), run (16-21), jump (28-31), fall (35-37)
- State machine: attack locks animation until complete, otherwise air vs ground states
- Controls: Arrow keys for movement/jump, X for attack

### Infinite World Generation
Ground tiles are generated procedurally 20 tiles ahead of player position. Tilemap is 500 tiles wide (12,000px). Camera follows player with deadzone and lerp smoothing.

## Patterns

- **Manifest-driven loading**: Assets defined in JSON, loaded dynamically in BootScene
- **Registry for cross-scene data**: Manifest stored via `this.registry.set()`
- **TileSprite parallax**: Fixed scroll factor layers with `tilePositionX` updated in update()
- **Animation state machine**: Check `isAttacking` flag and `onGround`/velocity states before playing animations
