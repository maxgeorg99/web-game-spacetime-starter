# Tile Tower Defense — living roadmap

## Vision

A small keep on a floating island. Draft land, expand your island, build and specialize towers, inspect the next wave, and recruit soldiers who march out to meet it. Later, airships carry armies between players' islands. Preserve the useful Bevy mechanics, with the quieter parchment/green visual language of the Rive experiment.

## Working rules

- Finish and verify one playable milestone at a time. Update this document before ending each session.
- TypeScript config files are the source of truth for units, towers, waves, terrain, balance, and tower skill trees. Stable string IDs; no executable callbacks or renderer objects in content.
- One rendering-free simulation shared by the local workshop and authoritative SpacetimeDB module. Phaser renders snapshots and emits commands; it does not own combat rules.
- Use the smallest useful implementation. No generic ECS, ability scripting engine, editor framework, matchmaking, or airship simulation before a milestone needs it.
- Tests protect gameplay invariants and authority. Browser checks cover the actual play loop. Never mark unverified work complete.

## Milestones

### M1 — config-driven playable foundation (implemented)

- [x] Standalone Phaser + TypeScript project and build commands.
- [x] Typed, validated configs for three towers, three recruits, enemies, five waves, land tiles, and balance.
- [x] Per-tower skill allocations with three branches, ranks, prerequisites, costs, and visible effective stats.
- [x] Floating island, fixed initial road, tower placement/selection, attack feedback and health bars.
- [x] Next-wave preview using the same definitions as spawning; victory/defeat/restart.
- [x] Meat-funded recruits march in reverse, stop to fight, take damage, and retire at the entrance (Bevy behavior).
- [x] Draft a terrain tile between waves and place it on an adjacent empty cell. Forest/farm income; finite island bounds.
- [x] Config catalog with character/tower previews and skill-tree inspection.
- [x] Local workshop and server-authoritative single-island mode using the same rules; generated bindings, reconnect, command errors.
- [x] Domain, build, browser, and isolated server verification; README and session handoff.

M1 deliberately uses a fixed road. Land expands building/economy choices; it does not pretend to reroute enemies. The original server mode had one island per identity; the active world milestone replaces the default with four shared seats. Configs are imported by the server; database catalog seeding is deferred.

### M2 — playable balance and content fidelity

- Playtest gold/meat income, recruitment timing, branch value, and five-wave difficulty.
- Add Bevy fire, frost, Tesla, and holy towers only alongside implemented/tested effects.
- Expand enemy/recruit roster, attack/defense effectiveness, wave variants and richer animation.
- Add more skill tiers and meaningful specialization; consider respec only after playtests show a need.
- Validate every catalog reference, asset, and upgrade effect. Add catalog export/seed tooling when database definition tables become necessary.

### M3 — island drafting as the central mechanic

- Draftable road pieces, rotation, connectivity and legal entrance/keep paths.
- Preview path changes before placement; reject stranded routes.
- Economy buildings, recruitment buildings and resource workers where they add decisions.
- Save format migrations and larger-island camera controls.

### M4 — shared sessions and independent islands

- Lobby, session ownership, two identities, reconnect and cleanup.
- Separate island economies and neutral waves; explicit planning/combat phases.
- Concurrent-command and two-browser tests. Normalize snapshot storage only when replication size or queries justify it.

### M5 — airship expeditions

- Recruit expedition armies, load capacity, departure, visible travel and arrival.
- Enemy-island combat, rewards, victory rules; server-authoritative orders and timing.
- The four-island slice below brings basic transport forward; richer transport gameplay remains deferred.

### M6 — release preparation

- Mobile interaction, accessibility, audio, art polish, performance/load checks.
- Abuse limits, private data where required, deployment, public playtests.

## Session log

### Multiplayer command fix — placeholder tower IDs

Restricted tower lookup to upgrade/sell orders. World transport includes `tower: 0` on all orders, which previously blocked building, recruitment and wave starts with “Tower not found.” Added an unrun regression case using transport-shaped payloads; automated verification awaits user approval.

### 2026-10-29 — first implementation session

Inspected Bevy recruitment, TOML towers/skill trees, and Rive island art/simulation. Chose Phaser rendering plus shared TypeScript domain and TypeScript SpacetimeDB module. Preserve the reverse-path recruit mechanic; avoid copying the old dual-simulation architecture. Foundation implemented and previously checked with domain tests, local server integration, build and browser playthrough. Later multiplayer changes require their own verification.

