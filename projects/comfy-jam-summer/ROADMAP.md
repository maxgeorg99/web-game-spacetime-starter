# Sandcastle TD — Roadmap

## Architecture Overview

```
WaveSystem (wave progression, liar intel, spawn config)
    │
    ├─► EnemySystem (creates Enemy entities, dynamic spawn positions)
    │       │
    │       └─► PathfindingSystem (BFS on 20x16 obstacle grid)
    │
    ├─► HudOverlay (dynamic panel: wave #, enemy counts, intel direction)
    │
    └─► BuildSystem (placement ↔ pathfinding validation, structure HP)
    
TowerSystem (each frame)
    │
    ├─► scans EnemySystem for targets in range
    ├─► selects target per tower's strategy (closest/farthest/mostHP/leastHP)
    └─► spawns Projectile toward target
```

---

## Phase 1 — Pathfinding + Structure HP

### New Files

| File | Purpose |
|---|---|
| `src/systems/PathfindingSystem.ts` | BFS pathfinding on 20x16 grid, obstacle tracking, path recalculation |

### Subtasks

- [ ] **1.1** Create `PathfindingSystem.ts`
  - `walkable: boolean[][]` — 20×16 grid, `false` = ocean/coast/occupied
  - `markBlocked(col, row)` / `markOpen(col, row)` — toggle walkability
  - `findPath(fromCol, fromRow, toCol, toRow): {col,row}[] | null` — BFS returning waypoint list (includes start). Returns `null` if no path
  - `findNearestReachable(fromCol, fromRow, toCol, toRow): {col,row}` — when no full path exists, returns closest reachable cell to target (enemy uses this to approach blocked area)
  - `hasPathFromAnyEdge(toCol, toRow): boolean` — checks if at least one spawn tile on any edge can BFS to target
  - `canPlaceWall(col, row): boolean` — before placing a wall, verify at least one spawn edge still reaches the center

- [ ] **1.2** Modify `BuildSystem.ts` — Structure HP
  - `structureHp: Map<string, number>` — HP per placed object, keyed by `tileKey(col,row)`
  - Constants: `MAX_TOWER_HP = 100`, `MAX_WALL_HP = 60`
  - `damageStructure(col, row, amount): boolean` — reduce HP, return `true` if destroyed
  - On destroy: remove sprite, free cell, notify PathfindingSystem + TowerSystem
  - HP bar visuals: small Phaser Graphics rectangle above each structure, green→yellow→red gradient
  - `repairStructure(col, row, amount)` — restore HP (for future repair mechanic)

- [ ] **1.3** Modify `BuildSystem.ts` — Pathfinding Integration
  - Hold ref to `PathfindingSystem`
  - On `placeWall()` → `pathfinding.markBlocked(col,row)` + validate with `canPlaceWall()`
  - On `placeTower()` → `pathfinding.markBlocked(col,row)` + validate
  - On `destroyAt()` → `pathfinding.markOpen(col,row)` + recalculate enemy paths
  - Reject placement if `!pathfinding.canPlaceWall(col,row)` — show red flash feedback
  - On occupancy change → notify PathfindingSystem to recalculate all active enemy paths

- [ ] **1.4** Modify `Enemy.ts` — Path Following + Attack State
  - Two states: `MOVING` (following waypoints) vs `ATTACKING` (targeting a structure)
  - Replace `dirX/dirY` with `path: {col,row}[]` waypoint array
  - `updateMoving(delta)`: move toward next waypoint world position, pop when within 4px
  - `updateAttacking(delta)`: deal `attackDamage * delta/1000` to target structure each frame
  - `attackTarget: {col,row}` — the wall/tower being attacked
  - `attackDamage: number` — DPS against structures
  - Face movement direction / attack direction (reuse `setFlipX`)
  - Play walk animation when MOVING, attack animation when ATTACKING
  - When path is null → switch to ATTACK state, target nearest blocked structure
  - When structure destroyed → request new path from PathfindingSystem

- [ ] **1.5** Enemy Attack Stats
  | Type | Attack DPS |
  |---|---|
  | Paddlefish | 10 |
  | Harpoonfish | 15 |
  | Turtle | 5 |
  | Snake | 8 |

- [ ] **1.6** Wire in `GameScene.ts`
  - Instantiate `PathfindingSystem`, pass to `BuildSystem` and `EnemySystem`

---

## Phase 2 — Tower + Weapon System

