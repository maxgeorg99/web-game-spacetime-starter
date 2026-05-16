import Phaser from "phaser";
import { MapNode, NodeKind } from "../state/MapState";
import { RunState } from "../state/RunState";

// ─── Themed location names ────────────────────────────────────────────────────

const COMBAT_NAMES = [
  "Village",
  "Ruins",
  "Outpost",
  "Hamlet",
  "Crossroads",
  "Encampment",
  "Mill",
  "Barrow",
  "Goblin Camp",
  "Snake Pit",
  "Spider Den",
  "Gnoll Warren",
  "Thief's Hideout",
  "Gnome Burrow",
  "Swamp Hut",
  "River Ford",
  "Haunted Farm",
  "Bandit Road",
  "Cursed Grove",
  "Fisherman's Dock",
  "Burial Mound",
  "Old Bridge",
];
const ELITE_NAMES = [
  "Fortress",
  "Stronghold",
  "Keep",
  "Rampart",
  "Garrison",
  "Watchtower",
  "Minotaur Labyrinth",
  "Werewolf Den",
  "Gargoyle Spire",
  "Knight Bastion",
  "Shaman Circle",
  "Stone Golem Mine",
  "Lizardman Marsh",
  "Ogre Tower",
  "Gryphon Aerie",
  "Pyromancer's Tower",
  "Headless Hollow",
  "Dwarf Delve",
];
const BOSS_NAME = "The Dark Throne";

