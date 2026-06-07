import { describe, it, expect } from "vitest";
import { PathfindingSystem } from "../systems/PathfindingSystem";
import { isSand } from "../utils/gridUtils";

describe("PathfindingSystem", () => {
  it("finds path from spawn edge to center on empty grid", () => {
    const pf = new PathfindingSystem(0, 0);
    const path = pf.findPath(3, 6, 10, 8);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(1);
  });

  it("rejects path from blocked cell", () => {
    const pf = new PathfindingSystem(0, 0);
    // Ocean cell is not walkable
    const path = pf.findPath(0, 0, 10, 8);
    expect(path).toBeNull();
  });

  it("blocks and opens cells correctly", () => {
    const pf = new PathfindingSystem(0, 0);

    // Should be able to path through cell (7, 8)
    const pathBefore = pf.findPath(5, 8, 10, 8);
    expect(pathBefore).not.toBeNull();

    // Block a cell
    pf.markBlocked(7, 8);
    expect(pf.walkable[7][8]).toBe(false);

    // Unblock it
    pf.markOpen(7, 8);
    expect(pf.walkable[7][8]).toBe(true);
  });

  it("hasPathFromAnyEdge returns true on empty grid", () => {
    const pf = new PathfindingSystem(0, 0);
    expect(pf.hasPathFromAnyEdge(10, 8)).toBe(true);
  });

  it("canPlaceWall returns true for placeable cell", () => {
    const pf = new PathfindingSystem(0, 0);
    // Pick a cell on sand that doesn't block all paths
    const result = pf.canPlaceWall(8, 8);
    expect(result).toBe(true);
  });

  it("canPlaceWall returns false if wall would block all spawn paths", () => {
    const pf = new PathfindingSystem(0, 0);
    // Block all spawn entries
    for (let col = 0; col < 20; col++) {
      for (let row = 0; row < 16; row++) {
        if (isSand(col, row)) {
          pf.markBlocked(col, row);
        }
      }
    }
    // Clear just one cell near spawn
    pf.markOpen(7, 3);
    pf.markOpen(7, 4);
    pf.markOpen(7, 8);

    // This should fail because path is cut off
    const result = pf.canPlaceWall(7, 4);
    expect(result).toBe(false);
  });

  it("findNearestReachable returns start if nothing reachable", () => {
    const pf = new PathfindingSystem(0, 0);
    // Block everything around (4, 7)
    pf.markBlocked(4, 6);
    pf.markBlocked(4, 8);
    pf.markBlocked(3, 7);
    pf.markBlocked(5, 7);

    // The cell itself is walkable but neighbors are blocked
    const nearest = pf.findNearestReachable(4, 7, 10, 8);
    expect(nearest.col).toBe(4);
    expect(nearest.row).toBe(7);
  });

  it("pathToWorld converts correctly", () => {
    const pf = new PathfindingSystem(100, 100);
    const worldPath = pf.pathToWorld([{ col: 3, row: 5 }]);
    expect(worldPath[0]).toEqual({
      x: 100 + 3 * 40 + 20, // 240
      y: 100 + 5 * 40 + 20, // 320
    });
  });
});
