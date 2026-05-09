# CLAUDE.md — Demon Overlord (Solo Dev Jam)

This file is loaded into every agent's context. Keep it terse and load-bearing.

## Pitch

We are participants in the **Solo Dev Jam**. Theme: **Everything has a cost.**

We are a Demon Overlord conquering the world. Genre: **deckbuilder** with cards that
cost **lifepoints** to play (HP is mana). Multiple levels until the boss; pick a new
card after every win (Slay-the-Spire-like). Heal cards exist, but only healing means
the enemy out-scales you.

A **combo system** rewards playing cards with increasing life costs in sequence
(1 → 2 → 3 → 4 → 5) — bigger combo, bigger damage. Tempts you to overspend.

## Tech Stack

- **Phaser 4** (`phaser@4`, currently 4.1.0). WebGL-first.
- **TypeScript 5.6** (strict). **Vite 6** dev/build. **Vitest 2.1** for unit tests.
- **Single-player**, no server, no multiplayer, no networking.
- Run from `projects/SoloDevJam/`:

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server at http://localhost:5173 |
| `npm run build` | Production build (`tsc -b && vite build`) |
| `npm run typecheck` | `tsc --noEmit` only |
| `npm run test` | Vitest CI run |
| `npm run test:watch` | Vitest watch |

## Orchestration Files

- **`ROADMAP.md`** — phased spec (what to build).
- **`PHASE_TRACKER.md`** — current sub-phase + step checkboxes + bug queue + iteration log.
- **`PROMPT.md`** — orchestrator instructions (the agent reads this every iteration).
- **`docs/verification/`** — Playwright reports + screenshots.

## File Structure (target)

```
projects/SoloDevJam/
├── src/
│   ├── main.ts                  # Game config, registers scenes
│   ├── scenes/
│   │   ├── BootScene.ts         # Loads assets.json, transitions to Title
│   │   ├── TitleScene.ts        # Title screen + Start Run button
│   │   ├── CombatScene.ts       # Main gameplay
│   │   ├── RewardScene.ts       # Card pick after victory
│   │   └── GameOverScene.ts     # Loss / win screens
│   ├── cards/
│   │   ├── Card.ts              # Card type + registry
│   │   ├── effects.ts           # Effect resolution (damage/heal/block)
│   │   └── __tests__/
│   ├── combat/
│   │   ├── Combat.ts            # Turn order, end-turn, win/lose
│   │   ├── Combo.ts             # Combo state machine
│   │   └── __tests__/
│   ├── state/
│   │   ├── DeckState.ts         # Draw / discard / shuffle
│   │   ├── PlayerState.ts       # HP, shield, etc.
│   │   ├── RunState.ts          # Level progression
│   │   └── __tests__/
│   └── ui/
│       ├── HandUI.ts            # Card row at bottom of CombatScene
│       ├── HpBar.ts             # Big HP bar
│       └── ComboHud.ts
└── public/
    └── assets/
        ├── assets.json          # Single source of truth for asset metadata
        ├── sprites/             # enemies/, bosses/
        ├── ui/                  # cards/, icons/, bars/, banners/, papers/, screens/
        └── audio/               # music/, sfx/
```

Each scene file holds **one** scene class. Pure logic (cards, deck, combat math, combo) lives
outside scene files so it can be unit-tested without Phaser.

## Asset Conventions

- **Single source of truth:** `public/assets/assets.json`. Add entries here when introducing assets,
  never `this.load.spritesheet(...)` with hard-coded paths in scenes.
- **Frame dimensions are measured, not guessed.** If you need to add a new spritesheet, run:
  ```bash
  sips -g pixelWidth -g pixelHeight <file>
  ```
  and divide by the visible frame count to set `frameWidth` / `frameHeight`.
- **Animation keys:** `<keyPrefix>-<suffix>` — e.g. `char-demon-idle`, `enemy-skull-attack`.
- **Image keys:** kebab-case, namespaced — e.g. `card-blank`, `icon-heart`, `screen-victory`.
- **Audio keys:** prefixed by category — `music-*`, `sting-*`, `sfx-*`, `sfx-ui-*`.

The Demon spritesheet (`char-demon-*`) is the **player character** — the demon overlord protagonist.

## Phaser 4 Rules (avoid Phaser 3 traps)

- Renderer is `Phaser.WEBGL` explicitly. Do not use `Phaser.AUTO` (Canvas fallback masks WebGL bugs).
- **No Phaser 3 idioms:**
  - `setTintFill(0xff0000)` → `setTint(0xff0000).setTintMode(Phaser.TintModes.FILL)`
  - `setPipeline('Light2D')` → `setLighting(true)`
  - `Math.PI2` → `Math.TAU` (now correctly `2*PI`)
  - `Math.TAU` (Phaser 3, was `PI/2`) → `Math.PI_OVER_2`
  - `BitmapMask` → `sprite.filters.internal.addMask(maskObject)`
  - `RenderTexture.draw(...)` requires explicit `.render()` — Phaser 4 buffers draw calls.
- Stick to standard game objects (`Sprite`, `Image`, `Text`, `Container`). Don't reach for
  `SpriteGPULayer` / `TilemapGPULayer` for a card game — overkill.
- No physics needed (`physics: undefined` in game config). It's a card game.
- For pixel art: `roundPixels: false` is the Phaser 4 default. Set per-object
  `vertexRoundMode = 'safe'` when needed, but our art is not pixel art so this rarely applies.

## Coding Conventions

- **TypeScript strict mode is on.** Don't `any` your way out.
- **No `console.log` left in committed code** — review agent should strip them.
- **Pure logic ≠ scene logic.** A `Combat.applyDamage(player, amount)` function should not
  reach into `this.scene` — pass it the data, return the result.
- **Random:** wrap `Math.random()` in a single `rng()` helper in `src/state/rng.ts` so we can
  inject deterministic RNG in tests.
- **No external state libraries** (zustand, redux, etc.) — plain TS classes / objects are fine.
- **Comments:** rare, only when WHY is non-obvious. The code names the WHAT.

## Game Constants

- Player starting HP / max HP: **80**
- Starter deck size: **10 cards**
- Hand size per turn: **5**
- Run length: **5 levels** (4 fights + 1 final boss)
- Combo cap: tier **5**
- Combo bonus damage: `2 * tier` (extra damage)

## What NOT to Do

- Don't add multiplayer, save files, accounts, leaderboards. Solo Dev Jam = small scope.
- Don't introduce new asset packs without measuring frame sizes first.
- Don't refactor the orchestration files (`ROADMAP.md`, `PHASE_TRACKER.md`, `PROMPT.md`) outside the
  documented update points (only the orchestrator updates them, never the implementation agent).
- Don't bypass the manifest — every asset goes through `assets.json`.
- Don't use Phaser 3 docs as a reference. When in doubt, query Context7 for `/photonstorm/phaser`.
