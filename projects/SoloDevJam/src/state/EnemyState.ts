export type Intent =
  | { kind: "attack"; damage: number }
  | { kind: "defend"; block: number }
  | { kind: "buff" };

export class EnemyState {
  hp: number;
  readonly maxHp: number;
  name: string;
  readonly baseDamage: number;
  intent: Intent;

  constructor(name: string, hp: number, damage: number) {
    this.name = name;
    this.hp = hp;
    this.maxHp = hp;
    this.baseDamage = damage;
    this.intent = { kind: "attack", damage };
  }

  takeDamage(raw: number): void {
    this.hp = Math.max(0, this.hp - raw);
  }

  computeIntent(overrideDamage?: number): void {
    this.intent = { kind: "attack", damage: overrideDamage ?? this.baseDamage };
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  get hpPercent(): number {
    return this.hp / this.maxHp;
  }
}
