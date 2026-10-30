export * from './types';
export * from './towers';
export * from './units';
export * from './skills';
export * from './waves';
export * from './island';
export * from './presentation';
import { towers } from './towers';
import { units } from './units';
import { skillTrees } from './skills';
import { waves } from './waves';
import { tiles } from './island';
export function towerDef(id: string) {
  const def = towers.find((v) => v.id === id);
  if (!def) {
    throw Error('Unknown tower.');
  }
  return def;
}
export function unitDef(id: string) {
  const def = units.find((v) => v.id === id);
  if (!def) {
    throw Error('Unknown unit.');
  }
  return def;
}
export function tileDef(id: string) {
  const def = tiles.find((v) => v.id === id);
  if (!def) {
    throw Error('Unknown tile.');
  }
  return def;
}
export function treeDef(id: string) {
  const def = skillTrees.find((v) => v.tower === id);
  if (!def) {
    throw Error('Missing skill tree.');
  }
  return def;
}
export function validateCatalog() {
  const unique = (ids: readonly string[]) => {
    if (new Set(ids).size !== ids.length) {
      throw Error('Duplicate config ID.');
    }
  };
  [towers, units, waves, tiles].forEach((list) => unique(list.map((v) => v.id)));
  unique(skillTrees.map((v) => v.tower));
  for (const t of towers) {
    treeDef(t.id);
    if (!t.projectile.art || !Number.isFinite(t.projectile.speed) || t.projectile.speed <= 0) {
      throw Error('Invalid projectile.');
    }
    if (t.cost <= 0 || t.damage <= 0 || t.cooldown <= 0 || t.range <= 0) {
      throw Error('Invalid tower stats.');
    }
  }
  for (const u of units) {
    if (
      u.health <= 0 ||
      u.speed <= 0 ||
      u.cooldown <= 0 ||
      u.damage < 0 ||
      u.range < 0 ||
      u.meatCost < 0 ||
      (u.recruitable && (!Number.isInteger(u.meatCost) || u.meatCost < 1))
    ) {
      throw Error('Invalid unit stats.');
    }
  }
  for (const w of waves) {
    if (w.interval <= 0 || w.healthMultiplier <= 0 || !w.groups.length) {
      throw Error('Invalid wave.');
    }
    for (const g of w.groups) {
      if (unitDef(g.unit).recruitable || g.count < 1 || !Number.isInteger(g.count)) {
        throw Error('Invalid wave group.');
      }
    }
  }
  for (const tree of skillTrees) {
    towerDef(tree.tower);
    unique(tree.nodes.map((n) => n.id));
    for (const n of tree.nodes) {
      if (
        n.branch < 0 ||
        n.branch >= tree.branchIds.length ||
        n.maxRank < 1 ||
        !Number.isInteger(n.maxRank) ||
        n.goldCost <= 0 ||
        n.perRank <= 0
      ) {
        throw Error('Invalid skill.');
      }
      if (n.requires) {
        const p = tree.nodes.find((p) => p.id === n.requires!.id);
        if (!p || p.tier >= n.tier || n.requires.rank > p.maxRank || n.requires.rank < 1) {
          throw Error('Invalid skill prerequisite.');
        }
      }
    }
  }
}
