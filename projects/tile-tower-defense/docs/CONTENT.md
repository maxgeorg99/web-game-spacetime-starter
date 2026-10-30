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

Names and descriptions live only in `src/i18n/locales/en/content.json`. Add matching keys when adding config entries; keep stable IDs unchanged. Shared configs must not carry English display text. Skill trees use `branchIds` and numeric node branch indices; branch names, node names and descriptions are resolved by the client localization adapter. Use its localized types when rendering content. See [Localization](LOCALIZATION.md) for plural counts, translated UI and additional languages.

## Discovery drafts and terrain synergies

`shared/config/drafting.ts` defines rarity colors, offer weights, unlock depths and terrain bonus values. `shared/game/drafting.ts` generates three distinct offers, with a guaranteed uncommon-or-better slot. Depth is the larger of completed waves in the current cycle and placed expansions plus one. Offers are saved, so reconnecting cannot reroll them. The new-to-island badge means a type has not yet been placed here; it is not an account collection.

Groves gain 4 gold per orthogonally adjacent grove (both benefit); pastures gain 2 meat per neighboring grove; quarries gain 6 gold per neighboring tower; orchards gain 2 meat per neighboring pasture. Bonuses pay at wave completion. Perches add 25% base range to a tower on that tile. Shrines add 20% base damage within Euclidean distance two; multiple shrines do not stack. These bonuses add alongside skill modifiers. Springs heal up to three missing keep health on placement and pay both resources each wave.

`placementEffect` calculates the entire island income difference, including changed neighbors. Preview a location and tap it again to commit. New tiles reuse registered art and rarity accents. Road rerouting, rotation, tile replacement, account unlocks and paid rerolls remain unimplemented. Save format and transport commands remain compatible; existing terrain receives adjacency bonuses after the server module is updated.

## Twenty-wave campaign

The campaign has 20 authored waves. The original five opening compositions remain stable; later waves introduce all 32 non-recruitable Bevy enemies. Player soldiers stay in the Recruit roster, and three legacy enemies retain their opening-wave appearances. Groups spawn in their listed order using the wave's interval and health multiplier. Descriptions describe formation, health, speed and keep damage, not special abilities.

Shared worlds cycle after wave 20. The field guide lists every wave and all eight terrain discoveries with illustration, rarity, effect and unlock depth. Longer-run difficulty requires manual balancing; roster coverage is protected by an added regression case, not a claim that the campaign has been playtested.

## Windmill and dedicated discovery sprites

Windmill is the ninth tile: rare, unlocked at discovery depth two, weight two. Towers within two tiles gain +15% base attack speed, additive with attack-speed skill modifiers. Multiple windmills do not stack. It gives no income and cannot host a tower. Placement preview counts only towers that gain speed; combat and tower inspection use the same `effectiveStats` rules.

Six dedicated sprites replace placeholders for quarry, orchard, perch, shrine, spring and windmill. Runtime PNGs under `public/art/tiles` are 96×96 with transparency. `landmarkArt` in presentation config records display width and measured footprint anchors. The perch platform remains under a built tower. Draft cards and the field guide reuse the same art keys. See `TILE-ART.md` for source jobs, prompts and preparation. Original meadow, grove and pasture art remains unchanged.

## Mage Tower: authoritative elemental skills

The stable `sentinel` ID now displays Mage Tower. Base price 120 gold, damage 20, range 2.8 tiles, 1.1-second cooldown. It begins with an arcane bolt. `shared/config/magic.ts` defines the three schools, skill nodes, 15-point budget, capstones and balance constants. Each school has three three-rank skills followed by a one-rank capstone; buying the capstone requires nine prior points in that school. Only one capstone fits the total budget. Gold costs are 20/25/35 per rank, then 90 for the capstone.

Primary hits combine all learned elements. School appearance follows the greatest investment; a tied purchase prefers the branch just purchased. Frost slows 30/40/50%, extends duration and improves bolt damage. Deep Freeze makes every fifth cast freeze its primary target for 0.8 seconds, followed by three seconds of freeze immunity. Fire applies burn with a bounded per-target stack count (one to four); repeat applications preserve the stronger damage/duration and refresh it, rather than creating unbounded per-tower effects. Ignition makes every fifth cast deal additional area damage on impact. Lightning adds 2/3/4 jumps, with upgrades to reach and damage retention. Overcharge makes every fourth cast jump twice more with no damage loss. Bounces apply damage only; they cannot spread frost/burn or trigger further capstone explosions.

Shared scheduled combat increments cast counters, snapshots spell parameters on launch, applies effects on impact, ticks burn, controls movement/freeze, and selects the next nearest living unvisited chain target (ID breaks ties). Chain projectiles are queued for the next tick. Burn deaths pass through the existing single bounty/kill accounting. Parameters, visited IDs, timers, cast count and in-flight spells are saved in the authoritative JSON. There are no client combat timers, random procs, optimistic purchases or client target choices for Mage gameplay.

Existing Sentinel towers remain placed. The authority marks them once with `magicVersion: 1`; old Sentinel ranks are cleared and their upgrade spend is refunded, preserving the base purchase and sell accounting. Old in-flight arrows finish normally. World ticks persist migration even between waves; solo restore/commands migrate before execution. Browser restore explicitly disables gameplay migration/refunds and waits for replicated state.

Presentation reuses the reference Bevy Ice/Fire/Tesla mage sprites (128×256) across captain colors. Arcane/frost wizard cloth has controlled palette variants; fire/lightning retain their source wizard styles. Faction changes derive from matching base-tower palettes. All ground anchors use the measured 230/256 base. Four 32×32 bolt PNGs derive from the Shaman's first 128px frame and the static fireball; three existing spell icons supply skill buttons. Capstones add a second ground sigil, enlarged impact/overcharge feedback, and status visuals render frost rings, frozen sprites and burn stack flames. New files live under `public/art/magic`, `public/art/mage-*.png`, and `public/art/factions/*/mage-*.png`. Retain the source asset pack license; no external asset service is required.
