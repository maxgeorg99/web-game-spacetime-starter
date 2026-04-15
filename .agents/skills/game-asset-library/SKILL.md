---
name: game-asset-library
description: >
  Reference for the shared game asset library in assets/. Covers directory layout, sprite sheet
  conventions (frame sizes, animation states, naming), sound effect categories, terrain tilesets,
  and UI elements. Use when loading sprites, configuring animations, or wiring up audio in any
  game project built from this starter.
---

# Game Asset Library

Unified asset library sourced from two game projects (tower-defense-with-friends, vibe-survivor). All assets live under `assets/` with a category-based structure.

## Directory Layout

```
assets/
  sprites/
    characters/
      units/          # Faction-colored player units (archer, warrior, lancer, monk, etc.)
      classes/        # Survivor-style player classes (athlete, chef, mage, paladin, etc.)
    enemies/          # TD enemies + survivor monsters
    bosses/           # Boss sprites (agna, final boss, simon)
    buildings/        # Faction-colored buildings
    terrain/          # Tilesets, beach, resources (gold/meat/wood), decorations
    environment/      # Trees, rocks, sheep, structures, grass, shadow
    projectiles/      # Attack weapons, void projectiles, soul arrows
    effects/          # Particle FX (fire, lightning), agna effects, spawn indicators
    items/            # Gems, upgrades, treasure, boosters, dice
    ui/
      buttons/        # Round/square buttons in blue/red, big/small/tiny
      bars/           # Health/progress bars (base + fill)
      banners/        # Banner frames and slot displays
      ribbons/        # Colored ribbons (blue, red, purple, black, yellow)
      papers/         # Regular and special paper backgrounds
      icons/          # Game icons + spells/ and skills/ subdirs
      cursors/        # Mouse cursor sprites
      avatars/        # Human avatar portraits
      swords/         # Decorative sword icons by color
      cards/          # Card blank, curse card, curse background
      screens/        # Title, victory, loss screens, menu backgrounds
  sounds/
    music/            # Background tracks (title, main, boss, game_over, win, medieval)
    sfx/
      combat/         # Weapon strikes, arrows, magic bolts, hammers
      boss/           # Boss roars, transforms, agna phase sounds
      voice/          # Narrator lines, viberians, announcements
      ui/             # Clicks, level up, choose, rewards, upgrades
      monsters/       # Monster/animal death sounds
      environment/    # Structure breaks, castle damage, void capsules
  maps/               # Tiled .tmx map files
  fonts/              # FiraSans Regular + Bold (.ttf)
  shaders/            # fog_of_war.wgsl
```

## Sprite Sheets

### How Sprite Sheets Work

Sprite sheets are horizontal strips of animation frames. Each frame has a fixed size, and frames are laid out left-to-right. The total image width divided by the frame width gives the frame count.

```
+--------+--------+--------+--------+--------+
| frame0 | frame1 | frame2 | frame3 | frame4 |
+--------+--------+--------+--------+--------+
<-- frameWidth -->
<-------------- totalWidth = frameWidth * frameCount ------------->
```

### Loading a Sprite Sheet (Phaser Example)

```typescript
// In preload:
this.load.spritesheet('bear_idle', 'assets/sprites/enemies/Bear_Bear_Idle.png', {
  frameWidth: 256,
  frameHeight: 256
});

// In create:
this.anims.create({
  key: 'bear_idle',
  frames: this.anims.generateFrameNumbers('bear_idle', { start: 0, end: 7 }),
  frameRate: 8,
  repeat: -1
});
```

### Unit Sprite Naming Convention

**Faction units** follow: `{Color}_{Class}_{Class}_{Animation}.png`

| Pattern | Example | Frame Size |
|---------|---------|------------|
| `{Color}_{Class}_{Class}_Idle.png` | `Red_Warrior_Warrior_Idle.png` | varies |
| `{Color}_{Class}_{Class}_Run.png` | `Red_Warrior_Warrior_Run.png` | varies |
| `{Color}_{Class}_{Class}_Attack*.png` | `Red_Warrior_Warrior_Attack1.png` | varies |
| `{Color}_{Class}_{Class}_Death.png` | `Red_Warrior_Warrior_Death.png` | varies |
| `{Color}_{Class}_Avatar.png` or `{Color}_{Class}_{Class}_Avatar.png` | `Red_Pawn_Pawn_Avatar.png` | single frame |

Available factions: **Black, Blue, Purple, Red, Yellow**
Available unit types: **Archer, Dragon, Knight, Dwarf, Lancer, Mage, Monk, Pawn, Warrior**

Not all factions have all unit types. Special units:
- Dragon: Black only
- Knight: Yellow only
- Dwarf: Purple only
- Mage: Blue only

### Enemy Sprite Naming Convention

**TD enemies** follow: `{Enemy}_{Enemy}_{Animation}.png`

