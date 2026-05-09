import { describe, it, expect } from "vitest";
import { EnemyState } from "../EnemyState";

describe("EnemyState", () => {
  it("starts at full HP", () => {
    const e = new EnemyState("Skull", 30);
    expect(e.hp).toBe(30);
    expect(e.maxHp).toBe(30);
    expect(e.isAlive).toBe(true);
  });

  it("takeDamage reduces HP", () => {
    const e = new EnemyState("Skull", 30);
    e.takeDamage(10);
    expect(e.hp).toBe(20);
  });

  it("does not go below 0", () => {
    const e = new EnemyState("Skull", 10);
    e.takeDamage(30);
    expect(e.hp).toBe(0);
    expect(e.isAlive).toBe(false);
  });

  it("hpPercent returns correct ratio", () => {
    const e = new EnemyState("Skull", 30);
    e.takeDamage(15);
    expect(e.hpPercent).toBe(0.5);
  });
});
