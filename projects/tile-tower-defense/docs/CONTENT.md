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

### Periodic neutral waves — 2026-10-31

Neutral waves start after 20 seconds in preparation, using shared simulation and scheduled server ticks. The button shows the countdown and can start early. Drafting pauses the timer. Existing saves default to a fresh countdown. Unit sending and turtle health are unchanged. Formatted; automated checks and publishing have not run. Manual playtest and optional `bun run test:server` remain pending.

### Shared rounds in new sessions

`worldBalance.draftSeconds` (10) and `preparationSeconds` (20) control the authoritative shared round clock. Host starts with 2–4 players. Missing draft input selects the first saved offer and first valid expansion cell deterministically. Manual selections retain the full shared drafting window. Drafting precedes the first wave too. The next draft waits for every surviving island and inbound expedition to clear. No early starts or mid-match replacements; reconnect uses the same identity. At most one survivor ends the match. New sessions start fresh islands; existing worlds retain their independent saved campaigns. Empty seats are hidden and closed to new players after start. The host may fill empty seats with COM opponents before starting (see below).

## Player-directed frontier growth

New shared-match islands store `path` and `expansions` in their JSON snapshot. Missing `path` retains the original road for old saves. The starting island and road are unchanged. During a draft, choose a discovery card, preview an outlined direction at the entrance and tap again to confirm. Each choice prepends three cells to the enemy route, reveals a three-cell-wide strip of land, and places the selected discovery beside the new road. Remaining new cells are buildable meadow. The ten-second timeout chooses the first valid option deterministically.

`shared/config/expansion.ts` owns segment length, coordinate radius (12) and land cap (625). Valid routes do not cross existing roads, towers or non-meadow terrain; at least two road cells must enter undiscovered land. Growth stops if no valid direction remains, while waves continue. This first pass extends one entrance; it does not add branching or multiple spawns. Preview, placement, auto-choice and combat share authoritative rules in `shared/game/paths.ts`. Path changes preserve existing fighters' positions and projectile targets. Discovery tier unlocks count expansion choices, not the number of meadow cells revealed. The camera fits revealed land and draft options, and the four island origins are spaced to accommodate growth.

## COM opponents

In a shared-match lobby, the host can **Add COM** to the next empty seat or remove the last COM. One human plus 1–3 COMs and two humans plus 1–2 COMs use the same four-seat free-for-all rules. COMs can attack each other; there are no teams. COM seats count toward session occupancy. The roster locks on start, and defeated COMs do not restart. Legacy independent campaigns cannot add COMs.

`shared/game/com.ts` runs only from the scheduler-authorized server tick. It chooses at most one command per living COM per decision interval, then applies the same `worldCommand` validation and resource costs as a human. Clients only send lobby management commands and render replicated snapshots. Synthetic `com:<slot>` owners cannot match authenticated hexadecimal SpacetimeDB identities. Optional per-seat COM state preserves decision and raid timers across saved snapshots, with no schema or reducer signature change.

`shared/config/com.ts` controls one-second decision intervals, twelve-second raid spacing, three-passenger batches, desired tower counts and draft scoring weights. The policy values income/healing from offered discoveries, places affordable towers by road coverage, buys legal upgrades and sends affordable soldiers to surviving opponents. It respects shared phases, flight limits and incoming capacity. It has no resource bonuses, network calls, LLM service or client timers. Difficulty/balance still needs playtesting.

Manual flow after updating the world module: create a session, open Add COM beside Start match and select a named captain, optionally remove one to make room for a friend, then start. Watch COM expansion during drafting, construction during preparation and airships during active play. Existing deployed worlds require a module update; a frontend-only reload cannot install the AI. No production publish was performed for this change.

Named COM profiles now live in `shared/config/com.ts`: Rook favors fast raids and Watchtowers, Mara favors Mage Towers and defense, Ivo favors income and Catapults. Saved seeds vary decisions and cadence, with no resource cheats. The picker prevents duplicate captains and supports individual removal before start. Portrait references point to replaceable PNGs under `public/art/captains`. Rook was generated by PixelLab; Mara and Ivo by the built-in OpenAI image generator with user approval.

## Attack and defense matchups

`shared/config/damage.ts` preserves the reference project's four-by-three multiplier matrix. All 40 imported units carry their original `attack_type` and `defense_type`; Watchtower is Pierce, Catapult Blunt, and Mage Tower Magic. Towers are not damageable entities, so they have no unused defense category. Legacy six-unit definitions remain untyped and take/deal neutral damage for compatibility.

Every new projectile stores its attack type. Impact applies the multiplier separately to each target; splash, ignition and chain jumps never reuse a multiplier from a previous target. Burn stores its type and applies resistance during ticking. Melee uses the same matrix. Keep damage, rewards, prices and health are unchanged. Existing untyped projectiles/burns finish with their original flat damage. UI labels in English, German and Spanish show attack/defense types and exact matchup multipliers on hover. This introduces counters but does not add evasion, armor points, tower health or divine towers.

## Match results and world retirement

The shared `matchOutcome` helper identifies victory/defeat from authoritative world snapshots. A defeated human can spectate while other humans remain; the match stops once one captain remains or every human has lost, so unattended COMs cannot keep it alive. The result dialog uses captain art, a short entrance animation (disabled for reduced motion), wave/kill totals and distinct victory/defeat sounds. Victory audio reuses the reference project's `assets/Sound Effects/win.mp3`.

Finished worlds send authenticated terminal slot reports (`claimed=0, capacity=0`) to the coordinator. The session becomes `finished`, disappears from the lobby and no longer counts toward creation quotas. Late or repeated reports cannot revive it or extend its grace period. `shared/config/lifecycle.ts` gives results 120 seconds before physical deletion. The local provisioner deletes generated world databases and directory records, retrying interrupted cleanup. Hosted clients trigger the authenticated cleanup endpoint while connected; without a connected client, hosted physical cleanup waits for the next client (there is no deployed cron). Captain profiles are retained. Existing worlds need the updated world module to report completion.
