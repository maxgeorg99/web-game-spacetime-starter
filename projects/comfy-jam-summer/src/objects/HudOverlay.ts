import Phaser from "phaser";
import { COLORS, DEPTH, FONT } from "../config/constants";
import { BuildSystem } from "../systems/BuildSystem";
import { BUILD_COSTS } from "../logic/economy";
import { AudioManager } from "../audio/AudioManager";

const INTEL_PANEL_Y = 110;
const INTEL_PANEL_W = 180;
const INTEL_PANEL_H = 140;

type ToolChangeHandler = (mode: string) => void;

export interface HudApi {
  updateIntel(counts: { type: string; count: number }[]): void;
}

export function buildHud(
  scene: Phaser.Scene,
  buildSystem: BuildSystem,
  onToolChange: ToolChangeHandler,
  audio: AudioManager,
): HudApi {
  const { width, height } = scene.scale;
  const D = DEPTH.hud;

  // ---- Resources bar (top-left) ----
  // Gold icon (amount updated dynamically by GameScene).
  scene.add
    .image(24, 20, "icon-gold")
    .setOrigin(0.5)
    .setDisplaySize(24, 24)
    .setDepth(D);

  // Shell icon (amount updated dynamically by GameScene).
  scene.add
    .image(100, 20, "shell-yellow")
    .setOrigin(0.5)
    .setDisplaySize(34, 34)
    .setDepth(D);

  // ---- Next-wave panel (top-left, shark-warning sign) ----
  const panelY = INTEL_PANEL_Y;
  const panelW = INTEL_PANEL_W;
  const panelH = INTEL_PANEL_H;
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
    .setRotation(-0.25)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => {
      const muted = audio.isMuted;
      audio.setEnabled(muted);
      if (muted) {
        slash.clear();
      } else {
        drawSlash();
      }
    });

  // Mute slash overlay drawn diagonally across the phone.
  const phoneX = panelX + panelW;
  const phoneY = panelY - panelH / 2 + 16;
  const slash = scene.add.graphics().setDepth(D + 1);
  const drawSlash = () => {
    slash.clear();
    slash.lineStyle(3, 0xff3333, 0.9);
    slash.lineBetween(phoneX - 12, phoneY - 14, phoneX + 12, phoneY + 14);
    slash.lineBetween(phoneX - 12, phoneY + 14, phoneX + 12, phoneY - 14);
  };

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
  const toolbarLeft = width / 2 - 130;
  const hudImg = scene.add
    .image(width / 2, hudY, "ui-hud")
    .setDepth(D)
    .setInteractive({ useHandCursor: true });

  // Cost labels below button names (inside toolbar area).
  const labelY = hudY + 16;

  const toolCosts = [
    { x: toolbarLeft + 43, cost: BUILD_COSTS.tower },
    { x: toolbarLeft + 130, cost: BUILD_COSTS.wall },
    { x: toolbarLeft + 217, cost: BUILD_COSTS.destroy },
  ];

  for (const tool of toolCosts) {
    if (tool.cost > 0) {
      scene.add
        .text(tool.x - 8, labelY, `${tool.cost}`, {
          ...FONT.label,
          color: COLORS.goldResource,
          stroke: COLORS.brownStroke,
        })
        .setOrigin(1, 0.5)
        .setDepth(D);
      scene.add
        .image(tool.x - 4, labelY, "icon-gold")
        .setOrigin(0, 0.5)
        .setDisplaySize(13, 13)
        .setDepth(D);
    } else {
      scene.add
        .text(tool.x, labelY, "-", {
          ...FONT.label,
          color: COLORS.goldResource,
          stroke: COLORS.brownStroke,
        })
        .setOrigin(0.5)
        .setDepth(D);
    }
  }

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
