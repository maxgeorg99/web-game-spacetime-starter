import Phaser from "phaser";
import { MapNode, NodeKind } from "../state/MapState";
import { RunState } from "../state/RunState";

// ─── Themed location names ────────────────────────────────────────────────────

const COMBAT_NAMES = [
  "Village", "Ruins", "Outpost", "Hamlet", "Crossroads", "Encampment",
  "Mill", "Barrow", "Goblin Camp", "Snake Pit", "Spider Den", "Gnoll Warren",
  "Thief's Hideout", "Gnome Burrow", "Swamp Hut", "River Ford", "Haunted Farm",
  "Bandit Road", "Cursed Grove", "Fisherman's Dock", "Burial Mound", "Old Bridge",
];
const ELITE_NAMES  = [
  "Fortress", "Stronghold", "Keep", "Rampart", "Garrison", "Watchtower",
  "Minotaur Labyrinth", "Werewolf Den", "Gargoyle Spire", "Knight Bastion",
  "Shaman Circle", "Stone Golem Mine", "Lizardman Marsh", "Ogre Tower",
  "Gryphon Aerie", "Pyromancer's Tower", "Headless Hollow", "Dwarf Delve",
];
const BOSS_NAME    = "The Dark Throne";

const TIER_LABELS  = ["Borderlands", "Midlands", "Heartlands", "Capital Gates", "The Throne"];

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

// ─── Layout constants ─────────────────────────────────────────────────────────

const TIER_X      = [180, 380, 590, 810, 1060];
const Y_BANDS: Record<number, number[]> = {
  1: [360],
  2: [260, 460],
  3: [185, 360, 535],
};

const NODE_R: Record<NodeKind, number> = { combat: 24, elite: 26, boss: 36 };

// Fill colours: normal / available / cleared
const NODE_FILL: Record<NodeKind, [number, number, number]> = {
  combat: [0x3a4830, 0x60784a, 0x252e1e],
  elite:  [0x5a3a10, 0x9a6020, 0x30200a],
  boss:   [0x5a0a0a, 0xaa1818, 0x280404],
};
const NODE_STROKE: Record<NodeKind, number> = {
  combat: 0x8aaa66,
  elite:  0xd4901c,
  boss:   0xee3030,
};

export class MapScene extends Phaser.Scene {
  private runState!: RunState;

