# ROADMAP — Demon Overlord (Solo Dev Jam)

**Theme:** Everything has a cost. Cards are paid in HP, not mana.

**Pitch:** A Slay-the-Spire-like deckbuilder where you play a Demon Overlord conquering the world.
Damage cards cost HP. Heal cards restore HP but waste tempo. A combo system rewards playing cards
in increasing-cost order (1 → 2 → 3 → 4 → 5), tempting you to spend too much. Reach the boss
through a series of levels; pick a new card after every win.

**Stack:** Phaser 4 + TypeScript + Vite + Vitest. Single-player. WebGL renderer.

---

## Phase 1 — Foundation

### 1.1 — Project bootstrap _(Done — completed by human)_
- Vite + TypeScript + Phaser 4 scaffold
- `npm run dev` serves a working scene at http://localhost:5173
- `npm run build`, `npm run typecheck`, `npm run test` all pass

### 1.2 — Asset manifest + BootScene _(Done)_
- `BootScene` reads `public/assets/assets.json`
- Queues all spritesheets, images, and audio defined in the manifest
- Shows a progress bar while loading
- Stores manifest in registry for downstream scenes
- On load complete, transitions to `TitleScene`
- **Verify in browser:** loading screen visible, transitions to title without errors

### 1.3 — TitleScene _(Done)_
- Background: `screen-title-bg`
- Title text "Demon Overlord" + tagline "Everything has a cost"
- "Start Run" button → transitions to `CombatScene`
- Plays `music-title` on enter
- **Verify in browser:** title visible, click Start → combat scene shown

### 1.4 — Animation registration
- `AnimationFactory` helper that registers Phaser animations from manifest entries
- All 5 character spritesheets (`demon`, `skull`, `bear`, `centaur`, `cerberus`) get all 4 animations registered
- Unit test: factory emits the expected animation keys
- **Verify in browser:** open dev console, no animation-key collisions; sprites can be played

---

## Phase 2 — Combat skeleton

### 2.1 — Player entity + HP bar
- Demon sprite rendered in CombatScene at fixed position (left side)
- Plays `idle` animation by default
- HUD shows HP as a `bar-big-*` filled bar with a number overlay
- Player starts at HP=80, MAX_HP=80
- **Verify in browser:** demon visible, idle anim looping, HP bar fills correctly

### 2.2 — Enemy entity
- Skull sprite rendered at fixed position (right side), plays `idle`
- Enemy has HP (start 30/30), shown via `bar-small-*` above the sprite
- **Verify in browser:** skull visible, idle anim looping, HP bar visible

### 2.3 — Card data model + seed cards
- `Card` type: `{ id, name, cost, kind: 'attack'|'heal'|'block', value, art }`
- A `cards.ts` registry with at least 8 cards covering attack/heal/block at costs 1–5
- Pure unit tests for card lookup
- **Verify in browser:** logging shows seed deck assembled correctly; nothing visual yet

### 2.4 — Deck / hand / discard
- `DeckState` model with `draw(n)`, `discard(card)`, `shuffle()`
- Player starts with a 10-card starter deck, draws 5 each turn
- Pure unit tests for deck shuffling, drawing past empty (reshuffles discard)
- **Verify in browser:** dev console shows a hand of 5 cards on combat start

### 2.5 — Hand UI (read-only)
- Render up to 5 cards along the bottom of CombatScene
- Each card uses `card-blank` frame with: name, cost (with heart icon), effect text
- Hover lifts the card +20px
- **Verify in browser:** 5 cards visible across the bottom; hover responds smoothly

### 2.6 — Play card
- Click card → spend HP equal to cost → apply effect to enemy or self → discard card
- Attack cards play `sfx-attack-soft`, deal damage, flash enemy red
- Cannot play a card whose cost would reduce HP to 0 or below (prevent suicide play)
- **Verify in browser:** click attack card → HP goes down, enemy HP goes down

### 2.7 — Enemy turn
- After the player ends their turn (or hand empties), enemy plays `attack` animation and deals fixed damage
- Player flashes red on hit; `sfx-player-damage` plays
- New hand drawn for the player on next turn
- **Verify in browser:** end turn → enemy attacks visibly → new hand drawn

### 2.8 — Win / lose
- When enemy HP=0 → play `death` anim, then transition to a victory placeholder screen (`screen-victory`)
- When player HP=0 → demon plays `death` anim, transition to game over (`screen-loss`)
- Click anywhere on victory/loss → return to TitleScene
- **Verify in browser:** burn enemy down → victory; let enemy hit you to 0 → game over