## Active milestone — four-island persistent world

User priority supersedes the original milestone order: implement M4/M5's small playable core now.

- [ ] Four permanent island seats in a shared SpacetimeDB world; preserve existing solo saves.
- [ ] Live rendering of all four islands; drag, keyboard pan, wheel zoom, island/home/overview shortcuts.
- [ ] Choose opponent and unit; server validates ownership, resources, sequence and capacity.
- [ ] Visible airship travel, staggered entrance spawning, defenses active outside neutral waves.
- [ ] Independent neutral waves and economies; completed five-wave runs loop in world mode.
- [ ] Reconnect preserves ownership; full worlds permit spectators; no idle expiry.
- [x] Update manual play instructions and handoff.
- [ ] Verify the multiplayer slice: manual playtest first; automated checks only after user approval.

Updated decision: one Units roster sends purchases to opponents. Existing saved defenders remain; new shared-world recruitment is disabled. Lost islands may restart in their existing seat, but cannot dodge an incoming flight. Airships targeting a destroyed keep are cancelled. Four seats persist until an explicit administrative reset; matchmaking, extra worlds, alliances, timed rounds and public hosting are deferred. World persistence requires a disk-backed SpacetimeDB server (not `--in-memory`).

### 2026-10-29 — multiplayer implementation handoff

Implemented the active slice in config, shared domain, server reducers, four-island rendering and expedition UI. Checkboxes above remain open until the gameplay is verified. Generated SDK bindings and formatted authored files; no automated lint, type checks, tests or browser checks were run for this slice. Added focused domain tests for seats, sending, arrivals and defense between waves, awaiting approval to run. The new local world uses disk-backed port 3106, leaving the previous solo database untouched. See `docs/MULTIPLAYER.md`.

### Captain faction identities

Mapped the four permanent seats to Blue, Yellow, Red and Purple. Buildings and defenders load the matching asset-pack sprites; recruitment/build/send previews follow the owning captain. Expedition fighters store their origin slot so their sprites and health bars retain their sender's identity after landing. Airship accents and world markers use the same palette. Existing neutral enemies keep their original art. Authored files formatted; automated and visual checks await approval.

Captain portrait follow-up: copied the four Human Avatars directly from the Bevy project for world navigation. Restored its dedicated unit portraits on recruitment/send cards with faction-colored borders; only red unit portraits exist for this roster. No automated or visual checks run.

## Active slice — one sending roster and full Bevy catalog

User decision: unit purchases always attack a chosen opponent. Remove the separate Recruit action, preserve old saved defenders, and prevent new defensive recruitment in shared worlds.

- Import all 40 entries from Bevy `units.toml` into editable TypeScript configs.
- Copy movement sprites and available portraits into this project; preserve faction variants where provided.
- Provide one searchable Units tray with opponent, quantity, meat cost, health, speed and keep damage.
- Keep legacy IDs readable for existing waves/saves; no save reset.
- Preserve source health/speed/leak/reward values, convert pixel distances to tiles, and explicitly price previously unsendable monsters.
- Automated verification remains pending user approval.

Implementation handoff: all 40 source entries are available in the searchable Units tray. Removed Recruit UI and blocked the shared-world recruit order. Imported 40 movement strips, 36 dedicated portraits and 32 faction movement variants, all local to the project. Kept legacy snapshot IDs and neutral waves unchanged. Added an unrun per-unit purchase/arrival regression case and updated the previous command regression for the new recruit rejection. Balance and visual verification remain pending; no automated checks run.

## Current correction and sound pass

Only eight player soldiers belong in Recruit: Warrior, Archer, Lancer, Monk, Berserker, Horseman, King and Swordsman. The remaining 32 source units stay enemies. Recruit still sends to the chosen opponent, following the earlier confirmed flow. Enforce the roster in both UI and server; existing flights remain readable.

Sound pass: local Bevy audio, editable cue volumes/cooldowns, music and effects sliders plus mute, sound after user interaction, quiet background tabs, camera-distance combat audio, and bounded overlap. Verification remains opt-in.

