# Game Architecture

## Directory structure

```
src/
├── config/
│   └── constants.ts          # All magic numbers and asset keys in one place
├── utils/
│   └── gridUtils.ts          # Pure functions: grid math, isSand, coastFrame
├── filters/
│   └── WaterWobbleFilter.ts  # Self-contained WebGL shader + controller
├── systems/
│   ├── BuildSystem.ts        # Placement/destruction state + occupation tracking
│   └── HighlightSystem.ts    # Hover-cell visual feedback (reads BuildSystem, never writes)
├── objects/
│   ├── OceanBackground.ts    # TileSprite + filter wiring
│   ├── IslandBuilder.ts      # Terrain, shells, palms (stateless factory)
│   └── HudOverlay.ts         # All HUD panels + button wiring
└── scenes/
    └── GameScene.ts          # Thin coordinator — no rendering or logic here
```

## Layer model

```
GameScene (coordinator)
├── OceanBackground      ← filter/rendering detail
├── IslandBuilder        ← terrain factory, writes to BuildSystem.occupy()
├── BuildSystem          ← single source of truth for grid state
├── HighlightSystem      ← reads BuildSystem, renders Graphics overlay
└── HudOverlay           ← emits ToolMode events upward via callback
```

## Separation of concerns

|
 Module           
|
 Knows about              
|
 Does NOT know about                
|
|
------------------
|
--------------------------
|
------------------------------------
|
|
`gridUtils`
|
 grid math only           
|
 Phaser, scenes, game state         
|
|
`BuildSystem`
|
 Phaser scene / Images    
|
 HUD, pointer, highlight            
|
|
`HighlightSystem`
|
 BuildSystem (read-only)  
|
 how objects are built/destroyed    
|
|
`IslandBuilder`
|
 BuildSystem.occupy()     
|
 ToolMode, pointer, HUD             
|
|
`HudOverlay`
|
 callback signature only  
|
 BuildSystem, grid                  
|
|
`GameScene`
|
 all of the above         
|
 nothing — it only wires            
|

## How to extend

### Add a new building type (e.g. "Cannon")
1. Add `"build-cannon"` to the `ToolMode` union in `BuildSystem.ts`.
2. Add a `placeCannon()` method to `BuildSystem`.
3. Add a button region to `TOOL_REGIONS` in `HudOverlay.ts`.
4. Handle `"build-cannon"` in `GameScene.handleGridClick()`.

### Add a new WebGL filter
1. Create `src/filters/YourFilter.ts` following `WaterWobbleFilter.ts` as a template.
2. Call your `applyYourFilter()` helper from whichever object needs it.

### Add a new HUD panel
Add a private `buildYourPanel()` method inside `HudOverlay` and call it from the constructor.
No other file needs to change.

### Add a new scene (e.g. MainMenuScene)
Create `src/scenes/MainMenuScene.ts`. Import and register it in your Phaser game config.
It can import from `config/`, `utils/`, and `filters/` as needed.

### Unit-testing grid logic
`gridUtils.ts` has zero Phaser dependencies — import it directly in any test runner.
`BuildSystem` can be instantiated with a minimal mock scene for integration tests.
