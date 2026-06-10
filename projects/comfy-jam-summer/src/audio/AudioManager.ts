import Phaser from "phaser";

export class AudioManager {
  private scene: Phaser.Scene;
  private enabled = true;
  private musicVolume = 0.45;
  private sfxVolume = 0.6;
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private pendingMusicKey: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  playMusic(key: string, loop = true): void {
    this.pendingMusicKey = key;
    if (!this.enabled) return;
    this.stopMusic();
    this.currentMusic = this.scene.sound.add(key, { loop, volume: this.musicVolume });
    this.currentMusic.play();
  }

  stopMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic.destroy();
      this.currentMusic = null;
    }
  }

  playSfx(key: string): void {
    if (!this.enabled) return;
    try {
      this.scene.sound.play(key, { volume: this.sfxVolume });
    } catch {
      // Sound not loaded
    }
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.currentMusic) {
      (this.currentMusic as any).setVolume?.(this.musicVolume);
    }
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
  }

  setEnabled(enabled: boolean): void {
    const wasMuted = !this.enabled;
    this.enabled = enabled;
    if (!enabled) {
      this.stopMusic();
    } else if (wasMuted && this.pendingMusicKey) {
      this.playMusic(this.pendingMusicKey);
    }
  }

  get isMuted(): boolean {
    return !this.enabled;
  }
}