| Pattern | Example |
|---------|---------|
| `{Enemy}_{Enemy}_Idle.png` | `Bear_Bear_Idle.png` |
| `{Enemy}_{Enemy}_Run.png` or `_Walk.png` | `Bear_Bear_Run.png` |
| `{Enemy}_{Enemy}_Attack.png` or `_Throw.png` or `_Shoot.png` | `Bear_Bear_Attack.png` |
| `{Enemy}_{Enemy}_Death.png` | `Bear_Bear_Death.png` |
| `{Enemy}_{Enemy} Avatar.png` or `Avatar {Enemy}.png` | `Bear_Bear Avatar.png` |

Available TD enemies:
Bear, Centaur, Cerberus, Demon, Gargoyle, Gnoll, Gnome, Gryphon, Headless Horseman, Harpoon Fish, Lancer (Goblin), Lizard, Lizardman, Minotaur, Paddle Fish, Panda, Pyromancer, Satyr Archer, Shaman, Skeleton Mage, Skull, Snake, Spider, Stone Golem, Thief, Troll, Turtle, Werewolf

**Survivor monsters** are single static sprites: `monster_{type}.png`
Types: bat, imp, orc, rat, slime, void_claw, zombie

### Common Frame Sizes

Frame sizes vary per unit/enemy. Here are the known values from game configs:

| Entity | Frame Size | Notes |
|--------|-----------|-------|
| Most units (archer, warrior, monk) | 192x192 | Standard unit size |
| Lancer units | 320x320 | Larger due to weapon reach |
| Small enemies (gnome, skull, thief, snake, spider, shaman) | 192x192 | Standard |
| Medium enemies (gnoll, lizard, bear, panda) | 192-256 | Bear/Panda use 256x256 |
| Large enemies (turtle, minotaur, troll/ogre) | 320-384 | Troll is 384x384 |
| Mounted enemies (centaur, headless horseman) | 192x192 | |
| Mage, Skeleton Mage, Cerberus, Pyromancer, Satyr Archer | 128x128 | Smaller frame |
| Dragon | 144x144 | |
| Werewolf, Lizardman | 196x196 | Slightly off-grid |
| Survivor monsters | ~64x64 | Single static sprites |
| Survivor classes | ~96x110 | Single static sprites |
| Survivor bosses | ~166x185 | Single static sprites |

**Death animations may use a different frame size** than other animations for the same entity.
For example, warriors use 192x192 for idle/run/attack but 128x128 for death. Always check both.

### Animation States & Frame Counts

Standard animation set per character:

| State | Typical Frames | Notes |
|-------|---------------|-------|
| Idle | 4 | Universal across all units/enemies |
| Run / Walk | 4-12 | `_Run.png` or `_Walk.png` |
| Attack | 3-20 | Varies widely; Stone Golem has 20 frames |
| Death | 4-12 | Often different frame size than other anims |

Some units have extra states:
- **Lancer**: Directional attacks (`_Up_Attack`, `_Down_Attack`, `_Right_Attack`, `_UpRight_Attack`, `_DownRight_Attack`) and matching defence poses
- **Monk**: `_Heal.png` + `_Heal_Effect.png` (separate effect overlay)
- **Pawn**: Tool-specific idles and interactions (`_Idle Axe`, `_Idle Pickaxe`, `_Interact Hammer`, etc.)
- **Gnoll**: `_Bone.png` (projectile sprite) + `_Throw.png` (throw animation)
- **Boat**: special case with `_Large.png`, `Dark Magician.png`, `Purple Portal Sprite Sheet.png`

### Configuring a Unit (TOML Reference)

This is the data model used in tower-defense-with-friends. Use it as a reference for what fields each sprite entity needs:

```toml
[[units]]
id = "warrior"
name = "Red Warrior"
sprite_path = "sprites/characters/units/Red_Warrior_Warrior_Run.png"
idle_sprite_path = "sprites/characters/units/Red_Warrior_Warrior_Idle.png"
idle_frame_count = 4
attack_sprite_path = "sprites/characters/units/Red_Warrior_Warrior_Attack1.png"
attack_sound = "sounds/sfx/combat/Assasin.mp3"
avatar_path = "sprites/characters/units/Red_Warrior_Avatar.png"
frame_count = 6           # run frames
attack_frame_count = 4
frame_size = [192, 192]
death_sprite_path = "sprites/characters/units/Red_Warrior_Warrior_Death.png"
death_frame_count = 4
death_frame_size = [128, 128]   # note: different from frame_size!
```

Key fields for sprite sheet loading:
- `frame_size` -- pixel dimensions of ONE frame (used to slice the horizontal strip)
- `frame_count` -- number of frames in the run/walk animation
- `idle_frame_count` -- frames in idle (almost always 4)
- `attack_frame_count` -- frames in attack animation
- `death_frame_count` -- frames in death animation
- `death_frame_size` -- often smaller than the main frame_size

## Survivor-Style Sprites

The vibe-survivor assets use a different pattern -- **single static images** instead of sprite sheets:

