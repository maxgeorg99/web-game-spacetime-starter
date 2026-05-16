import { describe, it, expect } from "vitest";
import { canPlayCard, applyCardEffect } from "../effects";
import { PlayerState } from "../../state/PlayerState";
import { EnemyState } from "../../state/EnemyState";
import { Card } from "../Card";

const strike: Card = {
  id: "strike_1",
  name: "Strike",
  cost: 1,
  kind: "attack",
  value: 5,
  art: "card-blank",
  targeting: "single",
};

const aoeStrike: Card = {
  id: "hellfire_2",
  name: "Hellfire",
  cost: 3,
  kind: "attack",
  value: 5,
  art: "card-blank",
  targeting: "aoe",
};

const heal: Card = {
  id: "heal_1",
  name: "Siphon",
  cost: 1,
  kind: "heal",
  value: 3,
  art: "card-blank",
  targeting: "self",
};

const block: Card = {
  id: "block_2",
  name: "Dark Shield",
  cost: 2,
  kind: "block",
  value: 8,
  art: "card-blank",
  targeting: "self",
};

describe("canPlayCard", () => {
  it("returns true when player can afford cost", () => {
    const player = new PlayerState(10, 80);
    expect(canPlayCard(strike, player)).toBe(true);
  });

  it("returns false when cost would reduce HP to 0", () => {
    const player = new PlayerState(1, 80);
    expect(canPlayCard(strike, player)).toBe(false);
  });

  it("returns false when cost exceeds HP", () => {
    const player = new PlayerState(3, 80);
    expect(canPlayCard({ ...strike, cost: 5 }, player)).toBe(false);
  });
});

describe("applyCardEffect", () => {
  it("attack deals damage to single target", () => {
    const player = new PlayerState(80, 80);
    const enemy = new EnemyState("Skull", 30, 8);
    const result = applyCardEffect(strike, player, [enemy]);

    expect(result.damageDealt).toBe(5);
    expect(enemy.hp).toBe(25);
  });

  it("aoe attack hits all targets", () => {
    const player = new PlayerState(80, 80);
    const e1 = new EnemyState("Skull", 30, 8);
    const e2 = new EnemyState("Skull", 20, 6);
    const result = applyCardEffect(aoeStrike, player, [e1, e2]);

    expect(result.damageDealt).toBe(5);
    expect(e1.hp).toBe(25);
    expect(e2.hp).toBe(15);
  });

  it("self card applies with empty targets array", () => {
    const player = new PlayerState(50, 80);
    const result = applyCardEffect(heal, player, []);

    expect(result.healAmount).toBe(3);
    expect(player.hp).toBe(53);
  });

  it("heal restores player HP", () => {
    const player = new PlayerState(50, 80);
    const result = applyCardEffect(heal, player, []);

    expect(result.healAmount).toBe(3);
    expect(player.hp).toBe(53);
  });

  it("heal does not overheal", () => {
    const player = new PlayerState(78, 80);
    const result = applyCardEffect(heal, player, []);

    expect(result.healAmount).toBe(2);
    expect(player.hp).toBe(80);
  });

  it("block adds shield to player", () => {
    const player = new PlayerState(80, 80);
    const result = applyCardEffect(block, player, []);

    expect(result.blockGained).toBe(8);
    expect(player.shield).toBe(8);
  });

  it("combo bonus doubles damage", () => {
    const player = new PlayerState(80, 80);
    const enemy = new EnemyState("Skull", 30, 8);
    const result = applyCardEffect(strike, player, [enemy], 1);

    expect(result.damageDealt).toBe(10);
    expect(enemy.hp).toBe(20);
  });
});
