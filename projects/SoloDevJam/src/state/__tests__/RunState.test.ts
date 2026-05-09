import { describe, it, expect } from "vitest";
import { RunState, getEnemyForLevel } from "../RunState";

describe("RunState", () => {
  it("starts at level 1 with 30 HP", () => {
    const r = new RunState();
    expect(r.level).toBe(1);
    expect(r.playerHp).toBe(30);
    expect(r.isFinalBoss).toBe(false);
  });

  it("advanceLevel increments level up to 5", () => {
    const r = new RunState();
    expect(r.advanceLevel()).toBe(true);
    expect(r.level).toBe(2);
    expect(r.advanceLevel()).toBe(true);
    expect(r.level).toBe(3);
    expect(r.advanceLevel()).toBe(true);
    expect(r.level).toBe(4);
    expect(r.advanceLevel()).toBe(true);
    expect(r.level).toBe(5);
    expect(r.isFinalBoss).toBe(true);
    expect(r.advanceLevel()).toBe(false);
    expect(r.level).toBe(5);
  });

  it("deck has 9 starter cards", () => {
    const r = new RunState();
    expect(r.deck).toHaveLength(9);
  });
});

describe("getEnemyForLevel", () => {
  it("returns skull for level 1", () => {
    expect(getEnemyForLevel(1).name).toBe("Skull");
  });

  it("returns bear for level 2", () => {
    expect(getEnemyForLevel(2).name).toBe("Bear");
  });

  it("returns centaur for level 3", () => {
    expect(getEnemyForLevel(3).name).toBe("Centaur");
  });

  it("returns cerberus for level 4", () => {
    expect(getEnemyForLevel(4).name).toBe("Cerberus");
  });

  it("returns final boss for level 5", () => {
    const e = getEnemyForLevel(5);
    expect(e.name).toBe("Final Boss");
    expect(e.hp).toBe(80);
  });

  it("clamps beyond max level", () => {
    expect(getEnemyForLevel(99).name).toBe("Final Boss");
  });
});
