import { icon } from './views';
import { portrait } from './art';
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
      const definition = towerDef(kind as TowerId);
      return `<details class="statistics-tower" data-report-section="tower-${escapeHtml(kind)}">
        <summary class="disclosure-summary">${portrait(definition.avatar)}<span class="statistics-tower-body"><span class="statistics-tower-heading"><strong>${escapeHtml(definition.name)}</strong><span>${format(value.damage)} <small>${share}%</small></span></span><span class="statistics-bar" aria-hidden="true"><span style="width:${Math.min(100, Math.max(0, share))}%"></span></span></span></summary>
        <p class="statistics-note">${th('stats.builtCount', { count: value.built })}</p>
        <dl class="statistics-grid">${metric('stats.kills', value.kills)}${metric('stats.invested', value.goldSpent)}${metric('stats.efficiency', value.goldSpent ? (value.damage / value.goldSpent).toFixed(1) : '—')}</dl>
      </details>`;
    })
    .join('');
  return `<section class="statistics-board">${stats.partial ? `<p class="statistics-note">${th('stats.partial')}</p>` : ''}
    <dl class="statistics-grid">
      ${metric('stats.waves', stats.waves)}${metric('stats.duration', `${Math.floor(stats.seconds / 60)}:${String(Math.floor(stats.seconds % 60)).padStart(2, '0')}`)}
      ${metric('stats.damage', stats.damage)}${metric('stats.kills', stats.kills)}
    </dl>
    <div class="statistics-section-heading"><h3>${th('stats.contribution')}</h3><span>${label('stats.damage')}</span></div>
    ${rows ? `<div class="statistics-towers">${rows}</div>` : `<p class="statistics-note">${th('stats.noTowers')}</p>`}
    <details class="statistics-fold" data-report-section="economy"><summary class="disclosure-summary">${icon('gold')}${th('stats.economy')}</summary>
    <dl class="statistics-grid">
      ${metric('stats.buildGold', stats.buildGold)}${metric('stats.upgradeGold', stats.upgradeGold)}${metric('stats.goldEarned', stats.goldIncome + stats.bounty)}${metric('stats.meatEarned', stats.meatIncome)}${metric('stats.upgradeShare', totalGold ? `${Math.round((stats.upgradeGold / totalGold) * 100)}%` : '—')}
    </dl>
    </details><details class="statistics-fold" data-report-section="raids"><summary class="disclosure-summary">${icon('pierce')}${th('stats.raids')}</summary>
    <dl class="statistics-grid">
      ${metric('stats.sent', stats.sent)}${metric('stats.raidDamage', stats.raidDamage)}${metric('stats.meatSpent', stats.meatSpent)}
    </dl></details>
    <details class="statistics-fold" data-report-section="defense"><summary class="disclosure-summary">${icon('keep-damage')}${th('stats.keepLost')} · ${format(stats.keepDamage)}</summary><dl class="statistics-grid">${metric('stats.leaks', stats.leaks)}${metric('stats.keepLost', stats.keepDamage)}</dl></details></section>`;
}

export class StatisticsPanel {
  constructor(store: GameStore) {
    const dialog = document.getElementById('statistics') as HTMLDialogElement;
    const body = document.getElementById('statistics-content')!;
    const render = () => {
      const open = new Set(
        Array.from(body.querySelectorAll<HTMLDetailsElement>('details[open]')).map(
          (detail) => detail.dataset.reportSection,
        ),
      );
      const focused =
        document.activeElement?.closest<HTMLDetailsElement>('details')?.dataset.reportSection;
      const scroll = dialog.scrollTop;
      body.innerHTML = statisticsMarkup(store.state.statistics);
      for (const detail of Array.from(body.querySelectorAll<HTMLDetailsElement>('details'))) {
        detail.open = open.has(detail.dataset.reportSection);
        if (focused && detail.dataset.reportSection === focused) {
          detail.querySelector('summary')?.focus({ preventScroll: true });
        }
      }
      dialog.scrollTop = scroll;
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
