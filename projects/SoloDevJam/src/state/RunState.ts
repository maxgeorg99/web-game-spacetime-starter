import { getStarterDeck } from "../cards/cards";
import type { Card } from "../cards/Card";

export const ENEMY_CONFIGS = [
  { name: "Skull", key: "skull", hp: 30, damage: 8 },
  { name: "Bear", key: "bear", hp: 40, damage: 10 },
  { name: "Centaur", key: "centaur", hp: 50, damage: 12 },
  { name: "Cerberus", key: "cerberus", hp: 60, damage: 14 },
  { name: "Final Boss", key: "boss", hp: 80, damage: 8 },
];

export function getEnemyForLevel(level: number): typeof ENEMY_CONFIGS[0] {
  return ENEMY_CONFIGS[Math.min(level - 1, ENEMY_CONFIGS.length - 1)];
}

export class RunState {
  level = 1;
  readonly maxLevel = 5;
  playerHp = 30;
  playerMaxHp = 30;
  deck: Card[];

  constructor() {
    this.deck = getStarterDeck();
  }

  advanceLevel(): boolean {
    if (this.level >= this.maxLevel) return false;
    this.level++;
    return true;
  }

  get isFinalBoss(): boolean {
    return this.level === this.maxLevel;
  }
}
