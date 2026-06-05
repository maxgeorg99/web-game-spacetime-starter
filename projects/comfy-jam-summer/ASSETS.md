# 🏖️ Sandcastle TD — Asset Inventory

## Sprite Sheet Analysis: `Ground_Cliff_and_Flora-Sheet.png`

Identified tiles/sprites from the uploaded sheet:

| Sprite | Type | Usable as |
|---|---|---|
| Brown textured ground (top-left) | Ground tile | `Sand` tile, beach ground |
| Green textured ground (top-right) | Ground tile | `Beach` tile (wet sand) |
| Cliff/ledge edge pieces | Terrain transition | Ocean→Beach border tiles |
| Christmas tree / Pine tree | Flora decoration | Island decoration, obstacle |
| Red mushroom/coral plant | Flora decoration | Underwater/shore decoration |
| Orange square tile | Ground tile | Dry sand variant |
| Teal/green square tile | Ground tile | `Sand` or `Beach` alt tile |
| Colorful flower cluster (pink/blue/yellow) | Flora decoration | Beach decoration |
| Small critter/crab sprite (bottom-right) | Enemy? | Could repurpose as enemy base |

---

## ✅ Assets — Have

### Environment / Tiles
- [x] Sand ground tiles (2 variants)
- [x] Beach/grass ground tiles
- [x] Cliff/ledge transition pieces (Ocean → Beach border)
- [x] Decorative flora (trees, plants, flowers)

### Enemies
- [x] Sea Turtle (top-down, walk animation)
- [x] Sea Snake (top-down, slither frames)
- [x] Paddlefish (top-down, swim frames)
- [x] Blowfish (top-down + death/explode frames)
- [x] Swordfish (top-down, charge frames)

### Projectiles / Items
- [x] Beach Ball sprite

---

## ❌ Assets — Missing (Need to Create or Find)

### 🏰 Sandcastle / Tower
- [ ] Sandcastle base sprite (top-down view)
- [ ] Sandcastle with bucket on top
- [ ] Flag / pennant sprite (animated wave would be nice)
- [ ] Tower upgrade states (damaged / reinforced)

### 🌊 Ocean / Water Tiles
- [ ] Ocean tile (animated water would be ideal)
- [ ] Ocean-to-beach transition tile (wet sand edge)
- [ ] Wave/foam animation frames

### 🔫 Weapons / Projectiles
- [ ] Water pistol item icon (UI)
- [ ] Water pistol projectile (small water droplet / stream)
- [ ] Water bazooka item icon (UI)
- [ ] Water bazooka projectile (bigger splash)
- [ ] Coconut projectile sprite
- [ ] Fishing net projectile / AoE indicator
- [ ] Impact/splash VFX frames (water hit)

### 🧱 Walls
- [ ] Sand wall tile (intact)
- [ ] Sand wall tile (cracked — damage state 1)
- [ ] Sand wall tile (heavily cracked — damage state 2)
- [ ] Driftwood wall tile (intact)
- [ ] Driftwood wall tile (damaged)

### 💰 Currency / UI Icons
- [ ] Seashell icon (currency)
- [ ] Pearl / gem icon (objective / HP)
- [ ] Ammo count icon (generic bullet/slot)
- [ ] Wave indicator icon

### 🎨 UI / HUD
- [ ] Toolbar / hotbar background (driftwood aesthetic)
- [ ] Button frames (coconut shell / wooden style)
- [ ] HP bar fill + background
- [ ] Build phase timer bar
- [ ] Wave forecast panel background

---

## 🛠️ Asset Production Plan

### Option A — Placeholder First (Jam-Safe)
Use `Phaser.GameObjects.Graphics.generateTexture()` for everything missing.
Swap real sprites in later without touching game logic.

```typescript
// Quick placeholder — colored rectangle as sprite
scene.add.graphics()
  .fillStyle(0xD4A853)
  .fillRect(0, 0, 32, 32)
  .generateTexture('sandcastle', 32, 32);
```

### Option B — Priority Draw Order
If drawing assets manually, tackle in this order:

1. **Ocean tile** — needed for map to read correctly
2. **Sandcastle** — it's the hero object, center of the screen
3. **2–3 enemy sprites** (Turtle + Paddlefish minimum for MVP)
4. **Wall tiles** (2 states: intact + cracked)
5. **Water projectile** (droplet — very simple)
6. **Coconut projectile** (brown circle, very simple)
7. **UI icons** (seashell, pearl)
8. **Flag animation** (2–3 frames)

### Recommended Tools
- **Aseprite** — pixel art + animation frames
- **Piskel** (free, browser-based) — quick sprites
- **itch.io asset packs** — search: `top-down beach`, `ocean tiles`, `tropical`

### Useful Free Packs (itch.io)
- Search: `"top down beach tileset"`
- Search: `"tropical island pixel art"`
- Search: `"ocean wave tiles pixel"`

---

## 📐 Recommended Sprite Sizes

| Asset | Size |
|---|---|
| Ground tiles | 16×16 px |
| Walls | 16×16 px |
| Sandcastle | 32×32 px |
| Enemies | 16×16 px (small), 24×24 px (large) |
| Projectiles | 8×8 px |
| UI icons | 16×16 px |
| Flag | 8×16 px |
