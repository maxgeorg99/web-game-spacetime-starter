import Phaser from "phaser";
import { TILE_SIZE, GRID_COLS, GRID_ROWS } from "../config/constants";

const WATER_WOBBLE_FRAG = `
precision mediump float;
uniform sampler2D iChannel0;
uniform float time;
varying vec2 outTexCoord;

void main() {
  vec2 uv = outTexCoord;
  uv.x += sin(uv.y * 8.0 + time * 1.5) * 0.004;
  uv.y += cos(uv.x * 6.0 + time * 1.2) * 0.003;
  gl_FragColor = texture2D(iChannel0, uv);
}
`;

class WaterWobble extends Phaser.Filters.Controller {
  scene: Phaser.Scene;
  constructor(camera: Phaser.Cameras.Scene2D.Camera, scene: Phaser.Scene) {
    super(camera, "FilterWaterWobble");
    this.scene = scene;
  }
}

class FilterWaterWobble
  extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader
{
  constructor(manager: Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager) {
    super("FilterWaterWobble", manager, undefined, WATER_WOBBLE_FRAG);
  }

  setupUniforms(
    controller: Phaser.Filters.Controller,
    _drawingContext: Phaser.Renderer.WebGL.DrawingContext,
  ): void {
    const wobble = controller as WaterWobble;
    this.programManager.setUniform("time", wobble.scene.time.now / 1000);
  }
}

// Rectangular sand island inset from the ocean border by a fixed margin.
const ISLAND_MARGIN_X = 3;
const ISLAND_MARGIN_Y = 3;
const ISLAND_LEFT = ISLAND_MARGIN_X;
const ISLAND_RIGHT = GRID_COLS - 1 - ISLAND_MARGIN_X;
const ISLAND_TOP = ISLAND_MARGIN_Y;
const ISLAND_BOTTOM = GRID_ROWS - 1 - ISLAND_MARGIN_Y;

// Frame indices into beach_tiles.png (20 frames per row).
// Interior sand: autotile centre — tiles seamlessly with the coast edges below.
const SAND_FRAME = 148;

// Sand-coastline autotile: sand body with a foam fringe toward the water.
// Keyed by which sides border the ocean (3x3 block around frame 148).
const COAST_NW = 127;
const COAST_N = 128;
const COAST_NE = 129;
const COAST_W = 147;
const COAST_E = 149;
const COAST_SW = 167;
const COAST_S = 168;
const COAST_SE = 169;

const SHELL_KEYS = [
  "shell-black",
  "shell-green",
  "shell-brown",
  "shell-red",
  "shell-pink",
  "shell-yellow",
];

function isSand(col: number, row: number): boolean {
  return (
    col >= ISLAND_LEFT &&
    col <= ISLAND_RIGHT &&
    row >= ISLAND_TOP &&
    row <= ISLAND_BOTTOM
  );
}

function isInteriorSand(col: number, row: number): boolean {
  if (!isSand(col, row)) return false;
  const n = !isSand(col, row - 1);
  const s = !isSand(col, row + 1);
  const e = !isSand(col + 1, row);
  const w = !isSand(col - 1, row);
  return !(n || s || e || w);
}

// Returns the coast frame for a sand tile, or -1 for interior sand.
function coastFrame(col: number, row: number): number {
  const n = !isSand(col, row - 1);
  const s = !isSand(col, row + 1);
  const e = !isSand(col + 1, row);
  const w = !isSand(col - 1, row);

  if (n && w) return COAST_NW;
  if (n && e) return COAST_NE;
  if (s && w) return COAST_SW;
  if (s && e) return COAST_SE;
  if (n) return COAST_N;
  if (s) return COAST_S;
  if (e) return COAST_E;
  if (w) return COAST_W;
  return -1; // fully surrounded by sand
}

type ToolMode = "none" | "build-tower" | "build-wall" | "destroy";

function tileKey(col: number, row: number): string {
  return `${col},${row}`;
}

export class GameScene extends Phaser.Scene {
  private ocean!: Phaser.GameObjects.TileSprite;
  private toolMode: ToolMode = "none";
  private highlight!: Phaser.GameObjects.Graphics;
  private occupied: Set<string> = new Set();
  private placedObjects: Map<string, Phaser.GameObjects.Image> = new Map();
  private gridOffsetX = 0;
  private gridOffsetY = 0;

  constructor() {
    super("GameScene");
  }

