import { describe, it, expect } from "vitest";
import { PlayerState } from "../PlayerState";

describe("PlayerState", () => {
  it("starts at full HP", () => {
    const p = new PlayerState(80, 80);
    expect(p.hp).toBe(80);
    expect(p.maxHp).toBe(80);
    expect(p.isAlive).toBe(true);
  });

  it("takeDamage reduces HP", () => {
    const p = new PlayerState(80, 80);
    p.takeDamage(20);
    expect(p.hp).toBe(60);
    expect(p.isAlive).toBe(true);
  });

  it("takeDamage does not go below 0", () => {
    const p = new PlayerState(10, 80);
    p.takeDamage(30);
    expect(p.hp).toBe(0);
    expect(p.isAlive).toBe(false);
  });

  it("heal restores HP up to max", () => {
    const p = new PlayerState(40, 80);
    p.heal(30);
    expect(p.hp).toBe(70);
    p.heal(30);
    expect(p.hp).toBe(80);
  });

  it("shield absorbs damage first", () => {
    const p = new PlayerState(80, 80);
    p.addShield(15);
    const absorbed = p.takeDamage(10);
    expect(absorbed).toBe(10);
    expect(p.hp).toBe(80);
    expect(p.shield).toBe(5);
  });

  it("shield absorbs partial damage", () => {
    const p = new PlayerState(80, 80);
    p.addShield(10);
    p.takeDamage(25);
    expect(p.hp).toBe(65);
    expect(p.shield).toBe(0);
  });

  it("payCost reduces HP directly ignoring shield", () => {
    const p = new PlayerState(30, 30);
    p.addShield(20);
    p.payCost(5);
    expect(p.hp).toBe(25);
    expect(p.shield).toBe(20);
  });

  it("payCost does not go below 0", () => {
    const p = new PlayerState(3, 30);
    p.payCost(10);
    expect(p.hp).toBe(0);
  });

  it("clearShield removes shield", () => {
    const p = new PlayerState(80, 80);
    p.addShield(20);
    p.clearShield();
    expect(p.shield).toBe(0);
  });

  it("hpPercent returns correct ratio", () => {
    const p = new PlayerState(40, 80);
    expect(p.hpPercent).toBe(0.5);
  });

  it("heal returns actual amount healed", () => {
    const p = new PlayerState(75, 80);
    const healed = p.heal(10);
    expect(healed).toBe(5);
    expect(p.hp).toBe(80);
  });
});
