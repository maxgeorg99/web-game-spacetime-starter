# Implementation Roadmap -- Crystal Legends

Each phase produces a visually verifiable result suitable for Ralph Loop evaluation (Implementation -> Code Review -> Playwright screenshot/interaction check).

Reference: `DESIGN.md` for full game design, asset mappings, and formulas.

---

## Phase 1: Project Scaffolding & Boot

**Goal**: Vite + Phaser 4 + TypeScript project that boots to a colored screen.

### Tasks

- [ ] 1.1 Initialize Vite project with TypeScript template in `projects/ff3-rpg/`
- [ ] 1.2 Install `phaser` (v4) as dependency
- [ ] 1.3 Create `index.html` with `<div id="game-container">` and minimal CSS (black background, centered)
- [ ] 1.4 Create `src/main.ts` with Phaser game config:
  - WebGL renderer, 480x320 resolution
  - `pixelArt: true`, `roundPixels: true`
  - Scale FIT + CENTER_BOTH
  - Arcade physics with `gravity: { y: 0 }`
- [ ] 1.5 Create `src/scenes/BootScene.ts` that:
  - Shows "Loading..." text centered on screen
  - Loads a single test asset (e.g., `class_fighter_1.png`) to verify asset path resolution
  - Logs "Boot complete" to console on load finish
- [ ] 1.6 Verify: `npm run dev` starts, browser shows the game canvas with loading text, no console errors

**Checkpoint**: Game boots, canvas renders at correct size, test asset loads without 404.

---

## Phase 2: Asset Loader & Registry

**Goal**: All game assets loaded via a manifest system, accessible across scenes.

### Tasks

- [ ] 2.1 Create `public/assets.json` manifest listing all needed assets with metadata:
  - Hero class portraits (6 images)
  - Hero battle spritesheets (6 unit types x idle/run/attack/death = 24 sheets) with frame sizes
  - Tier 1 enemy spritesheets (5 enemies x idle/attack/death = 15 sheets) with frame sizes
  - UI assets: BigBar_Base, BigBar_Fill, RegularPaper (9-slice), buttons, spell icons (6)
  - Screens: title_bg, victory_screen, loss_screen
  - Music: title, main, medieval_soundtrack, boss, win_sting, game_over_sting
  - SFX: Assasin, axe, Magic Bolt, attack_arrow (4 combat sounds minimum)
- [ ] 2.2 Update `BootScene` to:
  - Fetch and parse `assets.json`
  - Load all assets dynamically based on manifest entries
  - Show a progress bar (using BigBar_Base + BigBar_Fill once loaded, or simple rectangle initially)
  - Store manifest in `this.registry.set('manifest', manifest)`
- [ ] 2.3 Create `src/types.ts` with TypeScript interfaces for:
  - `AssetManifest`, `SpriteSheetEntry`, `ImageEntry`, `AudioEntry`
- [ ] 2.4 Verify: BootScene loads all assets without 404s, progress bar fills, console shows manifest loaded

**Checkpoint**: All assets in memory. No loading errors. Progress bar visible during load.

---

## Phase 3: Title Screen

**Goal**: Atmospheric title screen with background art, title text, and start button.

### Tasks

- [ ] 3.1 Create `src/scenes/TitleScene.ts`:
  - Display `title_bg.png` as background, scaled to fill 480x320
  - Add game title "CRYSTAL LEGENDS" as bitmap text or Phaser text (FiraSans Bold), centered top third
  - Add pulsing "Press ENTER to Start" text, centered bottom third
  - Play `title.mp3` on loop
- [ ] 3.2 Handle input:
  - ENTER key or mouse click transitions to `PartySelectScene`
  - Stop title music on transition
- [ ] 3.3 Add simple fade-out transition effect (camera fade or alpha tween)
- [ ] 3.4 Verify: Title screen renders with background, text pulses, music plays, ENTER transitions

**Checkpoint**: Title screen looks and sounds like a real game menu.

---

## Phase 4: Party Selection Screen

**Goal**: Player picks 4 heroes from 6 available classes.

### Tasks

- [ ] 4.1 Create `src/scenes/PartySelectScene.ts`
- [ ] 4.2 Display all 6 class portraits in a 3x2 grid, centered on screen
  - Each portrait rendered at ~80x92 pixels (slight scale down from 96x110)
  - Class name below each portrait (Fighter, Mage, Paladin, Rogue, Priest, Valkyrie)
