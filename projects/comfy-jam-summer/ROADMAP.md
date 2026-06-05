# 🗺️ Sandcastle TD — Implementation Roadmap

> Phaser 3 + TypeScript + Vite | Browser-based Grid TD

---

## Project Setup

```bash
npm create vite@latest sandcastle-td -- --template vanilla-ts
cd sandcastle-td
npm install phaser
npm install easystarjs        # pathfinding
npm install --save-dev @types/easystarjs
```

**Folder structure:**
```
src/
  scenes/
    BootScene.ts
    GameScene.ts
    UIScene.ts
  entities/
    Enemy.ts
    Wall.ts
    Tower.ts
    Projectile.ts
  systems/
    GridSystem.ts
    PathfindingSystem.ts
    WaveSystem.ts
    EconomySystem.ts
  config/
    enemies.ts
    ammo.ts
    waves.ts
  utils/
    constants.ts
assets/
  tiles/
  sprites/
  audio/
```

---

## Phase 0 — Foundation (Day 1 Morning, ~3h)

> Goal: Phaser boots, grid renders, tiles clickable

### 0.1 Vite + Phaser Bootstrap
- [ ] `main.ts` — Phaser.Game config (800×600, WebGL, scenes)
- [ ] `BootScene.ts` — preloads placeholder assets (colored rects as textures)
- [ ] `GameScene.ts` — skeleton with `create()` / `update()`

### 0.2 Grid System
```typescript
// GridSystem.ts
export const TILE_SIZE = 40;
export enum TileType { Ocean, Beach, Sand, SandCastle }

export class GridSystem {
  grid: TileType[][];           // 2D array of tile types
  gameObjects: Map<string, any> // tile key → placed entity

  constructor(scene: Phaser.Scene, cols: number, rows: number) {}
  
  tileToWorld(col: number, row: number): { x: number, y: number }
  worldToTile(x: number, y: number): { col: number, row: number }
  isWalkable(col: number, row: number): boolean
  isBuildable(col: number, row: number): boolean
  placeEntity(col: number, row: number, entity: any): void
  removeEntity(col: number, row: number): void
}
```

- [ ] Render 20×16 grid with color-coded tiles (blue=ocean, yellow=sand, tan=beach, gold=sandcastle)
- [ ] Click to toggle wall placement (right-click to remove)
- [ ] Highlight hovered tile

### 0.3 Island Map Definition
```typescript
// Hard-code a starting island shape or generate procedurally
// Ocean ring → Beach border → Sand interior → SandCastle center
const MAP_TEMPLATE = [
  "OOOOOOOOOOOOOOOOOOOO",  // Ocean
  "OOBBBBBBBBBBBBBBBOO",  // Beach
  "OOBSSSSSSSSSSSSSBOO",  // Sand
  "OOBSSSSSSSSSSSSSB OO",
  ...
  "OOBSSSSSCSSSSSSSB OO",  // C = SandCastle
  ...
]
```

---

## Phase 1 — Enemies & Pathfinding (Day 1 Midday, ~3h)

> Goal: Enemy walks from ocean to castle following walls

### 1.1 Pathfinding System
```typescript
// PathfindingSystem.ts — wraps EasyStar.js
import EasyStar from 'easystarjs';

export class PathfindingSystem {
  private easystar: EasyStar.js;
  
  updateGrid(grid: number[][]): void    // call after wall change
  findPath(
    fromCol: number, fromRow: number,
    toCol: number, toRow: number,
    callback: (path: {x,y}[] | null) => void
  ): void
}
```

- [ ] Initialize EasyStar with walkability map (ocean + walls = blocked)
- [ ] **Recalculate paths on every wall placement/removal**
- [ ] Validate: if placement blocks ALL paths → deny placement (show red flash)

### 1.2 Enemy Base Class
```typescript
// Enemy.ts
export class Enemy extends Phaser.GameObjects.Container {
  hp: number;
  maxHp: number;
  speed: number;
  path: {x: number, y: number}[];
  pathIndex: number;
  
  followPath(delta: number): void      // move along path
  takeDamage(amount: number): void     // reduce HP, check death
  onDeath(): void                      // drop shells, remove
  
  // Visuals
  sprite: Phaser.GameObjects.Rectangle  // placeholder
  hpBar: Phaser.GameObjects.Rectangle
}
```

### 1.3 Spawn System (simple)
```typescript
// Find all ocean tiles adjacent to beach
// Pick random subset as spawn points for this wave
getSpawnPoints(count: number): {col: number, row: number}[]
```

