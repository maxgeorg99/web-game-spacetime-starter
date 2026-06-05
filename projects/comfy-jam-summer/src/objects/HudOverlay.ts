import Phaser from "phaser";
import { BuildSystem } from "../systems/BuildSystem";

type ToolChangeHandler = (mode: string) => void;

export function buildHud(
  scene: Phaser.Scene,
  buildSystem: BuildSystem,
  onToolChange: ToolChangeHandler,
): void {
  const { width, height } = scene.scale;

  // ---- Resources bar (top-left) ----
  // Gold icon + amount
  scene.add.image(24, 20, "icon-gold").setOrigin(0.5).setDisplaySize(24, 24).setDepth(10);
  scene.add
    .text(40, 20, "120", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "16px",
      color: "#e0c070",
      stroke: "#3a2a10",
      strokeThickness: 3,
    })
    .setOrigin(0, 0.5)
    .setDepth(10);

  // Shell icon + amount
  scene.add.image(100, 20, "shell-yellow").setOrigin(0.5).setDisplaySize(24, 24).setDepth(10);
  scene.add
    .text(116, 20, "15", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "16px",
      color: "#e0d0a0",
      stroke: "#3a2a10",
      strokeThickness: 3,
    })
    .setOrigin(0, 0.5)
    .setDepth(10);

  // ---- Next-wave panel (top-left) ----
  const panelY = 60;
  const panelW = 110;
  const panelH = 52;

  scene.add
    .graphics()
    .fillStyle(0x1a2a1a, 0.7)
    .fillRoundedRect(10, panelY - panelH / 2, panelW, panelH, 6)
    .lineStyle(1, 0x4a7a4a, 0.6)
    .strokeRoundedRect(10, panelY - panelH / 2, panelW, panelH, 6)
    .setDepth(10);

  scene.add
    .text(16, panelY - 12, "NEXT WAVE", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "10px",
      color: "#6aaa6a",
    })
    .setDepth(10);

  scene.add
    .image(38, panelY + 15, "paddlefish-avatar")
    .setOrigin(0.5)
    .setDisplaySize(36, 36)
    .setDepth(10);

  scene.add
    .text(54, panelY + 6, "x6", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#e0d0a0",
      stroke: "#1a3a5c",
      strokeThickness: 3,
    })
    .setOrigin(0, 0.5)
    .setDepth(10);

  // ---- Bottom toolbar (260×120) ----
  const hudY = height - 60;
  const hudImg = scene.add
    .image(width / 2, hudY, "ui-hud")
    .setDepth(10)
    .setInteractive({ useHandCursor: true });

  const TOOL_REGIONS = [
    { limit: 87, mode: "build-tower", label: "build tower" },
    { limit: 174, mode: "build-wall", label: "build wall" },
    { limit: 260, mode: "destroy", label: "destroy" },
  ];

  hudImg.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
    const localX = pointer.x - (width / 2 - 130);
    for (const region of TOOL_REGIONS) {
      if (localX < region.limit) {
        buildSystem.setToolMode(region.mode as any);
        onToolChange(region.label);
        return;
      }
    }
  });
}