Implementation handoff: Recruit now exposes exactly eight soldier IDs and server orders reject the other 32 source types (existing flights are preserved). Field guide separates recruits from enemies. Removed recruit portrait borders. Added local audio assets, config-driven cue mix, camera-aware combat sound, music, mute/volume settings, first-interaction unlock and quiet background tabs. Updated unrun domain cases for the eight allowed/32 rejected IDs. Formatting only; tests, browser checks and listening playtest await approval.

Recruit simplification: removed the search field, filtering state and unused search styles. All eight recruits are shown directly. Formatted; automated checks not run.

## Active implementation — coordinator and independent persistent worlds

Use two module codebases: coordinator directory/profiles/activity and the existing game module deployed once per session. Add a trusted local provisioner that reads pending requests and publishes named world databases; browser clients never receive publishing credentials. Preserve and register the original world. Multiplayer menu supports captain name, create, join/resume, retry and return to sessions. Record membership activity for a later 30-day cleanup job; do not delete sessions now. Verification remains opt-in.

Coordinator implementation handoff: added the separate coordinator module, captain naming, persistent session directory with pending/ready/failed creation, trusted single-worker provisioning, menu join/resume/retry and per-world connections. Registered Original islands without resetting its save. Recorded directory/membership activity with minute heartbeats for future 30-day cleanup; no deletion job. Generated both SDK bindings and published locally. Added an unrun captain rename/save-preservation regression. Formatting only; automated and browser verification pending user approval. See `docs/SESSIONS.md` for deployment and recovery limits.

## Active release preparation — slots, Maincloud, itch.io and mobile

Report authoritative occupied seats from each world to the coordinator through the trusted worker; distinguish available slots from online presence. Build itch.io artifacts with relative asset URLs, production endpoint configuration and a Butler GitHub workflow. Prepare Maincloud coordinator deployment and persistent worker hosting without touching existing unrelated databases. Improve touch pan/pinch, safe-area layout and small-screen controls. Tests/build verification remain subject to the user's opt-in preference.

Credential setup: created ignored `.env.provisioner` placeholders for Maincloud admin and Butler keys, plus a committed example. Added explicit `provisioner:maincloud` and `secrets:github` commands; the latter sends values to repository secrets over stdin and is not run automatically. GitHub Pages cannot run the worker; permanent worker hosting remains open. See `docs/CREDENTIALS.md`.

## Active slice — on-demand Vercel provisioning and push releases

Implemented the serverless provisioning endpoint using the SpacetimeDB 2.10.2 JS HTTP publish protocol; private coordinator leases prevent overlapping invocations, and caller authorization is delegated to the coordinator. The menu starts creator-owned pending sessions and reads world slot counts while open. Added Vercel build/function configuration, secret setup and a path-filtered main-branch release workflow (coordinator → Vercel → itch.io). Existing worlds remain on their current module version; fleet migrations and 30-day cleanup are future work.

Handoff: Vercel login/project link complete; sensitive production publisher token configured; all five GitHub secret names confirmed present. User explicitly declined checks for this slice. No local lint, typecheck, build or integration check was run. Production cutover and the stable provisioner URL remain pending. Stop only the Maincloud legacy worker before enabling the endpoint. See `docs/VERCEL.md`.

Production cutover: authorized by user and performed on 2026-10-29. Coordinator migrated without resetting saves; Vercel production READY at https://tiled-tower-defense.vercel.app. Maincloud legacy worker stopped, local worker preserved. GitHub endpoint variable configured. Required deployment builds/typechecks passed after fixing script module declarations. Standalone checks and gameplay verification remain skipped at user request. Push-release workflow is configured locally and must be committed/pushed to activate.

itch.io upload completed and processing succeeded: `maxgeorg99/tiled-tower-defense:html5`, build `2247444`, version `vercel-cutover-20261029`.

## SpacetimeDB 2.14.0 upgrade — 2026-10-30

Pinned the client, both modules, Vercel compiler, release CLI and optional worker image to 2.14.0; refreshed lockfiles and regenerated both binding sets. Generation also restored bindings for the existing provisioning authorization/lease reducers. No production publish or existing-world migration was performed.

With user approval, all three TypeScript checks, ESLint, 26 domain/world tests, frontend production build and the legacy server integration test passed. Both modules published successfully to an isolated local 2.14.0 server. The frontend build retains its large-chunk warning. Server integration covers the legacy solo flow, not coordinator provisioning or IDC; browser playtesting and production compatibility remain unverified.