- `sprites/characters/classes/class_{name}_1.png` -- player class portraits (~96x110px)
- `sprites/enemies/monster_{type}.png` -- small enemy sprites (~64x64px)
- `sprites/bosses/boss_agna_{1,2}.png` -- boss phase sprites (~166x185px)
- `sprites/bosses/final_boss_phase_{1,2}.png` -- final boss forms
- `sprites/bosses/final_boss_simon_phase_{1,2}.png` -- alternate final boss
- `sprites/projectiles/attack_{weapon}.png` -- weapon/attack sprites
- `sprites/projectiles/void_{type}.png` -- void projectiles (arrow, ball, bolt, capsule, scythe, zone)
- `sprites/effects/agna_*.png` -- boss special effects (flame, circle, candle, flamethrower, etc.)
- `sprites/items/gem_{1-4}.png` -- XP gems of increasing value
- `sprites/items/upgrade_{type}.png` -- stat upgrade icons (armor, maxHP, regenHP, speed)

## Sounds

### Music (sounds/music/)

| File | Use |
|------|-----|
| `title.mp3` | Title/menu screen |
| `main.mp3` | Primary gameplay |
| `boss.mp3` | Boss encounters |
| `game_over_sting.mp3` | Death/game over (short sting) |
| `win_sting.mp3` | Victory (short sting) |
| `medieval_soundtrack.mp3` | TD background music |

### SFX Categories

**combat/** -- weapon and attack sounds
- TD: `Assasin.mp3`, `axe.mp3`, `Bonk.mp3`, `Goblin Lancer.mp3`, `Hammer Swing.mp3`, `Harpoon.mp3`, `Magic Bolt.mp3`, `Viper.mp3`, `attack_arrow.mp3`, `attack_holy.ogg`, `attack_stone.ogg`, `pickaxe.mp3`
- Survivor: `attack_fire.mp3`, `attack_soft.mp3`, `chaos_bolt_fire.mp3`, `player_damage.mp3`, `thunder.mp3`

**boss/** -- boss encounter sounds (agna phases, roars, transforms, teleports)

**voice/** -- narrator lines, viberians dialogue, game state announcements (win/lose/level/boss)

**ui/** -- interface feedback (clicks, choose, rewards, level up, upgrades, dice, exp gem pickup)

**monsters/** -- creature sounds (death, Bear, Panda, sheep, unit_death)

**environment/** -- world sounds (castle damage, tower destroy, structure broken, void capsules)

## Buildings (sprites/buildings/)

Named `{Color}_{filename}.png` where Color is Black, Blue, Purple, Red, or Yellow.
These are static decoration sprites for map building placement.

## Terrain (sprites/terrain/)

- `tileset/` -- base tileset images for Tiled map editor
- `beach/` -- beach/water edge tiles
- `decorations/clouds/` -- cloud overlay sprites
- `resources/` -- harvestable resource sprites organized by type:
  - `gold/gold_resource/`, `gold/gold_stones/`
  - `meat/meat_resource/`, `meat/sheep/`
  - `wood/trees/`, `wood/wood_resource/`
  - `tools/`

## UI Elements (sprites/ui/)

All from the TD art pack's UI kit:

- **buttons/** -- Big/Small/Tiny buttons in Blue/Red, Round/Square variants, each with Regular + Pressed states. Also includes PvP toggle buttons and sound/music icons.
- **bars/** -- BigBar and SmallBar, each with `_Base.png` and `_Fill.png` for health/progress bars.
- **icons/** -- Game mechanic icons (gold, damage, health, defense, build, settings, etc.) plus `spells/` and `skills/` subdirectories with ability icons.
- **screens/** -- Full-screen backgrounds: `title_bg.png`, `victory_screen.png`, `loss_screen.png`, `MenuBackgroundV2.png`, `Story.png`
- **cards/** -- `card_blank.png`, `curse_card.png`, `curse_bg.png`
- **avatars/** -- 5 human portrait sprites
- **cursors/** -- 4 cursor sprites
- **swords/** -- Decorative swords by faction color + combined `Swords.png`
- **ribbons/** -- Colored ribbon decorations + combined `SmallRibbons.png` / `BigRibbons.png`
- **papers/** -- `RegularPaper.png`, `SpecialPaper.png` for dialog/menu backgrounds
- **banners/** -- `Banner.png`, `Banner_Slots.png`

## Maps (maps/)

Tiled editor `.tmx` files:
- `map.tmx` -- standard 1v1 map
- `2v2_map.tmx` -- 2v2 multiplayer map
- `Island map.tmx` -- island-themed map

## Quick Reference: Loading Checklist

When adding a new character to your game:

1. **Identify the sprite sheet** -- find the right file in `sprites/characters/units/` or `sprites/enemies/`
2. **Determine frame size** -- check the table above or calculate: `imageWidth / frameCount = frameWidth`
3. **Count frames per animation** -- `Idle` is almost always 4; others vary
4. **Check death frame size** -- it's often different (typically smaller) than other animations
5. **Pick sounds** -- match attack type to a sound in `sounds/sfx/combat/`
6. **Find the avatar** -- look for `Avatar.png` or `{Name} Avatar.png` in the same sprite group