### New Files

| File | Purpose |
|---|---|
| `src/config/WeaponConfig.ts` | Weapon stat definitions |
| `src/entities/Tower.ts` | Tower entity with weapon, targeting strategy, cooldown |
| `src/entities/Projectile.ts` | Projectile entity with tracking, damage, FX |
| `src/systems/TowerSystem.ts` | Manages all towers, auto-attack loop, projectile spawning |

### Subtasks

- [ ] **2.1** Create `WeaponConfig.ts`
  ```ts
  { name, icon, fireRate, damage, projectileSpeed, range, splash?, knockback? }
  ```
  | Weapon | Fire Rate | Damage | Speed | Range | Special |
  |---|---|---|---|---|---|
  | Watergun | 0.4s | 5 | 300 | 150px | — |
  | Coconut | 1.5s | 25 | 200 | 180px | Splash 60px |
  | Volleyball | 0.7s | 10 | 250 | 160px | Bounces to next target (max 2) |
  | Bazooka | 2.0s | 40 | 180 | 200px | Knockback 30px |

- [ ] **2.2** Create `Tower.ts`
  - `col, row, weaponType, aimingStrategy, lastFireTime, range`
  - `canFire(now): boolean` — check cooldown
  - `fire()` — reset `lastFireTime`
  - `aimingStrategy: "closest" | "farthest" | "mostHp" | "leastHp"`
  - `pickTarget(enemies: Enemy[]): Enemy | null` — filter by range, sort by strategy, return best

- [ ] **2.3** Create `Projectile.ts`
  - `sprite, speed, damage, target: Enemy, splash?, knockback?`
  - Fires from tower position toward target position
  - `update(delta): boolean` — lerp toward target, check distance < 12px → deal damage, return `true` (dead)
  - On hit: `target.hp -= damage`, destroy sprite
  - Splash: find enemies within splash radius, deal reduced damage
  - Knockback: push target away from impact point
  - Volleyball bounce: on hit, find next nearest enemy, re-target (max 2 bounces)

- [ ] **2.4** Create `TowerSystem.ts`
  - `towers: Map<string, Tower>` keyed by grid tileKey
  - `addTower(col, row): Tower` — create tower with now weapon
  - `removeTower(col, row)` — remove from map, destroy
  - `setWeapon(col, row, weapon: string)` — change tower weapon type
  - `setStrategy(col, row, strategy: string)` — change tower aiming strategy
  - `update(delta, enemies: Enemy[])` — for each tower, if cooldown ready → pick target → spawn Projectile
  - `projectiles: Projectile[]` — update all, remove dead ones
  - draw selected weapon on top of the Sandtower sprite to show which weapon is used

- [ ] **2.5** Modify `WeaponWheel.ts` — Per-Tower Weapon + Strategy Selection
  - Selection callback now passes `{ weaponLabel: string }`
  - After weapon pick, show a smaller sub-wheel or toggle for strategy (4 options)
  - Or: left-click weapon = assign, right-click weapon = cycle strategy for that weapon
  - Store selected strategy per tower in TowerSystem

- [ ] **2.6** Wire in `GameScene.ts`
  - Instantiate `TowerSystem`, pass to `BuildSystem`
  - `BuildSystem.onTowerClick` → open WeaponWheel for that tower
  - `BuildSystem.onTowerPlace` → `TowerSystem.addTower(col, row)`
  - `BuildSystem.onTowerDestroy` → `TowerSystem.removeTower(col, row)`
  - `update()` calls `towerSystem.update(delta, enemySystem.getEnemies())`

---

## Phase 3 — Wave System

### New Files

| File | Purpose |
|---|---|
| `src/config/WaveConfig.ts` | Wave definitions with enemy composition, spawn edges, build time, intel reliability |
| `src/systems/WaveSystem.ts` | Wave progression state machine, build phase timer, intel generation |

### Subtasks

- [ ] **3.1** Create `WaveConfig.ts`
  ```ts
  interface WaveEnemy {
    type: "paddlefish" | "harpoonfish" | "turtle" | "snake";
    count: number;
    edges: ("north" | "south" | "east" | "west")[];
  }
  
  interface WaveDef {
    wave: number;
    enemies: WaveEnemy[];
    buildTimeSec: number;
    intelReliability: number;   // 0.65–0.85 — chance intel is correct
    speedMult: number;          // 1.0 + wave * 0.08
    hpMult: number;             // 1.0 + wave * 0.1
  }
  ```
  - Define 10+ waves with scaling difficulty
  - Wave 1: 3 paddlefish from north, build 15s, 85% reliability
  - Wave 5: 5 paddlefish + 3 harpoonfish from N+E, 4 turtles from W, build 10s, 75% reliability
  - Wave 10: massive mixed spawn from all 4 edges, build 5s, 65% reliability

