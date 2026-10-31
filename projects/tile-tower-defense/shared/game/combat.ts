import { magicSpell, tickMagic, migrateMages } from './magic';
import { launch, advanceProjectiles } from './projectiles';
import { balance, road, towerDef, unitDef, waves } from '../config';
import type { Fighter, State } from './model';
import { command, distance, effectiveStats, finishWave, position } from './rules';

/** One fixed simulation step. Both workshop and server call this exact function. */
export function step(s: State, defendBetweenWaves = false, automaticWaves = true) {
  if (automaticWaves && s.phase === 'prepare') {
    s.preparationRemaining = Math.max(
      0,
      (s.preparationRemaining ?? balance.wavePreparationSeconds) - balance.tickSeconds,
    );
    if (s.preparationRemaining <= 0.000001) {
      Object.assign(s, command(s, { type: 'start' }));
    }
  }
  if (s.phase !== 'combat' && (!defendBetweenWaves || s.phase === 'lost')) {
    return;
  }
  migrateMages(s);
  const dt = balance.tickSeconds;
  s.impacts = [];
  for (const fighter of [...s.enemies, ...s.recruits]) {
    tickMagic(fighter, dt);
  }
  advanceProjectiles(s, dt);
  s.spawnIn -= dt;
  if (s.phase === 'combat' && s.queue.length && s.spawnIn <= 0) {
    const kind = s.queue.shift()!,
      def = unitDef(kind),
      health = def.health * waves[s.wave].healthMultiplier;
    s.enemies.push({ id: s.nextId++, kind, progress: 0, health, maxHealth: health, cooldown: 0 });
    s.spawnIn += waves[s.wave].interval;
  }
  for (const tower of s.towers) {
    tower.cooldown = Math.max(0, tower.cooldown - dt);
    if (tower.cooldown > 0) {
      continue;
    }
    const stats = effectiveStats(tower, s);
    const target = s.enemies
      .filter((e) => e.health > 0 && distance(tower, position(e.progress)) <= stats.range)
      .sort((a, b) => b.progress - a.progress || a.id - b.id)[0];
    if (!target) {
      continue;
    }
    tower.casts = (tower.casts ?? 0) + 1;
    const spell = tower.kind === 'sentinel' ? magicSpell(tower, stats.damage) : undefined;
    const definition = spell
      ? { ...towerDef(tower.kind).projectile, art: `magic/${spell.school}-bolt` }
      : towerDef(tower.kind).projectile;
    launch(s, tower, target, definition, stats.damage, stats.splash, true, 48, spell);
    tower.cooldown = stats.cooldown;
  }
  // Recruits and enemies acquire spatial targets. Melee contact blocks passage; ranged units may stop earlier.
  function advance(f: Fighter, opponents: Fighter[], direction: 1 | -1) {
    if (f.health <= 0 || (f.freeze ?? 0) > 0) {
      return;
    }
    const def = unitDef(f.kind),
      p = position(f.progress);
    f.cooldown = Math.max(0, f.cooldown - dt);
    const living = opponents.filter((o) => o.health > 0);
    const target = living
      .filter((o) => distance(p, position(o.progress)) <= def.range)
      .sort(
        (a, b) =>
          distance(p, position(a.progress)) - distance(p, position(b.progress)) || a.id - b.id,
      )[0];
    if (target) {
      if (f.cooldown <= 0) {
        if ('projectile' in def) {
          launch(s, p, target, def.projectile, def.damage, 0, direction === -1, 12);
        } else {
          target.health -= def.damage;
          s.impacts.push({ ...position(target.progress), splash: 0, ally: direction === -1 });
        }
        f.cooldown = def.cooldown;
      }
    } else {
      const blocked = living.some((o) => Math.abs(o.progress - f.progress) < 0.4);
      if (!blocked) {
        f.progress += direction * def.speed * dt * (1 - (f.chill?.strength ?? 0));
      }
    }
  }
  for (const recruit of s.recruits) {
    advance(recruit, s.enemies, -1);
  }
  for (const enemy of s.enemies) {
    advance(enemy, s.recruits, 1);
  }
  for (const enemy of s.enemies) {
    if (enemy.health <= 0) {
      s.gold += enemy.reward ?? unitDef(enemy.kind).reward;
      s.kills++;
    } else if (enemy.progress >= road.length - 1) {
      s.lives = Math.max(0, s.lives - (enemy.leak ?? unitDef(enemy.kind).leak));
    }
  }
  s.enemies = s.enemies.filter((e) => e.health > 0 && e.progress < road.length - 1);
  s.retired += s.recruits.filter((r) => r.health > 0 && r.progress <= 0).length;
  s.recruits = s.recruits.filter((r) => r.health > 0 && r.progress > 0);
  if (s.lives <= 0) {
    s.phase = 'lost';
    s.projectiles = [];
    s.queue = [];
    s.impacts = [];
    return;
  }
  if (s.phase === 'combat' && !s.queue.length && !s.enemies.length) {
    finishWave(s);
  }
}
