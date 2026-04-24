# Roadmap — Oak Woods: Castle Crashers-style Beat 'em Up

**Vision:** Transform the current side-scrolling platformer into a 4-player cooperative 2.5D beat 'em up inspired by Castle Crashers. Players walk on an X (horizontal) / Z (depth) plane, clear arena waves, and progress through stages.

**Stack:** Phaser 3 + TypeScript + Vite (client), Colyseus + Node (server). Server is authoritative for positions, enemies, and combat resolution. Assets reuse existing Oak Woods spritesheets.

**Core pivot from platformer:**
- Remove gravity + jumping ground collision. Movement is 8-directional on XZ plane.
- Camera does not infinite-scroll — each stage is a fixed-width arena chain.
- Sprites are depth-sorted by Z so characters "in front" overlap those behind.
- Max 4 players (was 8). Shared enemy pool, shared HP damage, shared victory.

---

## Phase 1: 2.5D Movement Foundation

Goal: Characters move 8-directional on an XZ ground plane. No gravity. Depth sorting works.

### 1.1: XZ-Plane Player Movement
- Add `z` axis to PlayerState (depth position, 0 = back row, 100 = front row).
- Remove gravity from client Arcade physics (or switch to overhead kinematic movement).
- Arrow keys move player 8-way on XZ. Velocity speed constant ~100 px/s.
- `facing` becomes left/right only (1-bit) — up/down movement does not flip sprite.
- Sprite rendered at screen position `(worldX, baseY - z)` where `baseY` is the ground plane anchor.
- Remove the "jump" / "fall" animation states; only idle / run / attack / death.
- Server clamps Z to `[0, 100]` (stage depth).
- Status: Done (2026-04-24) — Playwright verification deferred.

### 1.2: Depth Sorting
- All entities (players, enemies, decorations) have a `depth` set to their Z value so nearer sprites render above farther ones.
- Update every frame in client.
- Decorations that should always be background (parallax layers, shop, fences) sit at fixed depths.
- Status: Not started

### 1.3: Arena-Bound Stage (single arena)
- Replace the 500-tile infinite ground with a fixed-width arena: 640 px wide × 100 Z-deep.
- Draw a ground plane (tile pattern) covering the arena, with foreground/background walls or scenery above and below the walkable Z-band.
- Camera is world-bounded to the arena; no scroll-ahead.
- Remove the infinite-ground generator from `GameScene.update`.
- Status: Not started

---

## Phase 2: Beat 'em Up Combat

Goal: Server-authoritative combat with combo attacks and Z-aware hitboxes.

### 2.1: Z-Aware Attack Resolution
- Server `resolvePlayerAttacks` and enemy `applyEnemyHit` use both X **and** Z overlap (not only Y) so attacks only connect to targets on the same depth band (±20 Z).
- Enemy AI chase and patrol uses XZ distance too (move enemy's Z toward nearest player's Z).
- Status: Done (2026-04-24) — Playwright verification deferred.

### 2.2: Light Combo (3-hit chain)
- Pressing X within 400ms of previous attack chains to hit 2, then hit 3.
- Server tracks combo count per player (`comboStep: 0|1|2`) and resets after timeout.
- Third hit deals 1.6× damage and pushes the enemy farther.
- Client animation: reuse attack anim frames for all 3 hits for now (can swap later).
- Status: Not started

### 2.3: Heavy Attack (launch / knockback)
- New key: `C` (heavy attack). Longer windup, bigger damage, strong knockback on X (away from attacker) and slight Z push.
- Server message `heavyAttack`, separate hitbox + cooldown.
- Status: Not started

---

## Phase 3: Arena Wave System

Goal: Enemies spawn in waves, camera locks until wave cleared, then stage progresses.

### 3.1: Wave Spawning
- Replace the fixed `ENEMY_SPAWN_PLAN` with a `WaveConfig[]` per arena.
- Each wave specifies list of enemies + their spawn (x, z) positions.
- Server spawns wave when arena is entered; spawns next wave when current is clear.
- Status: Not started

### 3.2: Stage Gate + Camera Lock
- Stage = sequence of 3 arenas separated by gates.
- Camera locked to current arena until all waves cleared.
- On clear, gate opens and players can walk right into the next arena.
- Server state includes `currentArenaIndex` and `arenaPhase: "fighting" | "cleared"`.
- Status: Not started

### 3.3: Stage Victory
- After final arena clears, `phase = "victory"` and players see stage-clear screen (reuse existing end screen).
- Pressing R restarts the stage (resets arena index and respawns enemies).
- Status: Not started

---

## Phase 4: Four-Player Co-op

Goal: Up to 4 players with character select and shared lives.

### 4.1: Character Select Screen
- New scene `CharacterSelectScene` between Boot and Game.
- 4 tinted variants of the existing char-blue spritesheet (blue, red, green, yellow).
- Each connected client picks one unclaimed character; claim is reflected in server state.
- "Ready" toggle; game starts when all connected players are ready.
- Status: Not started

### 4.2: Max 4 Slots + HUD Roster
- Server `maxClients = 4`.
- Client HUD shows up to 4 player portraits with HP bars (stacked vertically left side).
- Status: Not started

### 4.3: Respawn & Revive
- On HP 0, player ragdolls ("downed" state, not dead). Remains at current position, can be revived.
- Teammate walks within 16 px for 2 s to revive (50% HP).
- If all players are downed simultaneously, stage fails → "GAME OVER" screen, R to restart stage.
- Status: Not started

---

## Phase 5: Polish & Feel

Goal: Ship-quality juice. This phase is the victory lap.

### 5.1: Hitstop & Screen Shake
- 60 ms hitstop (freeze server & client frames) on successful hit.
- Camera shake scaling with damage dealt.
- Status: Not started

### 5.2: Damage Numbers + Combo Counter
- Client spawns floating damage numbers above targets on hit.
- Combo counter HUD ("3-HIT COMBO!") appears when combo reaches 2+, fades after 1 s of inactivity.
- Status: Not started

### 5.3: Sound Effects
- Hit impacts, attack swings, enemy death, stage-clear fanfare.
- Use existing asset library sfx.
- Status: Not started

---

## Out of Scope (for this milestone)

- Ranged magic attacks / spells
- Weapon pickups
- Character-unique movesets
- Save/load progress
- Multiple stages (only one stage × 3 arenas for now)
- Mobile / touch controls