- [ ] 4.3 Create `src/data/classes.ts` defining base stats per class:
  - `id`, `name`, `portrait`, `battleSpritePrefix`, `frameSize`, `baseStats: {hp, mp, atk, def, mag, spd}`
  - `levelUpGrowth: {hp, mp, atk, def, mag, spd}` (per-level stat increases)
  - `abilities: string[]` (list of spell IDs the class can use)
- [ ] 4.4 Implement selection logic:
  - Highlight on hover/keyboard navigation (arrow keys move cursor)
  - ENTER/click to toggle select (max 4). Selected portraits get a bright border or checkmark
  - Show selected count "Party: 2/4"
  - When 4 selected, show "Confirm Party" button
- [ ] 4.5 On confirm:
  - Store party data in registry: `this.registry.set('party', selectedClasses)`
  - Transition to `OverworldScene`
- [ ] 4.6 Add class stat preview panel:
  - When hovering a class, show its stats on right side using RegularPaper background
  - Display HP, MP, ATK, DEF, MAG, SPD values + class role description
- [ ] 4.7 Verify: Can navigate grid, select exactly 4, see stats, confirm transitions to next scene

**Checkpoint**: Full party selection flow works with keyboard and mouse.

---

## Phase 5: Overworld -- Basic Map & Movement

**Goal**: Top-down tilemap world the player can walk around in with collision.

### Tasks

- [ ] 5.1 Create `src/scenes/OverworldScene.ts`
- [ ] 5.2 Create a procedural tilemap (or hand-coded tile array) using `Tilemap_color1.png`:
  - 30x20 tile grid (64x64 tiles = 1920x1280 world)
  - Grass base layer, stone path, water edges
  - Collision on water and rock tiles
- [ ] 5.3 Add player sprite to overworld:
  - Use first party member's battle sprite idle animation (scaled down to ~32x32 for overworld)
  - 4-directional movement with arrow keys at constant speed
  - Flip sprite horizontally for left/right
  - Play idle animation when stationary, run animation when moving
- [ ] 5.4 Camera setup:
  - Follow player with smooth lerp (0.1)
  - Clamp to map bounds
- [ ] 5.5 Add environment decorations:
  - Place Tree1-4, Rock1-4 sprites as static obstacles with collision bodies
  - Scatter grass sprites as non-colliding decoration
- [ ] 5.6 Play `main.mp3` as overworld BGM on loop
- [ ] 5.7 Verify: Player walks on tilemap, collides with obstacles, camera follows, music plays

**Checkpoint**: Explorable overworld with collision and smooth camera.

---

## Phase 6: Random Encounter System

**Goal**: Walking triggers random battles with screen transition.

### Tasks

- [ ] 6.1 Create `src/systems/EncounterSystem.ts`:
  - Track step count (increment per N pixels of movement)
  - Random encounter check: after `minSteps` (15), each step has `encounterRate`% chance (10%)
  - Reset counter after encounter
- [ ] 6.2 Create `src/data/encounters.ts`:
  - Define encounter tables per area: `{ areaId, enemies: [{ id, weight }] }`
  - Each encounter rolls 1-3 random enemies from the table
- [ ] 6.3 Create `src/data/enemies.ts`:
  - Define enemy stats: `{ id, name, hp, atk, def, mag, spd, xpReward, goldReward }`
  - Define sprite metadata: `{ spritePrefix, frameSize, idleFrames, attackFrames, deathFrames }`
  - Start with Tier 1: Gnome, Skull, Snake, Spider, Lizard
