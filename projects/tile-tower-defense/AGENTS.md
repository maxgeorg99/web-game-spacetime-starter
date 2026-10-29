# Tile Tower Defense

- Read `ROADMAP.md` and `docs/CONTENT.md` before changing gameplay. Update roadmap status and handoff notes at session end.
- Use Phaser for presentation and SpacetimeDB for authoritative saved play. Share gameplay rules under `shared/game`; never duplicate them in the client.
- Keep balance and content in `shared/config`. Stable IDs, serializable data, explicit supported effects. Portrait and skill icon references belong in config too.
- YAGNI: finish the current playable milestone before adding another framework, transport system, generic ECS, editor or unused database abstraction.
- The visual target is a full-screen game like Isle of Arrows: compact HUD, icon-led action cards and contextual panels. No landing-page sections or editorial copy around the battlefield.
- Use existing avatar/resource/skill art from the Bevy/shared asset library. Measure spritesheets before loading them.
- Format authored files after editing. Ask the user before running automated lint, type checks, tests, builds, or browser verification; the user currently prefers to playtest manually. Never claim unrun checks passed.
- Offer `bun run test:server` after server/transport changes, but run it only with user approval. Never publish to production without explicit authorization.
- Regenerate `src/module_bindings`; do not edit or format generated files. Preserve unrelated projects and user changes.