IDC assessment: direct world-to-coordinator slot reports can replace polling, but IDC does not publish new databases. Retain the Vercel function for on-demand worlds. A CI-prepublished world pool could remove runtime provisioning in a separate change. See `docs/SESSIONS.md` for trust, rollout and capacity requirements.

Follow-up review: confirmed production has an on-demand function rather than a continuous worker. Recommend IDC for slot reporting while retaining database publishing. Migration must enable coordinator slot subscriptions in production, resolve the menu's 60-second stale-report policy, register trusted world identities and confirm same-server delivery support. No runtime changes or automated checks performed in this review; detailed handoff added to `docs/SESSIONS.md`.

### IDC slot reporting implemented — 2026-10-30

Added publisher-registered world identities, typed world-to-coordinator outboxes, occupancy updates and 30-second heartbeats. One pending call per world bounds the outbox; failed results retry with backoff. Vercel and the local provisioner configure new worlds, and the menu consumes coordinator updates with legacy/stale HTTP fallback. Existing saved worlds retain polling because their original init did not record a reporting administrator; enrolling them requires a separate trusted migration. Vercel remains responsible for database creation.

Validation approved by the user: bindings generated; all three typechecks, lint, 31 unit tests, frontend build, solo server regression and actual two-world IDC delivery/authentication/recovery/heartbeat integration passed. Tests used isolated local databases, leaving existing local and production saves untouched. Existing build chunk warning remains. No browser or hosted rollout verification. See `docs/SESSIONS.md` for deployment order, generation commands and handoff.

### IDC-only reset and release — 2026-10-30

User explicitly authorized discarding old worlds locally and on Maincloud and deploying the hosted version. Removed HTTP slot polling, the public world slot table, administrator slot reporting and legacy provisioning branches. Every world now requires IDC configuration; stale reports remain labeled as last reported without a network fallback.

Deleted the three directory-listed local worlds and one hosted world, reset both coordinators, and created Fresh islands in each environment. Unrelated databases were untouched. The updated local provisioner is running. Actual Maincloud IDC delivery passed on disposable databases before reset; those probes were deleted.

All three typechecks, lint, 31 unit tests, solo server regression, IDC integration and production builds passed. The live Vercel smoke check caught an extensionless Node ESM import; fixed it to `.js` and redeployed successfully as `dpl_CkjTwx485kHGsmqrbKvtXkHL4MET`. Live creation, repeat provisioning, unauthenticated rejection and IDC reports passed; both fresh worlds have four free seats. itch.io build `2255349`, version `idc-only-20261030`, processed successfully. Formatted two existing store HTML files required by the release format check. No browser gameplay verification in this cutover. The disposable local integration server was stopped; the normal local server and worker remain running.

Handoff: reload and choose a captain name again after the directory reset. Commit/push to `main` triggers the existing release workflow; this reset is not part of that workflow. Future releases update the frontend, coordinator and bundle used for new worlds; they do not automatically republish existing worlds.

## Catapult and airship art — 2026-10-30

Replaced the Catapult tower's cannon placeholder with the supplied Warfare sprites in blue, yellow, red and purple. Measured 256px frames: nine firing and four loading frames, driven by authoritative cooldown snapshots with reduced-motion support. Added matching tower portraits and the supplied stone projectile. Reduced the catapult display canvas from 112px to 80px following user playtest feedback.

Generated a transparent 128px airship with PixelLab Pro and used exact palette replacement for the four captain variants. The renderer now uses these sprites, mirrored toward the destination, with existing troop labels and travel timing. Alpha and non-team pixels match across all variants. No gameplay balance or save schema changes.

Typechecks, lint, 26 unit tests and build passed during integration; browser rendering confirmed the catapult and all four airship textures loaded using disposable preview data. Final scale adjustment was formatted; user is playtesting at localhost:5175. The persistent local database on port 3106 is running; production was not deployed.

### Follow-up — building scale, flight movement and recruit colors

Reduced the keep from 130px to 92px, standard towers from 65px to 48px and other structures from 75px to 58px. Preserved the user's latest 70px catapult size. Airships now render at 112px with a gentler arc and frame-based smoothing instead of restarting a tween on every snapshot. Visual prediction is capped at 250ms and does not spawn troops or change server state. Small bob/roll respects reduced motion.