  create(): void {
    const { width, height } = this.scale;
    const offsetX = (width - GRID_COLS * TILE_SIZE) / 2;
    const offsetY = (height - GRID_ROWS * TILE_SIZE) / 2;
    this.gridOffsetX = offsetX;
    this.gridOffsetY = offsetY;

    // Single scrolling TileSprite for the ocean background.
    this.ocean = this.add.tileSprite(
      width / 2,
      height / 2,
      width,
      height,
      "ocean",
    );

    // Register and attach water wobble filter.
    const renderer = this.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    if (!renderer.renderNodes.hasNode("FilterWaterWobble")) {
      renderer.renderNodes.addNodeConstructor(
        "FilterWaterWobble",
        FilterWaterWobble as unknown as Function,
      );
    }
    this.ocean.enableFilters();
    this.ocean.filters!.internal.add(
      new WaterWobble(this.ocean.filterCamera!, this),
    );

    // Sand and coast tiles on top.
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (!isSand(col, row)) continue;

        const x = offsetX + col * TILE_SIZE + TILE_SIZE / 2;
        const y = offsetY + row * TILE_SIZE + TILE_SIZE / 2;
        const coast = coastFrame(col, row);
        const frame = coast >= 0 ? coast : SAND_FRAME;

        this.add
          .image(x, y, "tiles-sheet", frame)
          .setDisplaySize(TILE_SIZE, TILE_SIZE);
      }
    }

    // Scatter shells on interior sand tiles.
    for (let row = ISLAND_TOP; row <= ISLAND_BOTTOM; row++) {
      for (let col = ISLAND_LEFT; col <= ISLAND_RIGHT; col++) {
        if (!isInteriorSand(col, row)) continue;

        if (Math.random() > 0.2) continue;

        const x = offsetX + col * TILE_SIZE + TILE_SIZE / 2;
        const y = offsetY + row * TILE_SIZE + TILE_SIZE / 2;
        const shellKey = Phaser.Math.RND.pick(SHELL_KEYS);

        this.add
          .image(x, y, shellKey)
          .setDisplaySize(TILE_SIZE, TILE_SIZE)
          .setDepth(1);
      }
    }

    // Place 3 palm trees at fixed interior positions.
    const palmPositions: [number, number][] = [
      [6, 6],
      [14, 8],
      [14, 3],
    ];
    for (const [col, row] of palmPositions) {
      this.add
        .image(
          offsetX + col * TILE_SIZE + TILE_SIZE / 2,
          offsetY + row * TILE_SIZE + TILE_SIZE / 2,
          "palm",
        )
        .setDisplaySize(TILE_SIZE * 3, TILE_SIZE * 3)
        .setDepth(1);
      this.occupied.add(tileKey(col, row));
      this.occupied.add(tileKey(col, row - 1));
      this.occupied.add(tileKey(col, row + 1));
    }

    // Build-mode highlight graphics.
    this.highlight = this.add.graphics().setDepth(5);

    // HUD bar at the bottom with 3 clickable button regions (260×120).
    const hudY = height - 60;
    const hudImg = this.add
      .image(width / 2, hudY, "ui-hud")
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    hudImg.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.x - (width / 2 - 130);
      if (localX < 87) {
        this.toolMode =
          this.toolMode === "build-tower" ? "none" : "build-tower";
        console.log("build tower pressed", "mode:", this.toolMode);
      } else if (localX < 174) {
        this.toolMode = this.toolMode === "build-wall" ? "none" : "build-wall";
        console.log("build wall pressed", "mode:", this.toolMode);
      } else {
        this.toolMode = this.toolMode === "destroy" ? "none" : "destroy";
        console.log("destroy pressed", "mode:", this.toolMode);
      }
    });

    // Grid click handler for placing / destroying.
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const col = Math.floor((pointer.x - offsetX) / TILE_SIZE);
      const row = Math.floor((pointer.y - offsetY) / TILE_SIZE);

      if (this.toolMode === "destroy") {
        this.destroyAt(col, row);
        return;
      }

      if (!isInteriorSand(col, row)) return;
      if (this.occupied.has(tileKey(col, row))) return;

      if (this.toolMode === "build-tower") {
        this.placeTower(col, row);
      } else if (this.toolMode === "build-wall") {
        this.placeWall(col, row, !pointer.rightButtonDown());
      }
    });

    // ---- Top-left HUD ----
    // Gold (left) + Shells (right) on same row.
    this.add
      .image(24, 20, "icon-gold")
      .setOrigin(0.5)
      .setDisplaySize(24, 24)
      .setDepth(10);

    this.add
      .text(40, 20, "120", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#e0c070",
        stroke: "#3a2a10",
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setDepth(10);

    this.add
      .image(100, 20, "shell-yellow")
      .setOrigin(0.5)
      .setDisplaySize(24, 24)
      .setDepth(10);

    this.add
      .text(116, 20, "15", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#e0d0a0",
        stroke: "#3a2a10",
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setDepth(10);

    // Next-wave preview panel.
    const panelY = 60;
    const panelW = 110;
    const panelH = 52;

    this.add
      .graphics()
      .fillStyle(0x1a2a1a, 0.7)
      .fillRoundedRect(10, panelY - panelH / 2, panelW, panelH, 6)
      .lineStyle(1, 0x4a7a4a, 0.6)
      .strokeRoundedRect(10, panelY - panelH / 2, panelW, panelH, 6)
      .setDepth(10);

    this.add
      .text(16, panelY - 12, "NEXT WAVE", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "10px",
        color: "#6aaa6a",
      })
      .setDepth(10);

    this.add
      .image(38, panelY + 15, "paddlefish-avatar")
      .setOrigin(0.5)
      .setDisplaySize(36, 36)
      .setDepth(10);

    this.add
      .text(54, panelY + 6, "x6", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#e0d0a0",
        stroke: "#1a3a5c",
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setDepth(10);
  }

  private placeTower(col: number, row: number): void {
    const x = this.gridOffsetX + col * TILE_SIZE + TILE_SIZE / 2;
    const y = this.gridOffsetY + row * TILE_SIZE + TILE_SIZE / 2;

    const img = this.add
      .image(x, y, "sandtower")
      .setDisplaySize(TILE_SIZE, TILE_SIZE)
      .setDepth(2);

    const key = tileKey(col, row);
    this.occupied.add(key);
    this.placedObjects.set(key, img);
    console.log(`tower placed at (${col},${row})`);
  }

  private placeWall(col: number, row: number, horizontal: boolean): void {
    const x = this.gridOffsetX + col * TILE_SIZE + TILE_SIZE / 2;
    const y = this.gridOffsetY + row * TILE_SIZE + TILE_SIZE / 2;

    const img = this.add
      .image(x, y, horizontal ? "wall-h" : "wall-v")
      .setDisplaySize(TILE_SIZE, TILE_SIZE)
      .setDepth(2);

    const key = tileKey(col, row);
    this.occupied.add(key);
    this.placedObjects.set(key, img);
    console.log(
      `wall placed at (${col},${row}) ${horizontal ? "horizontal" : "vertical"}`,
    );
  }

  private destroyAt(col: number, row: number): void {
    const key = tileKey(col, row);
    const obj = this.placedObjects.get(key);
    if (!obj) return;

    obj.destroy();
    this.placedObjects.delete(key);
    this.occupied.delete(key);
    console.log(`destroyed at (${col},${row})`);
  }

  update(): void {
    this.ocean.tilePositionX += 0.3;
    this.ocean.tilePositionY += 0.15;

    this.highlight.clear();

    if (this.toolMode === "none") return;

    const pointer = this.input.activePointer;
    const col = Math.floor((pointer.x - this.gridOffsetX) / TILE_SIZE);
    const row = Math.floor((pointer.y - this.gridOffsetY) / TILE_SIZE);

    const x = this.gridOffsetX + col * TILE_SIZE + TILE_SIZE / 2;
    const y = this.gridOffsetY + row * TILE_SIZE + TILE_SIZE / 2;

    if (this.toolMode === "build-tower" || this.toolMode === "build-wall") {
      const ok =
        isInteriorSand(col, row) && !this.occupied.has(tileKey(col, row));
      this.highlight.fillStyle(ok ? 0x00ff00 : 0xff0000, 0.3);
      this.highlight.fillRect(
        x - TILE_SIZE / 2,
        y - TILE_SIZE / 2,
        TILE_SIZE,
        TILE_SIZE,
      );
    } else if (this.toolMode === "destroy") {
      if (this.occupied.has(tileKey(col, row))) {
        this.highlight.fillStyle(0xff0000, 0.4);
        this.highlight.fillRect(
          x - TILE_SIZE / 2,
          y - TILE_SIZE / 2,
          TILE_SIZE,
          TILE_SIZE,
        );
      }
    }
  }
}
