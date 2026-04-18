# Crystal Legends -- FF3-Style Pixel Art RPG

## Overview

A classic Final Fantasy 3-inspired turn-based RPG built with Phaser 4, Vite, and TypeScript. The player selects a party of 4 heroes from available classes, explores a top-down overworld, fights random encounters using classic turn-based combat, levels up, and defeats bosses to progress through the story.

## Tech Stack

- **Engine**: Phaser 4 (WebGL-first)
- **Bundler**: Vite
- **Language**: TypeScript
- **Physics**: Arcade (overworld movement only)
- **Rendering**: Standard game objects + pixel art rounding

## Game Config

```typescript
{
  type: Phaser.WEBGL,
  width: 480,
  height: 320,
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 } } }
}
```

Resolution 480x320 gives a 3:2 retro feel at a comfortable pixel density for the sprite sizes we have.

## Scene Flow

```
BootScene -> TitleScene -> PartySelectScene -> OverworldScene <-> BattleScene
                                                               -> VictoryScene
                                               OverworldScene -> PauseMenuScene (overlay)
                                               BattleScene    -> GameOverScene
```

## Asset Mapping

### Hero Classes -> Battle Sprites

Each selectable class portrait maps to an animated unit spritesheet for battle:

| Class       | Portrait                  | Battle Sprite                  | Frame Size |
|-------------|---------------------------|--------------------------------|------------|
| Fighter     | class_fighter_1.png       | Red_Warrior_Warrior_*          | 192x192    |
| Mage        | class_mage_1.png          | Blue_Mage_Mage_*              | 128x128    |
| Paladin     | class_paladin_1.png       | Yellow_Knight_Knight_*         | 192x192    |
| Rogue       | class_rogue_1.png         | Black_Pawn_Pawn_*              | 192x192    |
| Priest      | class_priest_1.png        | Blue_Monk_*                    | 192x192    |
| Valkyrie    | class_valkyrie_1.png      | Red_Archer_Archer_*            | 192x192    |

### Enemy Tiers

| Tier     | Enemies                                              | Area         |
|----------|------------------------------------------------------|--------------|
| Tier 1   | Gnome, Skull, Snake, Spider, Lizard                  | Forest       |
| Tier 2   | Gnoll, Bear, Panda, Shaman, Thief                    | Mountains    |
| Tier 3   | Werewolf, Cerberus, Pyromancer, Skeleton Mage        | Dark Lands   |
| Boss 1   | Minotaur (Agna avatar)                               | Forest end   |
| Boss 2   | Demon (Final Boss avatar)                            | Mountains end|
| Boss 3   | Headless Horseman (Simon avatar)                     | Dark Lands   |

### Spells

| Spell     | Icon                    | Target  | Element   | Effect          |
|-----------|-------------------------|---------|-----------|-----------------|
| Fire      | fire_spell.png          | 1 enemy | Fire      | Damage          |
| Blizzard  | ice_spell.png           | 1 enemy | Ice       | Damage          |
| Thunder   | lightning_spell.png     | 1 enemy | Lightning | Damage          |
| Cure      | healing_spell.png       | 1 ally  | Holy      | Restore HP      |
| Poison    | poison_dagger.png       | 1 enemy | Dark      | Damage + DoT    |
| Protect   | fortify_spell.png       | 1 ally  | None      | +DEF buff       |

### Music

| Context        | Track                    |
|----------------|--------------------------|
| Title screen   | title.mp3                |
| Overworld      | main.mp3                 |
| Battle         | medieval_soundtrack.mp3  |
| Boss           | boss.mp3                 |
| Victory        | win_sting.mp3            |
| Game Over      | game_over_sting.mp3      |

## Combat System -- Classic Turn-Based

1. **Command Phase**: Player selects actions for all 4 party members (Attack / Magic / Item / Defend)
2. **Target Phase**: After choosing action, select target (enemy for attacks, ally for heals)
3. **Execution Phase**: All actions execute in SPD order (highest first). Enemies act based on simple AI.
4. **Resolution**: Check for victory (all enemies dead) or defeat (all party dead). Loop back to Command Phase if neither.

### Damage Formula

```
Physical: damage = ATK * 2 - DEF + random(-2, 2)
Magical:  damage = MAG * 2.5 - RES/2 + random(-3, 3)
Healing:  heal   = MAG * 2 + random(0, 5)
```

### Stats Per Class

| Class    | HP  | MP  | ATK | DEF | MAG | SPD | Role         |
|----------|-----|-----|-----|-----|-----|-----|--------------|
| Fighter  | 120 | 10  | 14  | 12  | 3   | 8   | Physical DPS |
| Mage     | 60  | 50  | 4   | 5   | 15  | 7   | Magic DPS    |
| Paladin  | 100 | 20  | 10  | 15  | 8   | 5   | Tank/Hybrid  |
| Rogue    | 70  | 15  | 12  | 6   | 5   | 14  | Fast DPS     |
| Priest   | 80  | 45  | 5   | 8   | 13  | 6   | Healer       |
| Valkyrie | 90  | 25  | 11  | 10  | 9   | 10  | Balanced     |

### Level Up

XP required per level: `level * 100`. On level up: each stat grows by a class-specific amount (e.g., Fighter gets +12 HP, +1 MP, +2 ATK, +2 DEF, +0 MAG, +1 SPD).

## Overworld

- Top-down view using Tiny Swords tileset (64x64 tiles)
- Player represented by a single sprite walking in 4 directions
- Camera follows player with smooth scrolling
- Collision with solid tiles (water, walls, rocks)
- Area transitions at map edges
- NPCs are stretch goals, not MVP
- Random encounters trigger after N steps (random range per area)

## UI Layout

### Battle Screen (480x320)

```
+------------------------------------------------+
|                                                |
|  [Enemy1]  [Enemy2]  [Enemy3]                  |
|                                                |
|                         [Hero4] [Hero3]        |
|                         [Hero2] [Hero1]        |
|                                                |
+------------------------------------------------+
| [Portrait1] HP ████████ | Attack  | Magic     |
| [Portrait2] HP ████████ | Item    | Defend    |
| [Portrait3] HP ████████ |                     |
| [Portrait4] HP ████████ |                     |
+------------------------------------------------+
```

Bottom panel: party status on left (portraits + HP/MP bars), command menu on right.

### Pause Menu (overlay on overworld)

```
+------------------+
| Party Status     |
| Items            |
| Save (stretch)   |
| Quit             |
+------------------+
```
