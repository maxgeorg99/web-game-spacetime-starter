import { t, type TranslationKey } from './index';
import * as config from '../../shared/config';
import { bevyUnits as sourceUnits } from '../../shared/config/bevy-units';
import { worldIslands as sourceIslands } from '../../shared/config/world';
import { factions as sourceFactions } from '../../shared/config/factions';

// IDs and game rules stay stable; only presentation strings come from the catalog.
export type Localized<T> = T & { name: string; description: string };
export type LocalizedSkillTree = Omit<config.SkillTree, 'nodes'> & {
  branches: string[];
  nodes: Localized<config.SkillNode>[];
};
function text(key: string) {
  return t(key as TranslationKey);
}
function named<T extends { id: string }>(group: string, value: T): Localized<T> {
  return {
    ...value,
    name: text(`content.${group}.${value.id}.name`),
    description: text(`content.${group}.${value.id}.description`),
  };
}
export const towers = config.towers.map((value) => named('towers', value));
export const units = config.units.map((value) => named('units', value));
export const tiles = config.tiles.map((value) => named('tiles', value));
export const waves = config.waves.map((value) => named('waves', value));
export const bevyUnits = sourceUnits.map((value) => named('units', value));
export const recruitableUnits = bevyUnits.filter((value) => value.recruitable);
export const worldIslands = sourceIslands.map((value) => ({
  ...value,
  name: text(`content.islands.${value.slot}.name`),
}));
export const factions = Object.fromEntries(
  Object.entries(sourceFactions).map(([key, value]) => [
    key,
    { ...value, name: text(`content.factions.${key}.name`) },
  ]),
) as { [K in keyof typeof sourceFactions]: (typeof sourceFactions)[K] & { name: string } };
export const towerDef = (id: string) => named('towers', config.towerDef(id));
export const unitDef = (id: string) => named('units', config.unitDef(id));
export const tileDef = (id: string) => named('tiles', config.tileDef(id));
export function treeDef(id: string) {
  return localizeSkillTree(config.treeDef(id));
}
export function localizeSkillTree(
  tree: config.SkillTree,
  translate: typeof t = t,
): LocalizedSkillTree {
  const label = (key: string) => translate(key as TranslationKey);
  return {
    ...tree,
    branches: tree.branchIds.map((id) => label(`content.branches.${tree.tower}.${id}`)),
    nodes: tree.nodes.map((node) => ({
      ...node,
      name: label(`content.skills.${tree.tower}.${node.id}.name`),
      description: label(`content.skills.${tree.tower}.${node.id}.description`),
    })),
  };
}
