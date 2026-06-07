import Phaser from "phaser";
import { TILE_SIZE, DEPTH } from "../config/constants";
import { gridToWorld, tileKey } from "../utils/gridUtils";
import { GridState, ObjectType } from "../state/GridState";

const HP_BAR_W = 24;
const HP_BAR_H = 4;
const HP_BAR_OFFSET_Y = -TILE_SIZE / 2 - 6;

export class BuildRenderer {
  private scene: Phaser.Scene;
  private grid: GridState;
  private gridOffsetX: number;
  private gridOffsetY: number;
  private placedObjects: Map<string, Phaser.GameObjects.Image> = new Map();
  private hpBars: Map<string, Phaser.GameObjects.Graphics> = new Map();

  onTowerClick?: (x: number, y: number) => void;

  constructor(scene: Phaser.Scene, grid: GridState, offsetX: number, offsetY: number) {
    this.scene = scene;
    this.grid = grid;
    this.gridOffsetX = offsetX;
    this.gridOffsetY = offsetY;
  }

  placeSprite(col: number, row: number, type: ObjectType): void {
    const key = tileKey(col, row);
    const { x, y } = gridToWorld(col, row, this.gridOffsetX, this.gridOffsetY, TILE_SIZE);

    let texKey: string;
    if (type === "tower") {
      texKey = "sandtower";
    } else {
      texKey = type === "wall-h" ? "wall-h" : "wall-v";
    }

    const img = this.scene.add
      .image(x, y, texKey)
      .setDisplaySize(TILE_SIZE, TILE_SIZE)
      .setDepth(DEPTH.structure);

    if (type === "tower") {
      img.setInteractive({ useHandCursor: true });
      img.on("pointerdown", () => {
        if (this.grid.toolMode === "destroy") return;
        this.onTowerClick?.(x, y);
      });
    }

    this.placedObjects.set(key, img);
  }

  removeSprite(col: number, row: number): void {
    const key = tileKey(col, row);
    const obj = this.placedObjects.get(key);
    if (obj) {
      obj.destroy();
      this.placedObjects.delete(key);
    }

    const bar = this.hpBars.get(key);
    if (bar) {
      bar.destroy();
      this.hpBars.delete(key);
    }
  }

  getSprite(col: number, row: number): Phaser.GameObjects.Image | null {
    return this.placedObjects.get(tileKey(col, row)) ?? null;
  }

  getTextureKey(col: number, row: number): string | null {
    return this.placedObjects.get(tileKey(col, row))?.texture?.key ?? null;
  }

  drawHpBar(col: number, row: number, hp: number, maxHp: number): void {
    const key = tileKey(col, row);
    let gfx = this.hpBars.get(key);
    if (!gfx) {
      gfx = this.scene.add.graphics().setDepth(DEPTH.hud);
      this.hpBars.set(key, gfx);
    }

    if (hp >= maxHp) {
      gfx.clear();
      return;
    }

    const { x, y } = gridToWorld(col, row, this.gridOffsetX, this.gridOffsetY, TILE_SIZE);
    const bx = x - HP_BAR_W / 2;
    const by = y + HP_BAR_OFFSET_Y;
    const ratio = hp / maxHp;

    gfx.clear();
    gfx.fillStyle(0x000000, 0.6);
    gfx.fillRect(bx, by, HP_BAR_W, HP_BAR_H);

    const color = ratio > 0.6 ? 0x44cc44 : ratio > 0.3 ? 0xcccc44 : 0xcc4444;
    const fillW = Math.max(0, ratio * HP_BAR_W);
    gfx.fillStyle(color, 0.9);
    gfx.fillRect(bx, by, fillW, HP_BAR_H);
  }

  flashRed(col: number, row: number): void {
    const { x, y } = gridToWorld(col, row, this.gridOffsetX, this.gridOffsetY, TILE_SIZE);
    const flash = this.scene.add
      .graphics()
      .setDepth(DEPTH.highlight);
    flash.fillStyle(0xff0000, 0.5);
    flash.fillRect(x - TILE_SIZE / 2, y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      ease: "Power2",
      onComplete: () => flash.destroy(),
    });
  }
}
