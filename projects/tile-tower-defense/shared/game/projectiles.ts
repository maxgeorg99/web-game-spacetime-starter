import type { ProjectileDef } from '../config';
import { magicBalance } from '../config/magic';
import type { Fighter, MagicPayload, Point, Projectile, State } from './model';
import { distance, position } from './rules';
import { applyMagic } from './magic';

export function launch(
  state: State,
  from: Point,
  target: Fighter,
  definition: ProjectileDef,
  damage: number,
  splash: number,
  ally: boolean,
  launchHeight: number,
  magic?: MagicPayload,
) {
  state.projectiles.push({
    id: state.nextId++,
    x: from.x,
    y: from.y,
    origin: { x: from.x, y: from.y },
    target: target.id,
    aim: position(target.progress),
    art: definition.art,
    speed: definition.speed,
    damage,
    splash,
    ally,
    age: 0,
    launchHeight,
    ...(magic ? { magic } : {}),
  });
}

/** All impact damage, statuses and deterministic jump selection execute on the authority. */
export function advanceProjectiles(state: State, delta: number) {
  const surviving: Projectile[] = [],
    chained: Projectile[] = [];
  for (const projectile of state.projectiles) {
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
        if (
          unit.id === target?.id ||
          (projectile.splash > 0 &&
            distance(position(unit.progress), projectile.aim) <= projectile.splash)
        ) {
          unit.health -= projectile.damage;
          if (unit.id === target?.id && projectile.magic) {
            applyMagic(unit, projectile.magic);
          }
        }
      }
      const spell = projectile.magic;
      const ignition = !!target && !!spell?.ignite && !spell.chained;
      if (ignition) {
        for (const unit of opponents) {
          if (
            unit.health > 0 &&
            distance(position(unit.progress), projectile.aim) <= magicBalance.igniteRadius
          ) {
            unit.health -= projectile.damage;
          }
        }
      }
      state.impacts.push({
        ...projectile.aim,
        splash: ignition ? magicBalance.igniteRadius : projectile.splash,
        ally: projectile.ally,
        ...(spell
          ? {
              school: ignition ? 'fire' : spell.school,
              capstone: ignition || spell.freeze || spell.overcharge,
              ...(spell.school === 'lightning' ? { from: projectile.origin } : {}),
            }
          : {}),
      });
      if (target && spell && spell.jumps > 0) {
        const visited = [...spell.visited, target.id];
        const next = opponents
          .filter(
            (unit) =>
              unit.health > 0 &&
              !visited.includes(unit.id) &&
              distance(position(unit.progress), projectile.aim) <= spell.jumpRange,
          )
          .sort(
            (a, b) =>
              distance(position(a.progress), projectile.aim) -
                distance(position(b.progress), projectile.aim) || a.id - b.id,
          )[0];
        if (next) {
          chained.push({
            ...projectile,
            ...projectile.aim,
            origin: { ...projectile.aim },
            id: state.nextId++,
            target: next.id,
            aim: position(next.progress),
            age: 0,
            launchHeight: 12,
            art: 'magic/lightning-bolt',
            damage: projectile.damage * spell.retention,
            splash: 0,
            magic: {
              ...spell,
              school: 'lightning',
              jumps: spell.jumps - 1,
              visited,
              chained: true,
              freeze: false,
              ignite: false,
            },
          });
        }
      }
      continue;
    }
    if (projectile.age > 5) {
      continue;
    }
    const travel = (projectile.speed * delta) / remaining;
    projectile.x += (projectile.aim.x - projectile.x) * travel;
    projectile.y += (projectile.aim.y - projectile.y) * travel;
    surviving.push(projectile);
  }
  // New jumps start on the next tick, avoiding lost inserts or unbounded same-tick chains.
  state.projectiles = [...surviving, ...chained];
}