- [ ] **3.2** Create `WaveSystem.ts`
  - States: `BUILD_PHASE` → `SPAWNING` → `WAITING` → (loop)
  - `BUILD_PHASE` — countdown timer from `buildTimeSec`, player can place/destroy freely
  - `SPAWNING` — spawn enemies from configured edges with drip-feed timing (e.g., 800ms between each)
  - `WAITING` — all wave enemies spawned, wait until all dead → advance to next wave
  - `currentWave: number`, `wavesRemaining: WaveEnemy[]`
  - `startNextWave()` — advance wave counter, pick config, begin build phase
  - `onEnemyDied()` — notify when enemy killed, check if wave complete
  - `update(delta)` — state machine tick
  - `isBuildPhase(): boolean` — for BuildSystem to check (disable placement during spawning?)
  - Intel generation: `getIntel(): { direction: string, enemyCounts: {type,count}[] }`
    - Roll `Math.random() < intelReliability`
    - If pass → return true direction + true counts
    - If fail → pick a wrong direction + optionally reduce displayed counts by 1-3

- [ ] **3.3** Modify `EnemySystem.ts`
  - Remove hardcoded spawn interval + type cycling + fixed spawn columns
  - New method: `spawnWaveBatch(enemies: WaveEnemy[], speedMult, hpMult)` — called by WaveSystem
  - Spawn enemies at random positions within configured edges
  - Expose `getEnemies(): Enemy[]` for TowerSystem + WaveSystem
  - Remove `EnemyType` interface duplication — import from shared config
  - Keep animation creation

- [ ] **3.4** Modify `HudOverlay.ts` — Dynamic Wave Panel
  - Add dynamic text objects for:
    - Wave number (e.g., "WAVE 3")
    - Direction intel (e.g., "INCOMING FROM NORTH")
    - Enemy avatar grid with real counts (subject to liar mechanic)
    - Build phase countdown timer
  - Method `updateWaveInfo(intel)` — refresh displayed counts + direction
  - Method `updateBuildTimer(secondsLeft)` — update countdown text
  - Show "BUILD PHASE" text during build phase, hide during combat
  - Resource counters (gold/shells) remain static for now

- [ ] **3.5** Wire in `GameScene.ts`
  - Instantiate `WaveSystem`, pass refs to `EnemySystem`, `HudOverlay`
  - Call `waveSystem.startNextWave()` on game start
  - `update()` calls `waveSystem.update(delta)`

---

## Phase 4 — Spawn Locations

### Subtasks

- [ ] **4.1** Define spawn points in `constants.ts`
  ```ts
  export const SPAWN_EDGES: Record<string, { col: number; row: number }[]> = {
    north: [{ col: 7, row: 0 }, { col: 10, row: 0 }, { col: 13, row: 0 }],
    south: [{ col: 7, row: 15 }, { col: 10, row: 15 }, { col: 13, row: 15 }],
    west:  [{ col: 0, row: 6 }, { col: 0, row: 8 }, { col: 0, row: 10 }],
    east:  [{ col: 19, row: 6 }, { col: 19, row: 8 }, { col: 19, row: 10 }],
  };
  ```

- [ ] **4.2** Use per-wave spawn edges in `WaveSystem.ts`
  - Each `WaveEnemy` config specifies which edges to use
  - `EnemySystem.spawnWaveBatch()` picks random spawn points from the configured edges
  - Same type can spawn from different edges simultaneously (flanking)

---

## Phase 5 — Liar Mechanic Integration

### Subtasks

- [ ] **5.1** Intel lies in `WaveSystem.ts`
  - Per-wave `intelReliability` (0.65–0.85, decreasing over waves)
  - On wave start, roll: if fail, generate false intel
  - False direction: pick a random edge that is NOT in the actual spawn edges
  - False counts: reduce displayed enemy count by 1-3 per type (never show 0 when >0 actually spawn)
  - `getIntel()` returns the potentially-false data for HUD display
  - `getActualSpawns()` returns the real config for EnemySystem

