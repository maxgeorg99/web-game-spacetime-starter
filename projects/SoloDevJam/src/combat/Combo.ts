export class Combo {
  tier = 0;
  private lastCardCost: number | null = null;
  private readonly maxTier = 5;

  recordPlay(cost: number): { tier: number; advanced: boolean } {
    const isAdvance = this.lastCardCost !== null && cost === this.lastCardCost + 1;
    if (this.lastCardCost === null || cost === this.lastCardCost + 1) {
      this.tier = Math.min(this.tier + 1, this.maxTier);
    } else {
      this.tier = 1;
    }
    this.lastCardCost = cost;
    return { tier: this.tier, advanced: isAdvance };
  }

  reset(): void {
    this.tier = 0;
    this.lastCardCost = null;
  }

  get active(): boolean {
    return this.tier > 0;
  }

  get nextCost(): number | null {
    return this.lastCardCost !== null ? this.lastCardCost + 1 : null;
  }
}
