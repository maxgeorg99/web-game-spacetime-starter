export class EnemyState {
  hp: number;
  readonly maxHp: number;
  name: string;

  constructor(name: string, hp: number) {
    this.name = name;
    this.hp = hp;
    this.maxHp = hp;
  }

  takeDamage(raw: number): void {
    this.hp = Math.max(0, this.hp - raw);
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  get hpPercent(): number {
    return this.hp / this.maxHp;
  }
}
