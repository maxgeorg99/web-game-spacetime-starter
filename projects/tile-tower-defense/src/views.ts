import { assetUrl } from './assets';
import { bevyUnits } from '../shared/config/bevy-units';
import { factionArt, type Faction } from '../shared/config/factions';
import {
  balance,
  towers,
  waves,
  tiles,
  treeDef,
  towerDef,
  unitDef,
  tileDef,
  uiIcons,
} from '../shared/config';
import type { SkillNode, SkillTree, TowerDef, UnitDef } from '../shared/config';
import type { State, Tower } from '../shared/game/model';
import { effectiveStats, upgradeReason } from '../shared/game/rules';
import { portrait, sheets } from './art';

export function icon(name: keyof typeof uiIcons) {
  return `<img class="stat-icon" src="${assetUrl(`art/${uiIcons[name]}.png`)}" alt="" />`;
}
export function avatar(unit: UnitDef, faction?: Faction) {
  if (unit.avatar in sheets) {
    return portrait(faction ? factionArt(unit.avatar, faction) : unit.avatar);
  }
  return `<img class="avatar" src="${assetUrl(`art/${unit.avatar}.png`)}" alt="" />`;
}
const number = (value: number) => Number(value.toFixed(1));
const disabled = (condition: boolean) => (condition ? 'disabled' : '');

export function buildCards(
  state: State,
  selected: string | undefined,
  locked: boolean,
  faction: Faction = 'blue',
) {
  return towers
    .map(
      (tower) => `
    <button class="action-card ${selected === tower.id ? 'chosen' : ''}" data-build="${tower.id}"
      ${disabled(locked || state.phase !== 'prepare' || state.gold < tower.cost)} title="${tower.description}">
      ${portrait(factionArt(tower.art, faction))}
      <span class="card-name">${tower.name}</span>
      <span class="card-cost">${icon('gold')}${tower.cost}</span>
    </button>
  `,
    )
    .join('');
}

export function draftCards(state: State, selected: string | undefined, locked: boolean) {
  return state.offers
    .map((id) => {
      const tile = tileDef(id);
      const reward = tile.goldIncome
        ? `${icon('gold')}+${tile.goldIncome}`
        : tile.meatIncome
          ? `${icon('meat')}+${tile.meatIncome}`
          : `${icon('defense')}Buildable`;
      return `
      <button class="action-card draft-card ${id === selected ? 'chosen' : ''}" data-tile="${id}" ${disabled(locked)} title="${tile.description}">
        <span class="tile-preview" style="--tile-color:#${tile.color.toString(16)}">${'art' in tile ? portrait(tile.art) : ''}</span>
        <span class="card-name">${tile.name}</span><span class="card-cost">${reward}</span>
      </button>
    `;
    })
    .join('');
}

function skillButton(state: State, tower: Tower, node: SkillNode, locked: boolean) {
  const reason = upgradeReason(state, tower, node.id);
  const rank = tower.ranks[node.id] ?? 0;
  return `
    <button data-node="${node.id}" class="skill ${rank ? 'invested' : ''}"
      ${disabled(locked || state.phase !== 'prepare' || !!reason)} title="${reason ?? node.description}">
      <span class="skill-image"><img src="${assetUrl(`art/${node.icon}.png`)}" alt="" /><span>${rank}/${node.maxRank}</span></span>
      <b>${node.name}</b>
      <small>${node.description}</small>
      <span class="skill-price">${rank >= node.maxRank ? 'Maxed' : `${icon('gold')}${node.goldCost}`}</span>
      ${reason && rank < node.maxRank ? `<em>${reason}</em>` : ''}
    </button>
  `;
}

