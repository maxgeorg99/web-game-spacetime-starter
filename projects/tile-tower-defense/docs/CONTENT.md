# Content authoring

Edit TypeScript data in `shared/config`, format the files, and ask before running `bun run check`. Browser HMR reloads the workshop; republish the local SpacetimeDB module to change server rules. Reset an ended run when testing new balance. Never change a live schema or meaning of an existing ID without considering saved states.

## Units and wave previews

`units.ts` defines combat health, damage, range, cooldown, speed, meat cost, recruitability, reward and keep damage. `art` names a battlefield spritesheet; `avatar` names the dedicated portrait under `public/art` without `.png`. Recruitment and wave previews read the same definition as the simulation.

To add a unit, add its data, copy the required licensed art, and register measured frame dimensions in `src/art.ts`. Recruitable units appear in the dock automatically; enemies become spawnable when referenced in `waves.ts`. Do not use spritesheet frames as a substitute for an available avatar portrait.

## Towers and skill trees

`towers.ts` defines price and base combat stats. Every tower must have a corresponding entry in `skills.ts`. Each node has a stable ID, branch/visual tier, icon path, rank cap, gold cost, effect, and optional prerequisite node/rank.

Implemented effects:

| Stat          | Calculation                                     |
| ------------- | ----------------------------------------------- |
| `damage`      | Base damage × (1 + sum of modifiers)            |
| `range`       | Base range × (1 + sum of modifiers)             |
| `attackSpeed` | Base cooldown ÷ (1 + sum of modifiers)          |
| `splash`      | Base splash radius + sum of modifiers, in tiles |

For example, three ranks of `perRank: 0.15` damage produce +45% damage. Modifiers are recalculated from base definitions and purchased ranks, so they never compound accidentally. Unlocking a second tier requires the named prerequisite at the configured rank. Purchases affect one placed tower, never the entire type. All three branches can currently be developed; mutually exclusive specializations are not implemented.

Only add effect types with real, tested simulation behavior. An icon or description must not promise an unimplemented ability. Gold spent on upgrades contributes to the configured sell refund.

## Waves and terrain

`waves.ts` is ordered. Each wave lists unit groups, count, spawn spacing in seconds and an HP multiplier. Preview numbers and spawn queues derive from this same data. Enemy positions are distance along the fixed road from `island.ts`.

Terrain defines whether building is allowed and gold/meat income. Income is paid once when a wave finishes; newly drafted terrain starts paying on the following wave. Terrain and structures are separate. Road placement, route validation and rotation are M3 features.

## Preview and validation

The **? Field guide** shows every tower, unit portrait, upgrade icon, prerequisite and wave. Select a built tower to inspect actual modified stats. `validateCatalog` runs at browser startup and server initialization; tests also verify referenced art files exist. Definitions contain plain JSON-compatible data so future database seeding can import these exact files.

## Shared world and expeditions

`shared/config/world.ts` defines the four island positions/names/colors, flight time, staggered landing interval, capacity limits and expedition prices. Expedition unit IDs reference the regular unit catalog. `meatCost`, `keepDamage` and `bounty` are expedition-specific; combat health, speed and damage come from the unit definition. Keep world rules in `shared/game/world.ts`; Phaser only presents replicated flights and island snapshots.

### Captain colors

`shared/config/factions.ts` defines Blue, Yellow, Red and Purple, the matching building keys and measured unit animation strips. `world.ts` assigns a faction to each permanent seat. Assets under `public/art/factions/` are copied from the shared library, without recoloring. Warrior/Archer/Lancer run strips have 6/4/6 frames respectively. Captain navigation uses the four Human Avatars copied from the Bevy project. Recruit/send cards use its dedicated Warrior, Archer and Lancer portraits without a portrait border; these unit portraits are only supplied in red. Battlefield sprites use the correct faction variant. Expedition fighters carry `captainSlot` to preserve sender colors after landing. Older already-landed expedition fighters without that field keep their legacy appearance until removed.

## Full Bevy sending roster

