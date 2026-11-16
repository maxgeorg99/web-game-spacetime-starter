# Death animation asset inventory

Read-only asset scan, 2026-11-16. Matched bundled movement art to the shared library by SHA-256, then located death sheets in the same source family. Dimensions below are PNG header measurements, not verified frame layouts. No animations were loaded, changed or playtested.

**Current roster: 39 of 40 units have source death art. Lizard is missing.** The original Bevy asset directory also contains no matching Lizard death file. Lizardman is a distinct unit. The integration below now loads death sheets and uses confirmed kill records.

## Current roster

| Unit ID             | Source under shared assets/sprites                       | PNG dimensions |
| ------------------- | -------------------------------------------------------- | -------------- |
| `warrior`           | `characters/units/Red_Warrior_Warrior_Death.png`         | 768 × 192      |
| `archer`            | `characters/units/Red_Archer_Archer_Death.png`           | 960 × 192      |
| `lancer`            | `characters/units/Red_Lancer_Lancer_Death.png`           | 1600 × 320     |
| `monk`              | `characters/units/Red_Monk_Death.png`                    | 768 × 192      |
| `skull`             | `enemies/Skull_Skull_Death.png`                          | 960 × 192      |
| `paddle_fish`       | `enemies/Paddle_Fish_PaddleFish_Death.png`               | 960 × 192      |
| `harpoon_fish`      | `enemies/Harpoon_Fish_Harpoon_Death.png`                 | 768 × 192      |
| `goblin_lancer`     | `enemies/Lancer_Lancer_Death.png`                        | 1280 × 256     |
| `shaman`            | `enemies/Shaman_Shaman_Death.png`                        | 960 × 192      |
| `thief`             | `enemies/Thief_Thief_Death.png`                          | 960 × 192      |
| `snake`             | `enemies/Snake_Snake_Death.png`                          | 768 × 192      |
| `turtle`            | `enemies/Turtle_Turtle_Death.png`                        | 1920 × 320     |
| `minotaur`          | `enemies/Minotaur_Minotaur_Death.png`                    | 1280 × 320     |
| `gnoll`             | `enemies/Gnoll_Gnoll_Death.png`                          | 960 × 192      |
| `spider`            | `enemies/Spider_Spider_Death.png`                        | 960 × 192      |
| `panda`             | `enemies/Panda_Panda_Death.png`                          | 1024 × 256     |
| `lizard`            | **Missing**                                              | —              |
| `bear`              | `enemies/Bear_Bear_Death.png`                            | 1280 × 256     |
| `gnome`             | `enemies/Gnome_Gnome_Death.png`                          | 768 × 192      |
| `ogre`              | `enemies/Troll_Troll_Death.png`                          | 3840 × 384     |
| `dragon`            | `characters/units/Black_Dragon_Dragon_Death.png`         | 1008 × 144     |
| `mage`              | `characters/units/Blue_Mage_Mage_Death.png`              | 640 × 128      |
| `knight`            | `characters/units/Yellow_Knight_Knight_Death.png`        | 1152 × 192     |
| `werewolf`          | `enemies/Werewolf_Werewolf_Death.png`                    | 1960 × 196     |
| `demon`             | `enemies/Demon_Demon_Death.png`                          | 1920 × 192     |
| `stone_golem`       | `enemies/Stone_Golem_StoneGolem_Death.png`               | 1728 × 192     |
| `lizardman`         | `enemies/Lizardman_Lizardman_Death.png`                  | 2352 × 196     |
| `cerberus`          | `enemies/Cerberaus_Cerberus_Death.png`                   | 1280 × 128     |
| `skeleton_mage`     | `enemies/Skeleton_Mage_SkeletonMage_Death.png`           | 1280 × 128     |
| `gryphon`           | `enemies/Gryphon_Gryphon_Death.png`                      | 1344 × 192     |
| `headless_horseman` | `enemies/Headless_Horseman_HeadlessHorseman_Death.png`   | 1920 × 192     |
| `pyromancer`        | `enemies/Pyromancer_Pyromancer_Death.png`                | 1280 × 128     |
| `dwarf`             | `characters/units/Purple_Dwarf_Dwarf_Death.png`          | 1152 × 128     |
| `gargoyle`          | `enemies/Gargoyle_Gargoyle_Death.png`                    | 1344 × 192     |
| `satyr_archer`      | `enemies/Satyr_Archer_SatyrArcher_Death.png`             | 1024 × 128     |
| `centaur`           | `enemies/Centaur_Centauer_Death.png`                     | 1536 × 192     |
| `berserker`         | `characters/units/Red_Berserker_Berserker_Death_Red.png` | 1152 × 192     |
| `horseman`          | `characters/units/Red_Horseman_Horseman_Death_Red.png`   | 1920 × 320     |
| `king`              | `characters/units/Red_King_King_Death_Red.png`           | 1152 × 192     |
| `swordsman`         | `characters/units/Red_Swordsman_Swordsman_Death_Red.png` | 1920 × 320     |

