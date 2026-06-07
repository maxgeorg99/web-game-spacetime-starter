import { EnemyState } from "../state/EnemyState";
import { TowerState } from "../state/TowerState";
import { WeaponDef } from "../config/WeaponConfig";

export type TargetingResult = EnemyState | null;

export function pickTarget(
  tower: TowerState,
  enemies: EnemyState[],
  weapon: WeaponDef,
): TargetingResult {
  const alive = enemies.filter((e) => e.state !== "dead");

  const inRange = alive.filter((e) => {
    const dx = e.x - (tower.col * 40 + 20);
    const dy = e.y - (tower.row * 40 + 20);
    return Math.sqrt(dx * dx + dy * dy) <= weapon.range;
  });

  if (inRange.length === 0) return null;

  switch (tower.aimingStrategy) {
    case "closest":
      inRange.sort((a, b) => distFromTower(a, tower) - distFromTower(b, tower));
      break;
    case "farthest":
      inRange.sort((a, b) => distFromTower(b, tower) - distFromTower(a, tower));
      break;
    case "mostHp":
      inRange.sort((a, b) => b.hp - a.hp);
      break;
    case "leastHp":
      inRange.sort((a, b) => a.hp - b.hp);
      break;
  }

  return inRange[0];
}

function distFromTower(enemy: EnemyState, tower: TowerState): number {
  const dx = enemy.x - (tower.col * 40 + 20);
  const dy = enemy.y - (tower.row * 40 + 20);
  return dx * dx + dy * dy;
}
