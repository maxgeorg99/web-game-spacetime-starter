# Little Keep

A small, local tower-defense prototype built entirely in Rive RML + Luau.

Run `rive . --fit=contain` to open the native preview. Click golden pads to buy
50-gold towers, hover to see range, and click Start Wave. Survive three waves.
Reset starts a fresh game. Towers can also be built during combat.

The wave preview shows portraits, counts, scaled HP, and speed traits. It shows
the next wave during preparation and the current lineup during combat. Both
the preview and spawner read the same definitions in `game.luau`.

## Files

- `scene.rml`: native text, HUD, asset references, and view model bindings.
- `game.luau`: simulation in grid coordinates; no rendering dependencies.
- `board.luau`: isometric projection, depth-sorted sprites, input, HUD updates.
- `game-tests.luau`: economy, wave lifecycle, victory, loss, and session isolation.

Run `rive . --verify`, `rive inspect . --summary`, and `rive . --test`.
Capture a frame with `rive . --screenshot --advance=1`.

## Reference choices

Shared images and Fira Sans fonts are embedded from `../../../assets`.
The reference `towers.toml` basic tower supplies cost 50, damage 25, and a
0.5-second firing interval. Range 100 becomes 2.5 grid cells (40 units/cell).
The `units.toml` supplies the four enemy types:

| Enemy | Base HP | Speed (cells/s) | Gold | Keep damage | Animation |
|---|---:|---:|---:|---:|---|
| Skull | 70 | 1.125 | 12 | 2 | 6 × 192px |
| Snake | 20 | 1.875 | 7 | 1 | 8 × 192px |
| Spider | 25 | 2.25 | 8 | 1 | 5 × 192px |
| Turtle | 120 | 0.5 | 15 | 1 | 7 × 320px |

Three custom mixed waves introduce the enemies gradually:

| Wave | Composition | HP multiplier | Spawn interval |
|---|---|---:|---:|
| 1 | 6 skulls, 4 snakes | 1 | 1.25s |
| 2 | 4 skulls, 4 snakes, 6 spiders | 1.35 | 1.1s |
| 3 | 4 skulls, 4 snakes, 6 spiders, 3 turtles | 1.7 | 0.95s |

Groups spawn in the listed order. Clearing either of the first two waves awards
25 gold. The wave-preview presentation is inspired by the reference
`src/systems/wave_manager_ui.rs`; preparation remains manual with Start Wave.
The original wave mix and skill trees are not imported. Combat damage is
instant; arrow streaks are visual feedback.

The board is genuinely isometric geometry; the existing character/building
sprites are reused as upright billboards. No multiplayer, upgrades, selling,
audio, or generated assets in this first version.