Added 24 PixelLab exact-palette portrait variants for all eight recruits (blue, yellow, purple); red uses the original. Recruit cards resolve the owning captain's faction. Checked all 32 rendered portraits in the browser and verified recolors preserve alpha and every non-team pixel. Typechecks and lint passed; browser checks confirmed four ship textures and continuous forward movement between snapshots. Uses disposable preview data, not a live multiplayer playthrough.

## Localization and responsive UI — 2026-10-30

Added i18next with typed keys, bundled English UI/content catalogs, locale fallback and CLDR plural counts (including zero/one/other troop labels). Migrated menus, HUD, canvas labels and content display text; HTML interpolation is escaped. Structured upgrade failures let clients translate reasons while preserving server messages. Backend/transport errors remain English. See `docs/LOCALIZATION.md` for adding languages.

Consolidated compact layouts in `src/responsive.css`: 44px touch targets, safe-area spacing, horizontal recruit scrolling, collapsible actions, a tower upgrade sheet, short-phone panel scrolling and a landscape side dock. Fixed nested localization spans accidentally hidden by world-control CSS. Camera fitting considers compact HUD/dock bounds; rotation preserves the viewed island or overview. Collapsing actions reframes the battlefield. Existing drag/pinch controls remain available.

Validation: 31 domain/world/localization tests, all TypeScript checks, lint, formatting and production build passed. Chromium exercised build/recruit layouts at 320×568, 390×844, 667×375, 844×390, 1024×768 and 1440×900, plus dock collapse/restore, upgrade opening/closing and field guide. Short landscape dock contents intentionally scroll within the panel. Browser checks use disposable data with the real renderer/UI; physical-device touch and a live multiplayer match remain manual checks. Build retains the existing large-chunk warning. No production deploy.

## Discovery drafting — 2026-10-30 (awaiting manual playtest)

Implemented three distinct weighted offers with a guaranteed uncommon-or-better slot. Eight terrain types span four rarities; orchard/shrine unlock at depth two, spring at depth three. Island size preserves depth across campaign cycles. Offers derive from saved game data and remain stored until placement; existing pending offers remain valid.

Groves reward neighboring groves; pastures reward groves; quarries reward towers; orchards reward pastures. Perches add 25% base range, shrines add 20% base damage within two tiles (non-stacking), and springs produce both resources and heal up to three keep health on placement. Combat, inspection, income and placement previews share these rules.

Added rarity cards, new-to-island markers, colored tile ghosts, exact benefit previews, neighborhood indicators, two-tap confirmation, landmark color accents and reduced-motion-aware placement pulses. Uses existing art. Road rerouting and dedicated landmark illustrations remain future work; this slice does not complete M3.

Added unrun regression cases for stable/gated offers, adjacency income, consumed drafts, terrain combat stats, non-stacking shrines and capped healing. User chose manual playtesting: no lint, typechecks, tests, builds or browser verification run. Authored files formatted. No local/production publish performed. Multiplayer is the only browser mode: update the intended local world's module before playtesting; HMR alone cannot change authoritative rules. Existing terrain gains adjacency bonuses without a save reset. Current drafts retain saved offers; the next completed wave uses the new pool.

### Click-outside dismissal — 2026-10-30

Field guide closes on a backdrop click/tap; presses inside its content or padding remain open. Tower inspection closes when pressing outside the panel, before the next battlefield selection so another tower can still open normally. Existing close buttons and Escape remain available. Formatted; automated and browser checks not run, following the user's manual-playtest preference.

### Draft readability, illustrated tile guide and 20 waves — 2026-10-30

Reserved a non-shrinking, clipped artwork area for tile previews so sprites and tile shadows cannot spill over card names/descriptions; centered artwork also fits narrow cards. Field guide now presents all eight tiles as illustrated cards near the top, with rarity, effects and unlock depth.

Expanded the five-wave campaign to 20 authored waves. Preserved the first five wave IDs/compositions for saved queues; wave five now describes an early milestone. Waves 6–20 introduce all 32 enemy roster types through themed swarms, durable columns, fast hunts and heavy mixed assaults. All three legacy enemy IDs remain represented in the opening. Eight recruitable soldiers stay player units. New groups use existing health/speed/keep-damage behavior; no unimplemented monster abilities are promised. Campaign length and world looping already derive from the catalog length.

