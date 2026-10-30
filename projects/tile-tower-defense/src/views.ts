import { mageAspect, mageMastered, magePoints, branchPoints } from '../shared/game/magic';
import { schools, magicColors } from '../shared/config/magic';
import { discoveries, rarityColors } from '../shared/config/drafting';
import { assetUrl } from './assets';
import { t, th, escapeHtml } from './i18n';
import {
  bevyUnits,
  towers,
  waves,
  tiles,
  treeDef,
  towerDef,
  unitDef,
  tileDef,
  type Localized,
  type LocalizedSkillTree,
} from './i18n/content';
import { factionArt, type Faction } from '../shared/config/factions';
import { balance, uiIcons } from '../shared/config';
import type { SkillNode, TowerDef, UnitDef } from '../shared/config';
import type { State, Tower } from '../shared/game/model';
import { effectiveStats, upgradeFailure } from '../shared/game/rules';
import { portrait, sheets } from './art';

export function icon(name: keyof typeof uiIcons) {
  return `<img class="stat-icon" src="${assetUrl(`art/${uiIcons[name]}.png`)}" alt="" />`;
}
export function avatar(unit: UnitDef, faction?: Faction) {
  if (unit.avatar in sheets) {
    return portrait(faction ? factionArt(unit.avatar, faction) : unit.avatar);
  }
  return `<img class="avatar" src="${assetUrl(`art/${faction ? factionArt(unit.avatar, faction) : unit.avatar}.png`)}" alt="" />`;
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
      ${disabled(locked || state.phase !== 'prepare' || state.gold < tower.cost)} title="${escapeHtml(tower.description)}">
      ${portrait(factionArt(tower.avatar, faction))}
      <span class="card-name">${escapeHtml(tower.name)}</span>
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
      const rarity = discoveries[id].rarity;
      return `
      <button style="--rarity:#${rarityColors[rarity].toString(16)}" aria-pressed="${id === selected}" class="action-card draft-card ${id === selected ? 'chosen' : ''}" data-tile="${id}" ${disabled(locked)} title="${escapeHtml(tile.description)}">
        <span class="rarity-label">${th(`draft.${rarity}`)}</span>
        <span class="tile-preview" style="--tile-color:#${tile.color.toString(16)}">${'art' in tile ? portrait(tile.art) : ''}</span>
        <span class="card-name">${escapeHtml(tile.name)}</span>
        <span class="draft-description">${escapeHtml(tile.description)}</span>
        <span class="discovery-label">${th(state.tiles.some((land) => land.kind === id) ? 'draft.owned' : 'draft.new')}</span>
      </button>
    `;
    })
    .join('');
}

function skillButton(state: State, tower: Tower, node: Localized<SkillNode>, locked: boolean) {
  const failure = upgradeFailure(state, tower, node.id);
  const reason =
    failure?.kind === 'points'
      ? t('mage.pointLimit', { count: failure.limit })
      : failure?.kind === 'branch'
        ? t('mage.branchRequired', { count: failure.points })
        : failure?.kind === 'maxed'
          ? t('upgrade.maxed')
          : failure?.kind === 'gold'
            ? t('upgrade.needGold', { gold: failure.amount })
            : failure?.kind === 'prerequisite'
              ? t('skill.requires', {
                  name: treeDef(tower.kind).nodes.find((parent) => parent.id === failure.skill)!
                    .name,
                  rank: failure.rank,
                })
              : failure?.kind === 'unknown'
                ? t('upgrade.unknown')
                : undefined;
  const rank = tower.ranks[node.id] ?? 0;
  return `
    <button data-node="${node.id}" class="skill ${node.capstone ? 'capstone' : ''} ${rank ? 'invested' : ''}"
      ${disabled(locked || state.phase !== 'prepare' || !!reason)} title="${escapeHtml(reason ?? node.description)}">
      <span class="skill-image"><img src="${assetUrl(`art/${node.icon}.png`)}" alt="" /><span>${rank}/${node.maxRank}</span></span>
      <b>${node.capstone ? '✦ ' : ''}${escapeHtml(node.name)}</b>
      <small>${escapeHtml(node.description)}</small>
      <span class="skill-price">${rank >= node.maxRank ? th('tower.maxed') : `${icon('gold')}${node.goldCost}`}</span>
      ${reason && rank < node.maxRank ? `<em>${escapeHtml(reason)}</em>` : ''}
    </button>
  `;
}