- [ ] 6.4 Implement battle transition effect:
  - Screen flashes white 3 times (rapid alpha tween)
  - Then fade to black
  - Start `BattleScene` with encounter data passed via `scene.start('BattleScene', { enemies })`
  - Pause `OverworldScene` (don't destroy it)
- [ ] 6.5 Verify: Walking triggers encounters at random intervals, flash effect plays, transitions to BattleScene (even if BattleScene is placeholder)

**Checkpoint**: Encounter system triggers reliably with visual transition.

---

## Phase 7: Battle Scene -- Layout & Idle State

**Goal**: Battle scene renders party and enemies with idle animations, HP bars, and static UI.

### Tasks

- [ ] 7.1 Create `src/scenes/BattleScene.ts`
- [ ] 7.2 Draw battle background:
  - Simple gradient or tiled terrain strip at bottom, sky color at top
  - (Stretch: use tilemap segment as battle background)
- [ ] 7.3 Position enemy sprites on left side:
  - Receive enemy list from scene data
  - Create animated sprites with idle animation, spaced vertically
  - Scale appropriately for battle view (enemies vary 128-384px, normalize to ~80-120px display height)
- [ ] 7.4 Position party battle sprites on right side:
  - Load from registry party data
  - Create animated sprites with idle animation, stacked vertically (4 heroes)
  - Each hero ~64px display height
- [ ] 7.5 Create `src/ui/BattleHUD.ts`:
  - Bottom panel (height ~100px) with RegularPaper 9-slice background
  - Left side: 4 party member rows, each with portrait thumbnail + name + HP bar + MP bar
  - HP bar: BigBar_Base as frame, BigBar_Fill as fill (tinted green), width proportional to current/max HP
  - MP bar: same but fill tinted blue, smaller
- [ ] 7.6 Play `medieval_soundtrack.mp3` as battle BGM
- [ ] 7.7 Create animation registrations in `src/animations/registerAnimations.ts`:
  - Function to register idle/attack/death anims for a given unit sprite prefix + frame config
  - Call during BootScene or BattleScene create
- [ ] 7.8 Verify: Battle screen shows enemies on left, party on right, all idle-animating, HUD with HP/MP bars at bottom

**Checkpoint**: Battle scene looks like a proper FF3 battle with animated sprites and HUD.

---

## Phase 8: Battle System -- Command Input

**Goal**: Player can select Attack/Magic/Defend for each party member and pick targets.

### Tasks

- [ ] 8.1 Create `src/ui/BattleMenu.ts`:
  - Command window (right side of bottom panel): Attack, Magic, Item (disabled for now), Defend
  - Highlight current option, navigate with arrow keys, confirm with ENTER
  - Show which party member is choosing (highlight their row in HUD)
- [ ] 8.2 Implement target selection:
  - After choosing Attack: show cursor on enemies, arrow keys to cycle, ENTER to confirm
  - After choosing Magic: show spell submenu with available spells (from class data), then target selection
  - After choosing Defend: no target needed, auto-confirm
- [ ] 8.3 Create `src/systems/BattleStateMachine.ts` with states:
  - `COMMAND_SELECT` -- cycling through party members for input
  - `TARGET_SELECT` -- picking a target for the chosen action
  - `MAGIC_SELECT` -- picking a spell
  - `EXECUTING` -- playing out the turn (Phase 9)
  - `VICTORY` / `DEFEAT` -- end states
- [ ] 8.4 Create `src/types/battle.ts`:
  - `BattleAction: { actorId, type: 'attack'|'magic'|'defend'|'item', targetId?, spellId? }`
  - `BattleActor: { id, name, stats, currentHp, currentMp, isEnemy, spriteKey }`
- [ ] 8.5 Collect actions for all 4 party members sequentially, then transition to EXECUTING state
- [ ] 8.6 Add cursor sprite (use Cursor_01.png) that points at current target during selection
- [ ] 8.7 Verify: Can navigate menus, select actions for all 4 heroes, target enemies/allies, queue fills correctly

**Checkpoint**: Full command input works with keyboard navigation and visual feedback.

---

## Phase 9: Battle System -- Turn Execution

**Goal**: Queued actions play out in speed order with animations and damage.

### Tasks

- [ ] 9.1 Create `src/systems/TurnExecutor.ts`:
  - Sort all actions (party + enemy) by actor SPD descending
  - Execute each action sequentially with async/await or tween chains
- [ ] 9.2 Implement enemy AI in `src/systems/EnemyAI.ts`:
  - Simple: each enemy picks a random living party member and attacks
  - (Stretch: healers prioritize hurt allies)
- [ ] 9.3 Implement Attack execution:
  - Attacker plays run animation toward target (tween x position)
  - Play attack animation at target position
  - Play combat SFX (Assasin.mp3 for physical)
  - Calculate damage: `ATK * 2 - DEF + random(-2, 2)`, minimum 1
  - Flash target sprite red (tint tween)
  - Show damage number floating up from target (text object with y tween + fade)
  - Update target HP bar
  - Attacker tweens back to original position, plays idle
- [ ] 9.4 Implement Magic execution:
  - Caster plays attack animation in place
  - Show spell icon briefly over target
  - Play Magic Bolt SFX
  - Calculate damage: `MAG * 2.5 - RES/2 + random(-3, 3)` or heal: `MAG * 2 + random(0, 5)`
  - Show damage/heal number (green for heal)
  - Update HP bar
- [ ] 9.5 Implement Defend:
  - Show shield icon or "Defending" text over character
  - Set defending flag (halves incoming damage this turn)
- [ ] 9.6 Handle death:
  - When HP <= 0, play death animation
  - Mark actor as dead (skip in future turns, grey out HUD row)
  - Remove from valid target list
- [ ] 9.7 After all actions execute, check win/lose:
  - All enemies dead -> transition to VICTORY state
  - All party dead -> transition to DEFEAT state
  - Otherwise -> back to COMMAND_SELECT
- [ ] 9.8 Verify: Full combat round plays out with animations, damage numbers, deaths, and state transitions

**Checkpoint**: Complete battle loop -- select actions, watch execution, see results.

---

## Phase 10: Victory & Game Over

**Goal**: Battle outcomes lead to proper reward/fail screens.

### Tasks

- [ ] 10.1 Create victory flow in BattleScene:
  - Play `win_sting.mp3`
  - Show "Victory!" text with bounce tween
  - Calculate total XP and Gold from defeated enemies
  - Display "Gained X EXP" and "Gained X Gold" text
- [ ] 10.2 Implement XP and leveling in `src/systems/LevelSystem.ts`:
  - XP to next level: `level * 100`
  - On level up: apply class growth rates to stats, restore HP/MP to max
  - Show "Level Up!" text per character that leveled
  - Show stat increases briefly
- [ ] 10.3 After victory display, return to OverworldScene:
  - `this.scene.stop('BattleScene')`
  - `this.scene.resume('OverworldScene')`
  - Party HP/MP persists (carries over from battle)
- [ ] 10.4 Create `src/scenes/GameOverScene.ts`:
  - Display `loss_screen.png` as background (or tinted dark version)
  - Play `game_over_sting.mp3`
  - Show "Game Over" text
  - "Retry" option -> restart from TitleScene
- [ ] 10.5 Verify: Victory gives XP, levels up correctly, returns to overworld. Defeat shows game over with retry.

**Checkpoint**: Full gameplay loop from overworld -> battle -> reward/fail -> back.

---

## Phase 11: Pause Menu & Stats

**Goal**: Player can pause and view party stats during overworld exploration.

### Tasks

- [ ] 11.1 Create `src/scenes/PauseMenuScene.ts` (launched as overlay):
  - ESC key pauses OverworldScene and launches PauseMenuScene
  - RegularPaper background panel, centered
  - Menu options: Party Status, Items (placeholder), Quit to Title
- [ ] 11.2 Party Status sub-screen:
  - Show each party member's portrait, name, level, and full stats
  - Show current HP/MP vs max
  - Show equipped spells list
- [ ] 11.3 Quit to Title:
  - Stop all scenes, start TitleScene
  - Reset game state
- [ ] 11.4 ESC again closes pause menu and resumes overworld
- [ ] 11.5 Verify: Pause opens/closes cleanly, stats display correctly, quit works

**Checkpoint**: Pause menu provides full party overview.

---

## Phase 12: Multiple Areas & Progression

**Goal**: 3 explorable areas with different enemies and a boss gate.

### Tasks

- [ ] 12.1 Create `src/data/areas.ts`:
  - Area 1 "Emerald Forest": Tier 1 enemies, green tilemap (color1)
  - Area 2 "Iron Mountains": Tier 2 enemies, brown tilemap (color2)  
  - Area 3 "Shadow Lands": Tier 3 enemies, dark tilemap (color3)
- [ ] 12.2 Create 3 tilemaps (procedural or hand-coded arrays):
  - Each 30x20 tiles with unique layout
  - Exit zones at edges connecting areas (e.g., right edge of Forest -> left edge of Mountains)
- [ ] 12.3 Implement area transitions:
  - Player touches exit zone -> fade out -> load new area tilemap -> position player at entry point -> fade in
  - Update BGM if different (same track for all overworld in MVP)
  - Update encounter table to new area's enemies
- [ ] 12.4 Add Tier 2 enemies to `enemies.ts`:
  - Gnoll, Bear, Panda, Shaman, Thief with stats and sprite metadata
- [ ] 12.5 Add Tier 3 enemies:
  - Werewolf, Cerberus, Pyromancer, Skeleton Mage with stats and sprite metadata
- [ ] 12.6 Load new enemy spritesheets in manifest (or lazy-load per area)
- [ ] 12.7 Verify: Can walk between 3 areas, each has different enemies, difficulty scales

**Checkpoint**: Multi-area exploration with progressive difficulty.

---

## Phase 13: Boss Fights

**Goal**: Each area has a boss encounter with unique behavior.

### Tasks

- [ ] 13.1 Add boss trigger zones in each area map (a special tile or area near the exit)
- [ ] 13.2 Create boss enemy definitions in `enemies.ts`:
  - Boss 1 "Minotaur": HP 300, high ATK, uses Minotaur sprites, drops 200 XP
  - Boss 2 "Demon Lord": HP 500, balanced, uses Demon sprites, drops 400 XP
  - Boss 3 "Headless Horseman": HP 800, high SPD, uses Headless_Horseman sprites, drops 800 XP
- [ ] 13.3 Boss encounters are fixed (not random):
  - Walking into boss zone triggers mandatory battle
  - Boss appears alone (single large enemy)
- [ ] 13.4 Switch to `boss.mp3` for boss battles
- [ ] 13.5 Boss AI in `EnemyAI.ts`:
  - Bosses use a simple pattern: alternates between normal attack and a strong attack (double damage)
  - Below 50% HP: attacks twice per turn
- [ ] 13.6 After defeating a boss:
  - Show boss-specific victory message
  - Unlock next area (or show ending after Boss 3)
- [ ] 13.7 After Boss 3 defeated, show `victory_screen.png` as ending screen with "Congratulations!" text
- [ ] 13.8 Verify: Boss triggers work, boss fights are harder, defeating all 3 shows ending

**Checkpoint**: Complete game from start to finish with 3 boss fights.

---

## Phase 14: Polish & Juice

**Goal**: Sound effects, screen transitions, damage numbers, and visual flair.

### Tasks

- [ ] 14.1 Add combat SFX to all attack types:
  - Physical attacks: `Assasin.mp3`, `axe.mp3`
  - Magic: `Magic Bolt.mp3`
  - Heal: `attack_holy.ogg`
  - Enemy death: `unit_death.mp3`
  - Player damage: `player_damage.mp3`
- [ ] 14.2 Add UI SFX:
  - Menu cursor move: `click.mp3`
  - Menu confirm: `choose.mp3`
  - Level up: `level_up.mp3`
- [ ] 14.3 Improve battle transitions:
  - Overworld -> Battle: flash white 3x, then diagonal wipe to black
  - Battle -> Overworld: fade from black
- [ ] 14.4 Add floating damage numbers with style:
  - White text with black outline for physical damage
  - Red text for fire, blue for ice, yellow for lightning
  - Green text for healing
  - Numbers float up and fade out over 1 second
- [ ] 14.5 Add hit flash effect:
  - Target sprite flashes white (tint fill) for 100ms on hit
- [ ] 14.6 Add idle bounce to battle sprites:
  - Subtle y-axis sine wave on all idle battle sprites (amplitude 2px, period 2s)
- [ ] 14.7 Camera shake on critical hits or boss attacks (intensity 3, duration 200ms)
- [ ] 14.8 Verify: Game feels juicy -- sounds on every action, visual feedback on every hit, smooth transitions

**Checkpoint**: Game feels polished and responsive.

---

## Stretch Goals (Post-MVP)

These are not part of the core roadmap but are natural extensions:

- [ ] S1. Items system (potions, ethers) with inventory management
- [ ] S2. Equipment system (weapons, armor affecting stats)
- [ ] S3. Status effects (poison DoT, paralysis skip turn, blind miss chance)
- [ ] S4. More classes: Athlete, Chef, Gambler, Stoner (with unique abilities)
- [ ] S5. NPCs with dialogue in overworld
- [ ] S6. Save/Load system (localStorage)
- [ ] S7. Overworld minimap
- [ ] S8. Animated battle backgrounds
- [ ] S9. SpacetimeDB multiplayer integration (shared overworld)

---

## Ralph Loop Integration Notes

Each phase is designed for the 3-agent Ralph Loop:

1. **Implementation Agent**: Executes the tasks in order within a phase
2. **Code Review Agent**: Reviews for TypeScript errors, Phaser 4 API correctness, code quality
3. **Playwright Evaluation Agent**: Takes screenshots and verifies:
   - Correct scene renders (canvas has expected visual elements)
   - No console errors
   - Interactive flows work (keyboard input -> visual change)

**Key verification commands per phase:**
- Phase 1-3: Screenshot title screen, check canvas dimensions
- Phase 4: Screenshot party select, simulate keyboard selection
- Phase 5-6: Screenshot overworld, simulate movement, verify encounter triggers
- Phase 7-9: Screenshot battle, simulate menu navigation, verify turn execution
- Phase 10+: Full flow screenshots at each stage

**Dev server**: `npm run dev` in `projects/ff3-rpg/`
**Build check**: `npm run build` must succeed with no TypeScript errors