Added an unrun roster-coverage/20-wave invariant. Formatted authored changes; lint, typechecks, tests and browser checks remain skipped per manual-playtest preference. Balance across the longer campaign is provisional. Local publishing is part of making this change available for the ongoing playtest; production untouched.

Local handoff: module compilation and publish to `tile-tower-defense-world` succeeded without a destructive migration. Fresh islands now uses the 20-wave campaign; existing progress is preserved. Frontend changes use Vite HMR. No gameplay/browser verification performed.

### Catapult aiming — 2026-10-30

Catapults now record their actual target position when firing and rotate the existing sprite toward that point in projected screen space. Facing persists through firing/reloading and land redraws. Moved the rotation pivot to the chassis center so it turns in place. Existing saves tolerate the optional aim field and acquire it on their next shot. No client-side target selection or simulation duplication. Authored files formatted; automated/browser checks remain skipped for manual playtesting.

Catapult aiming reverted at user request: restored the original fixed orientation and sprite anchor, removed target recording and rotation configuration. Existing saved aim fields are harmless unused JSON. All earlier drafting, guide and campaign changes remain. Formatting only; no automated or browser checks.

### Windmill and dedicated discovery art — 2026-10-30

Added a ninth rare tile, Windmill: +15% base attack speed within two tiles, non-stacking, available at depth two. Shared combat/inspection/placement calculations include the aura. Added an unrun regression for radius, exact speed, non-stacking and incremental preview counts.

Generated quarry and orchard with PixelLab Pro Flash. PixelLab then exhausted its account allowance; user authorized switching to OpenAI. Generated the remaining perch, shrine, spring and windmill with built-in OpenAI image generation using the quarry as reference. Prepared 96×96 transparent runtime PNGs with nearest-neighbor resizing where needed, inspected the final art and measured alpha footprints. Six files total approximately 62 KB. Large OpenAI sources stay outside the runtime bundle. Island, draft and field guide share dedicated art keys; perch remains visible under a built tower. Art provenance/prompt record: docs/TILE-ART.md.

No automated tests, lint, typechecks or browser checks run, following the user's manual playtest preference. Asset dimension/file-size inspection and formatting only. Local publication follows for Fresh islands; production untouched.

Local handoff: module compilation and publish to Fresh islands succeeded; existing save retained. Reload the browser to load the six new image textures. Previously saved draft offers remain valid; Windmill can appear in subsequent eligible drafts. No production deployment.

### Timber grove overflow — 2026-10-30

Found incorrect slicing: forest.png matches Tree1's eight 192×256 frames, previously registered as six 256×256 frames. Replaced the oversized single-tree display with a compact three-tree composition from existing Tree1/Tree3 assets, without generating art. New grove.png is 96×96, 2.1 KB, with visible bounds safely inset. Island, draft and field guide share the new asset. Removed unused incorrect sheet registration and oversized render special case. Forest ID and bonuses unchanged. Inspected the composed PNG and measured source frames; no automated tests or browser checks, per manual-playtest preference.

Grove scale follow-up: increased battlefield display width from 76px to 84px (about 11%) at user request, preserving the footprint anchor and inset tree cluster. Formatting only; no automated or browser checks.

### Watchtower ground alignment — 2026-10-30

Measured all four faction watchtower sprites: 128×256 canvases with visible bounds (4,46)–(124,230). Bottom padding previously lifted the displayed tower about 10px off its intended ground contact. Anchored watchtowers at y=230/256 instead of the canvas bottom, preserving their width and horizontal center. Client presentation only. Formatted; no automated or browser verification, following manual-playtest preference.

## Mage Tower replacement — 2026-10-30

Replaced Sentinel's display/config role with a Mage Tower while retaining its stable saved ID. Implemented Frost/Fire/Lightning branches, 15 total points, prerequisites, 10-point capstones, hybrid primary hits and dominant-school appearance. Deep Freeze: periodic primary freeze plus immunity. Ignition: periodic impact explosion. Overcharge: periodic extra jumps with full damage retention. All purchases, cast counters, projectile payloads, statuses, damage ticks, target selection, death rewards and limits run in shared server-authoritative logic. Client only renders replicated state; client restore explicitly disables gameplay migration/refunds.

