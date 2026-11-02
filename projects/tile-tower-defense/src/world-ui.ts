import { comCaptains, comCaptain } from '../shared/config/com';
import { t, th, escapeHtml } from './i18n';
import { assetUrl } from './assets';
import { recruitableUnits, factions, worldIslands } from './i18n/content';
import { worldBalance } from '../shared/config/world';
import type { GameStore } from './store';
import type { IslandScene } from './IslandScene';
import { avatar, icon, stat, unitTraits } from './views';

/** World navigation never changes whose island the HUD commands control. */
export class WorldUI {
  target: number | null = null;
  count = 1;
  private signature = '';
  constructor(
    private store: GameStore,
    private scene: IslandScene,
    private openSend: () => void,
  ) {
    const navigation = document.getElementById('world-navigation')!;
    navigation.hidden = !store.online;
    document.getElementById('world-controls')!.hidden = !store.online;
    scene.onInspect = (slot) => {
      if (store.world?.seats[slot]?.owner && slot !== store.ownSlot) {
        this.target = slot;
        this.openSend();
        this.render(true);
      }
    };
    navigation.onclick = (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        'button[data-island]',
      );
      if (!button) {
        return;
      }
      const slot = Number(button.dataset.island);
      scene.focusIsland(slot);
      if (slot !== store.ownSlot && store.world?.seats[slot]?.owner) {
        this.target = slot;
      }
      this.render(true);
    };
    document.getElementById('world-home')!.onclick = () => scene.focusIsland(store.ownSlot ?? 0);
    document.getElementById('world-overview')!.onclick = () => scene.overview();
    const picker = document.getElementById('captain-picker') as HTMLDialogElement;
    document.getElementById('add-com')!.onclick = () => {
      this.render(true);
      picker.showModal();
    };
    document.getElementById('captain-picker-close')!.onclick = () => picker.close();
    document.getElementById('captain-choices')!.onclick = (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        'button[data-captain]',
      );
      if (!button || button.disabled) {
        return;
      }
      const captain = comCaptains.find((captain) => captain.id === button.dataset.captain);
      if (!captain) {
        return;
      }
      const existing = store.world?.seats.find(
        (seat) => seat.com && comCaptain(seat.com.captain, seat.slot).id === captain.id,
      );
      void store.send(
        existing
          ? { type: 'remove-com', target: existing.slot }
          : { type: 'add-com', kind: captain.id },
      );
    };
    document.getElementById('opponent')!.onchange = (event) => {
      this.target = Number((event.target as HTMLSelectElement).value);
      this.render(true);
    };
    document.getElementById('passengers')!.onchange = (event) => {
      const value = Number((event.target as HTMLInputElement).value);
      this.count = Number.isInteger(value)
        ? Math.max(1, Math.min(worldBalance.maxFlightUnits, value))
        : 1;
      (event.target as HTMLInputElement).value = String(this.count);
      this.render(true);
    };
    document.getElementById('send-cards')!.onclick = (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-send]');
      if (button?.dataset.send && this.target !== null) {
        void store.send({
          type: 'send',
          kind: button.dataset.send,
          target: this.target,
          count: this.count,
        });
      }
    };
    store.subscribe(() => this.render());
    this.render();
  }
  render(force = false) {
    const world = this.store.world ?? { seats: [], flights: [] };
    const opponents = world.seats.filter(
      (seat) => seat.owner && seat.slot !== this.store.ownSlot && seat.state.phase !== 'lost',
    );
    if (!opponents.some((seat) => seat.slot === this.target)) {
      this.target = opponents[0]?.slot ?? null;
    }
    const signature = JSON.stringify([
      world.seats.map((seat) => [
        seat.owner,
        seat.name,
        seat.com?.captain,
        !!seat.com,
        seat.state.lives,
        seat.state.phase,
        seat.state.wave,
      ]),
      this.store.state.meat,
      this.store.pending,
      this.store.error,
      this.store.ready,
      this.store.world?.round?.phase,
      this.target,
      this.count,
      this.store.ownSlot,
    ]);
    if (!force && signature === this.signature) {
      return;
    }
    this.signature = signature;
    const host = world.seats.find((seat) => seat.owner && !seat.com)?.slot === this.store.ownSlot;
    const canManage = host && this.store.world?.round?.phase === 'lobby';
    const addCom = document.getElementById('add-com') as HTMLButtonElement;
    addCom.hidden = !canManage;
    addCom.disabled = !this.store.ready || this.store.pending;
    const picker = document.getElementById('captain-picker') as HTMLDialogElement;
    if (!canManage && picker.open) {
      picker.close();
    }
    const full = world.seats.every((seat) => seat.owner);
    document.getElementById('captain-choices')!.innerHTML = comCaptains
      .map((captain) => {
        const selected = world.seats.some(
          (seat) => seat.com && comCaptain(seat.com.captain, seat.slot).id === captain.id,
        );
        const disabled =
          !canManage || !this.store.ready || this.store.pending || (!selected && full);
        return `<article class="captain-choice ${selected ? 'selected' : ''}" data-personality="${captain.id}">
        <div class="captain-portrait-stage"><img src="${assetUrl(`art/${captain.portrait}.png`)}" alt="${escapeHtml(captain.name)}"></div>
        <h3>${escapeHtml(captain.name)}</h3>
        <strong class="captain-playstyle">${th(`captain.${captain.id}.style`)}</strong>
        <p>${th(`captain.${captain.id}.description`)}</p>
        <button data-captain="${captain.id}" ${disabled ? 'disabled' : ''} aria-label="${th(selected ? 'match.removeNamedCom' : 'captain.addNamed', { name: captain.name })}">${th(selected ? 'captain.remove' : full ? 'captain.full' : 'captain.add')}</button>
        <small>${selected ? th('captain.inSession') : th(`captain.${captain.id}.signature`)}</small>
      </article>`;
      })
      .join('');
    document.getElementById('captain-picker-status')!.textContent = this.store.error;
    document.getElementById('world-navigation')!.innerHTML = world.seats
      .filter((seat) => !this.store.world?.round || seat.owner)
      .map(
        (seat) => `
      <button aria-label="${escapeHtml(seat.name ?? worldIslands[seat.slot].name)}" title="${escapeHtml(seat.name ?? worldIslands[seat.slot].name)}" data-island="${seat.slot}" class="${seat.slot === this.store.ownSlot ? 'own-island' : ''}">
        <img class="captain-avatar" src="${assetUrl(`art/${seat.com ? comCaptain(seat.com.captain, seat.slot).portrait : factions[worldIslands[seat.slot].faction].avatar}.png`)}" alt="${th('world.captainColor', { color: factions[worldIslands[seat.slot].faction].name })}" style="border-color:#${worldIslands[seat.slot].color.toString(16)}">
        <span><b>${escapeHtml(seat.name ?? worldIslands[seat.slot].name)}${seat.slot === this.store.ownSlot ? t('world.you') : ''}</b>
          <small>${seat.owner ? th('world.healthStatus', { health: seat.state.lives, status: seat.state.phase === 'combat' ? t('world.fighting') : seat.state.phase === 'lost' ? t('world.defeated') : t('world.preparing') }) : t('world.unclaimed')}</small>
        </span>
      </button>
    `,
      )
      .join('');
    const select = document.getElementById('opponent') as HTMLSelectElement;
    select.innerHTML = opponents.length
      ? opponents
          .map(
            (seat) =>
              `<option value="${seat.slot}" ${seat.slot === this.target ? 'selected' : ''}>${escapeHtml(seat.name ?? worldIslands[seat.slot].name)}</option>`,
          )
          .join('')
      : `<option>${th('world.noOpponent')}</option>`;
    select.disabled = !opponents.length;
    const locked =
      ['lobby', 'finished'].includes(this.store.world?.round?.phase ?? '') ||
      !this.store.ready ||
      this.store.pending ||
      this.store.ownSlot === null ||
      this.target === null ||
      this.store.state.phase === 'lost';
    document.getElementById('send-cards')!.innerHTML = recruitableUnits
      .map((unit) => {
        const cost = unit.meatCost * this.count;
        return `<button class="action-card" data-send="${unit.id}" ${locked || cost > this.store.state.meat ? 'disabled' : ''} title="${th('world.sendTitle', { troops: t('count.troops', { count: this.count }), unit: unit.name, damage: unit.leak })}">
        ${avatar(unit, this.store.faction)}<span class="card-name">${escapeHtml(unit.name)}</span><span class="unit-stats">${stat('health', `${unit.health} HP`)}${stat('leak', `${unit.leak} DMG`)}</span><span class="unit-traits">${unitTraits(unit)}</span><span class="card-cost">${icon('meat')}${cost}</span>
      </button>`;
      })
      .join('');
    document.getElementById('unit-comparison')!.innerHTML = recruitableUnits
      .map(
        (unit) =>
          `<div class="unit-comparison-row"><b>${escapeHtml(unit.name)}</b><span class="unit-stats">${stat('health', unit.health)}${stat('speed', Number(unit.speed.toFixed(2)))}${stat('leak', unit.leak)}</span></div>`,
      )
      .join('');
  }
}
