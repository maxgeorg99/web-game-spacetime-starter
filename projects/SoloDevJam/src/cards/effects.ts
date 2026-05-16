import { Card } from "./Card";
import { PlayerState } from "../state/PlayerState";
import { EnemyState } from "../state/EnemyState";

export interface EffectResult {
  damageDealt: number;
  healAmount: number;
  blockGained: number;
  cardsDrawn: number;
  burnApplied: number;
}

export function canPlayCard(card: Card, player: PlayerState): boolean {
  return player.hp > card.cost;
}

export function applyCardEffect(
  card: Card,
  player: PlayerState,
  targets: EnemyState[],
  comboBonus = 0,
): EffectResult {
  const result: EffectResult = { damageDealt: 0, healAmount: 0, blockGained: 0, cardsDrawn: 0, burnApplied: 0 };

  switch (card.kind) {
    case "attack": {
      const totalDamage = comboBonus > 0 ? card.value * 2 : card.value;
      for (const enemy of targets) {
        enemy.takeDamage(totalDamage);
      }
      result.damageDealt = totalDamage;
      break;
    }
    case "heal": {
      const healValue = comboBonus > 0 ? card.value * 2 : card.value;
      result.healAmount = player.heal(healValue);
      break;
    }
    case "block": {
      const blockValue = comboBonus > 0 ? card.value * 2 : card.value;
      player.addShield(blockValue);
      result.blockGained = blockValue;
      break;
    }
    case "draw": {
      const count = comboBonus > 0 ? card.value * 2 : card.value;
      result.cardsDrawn = count;
      break;
    }
    case "burn": {
      const stacks = comboBonus > 0 ? card.value * 2 : card.value;
      for (const enemy of targets) {
        enemy.burnStacks += stacks;
      }
      result.burnApplied = stacks;
      break;
    }
  }

  return result;
}