Migrates old Sentinel investments once on authority, refunding upgrade gold and clearing old ranks while keeping the tower/base spend. World ticks handle idle migrations; old arrows and saves remain readable. No table/reducer schema changes, so generated bindings need no edit.

Reused Bevy wizard/tower art and spell icons, created arcane/frost palette variants, four faction appearances for each aspect and compact 32px spell projectiles. School/capstone sigils, frost/freeze presentation, burn stack markers and chain arcs show replicated effects. Skill panel displays school points, total budget, prerequisites and capstones; field guide/localization updated.

User explicitly chose manual playtesting again. Added but did not run focused skill/status/chain/capstone/migration/determinism regressions and a real-server mage purchase/effect scenario; added the mage suite to the normal test command. No lint, typechecks, tests or browser verification run. Authored files formatted and art inspected. Balance and actual gameplay remain unverified; local module publication is the next playtest handoff step. Production untouched.

Mage handoff: module compilation and non-destructive local publish to `tile-tower-defense-world` succeeded. Fresh islands now runs authoritative mage rules and migrations. Reload localhost:5175 for new textures and skill UI. Existing Sentinel upgrade refunds occur once on the server. No standalone checks, tests or browser playthrough were run; user will verify manually.

### Clear burn status badge — 2026-10-30

Replaced tiny triangle stack markers with the existing pixel-art flame icon and a numeric stack count on a dark, orange-bordered badge above the health bar. Badge is created only for affected units, follows authoritative burn state, hides on expiry and is destroyed with its actor. No combat changes; no server publish needed. Formatted; manual playtesting only.

### Locale catalogs as the single display-text source — 2026-10-30

Removed duplicated English names/descriptions from shared tower, unit, terrain, wave and skill definitions, plus faction/island labels. Shared configs retain IDs, gameplay values and art references; the client i18n adapter adds typed localized display text. Skill branches now use stable IDs instead of English labels or positional translation keys. Tower panels, prerequisites and the field guide consume localized content; server prerequisite diagnostics reference the stable skill ID. Saves, node IDs and authoritative gameplay rules are unchanged.

Extended localization coverage for all skill descriptions/branches, translated node labels and English fallback, unchanged gameplay data, and rejection of duplicate display fields in shared catalogs. These additions have not been run locally; manual playtesting remains the user preference.

Release handoff: formatting and brace issues were fixed in commits b6a6f72 and 5250df7. GitHub release 41133563974 completed successfully. Fresh islands on Maincloud (tile-td-c20096a1909c-1) was subsequently updated with the released Mage Tower module using --delete-data=never; publication succeeded. The user identified the reported unknown skill as a legacy case. No world reset was performed.

### German browser-language support — 2026-10-30

Added complete German UI and content catalogs, including all towers, branches, skills/capstones, terrain, waves, units, factions, islands and accessibility labels. Registered German in the bundled i18next resources; browser locales de/de-DE/de-AT/de-CH resolve to German, with explicit ?lang=de/en overrides and English fallback. The same bundled code runs inside itch.io’s iframe without translation-network requests. Added wrapping/hyphenation for long German card and skill text.

Added unrun regression coverage for German regional locales, plural counts, catalog key parity and interpolation placeholders. German catalog keys are also checked against the English type shape by the normal release build. Formatted authored files; no local tests, typechecks, builds or browser checks run, per manual-playtest preference. Manual preview: localhost:5175/?lang=de (or reload with German browser language); ?lang=en restores English. German is not yet confirmed deployed to itch.io.

### Spanish browser-language support — 2026-10-30

Added complete Spanish UI and content catalogs, including skills/capstones, towers, units, terrain, waves, factions, islands and accessibility labels. Bundled Spanish alongside English and German; Spanish browser locales resolve to es, with ?lang=es for manual selection and English fallback. Translation files use the same stable keys and interpolation placeholders, with their key shape checked by the existing release build. No changes to server rules or saved IDs.

Extended the unrun localization regressions for es/es-ES/es-MX/es-AR/es-419, plural counts, skill prerequisite interpolation and Spanish catalog coverage. Formatted authored files; no tests, typechecks, builds or browser checks run, following the manual-playtest preference. Preview locally at localhost:5175/?lang=es. This change has not been published to itch.io.