- [ ] Enemies spawn at ocean edge, immediately request path to SandCastle
- [ ] Spawn with a short "emerging from water" animation (scale up from 0)
- [ ] Multiple enemies stagger-spawn (150ms delay each)

---

## Phase 2 — Tower & Combat (Day 1 Afternoon, ~2h)

> Goal: Tower shoots, enemies die, shells drop

### 2.1 Tower
```typescript
// Tower.ts
export class Tower extends Phaser.GameObjects.Container {
  ammoType: AmmoType;
  fireRate: number;   // ms between shots
  range: number;      // tiles
  
  findTarget(enemies: Enemy[]): Enemy | null
  shoot(target: Enemy): void
  update(time: number, delta: number): void
}
```

- [ ] Tower auto-attacks nearest enemy in range
- [ ] Range shown as circle on hover
- [ ] Fire rate indicator (fills like a progress bar on the tower)

### 2.2 Projectile System
```typescript
// Projectile.ts
export class Projectile extends Phaser.GameObjects.Rectangle {
  damage: number;
  speed: number;
  target: Enemy;
  ammoType: AmmoType;
  
  // Special behaviors per ammo type
  onHit(enemy: Enemy): void
}
```

**Ammo implementations (Phase 2 = just Water Pistol + Coconut):**
- `WaterPistol`: fast, low damage, applies "wet" slow (speed × 0.6 for 2s)
- `Coconut`: slow projectile, high damage, small AoE on impact

### 2.3 Wave System (basic)
```typescript
// WaveSystem.ts
export class WaveSystem {
  currentWave: number;
  waves: WaveConfig[];
  
  startWave(): void            // spawn all enemies for this wave
  onWaveComplete(): void       // trigger build phase
  startBuildPhase(seconds: number): void  // countdown timer
}
```

```typescript
// config/waves.ts
export const WAVES: WaveConfig[] = [
  { enemies: [{ type: 'Turtle', count: 2 }, { type: 'Paddlefish', count: 4 }] },
  { enemies: [{ type: 'Turtle', count: 3 }, { type: 'Paddlefish', count: 6 }, { type: 'Snake', count: 2 }] },
  ...
]
```

---

## Phase 3 — Economy & UI (Day 1 Evening, ~2h)

> Goal: Shells drop, player can buy walls and ammo

### 3.1 Economy System
```typescript
// EconomySystem.ts
export class EconomySystem {
  shells: number;
  
  earn(amount: number): void
  spend(amount: number): boolean   // returns false if insufficient
  canAfford(cost: number): boolean
}
```

### 3.2 HUD (UIScene — runs parallel to GameScene)
```
┌─────────────────────────────────────────────────┐
│  🐚 Shells: 120   ❤️ Pearl HP: ████░░  Wave: 2  │
├─────────────────────────────────────────────────┤
│ [Sand Wall ×∞ - 10🐚] [Driftwood - 25🐚]         │
│ [Water Pistol - 5🐚]  [Coconut ×3 - 15🐚]        │
├─────────────────────────────────────────────────┤
│         BUILD PHASE: 30s ████████████           │
└─────────────────────────────────────────────────┘
```

- [ ] Selected ammo/wall highlighted in toolbar
- [ ] Cost shown on hover
- [ ] Shell count animates when gaining/losing
- [ ] Wave forecast: "Next: 🐢×3 🐟×6 from NORTH"

### 3.3 Wall HP & Destruction
- [ ] Walls have visible crack sprites (3 damage states: fine / cracked / broken)
- [ ] When wall HP reaches 0: remove from grid, update pathfinding
- [ ] Visual: sand particles burst on destruction

---

## Phase 4 — Polish & More Content (Day 2, ~4h)

> Goal: Feels like a real game

### 4.1 Remaining Enemy Types
| Enemy | Key Behavior |
|---|---|
| 🐍 Sea Snake | Ignores wet/slow, finds narrowest path |
| 🐡 Blowfish | Explodes on death: damages adjacent walls (1 tile radius) |
| 🗡️ Swordfish | Charge attack in straight line, ignores pathfinding for 1s |

### 4.2 Remaining Ammo Types
| Ammo | Implementation note |
|---|---|
| Water Bazooka | Projectile on impact: push enemies 2 tiles back along their path |
| Beach Ball | On hit: bounces to nearest enemy within 3 tiles, max 4 bounces |
| Fishing Net | Projectile lands as AoE: all enemies in 2×2 area get `stunned` for 3s |

