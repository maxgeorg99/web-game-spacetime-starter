import { ObjectType, BuildSystem } from "./BuildSystem";
import { TILE_SIZE } from "../config/constants";
import { gridToWorld } from "../utils/gridUtils";

const CONNECTED_SCALE = 1.5;
const POSITION_NUDGE = TILE_SIZE * 0.25;

/**
 * Order of connection rules for tower variant lookups.
 * Earlier entries have higher priority (more specific connections first).
 * Mask bits: bit 0 = wall above, bit 1 = wall below, bit 2 = wall left, bit 3 = wall right.
 */
const TOWER_LOOKUP: Array<{ mask: number; key: string }> = [
  // 2-connection combos (match first — also serves 3+ connections via best-fit)
  { mask: 0b0101, key: "sandtower-wall-up-left" },
  { mask: 0b1001, key: "sandtower-wall-up-right" },
  { mask: 0b0110, key: "sandtower-wall-down-left" },
  { mask: 0b1010, key: "sandtower-wall-down-right" },
  { mask: 0b0011, key: "sandtower-wall-down-up" },
  { mask: 0b1100, key: "sandtower-wall-left-right" },
  // single connections
  { mask: 0b0001, key: "sandtower-wall-up" },
  { mask: 0b0010, key: "sandtower-wall-down" },
  { mask: 0b0100, key: "sandtower-wall-left" },
  { mask: 0b1000, key: "sandtower-wall-right" },
];

const BASE_TOWER = "sandtower";

export class SnapSystem {
  private buildSystem: BuildSystem;
  private gridOffsetX: number;
  private gridOffsetY: number;

  constructor(buildSystem: BuildSystem, gridOffsetX: number, gridOffsetY: number) {
    this.buildSystem = buildSystem;
    this.gridOffsetX = gridOffsetX;
    this.gridOffsetY = gridOffsetY;
  }

  /**
   * Recompute and apply the correct connected-variant texture for the cell
   * at (col, row), plus refresh all cardinal neighbours so they update too.
   */
  refresh(col: number, row: number): void {
    // Refresh all 4 cardinal neighbours first (they may have gained/lost a connection).
    const allDirs = [
      { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
      { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
    ];
    for (const { dc, dr } of allDirs) {
      const nc = col + dc;
      const nr = row + dr;
      const nType = this.buildSystem.getType(nc, nr);
      if (nType) {
        this.applyVariant(nc, nr, nType);
      }
    }

    // Refresh the cell itself (if it still exists — won't after destruction).
    const type = this.buildSystem.getType(col, row);
    if (type) {
      this.applyVariant(col, row, type);
    }
  }

  // ── Internal ─────────────────────────────────────────────────────

  private applyVariant(col: number, row: number, type: ObjectType): void {
    const texKey = this.resolveTexture(col, row, type);
    const sprite = this.buildSystem.getSprite(col, row);
    if (!sprite) return;

    const isConnectedTower = type === "tower" && texKey !== "sandtower";
    const size = TILE_SIZE * (isConnectedTower ? CONNECTED_SCALE : 1);

    if (sprite.texture.key !== texKey) {
      sprite.setTexture(texKey);
    }
    sprite.setDisplaySize(size, size);

    // Nudge position so the tower portion of the connected sprite aligns
    // with the tile center. Push away from connecting walls.
    if (isConnectedTower) {
      let nx = 0;
      let ny = 0;
      if (this.isWallAt(col, row - 1)) ny -= POSITION_NUDGE;
      if (this.isWallAt(col, row + 1)) ny += POSITION_NUDGE;
      if (this.isWallAt(col - 1, row)) nx -= POSITION_NUDGE;
      if (this.isWallAt(col + 1, row)) nx += POSITION_NUDGE;

      const { x, y } = gridToWorld(col, row, this.gridOffsetX, this.gridOffsetY, TILE_SIZE);
      sprite.setPosition(x + nx, y + ny);
    } else {
      const { x, y } = gridToWorld(col, row, this.gridOffsetX, this.gridOffsetY, TILE_SIZE);
      sprite.setPosition(x, y);
    }
  }

  private resolveTexture(col: number, row: number, type: ObjectType): string {
    if (type === "tower") {
      return this.resolveTowerVariant(col, row);
    }
    // No wall variant textures available — keep base.
    return type === "wall-h" ? "wall-h" : "wall-v";
  }

  private resolveTowerVariant(col: number, row: number): string {
    let connections = 0;

    // bit 0: up, bit 1: down, bit 2: left, bit 3: right
    if (this.isWallAt(col, row - 1)) connections |= 0b0001;
    if (this.isWallAt(col, row + 1)) connections |= 0b0010;
    if (this.isWallAt(col - 1, row)) connections |= 0b0100;
    if (this.isWallAt(col + 1, row)) connections |= 0b1000;

    if (connections === 0) return BASE_TOWER;

    for (const { mask, key } of TOWER_LOOKUP) {
      if ((connections & mask) === mask) {
        return key;
      }
    }

    return BASE_TOWER;
  }

  private isWallAt(col: number, row: number): boolean {
    const type = this.buildSystem.getType(col, row);
    return type === "wall-h" || type === "wall-v";
  }
}
