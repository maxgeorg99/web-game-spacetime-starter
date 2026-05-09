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
  value: 6,
  art: "card-blank",
};

const heal: Card = {
  id: "heal_1",
  name: "Siphon",
  cost: 1,
  kind: "heal",
  value: 4,
  art: "card-blank",
};

const block: Card = {
  id: "block_2",
  name: "Dark Shield",
  cost: 2,
  kind: "block",
  value: 10,
  art: "card-blank",
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
  it("attack deals damage to enemy", () => {
    const player = new PlayerState(80, 80);
    const enemy = new EnemyState("Skull", 30);
    const result = applyCardEffect(strike, player, enemy);

    expect(result.damageDealt).toBe(6);
    expect(enemy.hp).toBe(24);
  });

  it("heal restores player HP", () => {
    const player = new PlayerState(50, 80);
    const enemy = new EnemyState("Skull", 30);
    const result = applyCardEffect(heal, player, enemy);

    expect(result.healAmount).toBe(4);
    expect(player.hp).toBe(54);
  });

  it("heal does not overheal", () => {
    const player = new PlayerState(78, 80);
    const enemy = new EnemyState("Skull", 30);
    const result = applyCardEffect(heal, player, enemy);

    expect(result.healAmount).toBe(2);
    expect(player.hp).toBe(80);
  });

  it("block adds shield to player", () => {
    const player = new PlayerState(80, 80);
    const enemy = new EnemyState("Skull", 30);
    const result = applyCardEffect(block, player, enemy);

    expect(result.blockGained).toBe(10);
    expect(player.shield).toBe(10);
  });
});