### 4.3 Tide Mechanic
- Every 3 waves: 1–2 beach tiles flood (become ocean)
- Existing walls on flooded tiles are destroyed
- New spawn points open up
- **Visual:** animated water flood spreading across tile (tween alpha + tint)

### 4.4 Ammo Selection UX
- Hotkeys: `1` `2` `3` `4` `5` for ammo types
- `W` for wall mode, `Esc` to deselect
- Tower shows current ammo icon + ammo count

---

## Phase 5 — Jam Constraint Integration (After Reveal)

> The constraint is announced at jam start. Keep 1–2h for adaptation.

**Preparation:** structure systems so each can be toggled:
- `TowerSystem.enabled` — can disable shooting entirely
- `EconomySystem.scarcityMode` — caps shell drops
- `WaveSystem.musicSync` — hook into Phaser audio beat detection

---

## Data Config Pattern

Keep all balance in config files — easy to tweak without touching logic:

```typescript
// config/enemies.ts
export const ENEMY_DEFS = {
  Turtle:     { hp: 80,  speed: 40,  reward: 15, size: 1.2 },
  Paddlefish: { hp: 30,  speed: 80,  reward: 8,  size: 0.8 },
  Snake:      { hp: 20,  speed: 120, reward: 10, size: 0.7 },
  Blowfish:   { hp: 45,  speed: 50,  reward: 12, size: 1.0 },
  Swordfish:  { hp: 100, speed: 150, reward: 25, size: 1.3 },
}

// config/ammo.ts
export const AMMO_DEFS = {
  WaterPistol:  { damage: 10, speed: 300, cost: 0,  fireRate: 500 },
  Coconut:      { damage: 45, speed: 180, cost: 5,  fireRate: 1500, aoeRadius: 1 },
  WaterBazooka: { damage: 20, speed: 220, cost: 8,  fireRate: 1200, knockback: 2 },
  BeachBall:    { damage: 8,  speed: 250, cost: 3,  fireRate: 800,  bounces: 4 },
  FishingNet:   { damage: 0,  speed: 200, cost: 10, fireRate: 2500, stunDuration: 3000 },
}
```

---

## Milestones / Time Budget

| Time | Milestone | Deliverable |
|---|---|---|
| +3h | Phase 0 done | Grid renders, tiles clickable |
| +6h | Phase 1 done | Enemy walks to castle, walls redirect |
| +8h | Phase 2 done | Tower shoots, enemy dies, waves loop |
| +10h | Phase 3 done | Economy works, UI complete, feels like a game |
| +14h | Phase 4 done | All enemies + ammo, tide mechanic |
| +15h | Constraint integrated | Adapted to jam reveal |
| +16h | Buffer / polish | Sound, juice, game feel |

---

## Quick Wins for "Game Feel"

These take <30min each but make a huge difference:

- **Screen shake** on coconut impact: `scene.cameras.main.shake(100, 0.01)`
- **Enemy squish** on hit: `tween scaleX 1.3, scaleY 0.7` then back
- **Shell pop** from dead enemy: small coins scatter with physics
- **Tower wind-up** before first shot: slight rotation/bob animation
- **Build phase music** shifts to calmer track; combat track kicks in on wave start
- **Wave incoming** animation: water edge ripples before enemies emerge

---

## Phaser 3 Specific Notes

```typescript
// Tilemap approach (no Tiled needed for jam)
const map = scene.make.tilemap({ 
  data: GRID_DATA,       // 2D number array
  tileWidth: TILE_SIZE, 
  tileHeight: TILE_SIZE 
});

// EasyStar integration
const easystar = new EasyStar.js();
easystar.setGrid(walkabilityGrid);  // 0 = walkable, 1 = blocked
easystar.setAcceptableTiles([0]);
easystar.findPath(sx, sy, ex, ey, (path) => { ... });
easystar.calculate();  // call in update() loop

// Depth sorting for isometric-feel layering
enemy.setDepth(enemy.y);  // enemies behind walls when above
```

---

## Assets Placeholder Strategy

During jam, use **Phaser Graphics API** for all visuals:
```typescript
// Instant placeholder sprites — no asset files needed
scene.add.graphics()
  .fillStyle(0x4CAF50).fillRect(0, 0, 32, 32)  // turtle (green square)
  .generateTexture('turtle', 32, 32);
```
Swap for real sprites when/if time allows — keeping texture keys consistent means zero code change.
