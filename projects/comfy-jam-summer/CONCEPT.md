# 🏖️ Sandcastle TD — Game Concept

> *"Protect the pearl. Build the walls. Hold the tide."*

---

## Overview

**Genre:** Tower Defense (Grid-Based)  
**Engine:** Phaser 3 (TypeScript/Vite)  
**Platform:** Browser  
**Jam:** Comfy Game Jam — Summer Edition  
**Theme:** Summer  
**Core Loop:** Place towers & walls on a sand grid → Enemies emerge from ocean waves → Defend your treasure (pearl/shell) at the center of the island

---

## Setting

A small tropical island surrounded by ocean. The player has built a beautiful sandcastle at the center, housing a rare giant pearl. But marine creatures — curious, territorial, and increasingly bold — are swarming from the waves to steal it.

The ocean surrounds the entire island. Enemies can emerge from **any ocean-adjacent tile**, and **waves change which shores are active**. The tide is rising.

---

## Visual Tone

- **Art Style:** Soft pixel art or clean vector sprites — pastel summer palette
- **Palette:** Sandy yellows, ocean blues/teals, warm coral accents
- **Mood:** Comfy but escalating tension — like building sandcastles before the tide comes in
- **UI:** Driftwood-and-shells aesthetic; handwritten-style fonts; coconut-shell buttons

---

## Grid & Map

- **Tile Types:**
  - `Ocean` — impassable for walls, enemy spawn zone
  - `Beach` (wet sand) — passable, buildable, near water
  - `Sand` — core playfield, fully buildable
  - `SandCastle` — central protected tile (win condition)
- **Grid Size:** ~20×16 tiles (scales with screen)
- **Enemies Path:** Dynamic — enemies use pathfinding (A\* or BFS) from their spawn to the SandCastle. **Walls redirect them.**
- **Wave Spawns:** Each wave, spawn points are randomly selected from ocean-adjacent tiles (simulates enemies surfacing from waves)

---

## Core Mechanics

### 🗼 The Main Tower (Sandcastle)

- **One fixed tower** at the center of the map — this is also the objective
- Cannot be destroyed, but if enemies reach it, HP is lost
- Can be upgraded with different **ammo types** (see below)
- Has a flag and bucket visual — iconic and immediately readable

### 🧱 Walls — The Primary Strategy Layer

Walls are the heart of the game. Unlike most TDs, walls here do more than block:

| Property | Detail |
|---|---|
| **HP** | Each wall segment has health — enemies chip away at them |
| **Pathfinding impact** | Enemies reroute around walls in real time |
| **Funnel creation** | Smart wall placement creates chokepoints |
| **Canal digging** | Removing/not placing walls creates corridors |
| **Material types** | Sand (cheap/weak), Wet Sand (medium), Driftwood (strong) |

> 🎯 Core design fantasy: *"I'll lure the crabs down this corridor, then blast them with a coconut barrage."*

### 🔫 Ammo / Weapon Types

The single Sandcastle tower cycles through ammo. Each ammo type is purchased and limited in quantity:

| Ammo | Damage | Special Effect | Feel |
|---|---|---|---|
| **Water Pistol** | Low | Fast fire rate, slows (wet) | Satisfying squirt sound |
| **Water Bazooka** | Medium | Knockback, AoE splash | Pushes enemies back toward ocean |
| **Coconut** | High | Single target, heavy impact | Chunky satisfying thud |
| **Beach Ball** | Low | Bounces between up to 4 enemies | Chaotic and fun |
| **Fishing Net** | None | Root/Stun in area | Crowd control |

Ammo is chosen per-wave or can be hotswapped mid-wave (at a cost).

---

## Enemies

All enemies emerge from the ocean. They have **swim** and **walk** phases.

