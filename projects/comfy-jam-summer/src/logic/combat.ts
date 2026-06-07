import { EnemyState } from "../state/EnemyState";
import { WeaponDef } from "../config/WeaponConfig";

export interface HitResult {
  targetDamaged: boolean;
  targetKilled: boolean;
  splashHits: number[];
}

export function resolveHit(
  projectile: { weapon: string; x: number; y: number; damage: number; targetEnemyId: number },
  weapon: WeaponDef,
  enemies: EnemyState[],
): HitResult {
  const result: HitResult = {
    targetDamaged: false,
    targetKilled: false,
    splashHits: [],
  };

  const target = enemies.find((e) => e.id === projectile.targetEnemyId);
  if (!target || target.state === "dead") return result;

  target.hp -= weapon.damage;
  result.targetDamaged = true;
  if (target.hp <= 0) {
    target.state = "dead";
    result.targetKilled = true;
  }

  if (weapon.splash) {
    for (const e of enemies) {
      if (e.id === target.id || e.state === "dead") continue;
      const ex = e.x - target.x;
      const ey = e.y - target.y;
      if (Math.sqrt(ex * ex + ey * ey) <= weapon.splash.radius) {
        e.hp -= weapon.damage * weapon.splash.damagePercent;
        result.splashHits.push(e.id);
        if (e.hp <= 0) {
          e.state = "dead";
        }
      }
    }
  }

  if (weapon.knockback && target.state !== "dead") {
    const kx = target.x - projectile.x;
    const ky = target.y - projectile.y;
    const kd = Math.sqrt(kx * kx + ky * ky) || 1;
    target.x += (kx / kd) * weapon.knockback;
    target.y += (ky / kd) * weapon.knockback;
  }

  return result;
}

export function tryBounce(
  projectile: { x: number; y: number; bounceRemaining: number; bouncedTargets: number[] },
  enemies: EnemyState[],
): number | null {
  if (projectile.bounceRemaining <= 0) return null;

  let best: EnemyState | null = null;
  let bestDist = Infinity;
  for (const e of enemies) {
    if (e.state === "dead") continue;
    if (projectile.bouncedTargets.includes(e.id)) continue;
    const dx = e.x - projectile.x;
    const dy = e.y - projectile.y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }

  return best ? best.id : null;
}
