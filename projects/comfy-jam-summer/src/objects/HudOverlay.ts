import Phaser from "phaser";
import { COLORS, DEPTH, FONT } from "../config/constants";
import { BuildSystem } from "../systems/BuildSystem";

type ToolChangeHandler = (mode: string) => void;

export interface HudApi {
  updateIntel(counts: { type: string; count: number }[]): void;
}

export function buildHud(
  scene: Phaser.Scene,
  buildSystem: BuildSystem,
  onToolChange: ToolChangeHandler,
): HudApi {
  const { width, height } = scene.scale;
  const D = DEPTH.hud;

  // ---- Resources bar (top-left) ----
  // Gold icon + amount
  scene.add
    .image(24, 20, "icon-gold")
    .setOrigin(0.5)
    .setDisplaySize(24, 24)
    .setDepth(D);
  scene.add
    .text(40, 20, "120", {
      ...FONT.hud,
      color: COLORS.goldResource,
      stroke: COLORS.brownStroke,
    })
    .setOrigin(0, 0.5)
    .setDepth(D);

  // Shell icon (amount updated dynamically by GameScene).
  scene.add
    .image(100, 20, "shell-yellow")
    .setOrigin(0.5)
    .setDisplaySize(34, 34)
    .setDepth(D);

  // ---- Next-wave panel (top-left, shark-warning sign) ----
  const panelY = 110;
  const panelW = 180;
  const panelH = 140;
  const panelX = 10;

  scene.add
    .image(panelX + panelW / 2, panelY, "ui-sign")
    .setDisplaySize(panelW, panelH)
    .setDepth(D);

  scene.add
    .image(panelX + panelW, panelY - panelH / 2 + 16, "ui-phone")
    .setOrigin(0.5)
    .setDisplaySize(32, 28)
    .setDepth(D)
    .setAlpha(0.85)
    .setRotation(-0.25);

  const AVATAR_ORDER = ["paddlefish", "harpoonfish", "turtle", "snake"];
  const AVATAR_KEY: Record<string, string> = {
    paddlefish: "paddlefish-avatar",
    harpoonfish: "harpoonfish-avatar",
    turtle: "turtle-avatar",
    snake: "snake-avatar",
  };

  const cols = 2;
  const avatarSize = 48;
  const gapX = 18;
  const gapY = 0;
  const totalW = cols * avatarSize + (cols - 1) * gapX;
  const totalH =
    Math.ceil(AVATAR_ORDER.length / cols) * avatarSize +
    (Math.ceil(AVATAR_ORDER.length / cols) - 1) * gapY;
  const startX = panelX + panelW / 2 - totalW / 1.5;
  const startY = panelY - totalH / 2 + 20;

  const countTexts: Record<string, Phaser.GameObjects.Text> = {};

  for (let i = 0; i < AVATAR_ORDER.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * (avatarSize + gapX) + avatarSize / 2;
    const cy = startY + row * (avatarSize + gapY) + avatarSize / 2;

    scene.add
      .image(cx, cy, AVATAR_KEY[AVATAR_ORDER[i]])
      .setOrigin(0.5)
      .setDisplaySize(avatarSize, avatarSize)
      .setDepth(D);

    const ct = scene.add
      .text(cx + avatarSize / 2, cy, "x0", {
        ...FONT.label,
        color: COLORS.sandText,
        stroke: COLORS.blackStroke,
      })
      .setOrigin(0, 0.5)
      .setDepth(D);
    countTexts[AVATAR_ORDER[i]] = ct;
  }

  // ---- Bottom toolbar (260×120) ----
  const hudY = height - 60;
  const hudImg = scene.add
    .image(width / 2, hudY, "ui-hud")
    .setDepth(D)
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

  return {
    updateIntel(counts) {
      for (const { type, count } of counts) {
        const t = countTexts[type];
        if (t) t.setText(`x${count}`);
      }
    },
  };
}
