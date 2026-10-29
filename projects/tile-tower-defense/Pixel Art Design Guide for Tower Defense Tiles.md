# Pixel Art Design Guide for Tower Defense Tiles

A practical guide to designing individual tiles for a tile-placement tower defense game, with notes on adapting a premade pixel asset pack.

## 1. Fix the technical grid first

- **One tile size**, e.g. 16x16 or 32x32, with towers at that size or at clean multiples. Mixed pixel densities are the most common thing that makes kitbashed art look wrong.
- **One perspective.** Top-down is easiest. 3/4 view lets towers have height, which matters if you want a height bonus.
- **Integer scaling only** when rendering, and nearest-neighbor filtering.

## 2. Split every tile into layers

Don't draw "grass tile with tower" as one sprite. Draw:

1. **Ground**: terrain, with a few variants to break up repetition
2. **Structure**: road, tower, wall, flag
3. **Overlay**: range ring, synergy glow, rarity border, hover ghost

Towers then drop onto any terrain, and you multiply content instead of drawing every combination.

## 3. Make function readable at a glance

Players make dozens of placement decisions per run, so each tile category needs its own visual language:

| Category          | Silhouette                         | Color cue                        |
| ----------------- | ---------------------------------- | -------------------------------- |
| Path/road         | Flat, low, continuous              | Neutral, warm (sand, brown)      |
| Tower             | Tall, vertical, distinct top shape | One accent color per damage type |
| Economy/resource  | Round, chest- or crate-like        | Gold or yellow                   |
| Expansion (flags) | Thin vertical pole                 | Bright, high-contrast            |
| Hazard/enemy-side | Jagged                             | Red or purple                    |

Test it by squinting, or by viewing the tile in greyscale at 1x. If you can't tell a tower from a decoration, the silhouette needs work.

## 4. Roads need autotiling

Because the player builds the path, road pieces must connect seamlessly. Use a bitmask autotile.

- **4-bit (16 variants)** handles straight, corner, T, cross and dead end, and is enough for a 4-neighbor grid.
- **8-bit (47 variants)** only matters if you want blobby edges against terrain.

Draw the edge connection points at the same pixel position on every piece, e.g. always exactly the center 4 pixels, so they line up.

## 5. Palette and shading discipline

- **8-16 colors per tileset**, plus a shared global palette so every tile feels like one game.
- **Light from one direction** (usually top-left) on every sprite.
- Use **hue shifting** in shadows (cooler) and highlights (warmer) rather than just darkening.
- Use **selective outlines**: darker outlines on objects, none or soft on ground, so towers pop off the terrain.
- Leave the ground low-contrast, so the things that matter stand out.

## 6. Animation budget

- **Idle**: 2-4 frames, subtle, only for towers and enemies.
- **Attack**: 3-5 frames with a clear anticipation frame, so players see which tower fired.
- **Ground tiles stay static**, apart from maybe water.
- Use **code-driven effects** (tint flash, scale pop, particles) for placement and upgrades instead of extra frames.

## 7. Working with a premade pack

- **Audit first.** List what the pack covers (ground, walls, props, characters) and what's missing (roads? tall towers? UI overlays?). Gaps are where your own drawing time goes.
- **Recolor to unify.** Applying your palette to the whole pack hides the seams between sprites that weren't designed together.
- **Kitbash towers** from parts: base + body + top, in different combinations. That gets many tower variants from a few pieces.
- **Draw the custom 10%** yourself: path connectors, placement ghosts, range indicators and synergy markers. These are the game-specific bits no pack will have.
