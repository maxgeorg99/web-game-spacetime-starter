import { assetUrl } from './assets';
import { audioMix, soundCues, type SoundCue } from '../shared/config/audio';
import { road } from '../shared/config';
import type { State } from '../shared/game/model';
import type { GameStore } from './store';
import type { IslandScene } from './IslandScene';

type Settings = { muted: boolean; effects: number; music: number };
type Snapshot = {
  lives: number;
  phase: State['phase'];
  wave: number;
  towers: number;
  ranks: string;
  projectiles: Set<number>;
  impacts: State['impacts'];
};
const settingsKey = 'tile-td:audio';
function readSettings(): Settings {
  const defaults = { muted: false, effects: audioMix.defaultEffects, music: audioMix.defaultMusic };
  try {
    const saved: Partial<Settings> = JSON.parse(localStorage.getItem(settingsKey) ?? '{}');
    const level = (value: unknown, fallback: number) =>
      typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, Math.min(1, value))
        : fallback;
    return {
      muted: typeof saved.muted === 'boolean' ? saved.muted : false,
      effects: level(saved.effects, defaults.effects),
      music: level(saved.music, defaults.music),
    };
  } catch {
    return defaults;
  }
}

/** Presentation-only snapshot cues: no replicated audio state or gameplay timers. */
export class GameAudio {
  private settings = readSettings();
  private unlocked = false;
  private music = new Audio(assetUrl(`audio/${audioMix.musicFile}`));
  private voices = new Map<HTMLAudioElement, number>();
  private lastCue = new Map<SoundCue, number>();
  private lastCombat = -Infinity;
  private snapshots = new Map<number, Snapshot>();
  private flights?: Set<number>;
  private error = '';

  constructor(
    private store: GameStore,
    private scene: IslandScene,
  ) {
    this.music.loop = true;
    this.music.preload = 'none';
    const mute = document.getElementById('audio-mute') as HTMLButtonElement;
    mute.onclick = () => {
      this.settings.muted = !this.settings.muted;
      this.save();
    };
    for (const channel of ['effects', 'music'] as const) {
      const input = document.getElementById(`audio-${channel}`) as HTMLInputElement;
      input.value = String(this.settings[channel] * 100);
      input.oninput = () => {
        this.settings[channel] = Number(input.value) / 100;
        this.save();
      };
    }
    const unlock = () => {
      if (!this.unlocked) {
        this.unlocked = true;
        this.mix();
      }
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (button && !button.disabled && button.id !== 'audio-mute') {
        this.play('click');
      }
    });
    document.addEventListener('visibilitychange', () => this.mix());
    window.addEventListener('blur', () => this.mix());
    window.addEventListener('focus', () => this.mix());
    window.addEventListener('pagehide', () => {
      this.music.pause();
      this.stopVoices();
    });
    store.subscribe(() => this.observe());
    this.mix();
  }
  private get audible() {
    return this.unlocked && !this.settings.muted && !document.hidden && document.hasFocus();
  }
  private save() {
    try {
      localStorage.setItem(settingsKey, JSON.stringify(this.settings));
    } catch {
      /* Optional persistence. */
    }
    this.mix();
  }
  private stopVoices() {
    for (const voice of this.voices.keys()) {
      voice.pause();
    }
    this.voices.clear();
  }
  private mix() {
    const mute = document.getElementById('audio-mute')!;
    mute.textContent = this.settings.muted ? 'Unmute sound' : 'Mute sound';
    mute.setAttribute('aria-pressed', String(this.settings.muted));
    this.music.volume = this.settings.music * audioMix.musicGain;
    if (!this.audible) {
      this.stopVoices();
    } else {
      for (const [voice, gain] of this.voices) {
        voice.volume = this.settings.effects * gain;
      }
    }
    if (this.audible && this.settings.music > 0) {
      if (this.music.paused) {
        void this.music.play().catch(() => {});
      }
    } else {
      this.music.pause();
    }
  }
  private play(cue: SoundCue, attenuation = 1, combat = false) {
    if (!this.audible || this.settings.effects <= 0 || attenuation <= 0) {
      return;
    }
    const definition = soundCues[cue],
      now = performance.now();
    if (
      now - (this.lastCue.get(cue) ?? -Infinity) < definition.cooldownMs ||
      (combat && now - this.lastCombat < audioMix.combatGapMs) ||
      this.voices.size >= audioMix.maxVoices
    ) {
      return;
    }
    this.lastCue.set(cue, now);
    if (combat) {
      this.lastCombat = now;
    }
    const voice = new Audio(assetUrl(`audio/${definition.file}`));
    const gain = definition.gain * attenuation;
    voice.volume = this.settings.effects * gain;
    this.voices.set(voice, gain);
    const release = () => this.voices.delete(voice);
    voice.onended = release;
    voice.onerror = release;
    void voice.play().catch(release);
  }
  private observe() {
    if (!this.store.ready) {
      this.snapshots.clear();
      this.flights = undefined;
      return;
    }
    const seats = this.store.online
      ? (this.store.world?.seats ?? [])
      : [{ slot: 0, state: this.store.state }];
    for (const seat of seats) {
      const state = seat.state,
        previous = this.snapshots.get(seat.slot);
      const current: Snapshot = {
        lives: state.lives,
        phase: state.phase,
        wave: state.wave,
        towers: state.towers.length,
        ranks: JSON.stringify(state.towers.map((tower) => tower.ranks)),
        projectiles: new Set(state.projectiles.map((projectile) => projectile.id)),
        impacts: state.impacts,
      };
      this.snapshots.set(seat.slot, current);
      if (!previous) {
        continue;
      } // Joining/reconnecting never replays old battles.
      const own = !this.store.online || seat.slot === this.store.ownSlot;
      if (own) {
        if (current.towers > previous.towers) {
          this.play('build');
        } else if (current.towers === previous.towers && current.ranks !== previous.ranks) {
          this.play('upgrade');
        }
        if (current.phase === 'lost' && previous.phase !== 'lost') {
          this.play('defeat');
        } else if (
          (current.wave !== previous.wave ||
            (current.phase === 'won' && previous.phase !== 'won')) &&
          previous.phase === 'combat' &&
          current.phase !== 'lost'
        ) {
          this.play('wave');
        }
      }
      if (current.lives < previous.lives) {
        this.play('keep', this.scene.soundGain(seat.slot, road[road.length - 1]));
      }
      for (const projectile of state.projectiles) {
        if (!previous.projectiles.has(projectile.id)) {
          this.play(
            projectile.art === 'rock' ? 'stone' : 'launch',
            this.scene.soundGain(seat.slot, projectile),
            true,
          );
        }
      }
      if (current.impacts !== previous.impacts && current.impacts.length) {
        const impact = current.impacts[0];
        this.play('impact', this.scene.soundGain(seat.slot, impact), true);
      }
    }
    const flights = this.store.world?.flights ?? [];
    if (this.flights) {
      for (const flight of flights) {
        if (!this.flights.has(flight.id) && flight.from === this.store.ownSlot) {
          this.play('depart');
        }
      }
    }
    this.flights = new Set(flights.map((flight) => flight.id));
    if (this.store.error && this.store.error !== this.error) {
      this.play('error');
    }
    this.error = this.store.error;
  }
}
