import { describe, it, expect } from "vitest";
import { ALL_CARDS, getCard, getCardsByKind, getStarterDeck } from "../cards";

describe("Card registry", () => {
  it("has at least 8 cards", () => {
    expect(ALL_CARDS.length).toBeGreaterThanOrEqual(8);
  });

  it("each card has a unique id", () => {
    const ids = ALL_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers costs 1 through 5", () => {
    const costs = new Set(ALL_CARDS.map((c) => c.cost));
    for (let i = 1; i <= 5; i++) {
      expect(costs.has(i)).toBe(true);
    }
  });

  it("includes attack, heal, and block cards", () => {
    expect(getCardsByKind("attack").length).toBeGreaterThan(0);
    expect(getCardsByKind("heal").length).toBeGreaterThan(0);
    expect(getCardsByKind("block").length).toBeGreaterThan(0);
  });

  it("getCard returns a card by id", () => {
    const card = getCard("strike_1");
    expect(card).toBeDefined();
    expect(card!.name).toBe("Strike");
  });

  it("getCard returns undefined for unknown id", () => {
    expect(getCard("nonexistent")).toBeUndefined();
  });

  it("starter deck has 10 cards", () => {
    const deck = getStarterDeck();
    expect(deck).toHaveLength(10);
  });

  it("all starter deck cards exist in ALL_CARDS", () => {
    const deck = getStarterDeck();
    for (const card of deck) {
      expect(card).toBeDefined();
    }
  });

  it("all cards have positive cost and value", () => {
    for (const card of ALL_CARDS) {
      expect(card.cost).toBeGreaterThan(0);
      expect(card.value).toBeGreaterThan(0);
    }
  });
});