| Enemy | HP | Speed | Behavior | Threat |
|---|---|---|---|---|
| 🐢 **Sea Turtle** | High | Slow | Tanks hits, hard to knockback | Wall breaker |
| 🐍 **Sea Snake** | Low | Fast | Slithers through gaps, ignores slow | Gap seeker |
| 🐟 **Paddlefish** | Medium | Medium | Swims faster, slows in sand | Swarm unit |
| 🐡 **Blowfish** | Medium | Slow | Explodes on death — damages walls | Kamikaze |
| 🗡️ **Swordfish** | High | Fast | Charges in a straight line, breaks walls | Rush threat |

---

## Wave System

- Waves are **pre-announced** (like a weather forecast): "Next wave: 3 Turtles from the North, 6 Paddlefish from the East"
- Players have a **build phase** between waves to reinforce, buy ammo, repair walls
- **Tide mechanic:** Every 3 waves, tide rises → some beach tiles become ocean → spawn zones shift → existing walls may be "washed away"
- Special **"Big Wave"** events: a mass surge from one direction — telegraphed by animated water

---

## Progression / Economy

- **Currency:** Seashells (dropped by defeated enemies)
- **Spending options:**
  - Buy ammo (per-shot or per-pack)
  - Build/upgrade walls
  - Unlock new ammo types (mid-game)
  - Repair damaged walls
- **No additional towers** — the single Sandcastle is the weapon; walls and ammo are the strategy

---

## Win / Lose Conditions

- **Win:** Survive all waves (or reach a score threshold in endless mode)
- **Lose:** The Sandcastle's pearl is stolen (enemies reach it and deplete HP)
- **Comfy angle:** The game should never feel punishing — soft fail states, undo wall placement, generous build timers

---

## Jam Constraint Adaptation

*The constraint is revealed at jam start. Possible adaptations:*

| Constraint | Adaptation |
|---|---|
| "No shooting" | Walls-only mode, enemies must be funneled into pits/ocean |
| "Limited resources" | Scarcity economy, forcing wall recycling |
| "Music-driven" | Wave timing synced to beach music BPM |
| "One button" | Auto-ammo, player only places walls |
| "Monochrome" | Silhouette-based art, sand/shadow contrast |

---

## Scope for Jam (48–72h)

### Must Have (MVP)
- [ ] Grid-based map with Ocean/Sand/SandCastle tiles
- [ ] Enemy spawning from ocean edges with basic pathfinding (BFS)
- [ ] Wall placement with pathfinding impact
- [ ] Single tower (auto-attacks nearest enemy)
- [ ] 2 enemy types (Turtle, Paddlefish)
- [ ] 2 ammo types (Water Pistol, Coconut)
- [ ] Wave system (3+ waves)
- [ ] Win/lose state

### Should Have
- [ ] Tide shift (spawn zone changes)
- [ ] 3–4 enemy types
- [ ] 3–4 ammo types
- [ ] Wall HP + destruction
- [ ] Shell economy + build phase
- [ ] Wave forecast UI

### Nice to Have
- [ ] Tide animation (tiles flood)
- [ ] Enemy death animations
- [ ] Beach Ball bounce chain visual
- [ ] Sound design (ocean ambience, squirts, coconut thuds)
- [ ] Endless mode

---

## Tech Stack

```
phaser@3.x
typescript
vite
(optional) tiled — for map editing
```

- **Rendering:** Phaser 3 with TilemapLayer for grid
- **Pathfinding:** BFS or EasyStar.js (pluggable, lightweight)
- **Build:** Vite for fast iteration
- **Art:** Placeholder colored rectangles → swapped for sprites

---

## Unique Selling Points for the Jam

1. **Immediately legible theme** — "Sandcastle vs. sea creatures" needs zero explanation
2. **Wall-as-strategy** — most jam TDs are tower-spam; this one rewards spatial thinking
3. **Dynamic spawn zones** — tide mechanic creates natural escalation without scripting complexity
4. **Comfy aesthetic fit** — soft palette, friendly enemies, satisfying squirt/thud sounds = perfect for the jam vibe
