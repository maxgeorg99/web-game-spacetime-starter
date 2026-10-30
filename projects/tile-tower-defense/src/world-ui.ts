import { t, th, escapeHtml } from './i18n';
import { assetUrl } from './assets';
import { recruitableUnits, factions, worldIslands, unitDef } from './i18n/content';
import { worldBalance } from '../shared/config/world';
import type { GameStore } from './store';
import type { IslandScene } from './IslandScene';
import { avatar, icon } from './views';

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
        seat.state.lives,
        seat.state.phase,
        seat.state.wave,
      ]),
      world.flights.map((flight) => [flight.id, flight.remaining, Math.floor(flight.elapsed)]),
      this.store.state.meat,
      this.store.pending,
      this.store.ready,
      this.target,
      this.count,
      this.store.ownSlot,
    ]);
    if (!force && signature === this.signature) {
      return;
    }
    this.signature = signature;
    document.getElementById('world-navigation')!.innerHTML = world.seats
      .map(
        (seat) => `
      <button aria-label="${escapeHtml(seat.name ?? worldIslands[seat.slot].name)}" title="${escapeHtml(seat.name ?? worldIslands[seat.slot].name)}" data-island="${seat.slot}" class="${seat.slot === this.store.ownSlot ? 'own-island' : ''}">
        <img class="captain-avatar" src="${assetUrl(`art/${factions[worldIslands[seat.slot].faction].avatar}.png`)}" alt="${th('world.captainColor', { color: factions[worldIslands[seat.slot].faction].name })}" style="border-color:#${worldIslands[seat.slot].color.toString(16)}">
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
      !this.store.ready ||
      this.store.pending ||
      this.store.ownSlot === null ||
      this.target === null ||
      this.store.state.phase === 'lost';
    document.getElementById('send-cards')!.innerHTML = recruitableUnits
      .map((unit) => {
        const cost = unit.meatCost * this.count;
        return `<button class="action-card" data-send="${unit.id}" ${locked || cost > this.store.state.meat ? 'disabled' : ''} title="${th('world.sendTitle', { troops: t('count.troops', { count: this.count }), unit: unit.name, damage: unit.leak })}">
        ${avatar(unit, this.store.faction)}<span class="card-name">${escapeHtml(unit.name)}</span><span class="unit-stats">${th('world.unitStats', { health: unit.health, damage: unit.leak })}<br>${th('world.speed', { speed: unit.speed.toFixed(2) })}</span><span class="card-cost">${icon('meat')}${cost}</span>
      </button>`;
      })
      .join('');
    const flights = world.flights.filter(
      (flight) => flight.from === this.store.ownSlot || flight.to === this.store.ownSlot,
    );
    document.getElementById('flight-status')!.textContent =
      flights
        .map((flight) => {
          const inbound = flight.to === this.store.ownSlot;
          const destination = worldIslands[inbound ? flight.from : flight.to].name;
          const time = Math.max(0, Math.ceil(worldBalance.flightSeconds - flight.elapsed));
          return t(inbound ? 'flight.incoming' : 'flight.outgoing', {
            destination,
            troops: t('count.troops', { count: flight.remaining }),
            unit: unitDef(flight.unit).name,
            arrival: time ? t('flight.seconds', { seconds: time }) : t('flight.landing'),
          });
        })
        .join(' / ') ||
      (!opponents.length
        ? t('world.waiting')
        : t('count.unitsPerAirship', { count: this.count, seconds: worldBalance.flightSeconds }));
  }
}
