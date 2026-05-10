import { describe, it, expect } from "vitest";
import { generateMap } from "../MapState";

describe("generateMap", () => {
  it("returns a non-empty node list", () => {
    const nodes = generateMap();
    expect(nodes.length).toBeGreaterThan(0);
  });

  it("has exactly one tier-1 node (single entry point)", () => {
    const nodes = generateMap();
    expect(nodes.filter((n) => n.tier === 1)).toHaveLength(1);
  });

  it("has exactly one boss node in tier 5", () => {
    const nodes = generateMap();
    const bosses = nodes.filter((n) => n.kind === "boss");
    expect(bosses).toHaveLength(1);
    expect(bosses[0].tier).toBe(5);
  });

  it("covers tiers 1 through 5", () => {
    const nodes = generateMap();
    for (let t = 1; t <= 5; t++) {
      expect(nodes.some((n) => n.tier === t)).toBe(true);
    }
  });

  it("has at most 1 elite per tier", () => {
    for (let run = 0; run < 20; run++) {
      const nodes = generateMap();
      for (let t = 1; t <= 5; t++) {
        const elites = nodes.filter((n) => n.tier === t && n.kind === "elite");
        expect(elites.length).toBeLessThanOrEqual(1);
      }
    }
  });

  it("tier 4 always has at least 1 combat node", () => {
    for (let run = 0; run < 20; run++) {
      const nodes = generateMap();
      const tier4 = nodes.filter((n) => n.tier === 4);
      expect(tier4.some((n) => n.kind === "combat")).toBe(true);
    }
  });

  it("all tier-2+ nodes are reachable from tier 1", () => {
    const nodes = generateMap();
    const reachable = new Set<string>();
    nodes.filter((n) => n.tier === 1).forEach((n) => reachable.add(n.id));

    for (let t = 1; t <= 4; t++) {
      const fromTier = nodes.filter((n) => n.tier === t && reachable.has(n.id));
      for (const node of fromTier) {
        for (const id of node.connections) reachable.add(id);
      }
    }

    for (const node of nodes) {
      expect(reachable.has(node.id)).toBe(true);
    }
  });

  it("all nodes start uncleared", () => {
    const nodes = generateMap();
    expect(nodes.every((n) => !n.cleared)).toBe(true);
  });

  it("node ids are unique", () => {
    const nodes = generateMap();
    const ids = nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