- [ ] **5.2** Display lies in `HudOverlay.ts`
  - Panel shows intel direction text (may be wrong)
  - Enemy avatar counts from intel (may be undercounted)
  - Player only discovers truth when enemies arrive from unexpected directions
  - Visual: add a subtle "signal strength" icon that hints at reliability? (optional)

- [ ] **5.3** Twist ideas (optional polish)
  - "Decoy signal" — a wave that announces but no enemies come (rare, 5% chance)
  - "Double bluff" — intel says NORTH, enemies come NORTH (just kidding they're right)
  - Phone icon shakes/flashes when the intel is wrong

---

## Phase 6 — Retro Dialog System (Lifeguard Tutorial)

### New Files

| File | Purpose |
|---|---|
| `src/systems/DialogBox.ts` | Retro RPG-style dialog box with portrait, typewriter text, click-to-advance |
| `src/config/DialogConfig.ts` | Lifeguard dialogue scripts per trigger event (some correct, some misleading) |

### Game Design
Chad the lifeguard — stupid but good-looking — gives the player instructions via retro-style text boxes. He's vaguely helpful but frequently wrong, tying into the jam's "mislead the player" theme.

### Subtasks

- [X] **6.1** Add lifeguard assets to manifest
  - `portrait-lifeguard` → `assets/sprites/characters/classes/class_athlete_1.png`
  - `ui-paper` → `assets/sprites/ui/papers/RegularPaper.png`

- [X] **6.2** Create `DialogBox.ts`
  - Retro RPG text box at bottom of screen (640×140px)
  - Dark background with colored accent bar + border (drawn with Phaser Graphics)
  - Portrait frame on left (72×72px) with border
  - Speaker name tag in gold above text
  - Typewriter text reveal effect (25ms per character)
  - Click to advance: skip typing → next page → dismiss
  - Blinking "▼" continue hint when text fully revealed
  - `show(script)` — queue a dialog, plays when idle
  - `showImmediate(script)` — insert at front of queue
  - Queue system: dialogs stack and play sequentially
  - Fade in/out tweens (200ms)
  - `update(delta)` — drives typewriter animation
  - Dialog does NOT block gameplay (separate click zone)

- [X] **6.3** Create `DialogConfig.ts`
  - `DialogTrigger` type: `"game_start" | "first_tower" | "first_wall" | "wave_incoming" | "wave_clear" | "enemy_near_shell" | "game_over" | "sandwich_found"`
  - `DIALOGS` map — each trigger maps to a `DialogScript` (speaker + pages)

  **Chad's dialogues (some correct, many WRONG):**

  | Trigger | Lies/Misleading Info |
  |---|---|
  | `game_start` | "Towers only shoot to the left" — false |
  | `first_tower` | "Bazooka does zero damage" — false |
  | `first_wall` | "Enemies turn around and go home when they see walls" — false, they attack |
  | `first_wall` | "Just build a full ring of walls, you win" — false, enemies destroy walls |
  | `wave_incoming` | "My intel says NORTH" — may be wrong (liar mechanic) |
  | `wave_incoming` | "Those numbers are never wrong" — false |
  | `enemy_near_shell` | "Maybe there's a 'scare fish' button" — no such thing |
  | `game_over` | "I did tell you to build more walls" — walls wouldn't have saved you alone |
  | `sandwich_found` | "That's mine... you can have it. I already ate." — he didn't eat |

- [X] **6.4** Wire into `GameScene.ts`
  - `DialogBox` instantiated after WeaponWheel
  - `update()` calls `dialogBox.update(delta)`
  - `game_start` dialog fires 600ms after scene create
  - `first_tower` dialog fires on first tower placement (via `BuildSystem.onPlace`)
  - `first_wall` dialog fires on first wall placement (via `BuildSystem.onPlace`)

- [X] **6.5** Wire into `BuildSystem.ts`
  - Add `onPlace?: (col, row, mode)` callback — fires after tower/wall placed
  - Add `onDestroy?: (col, row)` callback — fires after object destroyed

- [X] **6.6** Future integration points
  - `wave_incoming` — trigger from WaveSystem when wave starts
  - `wave_clear` — trigger from WaveSystem when all enemies dead
  - `enemy_near_shell` — trigger when enemy enters inner ring
  - `game_over` — trigger when shells are destroyed
  - `sandwich_found` — easter egg trigger

---

## Phase 7 — Wall & Tower Snapping System

### New Files
| File | Purpose |
|---|---|
| `src/systems/SnapSystem.ts` | Standalone system that resolves connected sprite variants for adjacent structures |

### Game Design
Towers are the smart piece — they have six directional variants that adapt their edges based on adjacent walls. Walls stay dumb and never change sprite. When a wall is placed or destroyed next to a tower, the tower swaps to the correct variant automatically. Connection eligibility is defined in a single `CONNECTION_RULES` table, so adding new building types requires no changes to the snapping logic itself.

### Assets
Tower variants live in `public/assets/sprites/terrain/`. The base `Sandtower` is the isolated fallback; the six directional variants cover all valid wall connection combinations:

| File | When used |
|---|---|
| `Sandtower` | No adjacent walls (default) |
| `Sandtower-wall-up` | Wall exits top only |
| `Sandtower-wall-down` | Wall exits bottom only |
| `Sandtower-wall-left` | Wall exits left only |
| `Sandtower-wall-right` | Wall exits right only |
| `Sandtower-wall-up-left` | Walls on top and left |
| `Sandtower-wall-up-right` | Walls on top and right |

> Note: `down-left` and `down-right` combos are not supported — horizontal walls only connect at tower-body height, not at the base.

### Subtasks
- [ ] **7.1** Add `ObjectType` tracking to `BuildSystem`
  - Export `ObjectType = "tower" | "wall-h" | "wall-v"`
  - Add `typeMap: Map<string, ObjectType>` storing type per grid cell
  - Add `getType(col, row): ObjectType | null` accessor
  - Add `getSprite(col, row): Phaser.GameObjects.Image | null` accessor
  - Update `onPlace` callback signature to pass `ObjectType`
  - Store/remove type entries on place/destroy

- [ ] **7.2** Create `SnapSystem.ts`
  - `CONNECTION_RULES: Record<ObjectType, ObjectType[]>`
    - `tower` → `["wall-h", "wall-v", "tower"]`
    - `wall-h` → `["tower", "wall-h"]`
    - `wall-v` → `["tower", "wall-v"]`
  - `resolveTextureKey(type, top, bottom, left, right): string` — maps the four connection booleans directly to a sprite key
    - Tower: pick from the 7 variants above; unrecognised combos fall back to `"Sandtower"`
    - Walls: always return the same key (walls never change sprite)
  - `refresh(col, row)` — checks all four neighbours against `CONNECTION_RULES`, calls `resolveTextureKey()`, calls `sprite.setTexture()` on the cell and each affected neighbour

- [ ] **7.3** Wire into `GameScene.ts`
  - Instantiate `SnapSystem` after `BuildSystem`
  - Call `snapSystem.refresh(col, row)` in `onPlace` callback
  - Call `snapSystem.refresh(col, row)` in `onDestroy` callback (neighbours revert correctly when a connection is broken)
  
---

## File Change Summary (All Phases)

### New Files (10)
1. `src/systems/PathfindingSystem.ts`
2. `src/config/WeaponConfig.ts`
3. `src/entities/Tower.ts`
4. `src/entities/Projectile.ts`
5. `src/systems/TowerSystem.ts`
6. `src/config/WaveConfig.ts`
7. `src/systems/WaveSystem.ts`
8. `src/systems/DialogBox.ts`
9. `src/config/DialogConfig.ts`
10. `src/systems/SnapSystem.ts`

### Modified Files (7)
1. `src/entities/Enemy.ts` — path following + attack state
2. `src/systems/EnemySystem.ts` — wave-based spawning
3. `src/systems/BuildSystem.ts` — HP + pathfinding + onPlace/onDestroy + ObjectType tracking
4. `src/systems/WeaponWheel.ts` — per-tower weapon + strategy
5. `src/objects/HudOverlay.ts` — dynamic wave panel + liar intel
6. `src/scenes/GameScene.ts` — wire all new systems
7. `src/config/constants.ts` — spawn edge definitions

---

## Order of Implementation

1. **Phase 1** — Pathfinding + Structure HP (foundation for everything)
2. **Phase 2** — Tower + Weapon (enemies need something to fight against)
3. **Phase 3** — Wave System (structure the game flow)
4. **Phase 4** — Spawn Locations (small change, pair with Phase 3)
5. **Phase 5** — Liar Mechanic (polish on top of working wave system)
6. **Phase 6** — Dialog System ✅ DONE
7. **Phase 7** — Snap System