export function towerPanel(state: State, tower: Tower, locked: boolean, faction: Faction = 'blue') {
  const definition = towerDef(tower.kind);
  const stats = effectiveStats(tower, state);
  const tree = treeDef(tower.kind);
  const branches = tree.branches
    .map(
      (branch, index) => `
    <section class="skill-branch" ${tower.kind === 'sentinel' ? `style="--school:#${magicColors[schools[index]].toString(16)}"` : ''}><h4>${escapeHtml(branch)} ${tower.kind === 'sentinel' ? `<small>${branchPoints(tower, schools[index])}/10</small>` : ''}</h4>
      ${tree.nodes
        .filter((node) => node.branch === index)
        .map((node) => skillButton(state, tower, node, locked))
        .join('')}
    </section>
  `,
    )
    .join('');
  return `
    <div class="tower-heading">${portrait(factionArt(tower.kind === 'sentinel' ? `mage-${mageAspect(tower)}` : definition.avatar, faction))}<div><h2>${escapeHtml(definition.name)}</h2><span>${th('tower.specialize')}</span></div></div>
    <div class="tower-stats">
      <span title="${th('tower.damage')}">${icon('damage')}${number(stats.damage)}</span>
      <span title="${th('tower.range')}">${icon('range')}${number(stats.range)}</span>
      <span title="${th('tower.cooldown')}">${th('tower.secondsPerShot', { seconds: number(stats.cooldown) })}</span>
    </div>
    ${tower.kind === 'sentinel' ? `<div class="mage-summary"><b>${th('mage.points', { count: magePoints(tower), limit: tree.pointLimit! })}</b><span>${th(`mage.aspect.${mageAspect(tower)}`)}${mageMastered(tower) ? ` · ${th('mage.mastered')}` : ''}</span><p>${th('mage.hybrids')}</p></div>` : ''}
    <div class="skill-tree">${branches}</div>
    <button class="sell" data-sell="yes" ${disabled(locked || state.phase !== 'prepare')}>
      ${th('tower.sell')} ${icon('gold')}${Math.floor(tower.spent * balance.sellFraction)}
    </button>
  `;
}

function catalogSkill(tree: LocalizedSkillTree, node: Localized<SkillNode>) {
  const prerequisite = node.requires
    ? tree.nodes.find((parent) => parent.id === node.requires!.id)?.name
    : undefined;
  return `
    <div class="catalog-skill"><img src="${assetUrl(`art/${node.icon}.png`)}" alt="" /><div>
      <b>${node.capstone ? '✦ ' : ''}${escapeHtml(node.name)}</b><small>${escapeHtml(node.description)}</small>
      <small>${th('count.ranks', { count: node.maxRank, gold: node.goldCost })}</small>
      ${prerequisite ? `<small>${th('skill.requires', { name: prerequisite, rank: node.requires!.rank })}</small>` : ''}
    </div></div>
  `;
}
function catalogTower(tower: Localized<TowerDef>) {
  const tree = treeDef(tower.id);
  return `
    <article>${portrait(tower.avatar)}<h3>${escapeHtml(tower.name)}</h3><code>${tower.id}</code>
      <p>${escapeHtml(tower.description)}</p>
      ${tree.pointLimit ? `<p>${th('mage.hybrids')}</p>` : ''}
      <p>${th('catalog.towerStats', { gold: tower.cost, damage: tower.damage, range: tower.range, seconds: tower.cooldown })}</p>
      ${tree.branches
        .map(
          (branch, index) => `
        <h4>${escapeHtml(branch)}</h4>
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
function catalogUnit(unit: Localized<UnitDef>) {
  return `
    <article>${avatar(unit)}<h3>${escapeHtml(unit.name)}</h3><code>${unit.id}</code>
      <p>${escapeHtml(unit.description)}</p>
      <p>${icon('health')}${th('catalog.unitHealth', { health: unit.health })} · ${icon('damage')}${th('catalog.unitDamage', { damage: unit.damage })}<br />
        ${th('catalog.unitTiming', { seconds: unit.cooldown, speed: unit.speed, range: unit.range })}<br />
        ${unit.recruitable ? `${icon('meat')}${th('catalog.recruitCost', { cost: unit.meatCost })}` : `${icon('gold')}${th('catalog.reward', { reward: unit.reward, damage: unit.leak })}`}
      </p>
    </article>
  `;
}
export function catalogContent() {
  return `
    <h3>${th('catalog.towers')}</h3><div class="catalog-grid">${towers.map(catalogTower).join('')}</div>
    <h3>${th('catalog.land')}</h3><div class="catalog-grid catalog-tiles">${tiles
      .map((tile) => {
        const rarity = discoveries[tile.id].rarity;
        return `<article class="catalog-tile" style="--rarity:#${rarityColors[rarity].toString(16)}">
        <span class="rarity-label">${th(`draft.${rarity}`)}</span>
        <span class="tile-preview" style="--tile-color:#${tile.color.toString(16)}">${'art' in tile ? portrait(tile.art) : ''}</span>
        <h4>${escapeHtml(tile.name)}</h4><p>${escapeHtml(tile.description)}</p>
        <small>${th('catalog.tileUnlock', { depth: discoveries[tile.id].unlock })}</small>
      </article>`;
      })
      .join('')}</div>
    <h3>${th('catalog.recruits')}</h3><div class="catalog-grid">${bevyUnits
      .filter((unit) => unit.recruitable)
      .map(catalogUnit)
      .join('')}</div>
    <h3>${th('catalog.enemies')}</h3><div class="catalog-grid">${bevyUnits
      .filter((unit) => !unit.recruitable)
      .map(catalogUnit)
      .join('')}</div>
    <h3>${th('catalog.waves')}</h3>
    ${waves
      .map(
        (wave, index) => `
      <p><b>${index + 1}. ${escapeHtml(wave.name)}</b> — ${wave.groups.map((group) => `${group.count} ${unitDef(group.unit).name}`).join(', ')}
        · ${th('catalog.waveStats', { health: wave.healthMultiplier, seconds: wave.interval })}</p>
    `,
      )
      .join('')}
  `;
}
