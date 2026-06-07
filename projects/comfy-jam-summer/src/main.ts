import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { GameScene } from "./scenes/GameScene";

// Deterministic test mode via URL flag ?test=1
const isTestMode = new URLSearchParams(window.location.search).has("test");

if (isTestMode) {
  // Seed RNG so spawns, drops, liar mechanic produce identical output
  Phaser.Math.RND.sow(["sandcastle-td-test-seed-2026"]);
  // Disable dialog (would block automated input)
  (window as any).__DIALOG_DISABLED = true;
  // Disable weapon wheel (would steal focus from pointer input)
  (window as any).__WEAPON_WHEEL_DISABLED = true;
  // Expose test seam for state assertions
  (window as any).__TEST__ = { ready: false, frameCount: 0 };
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#1a3a5c",
  smoothPixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, GameScene],
};

new Phaser.Game(config);
