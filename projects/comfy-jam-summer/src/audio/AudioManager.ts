export class AudioManager {
  private scene: { sound: Phaser.Sound.BaseSoundManager | { play(_k: string): void; add(_k: string): void } };
  private loaded: Set<string> = new Set();
  private enabled = true;
  private volume = 1.0;

  constructor(scene: { sound: Phaser.Sound.BaseSoundManager | { play: (_k: string) => void; add: (_k: string) => void } }) {
    this.scene = scene;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  play(key: string): void {
    if (!this.enabled) return;
    try {
      this.scene.sound.play(key, { volume: this.volume });
    } catch {
      // Sound not loaded — silently skip
    }
  }

  playSfx(key: string): void {
    this.play(key);
  }

  preload(key: string): void {
    if (!this.loaded.has(key)) {
      try {
        this.scene.sound.add(key);
        this.loaded.add(key);
      } catch {
        // Not yet loaded
      }
    }
  }
}
