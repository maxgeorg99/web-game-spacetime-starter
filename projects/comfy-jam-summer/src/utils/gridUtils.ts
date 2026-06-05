import {
  ISLAND_LEFT,
  ISLAND_RIGHT,
  ISLAND_TOP,
  ISLAND_BOTTOM,
  COAST_NW,
  COAST_N,
  COAST_NE,
  COAST_W,
  COAST_E,
  COAST_SW,
  COAST_S,
  COAST_SE,
} from "../config/constants";

export function tileKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function isSand(col: number, row: number): boolean {
  return (
    col >= ISLAND_LEFT &&
    col <= ISLAND_RIGHT &&
    row >= ISLAND_TOP &&
    row <= ISLAND_BOTTOM
  );
}

export function isInteriorSand(col: number, row: number): boolean {
  if (!isSand(col, row)) return false;
  return (
    isSand(col, row - 1) &&
    isSand(col, row + 1) &&
    isSand(col - 1, row) &&
    isSand(col + 1, row)
  );
}

export function coastFrame(col: number, row: number): number {
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
  return -1;
}

export function gridToWorld(
  col: number,
  row: number,
  offsetX: number,
  offsetY: number,
  tileSize: number,
): { x: number; y: number } {
  return {
    x: offsetX + col * tileSize + tileSize / 2,
    y: offsetY + row * tileSize + tileSize / 2,
  };
}

export function worldToGrid(
  worldX: number,
  worldY: number,
  offsetX: number,
  offsetY: number,
  tileSize: number,
): { col: number; row: number } {
  return {
    col: Math.floor((worldX - offsetX) / tileSize),
    row: Math.floor((worldY - offsetY) / tileSize),
  };
}
