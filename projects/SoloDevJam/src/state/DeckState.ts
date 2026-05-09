import { Card } from "../cards/Card";

export class DeckState {
  drawPile: Card[];
  discardPile: Card[];
  hand: Card[];

  constructor(deck: Card[]) {
    this.drawPile = [...deck];
    this.discardPile = [];
    this.hand = [];
    this.shuffle();
  }

  shuffle(): void {
    for (let i = this.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
    }
  }

  draw(n: number): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < n; i++) {
      if (this.drawPile.length === 0) {
        this.reshuffleDiscard();
        if (this.drawPile.length === 0) break;
      }
      const card = this.drawPile.pop()!;
      drawn.push(card);
    }
    this.hand.push(...drawn);
    return drawn;
  }

  discard(card: Card): void {
    const idx = this.hand.indexOf(card);
    if (idx >= 0) {
      this.hand.splice(idx, 1);
      this.discardPile.push(card);
    }
  }

  discardAll(): void {
    this.discardPile.push(...this.hand);
    this.hand = [];
  }

  private reshuffleDiscard(): void {
    if (this.discardPile.length === 0) return;
    this.drawPile = [...this.discardPile];
    this.discardPile = [];
    this.shuffle();
  }
}
