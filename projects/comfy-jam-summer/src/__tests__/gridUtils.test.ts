import { describe, it, expect } from "vitest";
import { isSand, isInteriorSand, worldToGrid, gridToWorld, tileKey, coastFrame } from "../utils/gridUtils";

describe("gridUtils", () => {
  it("isSand returns true for interior cells", () => {
    expect(isSand(10, 8)).toBe(true);
  });

  it("isSand returns false for ocean border", () => {
    expect(isSand(1, 1)).toBe(false);
    expect(isSand(0, 0)).toBe(false);
    expect(isSand(19, 15)).toBe(false);
  });

  it("isSand returns true for edge sand cells", () => {
    expect(isSand(3, 8)).toBe(true);
    expect(isSand(16, 8)).toBe(true);
  });

  it("isInteriorSand returns true for interior only", () => {
    expect(isInteriorSand(10, 8)).toBe(true);
    expect(isInteriorSand(3, 8)).toBe(false);
    expect(isInteriorSand(16, 8)).toBe(false);
  });

  it("worldToGrid roundtrips with gridToWorld", () => {
    const offsetX = 100;
    const offsetY = 100;
    const tileSize = 40;
    const { x, y } = gridToWorld(5, 7, offsetX, offsetY, tileSize);
    const { col, row } = worldToGrid(x, y, offsetX, offsetY, tileSize);
    expect(col).toBe(5);
    expect(row).toBe(7);
  });

  it("gridToWorld centers on tile", () => {
    const { x, y } = gridToWorld(2, 3, 0, 0, 40);
    expect(x).toBe(100); // 2 * 40 + 20
    expect(y).toBe(140); // 3 * 40 + 20
  });

  it("tileKey produces consistent keys", () => {
    expect(tileKey(3, 7)).toBe("3,7");
    expect(tileKey(10, 15)).toBe("10,15");
  });

  it("coastFrame returns -1 for interior sand", () => {
    expect(coastFrame(10, 8)).toBe(-1);
  });

  it("coastFrame identifies edges correctly", () => {
    // Top coast
    expect(coastFrame(7, 3)).not.toBe(-1);
    // Bottom coast
    expect(coastFrame(7, 12)).not.toBe(-1);
  });
});
