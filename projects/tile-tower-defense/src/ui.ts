import { t, th, escapeHtml } from './i18n';
import { waves, unitDef } from './i18n/content';
import { WorldUI } from './world-ui';
import { balance } from '../shared/config';
import { income, sameCell } from '../shared/game/rules';
import type { Point } from '../shared/game/model';
import type { GameStore } from './store';
import type { IslandScene } from './IslandScene';
import { buildCards, draftCards, towerPanel, catalogContent, icon, avatar } from './views';

const element = (id: string) => document.getElementById(id)!;
const button = (id: string) => element(id) as HTMLButtonElement;

/** DOM controls issue commands; every displayed number comes from the current snapshot. */
export class UI {
  private selected?: Point;
  private draftKind?: string;
  private buildKind?: string;
  private tab: 'build' | 'send' = 'build';
  private worldUI: WorldUI;
  private signature = '';
  private database?: string;

  constructor(
    private store: GameStore,
    private scene: IslandScene,
  ) {
    this.worldUI = new WorldUI(store, scene, () => {
      this.tab = 'send';
      this.buildKind = undefined;
      this.closeSelection();
    });
    button('dock-toggle').onclick = () => {
      const collapsed = document.body.classList.toggle('dock-collapsed');
      button('dock-toggle').setAttribute('aria-expanded', String(!collapsed));
      button('dock-toggle').textContent = t(
        collapsed ? 'layout.showActions' : 'layout.hideActions',
      );
    };
    button('tab-send').onclick = () => {
      this.tab = 'send';
      this.buildKind = undefined;
      this.closeSelection();
    };
    scene.onSelect = (point) => this.selectCell(point);
    store.subscribe(() => this.render());
    button('start').onclick = () => {
      const ended = ['won', 'lost'].includes(store.state.phase);
      void store.send({ type: ended ? 'restart' : 'start' });
    };
    element('build-tray').onclick = (event) => {
      const target = this.clickedButton(event);
      if (target?.dataset.build) {
        this.buildKind = target.dataset.build;
        this.closeSelection();
      }
    };
    element('selection').onclick = (event) => {
      const target = this.clickedButton(event);
      const tower = store.state.towers.find(
        (tower) => this.selected && sameCell(tower, this.selected),
      );
      if (!target || !tower) {
        return;
      }
      if (target.dataset.node) {
        void store.send({ type: 'upgrade', tower: tower.id, node: target.dataset.node });
      }
      if (target.dataset.sell) {
        void store.send({ type: 'sell', tower: tower.id });
      }
    };
    element('draft-cards').onclick = (event) => {
      const target = this.clickedButton(event);
      if (target?.dataset.tile) {
        this.draftKind = target.dataset.tile;
        this.render(true);
      }
    };
    button('tab-build').onclick = () => {
      this.tab = 'build';
      this.render(true);
    };
    button('selection-close').onclick = () => this.closeSelection();
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.buildKind = undefined;
        this.draftKind = undefined;
        this.closeSelection();
      }
    });
    const dialog = element('catalog') as HTMLDialogElement;
    button('catalog-open').onclick = () => dialog.showModal();
    button('catalog-close').onclick = () => dialog.close();
    element('catalog-content').innerHTML = catalogContent();
    this.render(true);
  }

  private clickedButton(event: MouseEvent) {
    return (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  }

  private closeSelection() {
    this.selected = undefined;
    this.scene.clearSelection();
    this.render(true);
  }

  private selectCell(point: Point) {
    this.selected = point;
    const state = this.store.state;
    const tower = state.towers.find((tower) => sameCell(tower, point));
    if (tower) {
      this.buildKind = undefined;
    } else if (state.phase === 'draft' && this.draftKind) {
      void this.store.send({ type: 'expand', kind: this.draftKind, ...point });
    } else if (this.buildKind) {
      void this.store.send({ type: 'build', kind: this.buildKind, ...point });
    }
    this.render(true);
  }

  render(force = false) {
    if (this.database !== this.store.destination?.database) {
      this.database = this.store.destination?.database;
      this.selected = undefined;
      this.draftKind = undefined;
      this.buildKind = undefined;
      this.signature = '';
      this.tab = 'build';
    }
    const state = this.store.state;
    element('connection').textContent = this.store.status;
    element('notice').textContent = this.store.error;
    element('resources').innerHTML = `
      <span title="${th('hud.health')}">${icon('health')}<b>${state.lives}</b><small>/${balance.keepHealth}</small></span>
      <span title="${th('hud.gold')}">${icon('gold')}<b>${state.gold}</b></span>
      <span title="${th('hud.meat')}">${icon('meat')}<b>${state.meat}</b></span>
    `;
    element('army-count').textContent =
      state.phase === 'combat'
        ? t('hud.armies', {
            invaders: t('count.invaders', { count: state.enemies.length }),
            defenders: t('count.defenders', { count: state.recruits.length }),
          })
        : t('count.defenderCapacity', {
            count: state.recruits.length,
            capacity: balance.maxRecruits,
          });

    // Combat positions change at 10 Hz, but controls only redraw when their inputs change.
    const signature = JSON.stringify([
      state.phase,
      state.wave,
      state.gold,
      state.meat,
      state.recruits.length,
      state.towers.map((tower) => [tower.id, tower.ranks]),
      state.tiles,
      this.selected,
      this.draftKind,
      this.buildKind,
      this.tab,
      this.store.ownSlot,
      this.store.ready,
      this.store.pending,
    ]);
    if (!force && signature === this.signature) {
      return;
    }
    this.signature = signature;
    const locked =
      !this.store.ready || this.store.pending || (this.store.online && this.store.ownSlot === null);
    const ended = state.phase === 'won' || state.phase === 'lost';
    const wave = waves[Math.min(state.wave, waves.length - 1)];
    element('wave-number').textContent = t('wave.number', {
      number: Math.min(state.wave + 1, waves.length),
      total: waves.length,
    });
    element('phase').textContent = t(`phase.${state.phase}`);
    element('wave-title').textContent =
      state.phase === 'won'
        ? t('wave.defended')
        : state.phase === 'lost'
          ? t('wave.destroyed')
          : wave.name;
    element('wave-description').textContent = ended
      ? t('wave.result', { count: state.kills })
      : wave.description;
    element('wave-units').innerHTML = wave.groups
      .map((group) => {
        const unit = unitDef(group.unit);
        return `
        <div class="wave-unit">${avatar(unit)}
          <span><b>${group.count} × ${escapeHtml(unit.name)}</b><small>${th('wave.unitStats', { health: Math.round(unit.health * wave.healthMultiplier), damage: unit.leak })}</small></span>
        </div>
      `;
      })
      .join('');
    button('start').disabled = locked || !['prepare', 'won', 'lost'].includes(state.phase);
    button('start').textContent = ended
      ? t('wave.restart')
      : state.phase === 'combat'
        ? t('wave.defending')
        : state.phase === 'draft'
          ? t('wave.placeTile')
          : t('wave.start');

    const hints = {
      prepare: this.buildKind ? t('hint.placeTower') : t('hint.chooseTower'),
      combat: t('hint.combat'),
      draft: this.draftKind ? t('hint.placeTile') : t('hint.chooseTile'),
      won: t('hint.won'),
      lost: t('hint.lost'),
    };
    element('instruction').textContent = this.tab === 'send' ? t('hint.send') : hints[state.phase];
    const tower = state.towers.find((tower) => this.selected && sameCell(tower, this.selected));
    element('selection-panel').hidden = !tower || state.phase === 'draft';
    element('selection').innerHTML = tower
      ? towerPanel(state, tower, locked, this.store.faction)
      : '';
    element('draft').hidden = state.phase !== 'draft';
    element('action-dock').hidden = state.phase === 'draft' || ended;
    if (state.phase !== 'draft') {
      this.draftKind = undefined;
    }
    element('draft-cards').innerHTML = draftCards(state, this.draftKind, locked);
    element('build-tray').innerHTML = buildCards(state, this.buildKind, locked, this.store.faction);
    element('build-tray').hidden = this.tab !== 'build';
    element('send-tray').hidden = this.tab !== 'send';
    this.worldUI.render();
    for (const tab of ['build', 'send'] as const) {
      button(`tab-${tab}`).classList.toggle('active', this.tab === tab);
      button(`tab-${tab}`).setAttribute('aria-pressed', String(this.tab === tab));
    }
    const earned = income(state);
    element('income').textContent = t('hud.income', { gold: earned.gold, meat: earned.meat });
  }
}
