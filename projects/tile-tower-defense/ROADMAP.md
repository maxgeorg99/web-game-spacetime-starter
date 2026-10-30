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