## Player colors

| Soldier   | Blue      | Yellow    | Red       | Purple    |
| --------- | --------- | --------- | --------- | --------- |
| Warrior   | Available | Available | Available | Available |
| Archer    | Available | Available | Available | Available |
| Lancer    | Available | Available | Available | Available |
| Monk      | Available | Available | Available | Available |
| Berserker | Available | Available | Available | Available |
| Horseman  | Available | Available | Available | Available |
| King      | Available | Available | Available | Available |
| Swordsman | Available | Available | Available | Available |

## Legacy IDs

- `squire`: source Blue Warrior idle; Warrior death art available, including all player colors.
- `guardian`: source Blue Lancer idle; Lancer death art available, including all player colors.
- `goblin`: source Spider run; Spider death art available.
- `raider`: source Snake run; Snake death art available.
- `brute`: source Turtle walk; Turtle death art available.
- `ranger`: bundled public/art/ranger.png exactly matches the source Archer Arrow PNG. The intended Archer has death art in all player colors, but this legacy base-art mismatch needs correction before mapping animations.

## Integration handoff

Measure frame grids and ground anchors visually before importing; do not assume movement frame sizes apply to death sheets. Goblin Lancer is stored under Lancer, Ogre under Troll, Cerberus under the misspelled Cerberaus, and Centaur uses Centauer filenames. Distinguish authoritative kills from keep arrivals, resets and reconnect reconciliation before playing death effects. No gameplay changes or automated tests performed.

## Integration — 2026-11-16

Imported 72 strips under `public/art/death`: 40 base unit sequences and 32 faction soldier sequences. Lizard deliberately uses `Lizard_Lizard_Attack.png` (1728×192, nine 192px frames), approved by the user. Inspected contact sheets for frame layout: each imported sheet uses one row of square frames without margins or spacing. Dimensions, texture mappings, animation rate and corpse limits live in `shared/config/death-art.ts`. Legacy IDs map to the matching source family; the unrelated legacy ranger base-art mismatch remains unchanged.

The shared combat step retains the last 128 confirmed killed fighter IDs and tile positions in optional `State.deaths`. It records enemy and defender deaths after damage resolution and before removal; keep arrivals and retiring defenders do not enter this list. The optional field is additive JSON state and needs no database schema/binding change. Restart produces a fresh history. Records survive the final kill of a wave and cover all existing damage paths.

The renderer only animates a previously visible actor removed with a matching kill record. Initial loads have no actors to replay; switching worlds and resets clear bodies. Death animation keeps the actor's facing, size and faction, removes bars/status immediately, plays once at 12fps, holds for 150ms and fades over 350ms. At most 64 bodies are retained per island; reduced-motion removes actors immediately. Animations have no collision or combat authority.

Added unrun regressions for melee/final-wave kill recording, defender deaths versus arrivals/retirement, bounded history, JSON restore and restart. Local world modules must be republished to emit kill records; existing server modules continue to work but cannot trigger the new animations. No production publish, automated tests or browser verification performed.
