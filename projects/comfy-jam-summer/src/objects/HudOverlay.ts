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
  scene.add
    .image(24, 20, "icon-gold")
    .setOrigin(0.5)
    .setDisplaySize(24, 24)
    .setDepth(10);
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
  scene.add
    .image(100, 20, "shell-yellow")
    .setOrigin(0.5)
    .setDisplaySize(34, 34)
    .setDepth(10);
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

  // ---- Next-wave panel (top-left, shark-warning sign) ----
  const panelY = 110;
  const panelW = 180;
  const panelH = 140;
  const panelX = 10;

  // Warning sign background image.
  scene.add
    .image(panelX + panelW / 2, panelY, "ui-sign")
    .setDisplaySize(panelW, panelH)
    .setDepth(10);

  // Small phone icon top-right, slightly rotated for playfulness.
  scene.add
    .image(panelX + panelW, panelY - panelH / 2 + 16, "ui-phone")
    .setOrigin(0.5)
    .setDisplaySize(32, 28)
    .setDepth(10)
    .setAlpha(0.85)
    .setRotation(-0.25);

  const avatars: { key: string; count: number }[] = [
    { key: "paddlefish-avatar", count: 3 },
    { key: "harpoonfish-avatar", count: 2 },
    { key: "turtle-avatar", count: 1 },
    { key: "snake-avatar", count: 4 },
  ];

  const cols = 2;
  const avatarSize = 48;
  const gapX = 18;
  const gapY = 0;
  const totalW = cols * avatarSize + (cols - 1) * gapX;
  const totalH =
    Math.ceil(avatars.length / cols) * avatarSize +
    (Math.ceil(avatars.length / cols) - 1) * gapY;
  const startX = panelX + panelW / 2 - totalW / 1.5;
  const startY = panelY - totalH / 2 + 20;

  for (let i = 0; i < avatars.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * (avatarSize + gapX) + avatarSize / 2;
    const cy = startY + row * (avatarSize + gapY) + avatarSize / 2;

    scene.add
      .image(cx, cy, avatars[i].key)
      .setOrigin(0.5)
      .setDisplaySize(avatarSize, avatarSize)
      .setDepth(10);

    scene.add
      .text(cx + avatarSize / 2 + 4, cy, `x${avatars[i].count}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#e0d0a0",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setDepth(10);
  }

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
