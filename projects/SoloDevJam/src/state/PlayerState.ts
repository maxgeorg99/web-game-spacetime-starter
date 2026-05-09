export class PlayerState {
  hp: number;
  readonly maxHp: number;
  shield: number;

  constructor(hp: number, maxHp: number) {
    this.hp = hp;
    this.maxHp = maxHp;
    this.shield = 0;
  }

  takeDamage(raw: number): number {
    let remaining = raw;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, remaining);
      this.shield -= absorbed;
      remaining -= absorbed;
    }
    this.hp = Math.max(0, this.hp - remaining);
    return raw - remaining;
  }

  heal(amount: number): number {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }

  addShield(amount: number): void {
    this.shield += amount;
  }

  clearShield(): void {
    this.shield = 0;
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  get hpPercent(): number {
    return this.hp / this.maxHp;
  }
}
