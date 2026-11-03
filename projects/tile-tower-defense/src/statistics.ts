import { icon } from './views';
import { statisticsIcons } from '../shared/config/presentation';
import type { RunStatistics } from '../shared/game/statistics';
import { towerDef } from './i18n/content';
import type { TowerId } from '../shared/config';
import { escapeHtml, language, t, th, type TranslationKey } from './i18n';
import type { GameStore } from './store';

const format = (n: number) =>
  new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(n);
const label = (key: TranslationKey) => {
  const name = key.slice('stats.'.length) as keyof typeof statisticsIcons;
  const art = statisticsIcons[name];
  return `<span class="statistics-label">${art ? icon(art) : ''}<span>${th(key)}</span></span>`;
};
const metric = (key: TranslationKey, value: number | string) =>
  `<div><dt>${label(key)}</dt><dd>${typeof value === 'number' ? format(value) : escapeHtml(value)}</dd></div>`;
export function statisticsMarkup(stats?: RunStatistics): string {
  if (!stats) {
    return `<p>${th('stats.unavailable')}</p>`;
  }
  const totalGold = stats.buildGold + stats.upgradeGold;
  const rows = Object.entries(stats.towers)
    .sort((a, b) => b[1]!.damage - a[1]!.damage)
    .map(([kind, row]) => {
      const value = row!;
      const share = stats.damage ? Math.round((value.damage / stats.damage) * 100) : 0;
      return `<tr><th scope="row">${escapeHtml(towerDef(kind as TowerId).name)}<small>${th('stats.builtCount', { count: value.built })}</small></th><td>${format(value.damage)}<small>${share}%</small></td><td>${format(value.kills)}</td><td>${format(value.goldSpent)}</td><td>${value.goldSpent ? (value.damage / value.goldSpent).toFixed(1) : '—'}</td></tr>`;
    })
    .join('');
  return `${stats.partial ? `<p class="statistics-note">${th('stats.partial')}</p>` : ''}
    <dl class="statistics-grid">
      ${metric('stats.waves', stats.waves)}${metric('stats.duration', `${Math.floor(stats.seconds / 60)}:${String(Math.floor(stats.seconds % 60)).padStart(2, '0')}`)}
      ${metric('stats.damage', stats.damage)}${metric('stats.kills', stats.kills)}${metric('stats.leaks', stats.leaks)}${metric('stats.keepLost', stats.keepDamage)}
    </dl>
    <h3>${th('stats.contribution')}</h3>
    ${rows ? `<div class="statistics-table"><table><thead><tr><th>${label('stats.tower')}</th><th>${label('stats.damage')}</th><th>${label('stats.kills')}</th><th>${label('stats.invested')}</th><th>${label('stats.efficiency')}</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p>${th('stats.noTowers')}</p>`}
    <p class="statistics-note">${th('stats.method')}</p>
    <h3>${th('stats.economy')}</h3>
    <dl class="statistics-grid">
      ${metric('stats.buildGold', stats.buildGold)}${metric('stats.upgradeGold', stats.upgradeGold)}${metric('stats.goldEarned', stats.goldIncome + stats.bounty)}${metric('stats.meatEarned', stats.meatIncome)}${metric('stats.upgradeShare', totalGold ? `${Math.round((stats.upgradeGold / totalGold) * 100)}%` : '—')}
    </dl>
    <h3>${th('stats.raids')}</h3>
    <dl class="statistics-grid">
      ${metric('stats.sent', stats.sent)}${metric('stats.raidDamage', stats.raidDamage)}${metric('stats.meatSpent', stats.meatSpent)}
    </dl>`;
}

export class StatisticsPanel {
  constructor(store: GameStore) {
    const dialog = document.getElementById('statistics') as HTMLDialogElement;
    const body = document.getElementById('statistics-content')!;
    const render = () => {
      body.innerHTML = statisticsMarkup(store.state.statistics);
    };
    document.getElementById('statistics-open')!.onclick = () => {
      render();
      dialog.showModal();
    };
    document.getElementById('statistics-close')!.onclick = () => dialog.close();
    let second = -1;
    store.subscribe(() => {
      if (!store.destination && store.online) {
        dialog.close();
      }
      const now = Math.floor(store.state.statistics?.seconds ?? 0);
      if (dialog.open && second !== now) {
        second = now;
        render();
      }
      const towerStats = document.getElementById('selected-tower-statistics');
      if (towerStats) {
        const tower = store.state.towers.find(
          (tower) => tower.id === Number(towerStats.dataset.tower),
        );
        towerStats.textContent = t('stats.towerSummary', {
          damage: format(tower?.statistics?.damage ?? 0),
          kills: tower?.statistics?.kills ?? 0,
          shots: tower?.statistics?.shots ?? 0,
        });
      }
    });
  }
}
