import * as Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { PartySelectScene } from './scenes/PartySelectScene';
import { OverworldScene } from './scenes/OverworldScene';
import { BattleScene } from './scenes/BattleScene';
import type { AssetManifest } from './types';

// Fetch manifest before creating the game so TitleScene can load assets
// synchronously inside preload() and Phaser's loader lifecycle works correctly.
fetch('/assets.json')
  .then(r => r.json() as Promise<AssetManifest>)
  .then(manifest => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.WEBGL,
      width: 1920,
      height: 1080,
      parent: 'game-container',
      backgroundColor: '#1a1a2e',
      pixelArt: true,
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: [TitleScene, PartySelectScene, OverworldScene, BattleScene],
      callbacks: {
        preBoot: (game) => {
          game.registry.set('manifest', manifest);
        },
      },
    };

    new Phaser.Game(config);
  })
  .catch(err => {
    console.error('Failed to load assets.json, starting game without manifest:', err);
    new Phaser.Game({
      type: Phaser.WEBGL,
      width: 1920,
      height: 1080,
      parent: 'game-container',
      backgroundColor: '#1a1a2e',
      pixelArt: true,
      scene: [TitleScene, PartySelectScene, OverworldScene, BattleScene],
    });
  });
