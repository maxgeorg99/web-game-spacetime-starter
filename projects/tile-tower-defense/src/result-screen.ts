import { matchOutcome } from '../shared/game/outcome';
import { comCaptain } from '../shared/config/com';
import { factions } from '../shared/config/factions';
import { waves } from '../shared/config/waves';
import { worldIslands } from '../shared/config/world';
import { assetUrl } from './assets';
import { t } from './i18n';
import type { GameStore } from './store';

/** Replicated outcome only; the overlay remains readable even after world cleanup disconnects. */
export class ResultScreen {
  private shown = '';
  constructor(store: GameStore) {
    const dialog = document.getElementById('match-result') as HTMLDialogElement;
    const spectate = document.getElementById('result-spectate') as HTMLButtonElement;
    document.getElementById('result-sessions')!.onclick = () => {
      dialog.close();
      store.leave();
    };
    spectate.onclick = () => dialog.close();
    dialog.addEventListener('cancel', (event) => {
      if (spectate.hidden) {
        event.preventDefault();
      }
    });
    store.subscribe(() => {
      if (!store.destination) {
        this.shown = '';
        dialog.close();
        return;
      }
      if (!store.ready) {
        return;
      }
      const outcome = matchOutcome(store.world, store.ownSlot);
      if (!outcome) {
        return;
      }
      const finished = store.world?.round?.phase === 'finished';
      const key = `${store.destination.database}:${outcome}:${finished}`;
      if (key === this.shown) {
        return;
      }
      this.shown = key;
      const seat = store.world!.seats[store.ownSlot!];
      dialog.dataset.outcome = outcome;
      document.getElementById('result-title')!.textContent = t(`result.${outcome}`);
      document.getElementById('result-message')!.textContent = t(
        finished ? 'result.finished' : 'result.eliminated',
      );
      document.getElementById('result-stats')!.textContent = t('result.stats', {
        waves: seat.cycles * waves.length + seat.state.wave,
        kills: seat.state.kills,
      });
      const portrait = document.getElementById('result-portrait') as HTMLImageElement;
      portrait.src = assetUrl(
        `art/${seat.com ? comCaptain(seat.com.captain, seat.slot).portrait : factions[worldIslands[seat.slot].faction].avatar}.png`,
      );
      portrait.alt = seat.name ?? '';
      spectate.hidden = !!finished;
      for (const other of Array.from(
        document.querySelectorAll<HTMLDialogElement>('dialog[open]'),
      )) {
        if (other !== dialog) {
          other.close();
        }
      }
      if (!dialog.open) {
        dialog.showModal();
      }
    });
  }
}
