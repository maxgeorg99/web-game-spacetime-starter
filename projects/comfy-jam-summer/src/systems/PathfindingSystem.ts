import { GRID_COLS, GRID_ROWS, TILE_SIZE } from "../config/constants";
import { isSand, gridToWorld } from "../utils/gridUtils";

export interface GridPoint {
  col: number;
  row: number;
}

const NEIGHBORS = [
  { dc: 0, dr: -1 },
  { dc: 0, dr: 1 },
  { dc: -1, dr: 0 },
  { dc: 1, dr: 0 },
];

/**
 * First sand cell inward from each Phase 4 spawn edge position.
 * Used by canPlaceWall / hasPathFromAnyEdge to check if spawn zones
 * can still reach the island center after a wall placement.
 */
const SPAWN_ENTRY: GridPoint[] = [
  // north (spawn rows 0 → first sand row 3)
  { col: 7, row: 3 },
  { col: 10, row: 3 },
  { col: 13, row: 3 },
  // south (spawn rows 15 → first sand row 12)
  { col: 7, row: 12 },
  { col: 10, row: 12 },
  { col: 13, row: 12 },
  // west (spawn cols 0 → first sand col 3)
  { col: 3, row: 6 },
  { col: 3, row: 8 },
  { col: 3, row: 10 },
  // east (spawn cols 19 → first sand col 16)
  { col: 16, row: 6 },
  { col: 16, row: 8 },
  { col: 16, row: 10 },
];

/** Grid center of the interior sand area — enemies pathfind toward this. */
export const TARGET_COL = 10;
export const TARGET_ROW = 8;

export class PathfindingSystem {
  walkable: boolean[][];
  gridOffsetX: number;
  gridOffsetY: number;

  constructor(offsetX: number, offsetY: number) {
    this.gridOffsetX = offsetX;
    this.gridOffsetY = offsetY;

    this.walkable = [];
    for (let col = 0; col < GRID_COLS; col++) {
      this.walkable[col] = [];
      for (let row = 0; row < GRID_ROWS; row++) {
        this.walkable[col][row] = isSand(col, row);
      }
    }
  }

  // ── grid mutators ───────────────────────────────────────────────

  markBlocked(col: number, row: number): void {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
    this.walkable[col][row] = false;
  }

  markOpen(col: number, row: number): void {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
    this.walkable[col][row] = isSand(col, row);
  }

  /** Mark a list of already-occupied cells as blocked (called once during init). */
  markOccupiedSet(occupied: Set<string>): void {
    for (const key of occupied) {
      const [c, r] = key.split(",").map(Number);
      this.markBlocked(c, r);
    }
  }

  // ── pathfinding ─────────────────────────────────────────────────

  findPath(fromCol: number, fromRow: number, toCol: number, toRow: number): GridPoint[] | null {
    if (!this.inBounds(fromCol, fromRow) || !this.inBounds(toCol, toRow)) return null;
    if (!this.walkable[fromCol][fromRow]) return null;

    const visited: boolean[][] = Array.from({ length: GRID_COLS }, () => new Array(GRID_ROWS).fill(false));
    const parent: (GridPoint | null)[][] = Array.from({ length: GRID_COLS }, () => new Array(GRID_ROWS).fill(null));

    const queue: GridPoint[] = [{ col: fromCol, row: fromRow }];
    visited[fromCol][fromRow] = true;

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.col === toCol && cur.row === toRow) {
        return this.reconstructPath(parent, cur);
      }

      for (const { dc, dr } of NEIGHBORS) {
        const nc = cur.col + dc;
        const nr = cur.row + dr;
        if (this.inBounds(nc, nr) && this.walkable[nc][nr] && !visited[nc][nr]) {
          visited[nc][nr] = true;
          parent[nc][nr] = cur;
          queue.push({ col: nc, row: nr });
        }
      }
    }

    return null;
  }

  /**
   * BFS from start position. Returns the reachable cell with the smallest
   * Manhattan distance to (toCol, toRow). Falls back to startPos if nowhere reachable.
   */
  findNearestReachable(fromCol: number, fromRow: number, toCol: number, toRow: number): GridPoint {
    const visited: boolean[][] = Array.from({ length: GRID_COLS }, () => new Array(GRID_ROWS).fill(false));

    const queue: GridPoint[] = [{ col: fromCol, row: fromRow }];
    visited[fromCol][fromRow] = true;

    let bestDist = manhattan(fromCol, fromRow, toCol, toRow);
    let best: GridPoint = { col: fromCol, row: fromRow };

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const d = manhattan(cur.col, cur.row, toCol, toRow);
      if (d < bestDist) {
        bestDist = d;
        best = cur;
      }

      for (const { dc, dr } of NEIGHBORS) {
        const nc = cur.col + dc;
        const nr = cur.row + dr;
        if (this.inBounds(nc, nr) && this.walkable[nc][nr] && !visited[nc][nr]) {
          visited[nc][nr] = true;
          queue.push({ col: nc, row: nr });
        }
      }
    }

    return best;
  }

  /**
   * Returns true if at least one spawn-edge entry cell can BFS to the target cell.
   */
  hasPathFromAnyEdge(toCol: number, toRow: number): boolean {
    for (const entry of SPAWN_ENTRY) {
      const path = this.findPath(entry.col, entry.row, toCol, toRow);
      if (path !== null) return true;
    }
    return false;
  }

  /**
   * Before placing a wall at (col, row), verify that at least one spawn
   * edge can still reach the island center after the wall is placed.
   * Temporarily marks the cell as blocked for the check, then restores.
   */
  canPlaceWall(col: number, row: number): boolean {
    const wasWalkable = this.walkable[col]?.[row];
    this.walkable[col][row] = false;
    const ok = this.hasPathFromAnyEdge(TARGET_COL, TARGET_ROW);
    this.walkable[col][row] = wasWalkable ?? false;
    return ok;
  }

  /**
   * Converts a grid path into world pixel positions (center of each tile).
   */
  pathToWorld(path: GridPoint[]): { x: number; y: number }[] {
    return path.map((p) => gridToWorld(p.col, p.row, this.gridOffsetX, this.gridOffsetY, TILE_SIZE));
  }

  /** Returns world position for a grid cell. */
  cellToWorld(col: number, row: number): { x: number; y: number } {
    return gridToWorld(col, row, this.gridOffsetX, this.gridOffsetY, TILE_SIZE);
  }

  // ── helpers ─────────────────────────────────────────────────────

  private inBounds(col: number, row: number): boolean {
    return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;
  }

  private reconstructPath(parent: (GridPoint | null)[][], target: GridPoint): GridPoint[] {
    const path: GridPoint[] = [];
    let cur: GridPoint | null = target;
    while (cur) {
      path.unshift(cur);
      cur = parent[cur.col][cur.row];
    }
    return path;
  }
}

function manhattan(c1: number, r1: number, c2: number, r2: number): number {
  return Math.abs(c1 - c2) + Math.abs(r1 - r2);
}
