import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { MapScene } from "./scenes/MapScene";
import { CombatScene } from "./scenes/CombatScene";
import { RewardScene } from "./scenes/RewardScene";
import { TutorialScene } from "./scenes/TutorialScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#0a0a0a",
  smoothPixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    TitleScene,
    MapScene,
    CombatScene,
    RewardScene,
    TutorialScene,
  ],
};

new Phaser.Game(config);
