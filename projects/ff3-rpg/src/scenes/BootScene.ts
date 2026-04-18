import * as Phaser from 'phaser';
import type { AssetManifest } from '../types';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    const loadingText = this.add.text(cx, cy - 60, 'Loading...', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Progress bar background
    this.add.rectangle(cx, cy + 20, 600, 40, 0x333333);
    const barFill = this.add.rectangle(cx - 298, cy + 20, 0, 32, 0x44aa44).setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      barFill.width = 596 * value;
    });

    this.load.on('complete', () => {
      const manifest = this.registry.get('manifest') as AssetManifest | undefined;
      const total = manifest
        ? manifest.images.length + manifest.spritesheets.length + manifest.audio.length
        : 0;
      loadingText.setText(`${total} assets loaded`);
      console.log(`Boot complete — ${total} assets loaded`);
    });

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
    const { width } = this.scale;
    const cx = width / 2;

    this.add.text(cx, 80, 'CRYSTAL LEGENDS', {
      fontFamily: 'monospace',
      fontSize: '42px',
      color: '#ffdd88',
    }).setOrigin(0.5);

    // Auto-transition to TitleScene after 1.5 seconds
    this.time.delayedCall(1500, () => this.scene.start('TitleScene'));
  }
}