  constructor() {
    super("MapScene");
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#000000");

    // Dark forest → deep earth gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x060d06, 0x060d06, 0x0a0703, 0x0a0703, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle vignette: dark edges
    const vignette = this.add.graphics().setDepth(1).setAlpha(0.45);
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 1, 1, 0, 0);
    vignette.fillRect(0, 0, width, height * 0.25);
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 1, 1);
    vignette.fillRect(0, height * 0.75, width, height * 0.25);

    this.runState = this.registry.get("runState") as RunState;

    // Title
    this.add
      .text(width / 2, 30, "Your Conquest", {
        fontFamily: "Georgia, serif",
        fontSize: "30px",
        color: "#c8a84a",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(10);

    // Tier labels at top
    for (let t = 0; t < 5; t++) {
      this.add
        .text(TIER_X[t], 68, TIER_LABELS[t], {
          fontFamily: "Georgia, serif",
          fontSize: "12px",
          color: "#7a6a44",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(10);
    }

    // Horizontal divider line
    const divider = this.add.graphics().setDepth(2).setAlpha(0.3);
    divider.lineStyle(1, 0x7a6a44, 1);
    divider.lineBetween(60, 82, width - 60, 82);

    this.renderHpHud();
    this.renderMap();
  }

  private renderHpHud(): void {
    const { height } = this.scale;
    const hp  = this.runState.playerHp;
    const max = this.runState.playerMaxHp;

    this.add
      .text(24, height - 28, `Blood  ${hp} / ${max}`, {
        fontFamily: "Georgia, serif",
        fontSize: "17px",
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

    // Roads first
    const roads = this.add.graphics().setDepth(3);
    for (const node of this.runState.nodes) {
      const from = positions.get(node.id)!;
      for (const connId of node.connections) {
        const to = positions.get(connId)!;
        this.drawRoad(roads, from.x, from.y, to.x, to.y, node.cleared);
      }
    }

    // Nodes on top
    for (const node of this.runState.nodes) {
      const pos = positions.get(node.id)!;
      this.renderNode(node, pos.x, pos.y, available.has(node.id));
    }
  }

  private drawRoad(
    gfx: Phaser.GameObjects.Graphics,
    x1: number, y1: number,
    x2: number, y2: number,
    cleared: boolean,
  ): void {
    // Shadow
    gfx.lineStyle(5, 0x000000, 0.5);
    gfx.lineBetween(x1, y1 + 2, x2, y2 + 2);
    // Road fill
    gfx.lineStyle(3, cleared ? 0x4a3a1a : 0x2e2414, cleared ? 0.9 : 0.6);
    gfx.lineBetween(x1, y1, x2, y2);
    // Road highlight
    gfx.lineStyle(1, cleared ? 0x7a6030 : 0x3a2e18, cleared ? 0.6 : 0.3);
    gfx.lineBetween(x1, y1 - 1, x2, y2 - 1);
  }

  private renderNode(node: MapNode, x: number, y: number, isAvailable: boolean): void {
    const r = NODE_R[node.kind];
    const [fillDim, fillAvail, fillCleared] = NODE_FILL[node.kind];
    const strokeColor = NODE_STROKE[node.kind];

    const gfx = this.add.graphics().setDepth(5);

    if (node.cleared) {
      this.drawNodeShape(gfx, node.kind, x, y, r, fillCleared, strokeColor, 0.6);
      this.add.text(x, y, "✓", {
        fontFamily: "Georgia, serif",
        fontSize: "16px",
        color: "#557744",
      }).setOrigin(0.5).setDepth(6);
      this.add.text(x, y + r + 14, nodeName(node), {
        fontFamily: "Georgia, serif",
        fontSize: "11px",
        color: "#3a4028",
        stroke: "#000000",
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(6);
      return;
    }

    const fill = isAvailable ? fillAvail : fillDim;
    this.drawNodeShape(gfx, node.kind, x, y, r, fill, strokeColor, isAvailable ? 1 : 0.7);

    // Boss gets an outer pulsing ring
    if (node.kind === "boss") {
      const ring = this.add.graphics().setDepth(4);
      ring.lineStyle(2, 0xee3030, 0.5);
      ring.strokeCircle(x, y, r + 8);
      if (isAvailable) {
        this.tweens.add({ targets: ring, alpha: { from: 0.8, to: 0.2 }, yoyo: true, repeat: -1, duration: 900 });
      }
    }

    // Current node marker: small flame above
    if (node.id === this.runState.currentNodeId) {
      this.add.text(x, y - r - 14, "▼", {
        fontFamily: "system-ui",
        fontSize: "14px",
        color: "#ffaa00",
      }).setOrigin(0.5).setDepth(7);
    }

    // Location name below node
    const nameColor: Record<NodeKind, string> = {
      combat: "#8aaa66",
      elite:  "#d4901c",
      boss:   "#ee6060",
    };
    this.add.text(x, y + r + 14, nodeName(node), {
      fontFamily: "Georgia, serif",
      fontSize: "12px",
      color: isAvailable ? nameColor[node.kind] : "#44443a",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);

    if (!isAvailable) return;

    // Hover glow & click
    const hitR = r + 8;
    const hit = this.add.circle(x, y, hitR).setInteractive({ useHandCursor: true }).setDepth(8).setAlpha(0.001);

    hit.on("pointerover", () => {
      gfx.setAlpha(1.2);
      this.drawNodeShape(gfx, node.kind, x, y, r, fillAvail, strokeColor, 1.3);
    });
    hit.on("pointerout",  () => {
      this.drawNodeShape(gfx, node.kind, x, y, r, fillAvail, strokeColor, 1);
    });
    hit.on("pointerdown", () => this.scene.start("CombatScene", { nodeId: node.id }));
  }

  private drawNodeShape(
    gfx: Phaser.GameObjects.Graphics,
    kind: NodeKind,
    cx: number, cy: number,
    r: number,
    fill: number,
    stroke: number,
    alpha: number,
  ): void {
    gfx.clear();
    gfx.setAlpha(alpha);

    if (kind === "elite") {
      // Diamond
      gfx.fillStyle(fill, 1);
      gfx.beginPath();
      gfx.moveTo(cx,     cy - r);
      gfx.lineTo(cx + r, cy);
      gfx.lineTo(cx,     cy + r);
      gfx.lineTo(cx - r, cy);
      gfx.closePath();
      gfx.fillPath();
      gfx.lineStyle(2, stroke, 1);
      gfx.beginPath();
      gfx.moveTo(cx,     cy - r);
      gfx.lineTo(cx + r, cy);
      gfx.lineTo(cx,     cy + r);
      gfx.lineTo(cx - r, cy);
      gfx.closePath();
      gfx.strokePath();
    } else {
      // Circle (combat & boss)
      gfx.fillStyle(fill, 1);
      gfx.fillCircle(cx, cy, r);
      gfx.lineStyle(kind === "boss" ? 3 : 2, stroke, 1);
      gfx.strokeCircle(cx, cy, r);
    }
  }

  private buildPositions(height: number): Map<string, { x: number; y: number }> {
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
