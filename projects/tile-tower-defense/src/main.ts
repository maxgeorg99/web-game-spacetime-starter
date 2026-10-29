import { SessionMenu } from './session-menu';
import { GameAudio } from './audio';
import Phaser from 'phaser';
import { validateCatalog } from '../shared/config';
import { GameStore } from './store';
import { IslandScene } from './IslandScene';
import { UI } from './ui';
import './style.css';
validateCatalog();
const store = new GameStore(),
  scene = new IslandScene(store);
new UI(store, scene);
new GameAudio(store, scene);
new SessionMenu(store);
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',

  backgroundColor: '#c6d3d6',
  // Smooth high-resolution text; individual pixel-art textures opt into nearest filtering.
  pixelArt: false,
  antialias: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE },
  scene: [scene],
  banner: false,
});