function hashId(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function nodeName(node: MapNode): string {
  if (node.kind === "boss") return BOSS_NAME;
  const pool = node.kind === "elite" ? ELITE_NAMES : COMBAT_NAMES;
  return pool[hashId(node.id) % pool.length];
}

// ─── Avatar key from actual encounter ─────────────────────────────────────────

function nodeAvatarKey(node: MapNode): string {
  const sk = node.encounterTemplates[0]?.spriteKey;
  if (!sk) return "avatar-skull";
  if (sk.startsWith("boss-")) return sk;
  return `avatar-${sk}`;
}

// ─── Building sprite key per kind ─────────────────────────────────────────────

const BUILDING_KEY: Record<NodeKind, string> = {
  combat: "building-tower",
  elite: "building-monastery",
  boss: "building-castle",
};
const BUILDING_DISPLAY: Record<NodeKind, { w: number; h: number }> = {
  combat: { w: 48, h: 98 },
  elite: { w: 48, h: 98 },
  boss: { w: 140, h: 112 },
};

// ─── Layout constants ─────────────────────────────────────────────────────────

const TIER_X = [180, 380, 590, 810, 1060];
const Y_BANDS: Record<number, number[]> = {
  1: [360],
  2: [260, 460],
  3: [185, 360, 535],
};

export class MapScene extends Phaser.Scene {
  private runState!: RunState;

  constructor() {
    super("MapScene");
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#000000");

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x060d06, 0x060d06, 0x0a0703, 0x0a0703, 1);
    bg.fillRect(0, 0, width, height);

    const vignette = this.add.graphics().setDepth(1).setAlpha(0.45);
    vignette.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      1,
      1,
      0,
      0,
    );
    vignette.fillRect(0, 0, width, height * 0.25);
    vignette.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0,
      0,
      1,
      1,
    );
    vignette.fillRect(0, height * 0.75, width, height * 0.25);

    this.runState = this.registry.get("runState") as RunState;

    this.add
      .text(width / 2, 30, "Your Conquest", {
        fontFamily: "Georgia, serif",
        fontSize: "32px",
        color: "#c8a84a",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(10);

    const divider = this.add.graphics().setDepth(2).setAlpha(0.3);
    divider.lineStyle(1, 0x7a6a44, 1);
    divider.lineBetween(60, 62, width - 60, 62);

    this.renderHpHud();
    this.renderMap();
  }

  private renderHpHud(): void {
    const { height } = this.scale;
    const hp = this.runState.playerHp;
    const max = this.runState.playerMaxHp;

    this.add
      .text(24, height - 28, `Blood  ${hp} / ${max}`, {
        fontFamily: "Georgia, serif",
        fontSize: "19px",
        color: "#cc4444",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setDepth(10);
  }

  private renderMap(): void {
    const { height } = this.scale;
    const available = new Set(this.runState.availableNodes.map((n) => n.id));
    const positions = this.buildPositions(height);

    const roads = this.add.graphics().setDepth(3);
    for (const node of this.runState.nodes) {
      const from = positions.get(node.id)!;
      for (const connId of node.connections) {
        const to = positions.get(connId)!;
        this.drawRoad(roads, from.x, from.y, to.x, to.y, node.cleared);
      }
    }

    for (const node of this.runState.nodes) {
      const pos = positions.get(node.id)!;
      this.renderNode(node, pos.x, pos.y, available.has(node.id));
    }
  }

  private drawRoad(
    gfx: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    cleared: boolean,
  ): void {
    gfx.lineStyle(5, 0x000000, 0.5);
    gfx.lineBetween(x1, y1 + 2, x2, y2 + 2);
    gfx.lineStyle(3, cleared ? 0x4a3a1a : 0x2e2414, cleared ? 0.9 : 0.6);
    gfx.lineBetween(x1, y1, x2, y2);
    gfx.lineStyle(1, cleared ? 0x7a6030 : 0x3a2e18, cleared ? 0.6 : 0.3);
    gfx.lineBetween(x1, y1 - 1, x2, y2 - 1);
  }

  private renderNode(
    node: MapNode,
    x: number,
    y: number,
    isAvailable: boolean,
  ): void {
    const isBoss = node.kind === "boss";
    const buildingKey = BUILDING_KEY[node.kind];
    const buildingDisp = BUILDING_DISPLAY[node.kind];
    const avatarKey = nodeAvatarKey(node);

    const nameColor: Record<NodeKind, string> = {
      combat: "#8aaa66",
      elite: "#d4901c",
      boss: "#ee6060",
    };

    // Building sprite (top)
    const building = this.add.image(x, y - 28, buildingKey).setDepth(5);
    building.setDisplaySize(buildingDisp.w, buildingDisp.h);

    // Avatar sprite (middle)
    const avatar = this.add.image(x, y + 36, avatarKey).setDepth(5);
    avatar.setDisplaySize(60, 60);

    // Location name (bottom)
    const name = this.add
      .text(x, y + 65, nodeName(node), {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        color: isAvailable ? nameColor[node.kind] : "#44443a",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(6);

    // ── Cleared ──────────────────────────────────────────────────────────────
    if (node.cleared) {
      building.setAlpha(0.3);
      avatar.setAlpha(0.3);
      name.setColor("#3a4028").setAlpha(0.5);

      this.add
        .text(x, y - 4, "✓", {
          fontFamily: "Georgia, serif",
          fontSize: "48px",
          color: "#557744",
        })
        .setOrigin(0.5)
        .setDepth(6);
      return;
    }

    // ── Unavailable (locked) ──────────────────────────────────────────────────
    if (!isAvailable) {
      building.setAlpha(0.35);
      avatar.setAlpha(0.35);
      name.setColor("#44443a");
      return;
    }

    // ── Available (interactive) ───────────────────────────────────────────────

    // Boss pulsing ring
    if (isBoss) {
      const ring = this.add.graphics().setDepth(4);
      ring.lineStyle(2, 0xee3030, 0.5);
      ring.strokeCircle(x, y - 28, 32);
      this.tweens.add({
        targets: ring,
        alpha: { from: 0.8, to: 0.2 },
        yoyo: true,
        repeat: -1,
        duration: 900,
      });
    }

    // Current node marker
    if (node.id === this.runState.currentNodeId) {
      this.add
        .text(x, y - 56, "▼", {
          fontFamily: "system-ui",
          fontSize: "14px",
          color: "#ffaa00",
        })
        .setOrigin(0.5)
        .setDepth(7);
    }

    // Hover glow & click interaction
    const hit = this.add
      .rectangle(x, y, 64, 84)
      .setInteractive({ useHandCursor: true })
      .setDepth(8)
      .setAlpha(0.001);

    const glow = this.add.graphics().setDepth(4).setAlpha(0);
    hit.on("pointerover", () => {
      building.setAlpha(0.85);
      glow.clear();
      glow.fillStyle(0xffffff, 0.1);
      glow.fillCircle(x, y - 28, 48);
      glow.setAlpha(1);
    });
    hit.on("pointerout", () => {
      building.setAlpha(1);
      glow.clear();
      glow.setAlpha(0);
    });
    hit.on("pointerdown", () =>
      this.scene.start("CombatScene", { nodeId: node.id }),
    );
  }

  private buildPositions(
    height: number,
  ): Map<string, { x: number; y: number }> {
    const map = new Map<string, { x: number; y: number }>();
    const scale = height / 720;

    for (let tier = 1; tier <= 5; tier++) {
      const tierNodes = this.runState.nodes
        .filter((n) => n.tier === tier)
        .sort((a, b) => a.id.localeCompare(b.id));

      const x = TIER_X[tier - 1];
      const yBand = Y_BANDS[Math.min(tierNodes.length, 3)] ?? Y_BANDS[3];

      for (let i = 0; i < tierNodes.length; i++) {
        map.set(tierNodes[i].id, { x, y: (yBand[i] ?? 360) * scale });
      }
    }

    return map;
  }
}