export function towerPanel(state: State, tower: Tower, locked: boolean, faction: Faction = 'blue') {
  const definition = towerDef(tower.kind);
  const stats = effectiveStats(tower);
  const tree = treeDef(tower.kind);
  const branches = tree.branches
    .map(
      (branch, index) => `
    <section class="skill-branch"><h4>${branch}</h4>
      ${tree.nodes
        .filter((node) => node.branch === index)
        .map((node) => skillButton(state, tower, node, locked))
        .join('')}
    </section>
  `,
    )
    .join('');
  return `
    <div class="tower-heading">${portrait(factionArt(definition.art, faction))}<div><h2>${definition.name}</h2><span>Specialize this tower</span></div></div>
    <div class="tower-stats">
      <span title="Damage">${icon('damage')}${number(stats.damage)}</span>
      <span title="Range in tiles">${icon('range')}${number(stats.range)}</span>
      <span title="Time between shots">${number(stats.cooldown)}s / shot</span>
    </div>
    <div class="skill-tree">${branches}</div>
    <button class="sell" data-sell="yes" ${disabled(locked || state.phase !== 'prepare')}>
      Sell ${icon('gold')}${Math.floor(tower.spent * balance.sellFraction)}
    </button>
  `;
}

function catalogSkill(tree: SkillTree, node: SkillNode) {
  const prerequisite = node.requires
    ? tree.nodes.find((parent) => parent.id === node.requires!.id)?.name
    : undefined;
  return `
    <div class="catalog-skill"><img src="${assetUrl(`art/${node.icon}.png`)}" alt="" /><div>
      <b>${node.name}</b><small>${node.description}</small>
      <small>${node.maxRank} ranks · ${node.goldCost} gold each</small>
      ${prerequisite ? `<small>Requires ${prerequisite}, rank ${node.requires!.rank}</small>` : ''}
    </div></div>
  `;
}
function catalogTower(tower: TowerDef) {
  const tree = treeDef(tower.id);
  return `
    <article>${portrait(tower.art)}<h3>${tower.name}</h3><code>${tower.id}</code>
      <p>${tower.description}</p>
      <p>${tower.cost} gold · ${tower.damage} damage · ${tower.range} range · ${tower.cooldown}s</p>
      ${tree.branches
        .map(
          (branch, index) => `
        <h4>${branch}</h4>
        ${tree.nodes
          .filter((node) => node.branch === index)
          .map((node) => catalogSkill(tree, node))
          .join('')}
      `,
        )
        .join('')}
    </article>
  `;
}
function catalogUnit(unit: UnitDef) {
  return `
    <article>${avatar(unit)}<h3>${unit.name}</h3><code>${unit.id}</code>
      <p>${unit.description}</p>
      <p>${icon('health')}${unit.health} HP · ${icon('damage')}${unit.damage} damage<br />
        ${unit.cooldown}s between attacks · ${unit.speed} tiles/s · ${unit.range} range<br />
        ${unit.recruitable ? `${icon('meat')}${unit.meatCost} to recruit` : `${icon('gold')}${unit.reward} reward · ${unit.leak} keep damage`}
      </p>
    </article>
  `;
}
export function catalogContent() {
  return `
    <h3>Towers & specializations</h3><div class="catalog-grid">${towers.map(catalogTower).join('')}</div>
    <h3>Recruits</h3><div class="catalog-grid">${bevyUnits
      .filter((unit) => unit.recruitable)
      .map(catalogUnit)
      .join('')}</div>
    <h3>Enemies</h3><div class="catalog-grid">${bevyUnits
      .filter((unit) => !unit.recruitable)
      .map(catalogUnit)
      .join('')}</div>
    <h3>Waves</h3>
    ${waves
      .map(
        (wave, index) => `
      <p><b>${index + 1}. ${wave.name}</b> — ${wave.groups.map((group) => `${group.count} ${unitDef(group.unit).name}`).join(', ')}
        · ${wave.healthMultiplier}× HP · ${wave.interval}s spacing</p>
    `,
      )
      .join('')}
    <h3>Land</h3>${tiles.map((tile) => `<p><b>${tile.name}</b> — ${tile.description}</p>`).join('')}
  `;
}
