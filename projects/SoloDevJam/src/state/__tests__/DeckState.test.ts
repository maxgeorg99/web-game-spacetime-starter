import { describe, it, expect } from "vitest";
import { DeckState } from "../DeckState";
import { Card } from "../../cards/Card";

function makeMockCards(n: number): Card[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `card_${i}`,
    name: `Card ${i}`,
    cost: 1,
    kind: "attack" as const,
    value: 5,
    art: "card-blank",
  }));
}

describe("DeckState", () => {
  it("starts with 10 cards in draw pile", () => {
    const d = new DeckState(makeMockCards(10));
    expect(d.drawPile.length).toBe(10);
    expect(d.hand.length).toBe(0);
    expect(d.discardPile.length).toBe(0);
  });

  it("draw moves cards to hand", () => {
    const d = new DeckState(makeMockCards(10));
    const drawn = d.draw(5);
    expect(drawn).toHaveLength(5);
    expect(d.hand).toHaveLength(5);
    expect(d.drawPile.length).toBe(5);
  });

  it("discard moves card from hand to discard", () => {
    const d = new DeckState(makeMockCards(10));
    d.draw(5);
    d.discard(d.hand[0]);
    expect(d.hand).toHaveLength(4);
    expect(d.discardPile).toHaveLength(1);
  });

  it("reshuffles discard when draw pile is empty", () => {
    const d = new DeckState(makeMockCards(5));
    d.draw(5);
    expect(d.drawPile.length).toBe(0);
    d.discardAll();
    const drawn = d.draw(3);
    expect(drawn).toHaveLength(3);
    expect(d.hand).toHaveLength(3);
    expect(d.drawPile.length).toBe(2);
  });

  it("does not draw more cards than available", () => {
    const d = new DeckState(makeMockCards(3));
    const drawn = d.draw(10);
    expect(drawn).toHaveLength(3);
    expect(d.hand).toHaveLength(3);
  });

  it("shuffle randomizes draw pile order", () => {
    const cards = makeMockCards(10);
    const d = new DeckState(cards);
    const originalOrder = [...d.drawPile];
    d.shuffle();
    const sameOrder = d.drawPile.every(
      (c, i) => c.id === originalOrder[i].id
    );
    expect(sameOrder).toBe(false);
  });

  it("discardAll moves entire hand to discard", () => {
    const d = new DeckState(makeMockCards(10));
    d.draw(5);
    d.discardAll();
    expect(d.hand).toHaveLength(0);
    expect(d.discardPile).toHaveLength(5);
  });
});
