import { biomeDef, biomeIds } from '../shared/config/biomes';
import { profilePicture } from '../shared/config/auth';
import { lobbyCapacities } from '../shared/config/world';
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
  private rosterSignature = '';
  private opponentSignature = '';
  private signature = '';
  private failedPictures = new Set<string>();
  constructor(
    private store: GameStore,
    private scene: IslandScene,
    private openSend: () => void,
  ) {
    const capacityPicker = document.getElementById('capacity-picker') as HTMLDialogElement;
    document.getElementById('capacity-open')!.onclick = () => capacityPicker.showModal();
    document.getElementById('capacity-close')!.onclick = () => capacityPicker.close();
    document.getElementById('capacity-choices')!.onclick = (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        'button[data-capacity]',
      );
      if (button && !button.disabled) {
        void store.send({ type: 'set-capacity', count: Number(button.dataset.capacity) });
      }
    };
    const biomePicker = document.getElementById('biome-picker') as HTMLDialogElement;
    document.getElementById('biome-open')!.onclick = () => biomePicker.showModal();
    document.getElementById('biome-close')!.onclick = () => biomePicker.close();
    document.getElementById('biome-choices')!.onclick = (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-biome]');
      if (!button || button.disabled || !button.dataset.biome) {
        return;
      }
      void store.send({ type: 'set-biome', kind: button.dataset.biome });
    };
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
      const remove = (event.target as HTMLElement).closest<HTMLButtonElement>(
        'button[data-remove-com]',
      );
      if (remove && !remove.disabled) {
        void store.send({ type: 'remove-com', target: Number(remove.dataset.removeCom) });
        return;
      }
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
        existing && (store.world?.seats.length ?? 4) <= 4
          ? { type: 'remove-com', target: existing.slot }
          : { type: 'add-com', kind: captain.id },
      );
    };
    document.getElementById('opponent')!.onchange = (event) => {
      this.target = Number((event.target as HTMLSelectElement).value);
      this.render(true);
    };
    document.getElementById('send-cards')!.onclick = (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-send]');
      if (button?.dataset.send && !button.disabled && this.target !== null) {
        void store.send({
          type: 'send',
          kind: button.dataset.send,
          target: this.target,
          count: 1,
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
    const flightCount = world.flights.filter((flight) => flight.from === this.store.ownSlot).length;
    const signature = JSON.stringify([
      world.seats.map((seat) => [
        seat.owner,
        seat.name,
        seat.picture,
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
      this.store.world?.biome,
      this.target,
      flightCount,
      this.store.ownSlot,
    ]);
    if (!force && signature === this.signature) {
      return;
    }
    this.signature = signature;
    const host = world.seats.find((seat) => seat.owner && !seat.com)?.slot === this.store.ownSlot;
    const canManage = host && this.store.world?.round?.phase === 'lobby';
    const capacity = world.seats.length || 4;
    const capacityButton = document.getElementById('capacity-open')!;
    capacityButton.hidden = this.store.world?.round?.phase !== 'lobby';
    capacityButton.innerHTML = `${capacityArt(capacity)}<span>${th('capacity.limit', { count: capacity })}</span>`;
    const capacityPicker = document.getElementById('capacity-picker') as HTMLDialogElement;
    if (this.store.world?.round?.phase !== 'lobby' && capacityPicker.open) {
      capacityPicker.close();
    }
    document.getElementById('capacity-choices')!.innerHTML = lobbyCapacities
      .map((count) => {
        const selected = capacity === count;
        const occupied = world.seats.slice(count).some((seat) => seat.owner);
        const disabled = !canManage || !this.store.ready || this.store.pending || occupied;
        return `<button class="capacity-choice" data-capacity="${count}" aria-pressed="${selected}" ${disabled ? 'disabled' : ''}>
        ${capacityArt(count)}
        <small>${th('capacity.upTo')}</small><strong>${count}</strong><small>${th('match.capacity')}</small>
        ${selected ? '<span class="biome-selected" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="m4 10 4 4 8-8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : ''}
        ${occupied ? `<span class="capacity-locked">${th('capacity.occupied')}</span>` : ''}
      </button>`;
      })
      .join('');
    document.getElementById('capacity-status')!.textContent =
      this.store.error || (canManage ? '' : t('biome.hostOnly'));
    const selectedBiome = this.store.world?.biome ?? 'sky';
    const biomeButton = document.getElementById('biome-open') as HTMLButtonElement;
    biomeButton.hidden = this.store.world?.round?.phase !== 'lobby';
    biomeButton.innerHTML = `<img src="${assetUrl(`art/${biomeDef(selectedBiome).thumbnail}`)}" alt=""><span>${th(`biome.${selectedBiome}`)}</span>`;
    biomeButton.setAttribute('aria-label', `${t('biome.choose')}: ${t(`biome.${selectedBiome}`)}`);
    const biomePicker = document.getElementById('biome-picker') as HTMLDialogElement;
    if (this.store.world?.round?.phase !== 'lobby' && biomePicker.open) {
      biomePicker.close();
    }
    document.getElementById('biome-choices')!.innerHTML = biomeIds
      .map(
        (id) =>
          `<button class="biome-choice" data-biome="${id}" aria-pressed="${id === selectedBiome}" ${!canManage || !this.store.ready || this.store.pending ? 'disabled' : ''}>
        <img src="${assetUrl(`art/${biomeDef(id).thumbnail}`)}" alt="">
        <strong>${th(`biome.${id}`)}</strong><small>${th('biome.waves')}</small>
        ${id === selectedBiome ? `<span class="biome-selected" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="m4 10 4 4 8-8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>` : ''}
      </button>`,
      )
      .join('');
    document.getElementById('biome-status')!.textContent =
      this.store.error || (canManage ? '' : t('biome.hostOnly'));
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
        const selected =
          world.seats.length <= 4 &&
          world.seats.some(
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
        ${
          world.seats.length > 4
            ? world.seats
                .filter(
                  (seat) => seat.com && comCaptain(seat.com.captain, seat.slot).id === captain.id,
                )
                .map(
                  (seat) =>
                    `<button data-remove-com="${seat.slot}" ${!canManage || this.store.pending ? 'disabled' : ''}>${th('captain.remove')} · ${seat.slot + 1}</button>`,
                )
                .join('')
            : ''
        }
        <small>${selected ? th('captain.inSession') : th(`captain.${captain.id}.signature`)}</small>
      </article>`;
      })
      .join('');
    document.getElementById('captain-picker-status')!.textContent = this.store.error;
    document.getElementById('world-navigation')!.innerHTML = world.seats
      .filter((seat) => !this.store.world?.round || seat.owner)
      .map((seat) => {
        const fallback = assetUrl(
          `art/${seat.com ? comCaptain(seat.com.captain, seat.slot).portrait : factions[worldIslands[seat.slot].faction].avatar}.png`,
        );
        const picture = seat.owner && !seat.com ? profilePicture(seat.picture) : '';
        const photo = picture && !this.failedPictures.has(picture) ? picture : '';
        return `
      <button aria-label="${escapeHtml(seat.name ?? worldIslands[seat.slot].name)}" title="${escapeHtml(seat.name ?? worldIslands[seat.slot].name)}" data-island="${seat.slot}" class="${seat.slot === this.store.ownSlot ? 'own-island' : ''}">
        <img class="captain-avatar${photo ? ' account-photo' : ''}" src="${escapeHtml(photo || fallback)}" data-fallback="${escapeHtml(fallback)}" alt="${th('world.captainColor', { color: factions[worldIslands[seat.slot].faction].name })}" style="border-color:#${worldIslands[seat.slot].color.toString(16)}">
        <span><b>${seat.slot + 1} · ${escapeHtml(seat.name ?? worldIslands[seat.slot].name)}${seat.slot === this.store.ownSlot ? t('world.you') : ''}</b>
          <small>${seat.owner ? stat('health', seat.state.lives) : t('world.unclaimed')}</small>
        </span>
      </button>
    `;
      })
      .join('');
    document
      .querySelectorAll<HTMLImageElement>('.captain-avatar.account-photo')
      .forEach((portrait) => {
        portrait.onerror = () => {
          this.failedPictures.add(portrait.src);
          portrait.onerror = null;
          portrait.src = portrait.dataset.fallback!;
          portrait.classList.remove('account-photo');
        };
      });
    const select = document.getElementById('opponent') as HTMLSelectElement;
    const options = opponents.length
      ? opponents
          .map(
            (seat) =>
              `<option value="${seat.slot}">${seat.slot + 1} · ${escapeHtml(seat.name ?? worldIslands[seat.slot].name)}</option>`,
          )
          .join('')
      : `<option>${th('world.noOpponent')}</option>`;
    if (options !== this.opponentSignature) {
      this.opponentSignature = options;
      select.innerHTML = options;
    }
    if (this.target !== null) {
      select.value = String(this.target);
    }
    select.disabled = !opponents.length;
    const locked =
      ['lobby', 'finished'].includes(this.store.world?.round?.phase ?? '') ||
      !this.store.ready ||
      this.store.pending ||
      this.store.ownSlot === null ||
      this.target === null ||
      this.store.state.phase === 'lost' ||
      flightCount >= worldBalance.maxFlightsPerCaptain;
    const cards = document.getElementById('send-cards')!;
    // Keep buttons and scroll positions stable across server acknowledgements.
    const rosterSignature = this.store.faction;
    if (rosterSignature !== this.rosterSignature) {
      this.rosterSignature = rosterSignature;
      cards.innerHTML = recruitableUnits
        .map((unit) => {
          const label = th('world.sendUnit', { unit: unit.name, cost: unit.meatCost });
          return `<button class="action-card recruit-card" data-send="${unit.id}" aria-label="${label}" title="${label}">
          ${avatar(unit, this.store.faction)}
          <span class="recruit-card-body"><span class="card-name">${escapeHtml(unit.name)}</span>
          <span class="card-cost">${icon('meat')}${unit.meatCost}</span></span>
        </button>`;
        })
        .join('');
      document.getElementById('unit-comparison')!.innerHTML = recruitableUnits
        .map(
          (unit) =>
            `<div class="unit-comparison-row"><b>${escapeHtml(unit.name)}</b>
        <span class="unit-stats">${stat('health', unit.health)}${stat('speed', Number(unit.speed.toFixed(2)))}${stat('leak', unit.leak)}</span>
        <span class="unit-traits">${unitTraits(unit)}</span></div>`,
        )
        .join('');
    }
    for (const unit of recruitableUnits) {
      cards.querySelector<HTMLButtonElement>(`[data-send="${unit.id}"]`)!.disabled =
        locked || unit.meatCost > this.store.state.meat;
    }
    const status = this.store.pending
      ? t('world.sending')
      : !opponents.length
        ? t('world.noOpponent')
        : flightCount >= worldBalance.maxFlightsPerCaptain
          ? t('world.airshipsBusy')
          : t('world.tapToSend');
    const statusElement = document.getElementById('send-status')!;
    if (statusElement.textContent !== status) {
      statusElement.textContent = status;
    }
    document.getElementById('send-capacity')!.textContent = t('world.airshipCapacity', {
      count: flightCount,
      max: worldBalance.maxFlightsPerCaptain,
    });
  }
}

/** Small archipelago diagrams make the three lobby sizes recognizable without extra copy. */
function capacityArt(count: number): string {
  const columns = count === 4 ? 2 : 4;
  const rows = count / columns;
  const colors = ['#779a82', '#c3af70', '#b78370', '#9789ad'];
  const islands = Array.from({ length: count }, (_, i) => {
    const x = 90 + ((i % columns) - (columns - 1) / 2) * 35;
    const y = 58 + (Math.floor(i / columns) - (rows - 1) / 2) * 23;
    return `<g transform="translate(${x} ${y})"><path d="m-13 0 13 7 13-7-4 10-9 4-9-4z" fill="#6e7568"/><path d="m-13 0 13-7 13 7-13 7z" fill="${colors[i % 4]}"/><path d="m-6 0 6-3 6 3" fill="none" stroke="#ebe1bc" stroke-width="2"/></g>`;
  }).join('');
  return `<svg class="capacity-art" viewBox="0 0 180 120" aria-hidden="true"><rect x="2" y="2" width="176" height="116" rx="10" fill="#e4e9dd"/><path d="M15 30h25m105 60h20M25 95h20" stroke="#f7f6eb" stroke-width="4" stroke-linecap="round"/>${islands}</svg>`;
}
