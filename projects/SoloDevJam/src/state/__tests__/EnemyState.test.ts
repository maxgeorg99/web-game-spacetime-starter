import { describe, it, expect } from "vitest";
import { EnemyState } from "../EnemyState";

describe("EnemyState", () => {
  it("starts at full HP", () => {
    const e = new EnemyState("Skull", 30, 8);
    expect(e.hp).toBe(30);
    expect(e.maxHp).toBe(30);
    expect(e.isAlive).toBe(true);
  });

  it("has initial attack intent equal to baseDamage", () => {
    const e = new EnemyState("Skull", 30, 8);
    expect(e.intent).toEqual({ kind: "attack", damage: 8 });
  });

  it("takeDamage reduces HP", () => {
    const e = new EnemyState("Skull", 30, 8);
    e.takeDamage(10);
    expect(e.hp).toBe(20);
  });

  it("does not go below 0", () => {
    const e = new EnemyState("Skull", 10, 8);
    e.takeDamage(30);
    expect(e.hp).toBe(0);
    expect(e.isAlive).toBe(false);
  });

  it("hpPercent returns correct ratio", () => {
    const e = new EnemyState("Skull", 30, 8);
    e.takeDamage(15);
    expect(e.hpPercent).toBe(0.5);
  });

  it("computeIntent can override damage", () => {
    const e = new EnemyState("Boss", 80, 8);
    e.computeIntent(14);
    expect(e.intent).toEqual({ kind: "attack", damage: 14 });
  });
});
