import { describe, it, expect } from "vitest";
import { RunState } from "../RunState";

describe("RunState", () => {
  it("starts with generated map nodes", () => {
    const r = new RunState();
    expect(r.nodes.length).toBeGreaterThan(0);
  });

  it("has exactly one boss node in tier 5", () => {
    const r = new RunState();
    const bosses = r.nodes.filter((n) => n.kind === "boss");
    expect(bosses).toHaveLength(1);
    expect(bosses[0].tier).toBe(5);
  });

  it("starts at 25 HP with no currentNode", () => {
    const r = new RunState();
    expect(r.playerHp).toBe(25);
    expect(r.currentNodeId).toBeNull();
    expect(r.currentNode).toBeNull();
  });

  it("availableNodes returns tier-1 nodes before any fight", () => {
    const r = new RunState();
    const avail = r.availableNodes;
    expect(avail.length).toBeGreaterThan(0);
    expect(avail.every((n) => n.tier === 1)).toBe(true);
  });

  it("markNodeCleared sets currentNodeId and cleared flag", () => {
    const r = new RunState();
    const firstNode = r.availableNodes[0];
    r.markNodeCleared(firstNode.id);
    expect(r.currentNodeId).toBe(firstNode.id);
    expect(firstNode.cleared).toBe(true);
  });

  it("availableNodes after clearing returns connections", () => {
    const r = new RunState();
    const firstNode = r.availableNodes[0];
    r.markNodeCleared(firstNode.id);
    const avail = r.availableNodes;
    for (const n of avail) {
      expect(firstNode.connections).toContain(n.id);
    }
  });

  it("isBossCleared starts false", () => {
    const r = new RunState();
    expect(r.isBossCleared).toBe(false);
  });

  it("isBossCleared is true after clearing the boss node", () => {
    const r = new RunState();
    const boss = r.nodes.find((n) => n.kind === "boss")!;
    r.markNodeCleared(boss.id);
    expect(r.isBossCleared).toBe(true);
  });

  it("deck has 10 starter cards", () => {
    const r = new RunState();
    expect(r.deck).toHaveLength(10);
  });
});
