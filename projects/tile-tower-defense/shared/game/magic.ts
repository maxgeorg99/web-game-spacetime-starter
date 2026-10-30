import {
  mageTree,
  magicBalance as b,
  schools,
  type School,
  type MageAspect,
} from '../config/magic';
import type { Fighter, MagicPayload, State, Tower } from './model';

export function branchPoints(tower: Pick<Tower, 'ranks'>, school: School) {
  return mageTree.nodes
    .filter((node) => node.id.startsWith(`${school}-`))
    .reduce((sum, node) => sum + (tower.ranks[node.id] ?? 0), 0);
}
export function magePoints(tower: Pick<Tower, 'ranks'>) {
  return schools.reduce((sum, school) => sum + branchPoints(tower, school), 0);
}
export function mageAspect(tower: Pick<Tower, 'ranks' | 'school'>): MageAspect {
  const maximum = Math.max(...schools.map((school) => branchPoints(tower, school)));
  if (!maximum) return 'arcane';
  if (tower.school && branchPoints(tower, tower.school) === maximum) return tower.school;
  return schools.find((school) => branchPoints(tower, school) === maximum)!;
}
export function mageMastered(tower: Pick<Tower, 'ranks'>) {
  return schools.some((school) => (tower.ranks[`${school}-capstone`] ?? 0) > 0);
}
/** Captured at launch by the authority: in-flight spells never read later upgrades. */
export function magicSpell(tower: Tower, damage: number): MagicPayload {
  const rank = (id: string) => tower.ranks[id] ?? 0;
  const frost = rank('frost-attune'),
    fire = rank('fire-attune'),
    lightning = rank('lightning-attune');
  const cast = tower.casts ?? 0;
  const storm = rank('lightning-capstone') > 0 && cast % b.stormEvery === 0;
  return {
    school: mageAspect(tower),
    slow: frost ? b.slowBase + frost * b.slowPerRank : 0,
    slowSeconds: b.slowDuration + rank('frost-duration') * b.durationPerRank,
    burnDps: fire * b.burnPerRank * damage,
    burnSeconds: b.burnSeconds + rank('fire-duration') * b.burnDurationPerRank,
    burnStacks: 1 + rank('fire-power'),
    jumps: lightning ? 1 + lightning + (storm ? b.stormExtraJumps : 0) : 0,
    jumpRange: b.chainRange + rank('lightning-duration') * b.chainRangePerRank,
    retention: storm ? 1 : b.chainRetention + rank('lightning-power') * b.chainRetentionPerRank,
    freeze: rank('frost-capstone') > 0 && cast % b.freezeEvery === 0,
    ignite: rank('fire-capstone') > 0 && cast % b.igniteEvery === 0,
    overcharge: storm,
    visited: [],
  };
}
export function applyMagic(target: Fighter, spell: MagicPayload) {
  if (spell.chained) return;
  if (spell.slow) {
    target.chill = {
      strength: Math.max(target.chill?.strength ?? 0, spell.slow),
      remaining: Math.max(target.chill?.remaining ?? 0, spell.slowSeconds),
    };
  }
  if (spell.freeze && !(target.freezeGuard && target.freezeGuard > 0)) {
    target.freeze = b.freezeSeconds;
    target.freezeGuard = b.freezeSeconds + b.freezeImmunity;
  }
  if (spell.burnDps) {
    const previous = target.burn;
    target.burn = {
      dps: Math.max(previous?.dps ?? 0, spell.burnDps),
      remaining: Math.max(previous?.remaining ?? 0, spell.burnSeconds),
      stacks: Math.max(
        previous?.stacks ?? 0,
        Math.min(spell.burnStacks, (previous?.stacks ?? 0) + 1),
      ),
    };
  }
}
/** Only the shared scheduled simulation advances statuses or applies damage. */
export function tickMagic(fighter: Fighter, dt: number) {
  if (fighter.health <= 0) return;
  if (fighter.burn) {
    fighter.health -= fighter.burn.dps * fighter.burn.stacks * Math.min(dt, fighter.burn.remaining);
    fighter.burn.remaining = Math.max(0, fighter.burn.remaining - dt);
    if (!fighter.burn.remaining) delete fighter.burn;
  }
  if (fighter.chill) {
    fighter.chill.remaining = Math.max(0, fighter.chill.remaining - dt);
    if (!fighter.chill.remaining) delete fighter.chill;
  }
  fighter.freeze = Math.max(0, (fighter.freeze ?? 0) - dt);
  fighter.freezeGuard = Math.max(0, (fighter.freezeGuard ?? 0) - dt);
}
/** Old Sentinel investments are refunded once, without removing the placed tower. */
export function migrateMages(state: State): boolean {
  let changed = false;
  for (const tower of state.towers) {
    if (tower.kind !== 'sentinel' || tower.magicVersion === 1) continue;
    const legacy = ['steel', 'piercer', 'scope', 'horizon', 'drill', 'precision'];
    if (Object.keys(tower.ranks).some((id) => legacy.includes(id))) {
      const refund = Math.max(0, tower.spent - 120);
      state.gold += refund;
      tower.spent -= refund;
      tower.ranks = {};
    }
    tower.magicVersion = 1;
    changed = true;
  }
  return changed;
}