`bevy-units.ts` contains all 40 configured units from the Bevy `units.toml`. These are editable, serializable TS definitions, not a runtime import. `meatCost` is the purchase price; `health`, `speed`, `reward` and `leak` drive arrival/combat. Source pixel speed/range values are divided by 64 to express tiles. Source health, bounty and keep damage are retained. Source combat values omitted by TOML remain zero, with a one-second cooldown placeholder; no healing, armor matrix or special abilities are promised. Archer shots use the existing projectile behavior.

Warrior, Archer, Lancer and Monk retain their source meat prices. Berserker, Horseman, King and Swordsman have explicit initial prices of 5, 5, 7 and 3 meat. Only these eight are purchaseable; server validation rejects all enemy IDs. Legacy flight definitions remain available for expeditions already in transit.

`unit-art.ts` records measured movement strips. Assets and 36 dedicated portraits are copied into this project's `public/art`; Dragon, Mage, Knight and Dwarf use first-frame previews because the source points their avatar field at a movement strip. Warrior, Archer, Lancer, Monk, Berserker, Horseman, King and Swordsman have four faction variants. Monsters and faction-exclusive units keep their source art with sender-colored health bars.

`units.ts` combines the new roster with six legacy definitions so existing saves, neutral waves and in-flight expeditions remain readable. The Recruit tray lists only the eight player soldiers; the other 32 are enemy definitions. `world.ts` derives expedition stats and prices from that roster; legacy flight definitions remain for compatibility. Shared-world recruitment commands are rejected; all new UI purchases send to an opponent. Local mode can preview the roster but cannot send without a shared world.

## Audio

`shared/config/audio.ts` owns cue filenames, relative gain, cooldowns, default music/effects volumes and voice limits. `src/audio.ts` listens to presentation snapshots and detects new projectiles, impacts, keep damage, buildings, upgrades, airships and wave outcomes. Joining does not replay prior events. Camera visibility/distance attenuates combat. UI/outcome cues use their configured mix level.

The audio manager uses browser audio with an explicit first-interaction unlock, six-voice cap, per-cue cooldown and a global combat gap. Hidden/unfocused tabs pause music and stop effects. Mute and independent volume settings persist locally. Audio failure never blocks gameplay. Files are copied from the Bevy project's Sound Effects folder; no external filesystem paths or dependencies are used at runtime. No subjective mix/listening verification has run yet.

## Warfare catapult and generated airship

Catapult art was supplied from `Downloads/Warfare/Catapult`. Runtime copies live under `public/art/factions/{blue,yellow,red,purple}/catapult*.png`; retain the source pack's license. Idle and portraits are 256×256. Fire strips are 2304×256 (9 frames), load strips 1024×256 (4 frames), with no spacing. Tower `avatar` is separate from battlefield `art`. The stone uses the existing `rock` key so saved projectiles remain compatible.

Airships are transparent 128×128 PNGs generated by PixelLab Pro, job `973e4dd0-b272-4d35-ab43-9f3a0ab1ad59`, candidate 1. Blue source ramps `#203d70`, `#2b619c`, `#438ed1` were mapped with PixelLab's exact pixel tools to yellow (`#70501f`, `#a67f24`, `#e2b832`), red (`#702f3d`, `#a83d4c`, `#d65353`) and purple (`#483367`, `#704a99`, `#9a65c9`). Hull, cream canvas, outlines and transparency stay identical. Assets are bundled locally; no PixelLab service is needed at runtime.

Recruit portrait variants live in `public/art/factions/{blue,yellow,purple}/avatars/`; red reuses the source portraits. `factionPortraits` derives its supported keys from the eight faction unit sheets. PixelLab exact palette mapping replaces only cloth/plume/backing colors (`#693d5b`, `#924159`, `#e76161`, `#be6e61`, `#a86262`, `#d2aa88`); hair, faces, armor, outlines and transparency are preserved. Enemy/catalog portraits without a captain remain unchanged.

## Display text

Client names and descriptions are edited in `src/i18n/locales/en/content.json`. Add matching keys when adding config entries; keep stable IDs unchanged. See [Localization](LOCALIZATION.md) for plural counts, translated UI and additional languages.
