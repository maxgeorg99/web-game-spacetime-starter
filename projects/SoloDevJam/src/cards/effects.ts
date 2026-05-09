import { Card } from "./Card";
import { PlayerState } from "../state/PlayerState";
import { EnemyState } from "../state/EnemyState";

export interface EffectResult {
  damageDealt: number;
  healAmount: number;
  blockGained: number;
}

export function canPlayCard(card: Card, player: PlayerState): boolean {
  return player.hp > card.cost;
}

export function applyCardEffect(
  card: Card,
  player: PlayerState,
  enemy: EnemyState,
): EffectResult {
  const result: EffectResult = { damageDealt: 0, healAmount: 0, blockGained: 0 };

  switch (card.kind) {
    case "attack":
      enemy.takeDamage(card.value);
      result.damageDealt = card.value;
      break;
    case "heal":
      result.healAmount = player.heal(card.value);
      break;
    case "block":
      player.addShield(card.value);
      result.blockGained = card.value;
      break;
  }

  return result;
}
