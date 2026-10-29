import type { ProjectileDef } from '../config';
import type { Fighter, Point, State } from './model';
import { distance, position } from './rules';

export function launch(
  state: State,
  from: Point,
  target: Fighter,
  definition: ProjectileDef,
  damage: number,
  splash: number,
  ally: boolean,
  launchHeight: number,
) {
  state.projectiles.push({
    id: state.nextId++,
    x: from.x,
    y: from.y,
    target: target.id,
    aim: position(target.progress),
    art: definition.art,
    speed: definition.speed,
    damage,
    splash,
    ally,
    age: 0,
    launchHeight,
  });
}

/** Homing projectiles follow living targets, otherwise finish at the last known position. */
export function advanceProjectiles(state: State, delta: number) {
  state.projectiles = state.projectiles.filter((projectile) => {
    const opponents = projectile.ally ? state.enemies : state.recruits;
    const target = opponents.find((unit) => unit.id === projectile.target && unit.health > 0);
    if (target) {
      projectile.aim = position(target.progress);
    }
    const remaining = distance(projectile, projectile.aim);
    projectile.age += delta;
    if (remaining <= projectile.speed * delta) {
      for (const unit of opponents) {
        if (unit.health <= 0) {
          continue;
        }
        const hitTarget = unit.id === target?.id;
        const hitSplash =
          projectile.splash > 0 &&
          distance(position(unit.progress), projectile.aim) <= projectile.splash;
        if (hitTarget || hitSplash) {
          unit.health -= projectile.damage;
        }
      }
      state.impacts.push({ ...projectile.aim, splash: projectile.splash, ally: projectile.ally });
      return false;
    }
    if (projectile.age > 5) {
      return false;
    }
    const travel = (projectile.speed * delta) / remaining;
    projectile.x += (projectile.aim.x - projectile.x) * travel;
    projectile.y += (projectile.aim.y - projectile.y) * travel;
    return true;
  });
}
