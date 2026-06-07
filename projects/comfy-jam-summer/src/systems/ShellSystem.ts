import Phaser from "phaser";
import { TILE_SIZE } from "../config/constants";
import { gridToWorld } from "../utils/gridUtils";

export interface ShellEntry {
  col: number;
  row: number;
  sprite: Phaser.GameObjects.Image;
}

export class ShellSystem {
  shells: ShellEntry[] = [];
  private scene: Phaser.Scene;
  private offsetX: number;
  private offsetY: number;

  onShellStolen?: (col: number, row: number) => void;
  onAllShellsGone?: () => void;

  constructor(scene: Phaser.Scene, offsetX: number, offsetY: number) {
    this.scene = scene;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  addShell(col: number, row: number, textureKey: string): void {
    const { x, y } = gridToWorld(col, row, this.offsetX, this.offsetY, TILE_SIZE);
    const sprite = this.scene.add
      .image(x, y, textureKey)
      .setDisplaySize(TILE_SIZE, TILE_SIZE)
      .setDepth(2);
    this.shells.push({ col, row, sprite });
  }

  /** Find the nearest shell to a world position. */
  findNearest(worldX: number, worldY: number): ShellEntry | null {
    let best: ShellEntry | null = null;
    let bestDist = Infinity;
    for (const shell of this.shells) {
      if (!shell.sprite.active) continue;
      const { x, y } = gridToWorld(shell.col, shell.row, this.offsetX, this.offsetY, TILE_SIZE);
      const dx = x - worldX;
      const dy = y - worldY;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = shell;
      }
    }
    return best;
  }

  /** Get grid position of nearest shell to a world position. */
  findNearestGrid(worldX: number, worldY: number): { col: number; row: number } | null {
    const shell = this.findNearest(worldX, worldY);
    if (!shell) return null;
    return { col: shell.col, row: shell.row };
  }

  /** Check if a shell exists at the given grid position and despawn it. Returns true if stolen. */
  tryStealShell(col: number, row: number): boolean {
    const idx = this.shells.findIndex((s) => s.col === col && s.row === row && s.sprite.active);
    if (idx === -1) return false;

    const shell = this.shells[idx];
    shell.sprite.destroy();
    this.shells.splice(idx, 1);

    this.onShellStolen?.(col, row);

    if (this.shells.length === 0) {
      this.onAllShellsGone?.();
    }

    return true;
  }

  getActiveShellPositions(): { col: number; row: number }[] {
    return this.shells.map((s) => ({ col: s.col, row: s.row }));
  }

  get activeCount(): number {
    return this.shells.length;
  }
}
