import * as Phaser from 'phaser';
import type { AssetManifest } from '../types';

export class TitleScene extends Phaser.Scene {
  private music!: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound;

  constructor() {
    super('TitleScene');
  }

  preload(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Loading UI
    const loadingText = this.add.text(cx, cy - 60, 'Loading...', {
      fontFamily: 'monospace', fontSize: '48px', color: '#ffffff',
    }).setOrigin(0.5);

    this.add.rectangle(cx, cy + 20, 600, 40, 0x333333);
    const barFill = this.add.rectangle(cx - 298, cy + 20, 0, 32, 0x44aa44).setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      barFill.width = 596 * value;
    });
    this.load.on('complete', () => {
      loadingText.destroy();
      barFill.destroy();
    });

    // Load all assets from manifest
    const manifest = this.registry.get('manifest') as AssetManifest | undefined;
    if (!manifest) {
      console.warn('No manifest found in registry — assets will not load');
      return;
    }

    for (const entry of manifest.images) {
      this.load.image(entry.key, entry.path);
    }
    for (const entry of manifest.spritesheets) {
      this.load.spritesheet(entry.key, entry.path, {
        frameWidth: entry.frameWidth,
        frameHeight: entry.frameHeight,
      });
    }
    for (const entry of manifest.audio) {
      this.load.audio(entry.key, [entry.path]);
    }
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Background
    this.add.image(cx, height / 2, 'title_bg').setDisplaySize(width, height);

    // Title
    this.add.text(cx, 220, 'CRYSTAL LEGENDS', {
      fontFamily: 'monospace',
      fontSize: '72px',
      color: '#ffdd88',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(cx, 320, 'A Pixel Art RPG', {
      fontFamily: 'monospace', fontSize: '28px', color: '#aaaaff',
    }).setOrigin(0.5);
    this.tweens.add({ targets: subtitle, alpha: 0.3, duration: 1200, yoyo: true, repeat: -1 });

    // Press ENTER
    const pressText = this.add.text(cx, 820, 'Press ENTER to Begin', {
      fontFamily: 'monospace', fontSize: '36px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.tweens.add({ targets: pressText, alpha: 0.1, duration: 800, yoyo: true, repeat: -1 });

    // Music
    this.music = this.sound.add('music_title', { loop: true, volume: 0.6 });
    this.music.play();

    let transitioning = false;
    const startGame = () => {
      if (transitioning) return;
      transitioning = true;
      this.music.stop();
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('PartySelectScene');
      });
    };

    this.input.keyboard!.on('keydown-ENTER', startGame);
    this.input.on('pointerdown', startGame);
  }
}