---

## Phase 3 — Card variety

### 3.1 — Heal cards
- At least 2 heal cards in the seed deck (cost 1 heal 4, cost 3 heal 12)
- Heal anim: green sparkle particle burst on the player; `sfx-attack-fire` repurposed (or any soft sfx)
- Cannot overheal past `MAX_HP`
- **Verify in browser:** play heal card → HP up, capped at max

### 3.2 — Block cards
- Block adds a temporary `shield` value, reduced first by next damage taken
- HUD shows shield as a small icon next to HP
- Shield clears at the start of the player turn (single-turn shield)
- **Verify in browser:** play block, take a hit → shield absorbs; turn over → shield cleared

### 3.3 — Multi-target / draw cards
- One AoE attack card (hits all enemies) — for now still single enemy, but the API is multi-target
- One `draw 2` card — adds two cards to hand instantly
- **Verify in browser:** AoE card plays without error; draw card increases hand count

---

## Phase 4 — Combo system

### 4.1 — Combo state machine
- Tracks `lastCardCost`. If next-played card cost = `lastCardCost + 1`, increment `comboTier` (max 5).
- Any other cost (including 0 or skip) resets combo to 0.
- Pure unit tests for combo transitions across the 1→2→3→4→5 sequence and reset cases.
- **Verify in browser:** dev console logs combo tier on each card play

### 4.2 — Combo HUD
- Combo counter UI top-center using `icon-combo`, shows `Combo x N` at `comboTier > 0`
- Card just-played briefly tints gold if combo advanced
- **Verify in browser:** play 1 → 2 → 3 in order → combo tier counts up visually

### 4.3 — Combo damage scaling
- Attack cards deal extra damage = `comboTier * 2`
- Tooltip on hover shows base + combo bonus damage
- **Verify in browser:** play 1→2→3→4→5 → final card deals visibly more damage than base

---

## Phase 5 — Run structure

### 5.1 — Multi-fight run
- A `RunState` model tracks `level` (starts 1), `maxLevel` (5), and the current deck
- After each victory, advance level. Enemy choice scales: skull → bear → centaur → cerberus → final boss
- Player keeps remaining HP between fights (no full heal)
- **Verify in browser:** beat skull → enter bear fight, HP carries over

### 5.2 — Card reward screen
- After each victory (except last), present 3 random cards via `card-blank` + `paper-special`
- Click one → adds to deck; "Skip" button is also valid
- Plays `sfx-ui-reward` and `sfx-ui-booster`
- **Verify in browser:** beat enemy → reward screen → pick card → next fight has new card available

### 5.3 — Final boss
- Level 5 = final boss (`boss-final-1` static image, scaled appropriately)
- Boss has 80 HP, deals 8 damage per turn, gets a special "Apocalypse" attack at HP < 40 (deals 14)
- Defeat boss → run-complete screen (`screen-victory`) + `sting-win` + `music-boss` plays during fight
- **Verify in browser:** reach level 5 → fight boss with phase change → win → run-complete screen

### 5.4 — Restart loop
- Run-complete and game-over both go back to TitleScene with reset state
- "Start Run" rebuilds a fresh starter deck
- **Verify in browser:** finish or die → click → fresh run available

---

## Phase 6 — Polish

### 6.1 — VFX pass
- Card-play swoosh: card scales up and fades out as it leaves the hand
- Damage numbers float up from the hit target
- Combo-bonus damage uses a different colour (gold)
- **Verify in browser:** every card play has a clear visual reaction

### 6.2 — Audio pass
- Music transitions: title → main → boss with crossfade
- All UI clicks use `sfx-ui-click`; reward picks use `sfx-ui-choose`
- Volume slider on title screen (master volume only)
- **Verify in browser:** music changes per scene; SFX consistent

### 6.3 — Tutorial / story bumper
- On first run, show `screen-story` for 4 seconds with intro text before TitleScene
- Skip button if click anywhere
- **Verify in browser:** first load → story screen → title

---

## Definition of Done (per sub-phase)

A sub-phase is complete when:
1. Implementation runs without console errors
2. `npm run typecheck` passes
3. `npm run test` passes (if pure logic was added)
4. Playwright verification screenshots show the feature working
5. A line is added to the Iteration Log in `PHASE_TRACKER.md`

## Constants (used across phases)

- Player starting HP / max HP: 80
- Starter deck size: 10 cards
- Hand size per turn: 5
- Run length: 5 levels (4 fights + 1 boss)
- Combo cap: tier 5
- Combo bonus damage: `2 * tier`
