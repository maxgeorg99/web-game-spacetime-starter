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
  burnStacks: number;

  constructor(name: string, hp: number, damage: number) {
    this.name = name;
    this.hp = hp;
    this.maxHp = hp;
    this.baseDamage = damage;
    this.intent = { kind: "attack", damage };
    this.burnStacks = 0;
  }

  takeDamage(raw: number): void {
    this.hp = Math.max(0, this.hp - raw);
  }

  computeIntent(overrideDamage?: number, ascensionExtraDamage = 0): void {
    this.intent = { kind: "attack", damage: (overrideDamage ?? this.baseDamage) + ascensionExtraDamage };
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  get hpPercent(): number {
    return this.hp / this.maxHp;
  }
}
