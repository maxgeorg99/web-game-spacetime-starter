import Phaser from "phaser";
import { Card } from "../cards/Card";

// ─── colour palette (matches CombatScene / MapScene) ────────────────────────
const C = {
  bg0: 0x0d0705,
  bg1: 0x1a0c08,
  bg2: 0x221008,
  border: 0x3d1a10,
  borderFaint: 0x2a1208,
  gold: 0xc9a84c,
  goldBright: 0xf0c040,
  blood: 0xc0392b,
  bloodDark: 0x7b1a12,
  textBright: 0xf0d8c0,
  textMid: 0xc4a882,
  textDim: 0xa08060,
  textFaint: 0x6a4030,
  white: 0xffffff,
  black: 0x000000,
  comboGlow: 0xf0c040,
} as const;

// ─── Example card shown in the annotation diagram ───────────────────────────
const EXAMPLE_CARD: Card = {
  id: "power_strike",
  name: "Power Strike",
  cost: 3,
  kind: "attack",
  value: 16,
  art: "power-strike",
  targeting: "single",
};

// ─── Section content ─────────────────────────────────────────────────────────
interface Rule {
  title: string;
  body: string;
}

const CORE_RULES: Rule[] = [
  {
    title: "Playing Cards",
    body: "Click a card in your hand to select it. Attack cards let you pick a target — click an enemy highlighted with a yellow ring. Heal and block cards take effect immediately.",
  },
  {
    title: "HP is your currency",
    body: "Cards cost Health Points, not mana. Play a cost-3 card and you lose 3 HP — before the enemy even swings.",
  },
  {
    title: "Attack to survive",
    body: "Kill enemies before they kill you. Letting them attack drains you too — aggression is often safer than holding back.",
  },
  {
    title: "Healing & Blocking",
    body: "Heal cards restore HP but do nothing to the enemy — every heal is a turn not spent dealing damage. Block shields expire at the start of YOUR next turn, so stack block before a heavy hit.",
  },
  {
    title: "Build a Combo",
    body: "Playing cards with increasing costs in one turn (1 -> 2 -> 3) gives you double the effect!",
  },
];

// ─── TutorialScene ───────────────────────────────────────────────────────────

export class TutorialScene extends Phaser.Scene {
  private scrollY = 0;
  private maxScroll = 0;
  private content!: Phaser.GameObjects.Container;
  private isDragging = false;
  private dragStartY = 0;

  constructor() {
    super("TutorialScene");
  }

  // ── create ─────────────────────────────────────────────────────────────────
  create(): void {
    const { width, height } = this.scale;

    this.scrollY = 0;

    // Full-screen dark background
    this.add.rectangle(width / 2, height / 2, width, height, C.bg0).setDepth(0);

    // Subtle radial vignette
    const vign = this.add.graphics().setDepth(1);
    vign.fillGradientStyle(C.bg0, C.bg0, C.bg1, C.bg1, 0, 0, 1, 1);
    vign.fillRect(0, 0, width, height);

    // ── fixed header ────────────────────────────────────────────────────────
    const headerBar = this.add.graphics().setDepth(15);
    headerBar.fillStyle(C.bg0, 1);
    headerBar.fillRect(0, 0, width, 60);
    headerBar.lineStyle(1, C.border, 1);
    headerBar.lineBetween(60, 59, width - 60, 59);

    this.add
      .text(width / 2, 30, "How to Play", {
        fontFamily:
          "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif",
        fontSize: "28px",
        color: "#c9a84c",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(16);

    // ── scrollable content container ────────────────────────────────────────
    this.content = this.add.container(0, 0).setDepth(5);

    let y = 76; // running cursor; advances after every element
    const PAD_L = 52;
    const INNER_W = width - PAD_L - 52;

    // ── Section: Core rules ──────────────────────────────────────────────────
    y = this.addSectionHeader("The Core Rules", width, y);

    for (const rule of CORE_RULES) {
      y = this.addRuleBlock(PAD_L, y, INNER_W, rule);
    }

    y += 16;

    // ── Section: Reading a card ──────────────────────────────────────────────
    y = this.addSectionHeader("Reading a Card", width, y);
    y += 8;

    y = this.addAnnotatedCard(PAD_L, y, width, EXAMPLE_CARD);

    y += 20;

    y += 32; // breathing room above footer

    const maskGfx = this.add.graphics();
    const maskTop = 60;
    const maskBottom = height - 48;
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(0, maskTop, width, maskBottom - maskTop);
    this.content.setMask(maskGfx.createGeometryMask());

    // Compute max scroll so bottom content is reachable
    this.maxScroll = Math.max(0, y - maskBottom + 48);

    // Scroll indicator (only visible when scrollable)
    if (this.maxScroll > 0) {
      this.add
        .text(width / 2, height - 12, "Scroll \u25bc", {
          fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
          fontSize: "13px",
          color: "#6a4030",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(20);
    }

    // ── fixed footer bar ────────────────────────────────────────────────────
    const footerBar = this.add.graphics().setDepth(15);
    footerBar.fillStyle(C.bg0, 1);
    footerBar.fillRect(0, height - 48, width, 48);
    footerBar.lineStyle(1, C.border, 1);
    footerBar.lineBetween(60, height - 48, width - 60, height - 48);

    const backBtn = this.add
      .text(width / 2, height - 24, "[ Back ]", {
        fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
        fontSize: "20px",
        color: "#888888",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });

    backBtn.on("pointerover", () => backBtn.setColor("#c9a84c"));
    backBtn.on("pointerout", () => backBtn.setColor("#888888"));
    backBtn.on("pointerdown", () => this.scene.start("TitleScene"));

    // ── scroll input ─────────────────────────────────────────────────────────
    this.input.on(
      "wheel",
      (_p: unknown, _g: unknown, _dx: number, deltaY: number) => {
        this.applyScroll(deltaY * 0.6);
      },
    );

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartY = p.y;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const dy = p.y - this.dragStartY;
      this.dragStartY = p.y;
      this.applyScroll(-dy);
    });
    this.input.on("pointerup", () => {
      this.isDragging = false;
    });
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private applyScroll(delta: number): void {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, this.maxScroll);
    this.content.y = -this.scrollY;
  }

  /** Gold separator + section title.  Returns new y. */
  private addSectionHeader(label: string, width: number, y: number): number {
    // divider line left
    const gfx = this.add.graphics();
    gfx.lineStyle(1, C.borderFaint, 1);
    gfx.lineBetween(52, y + 10, width / 2 - 80, y + 10);
    // divider line right
    gfx.lineBetween(width / 2 + 80, y + 10, width - 52, y + 10);
    this.content.add(gfx);

    const txt = this.add
      .text(width / 2, y, label, {
        fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
        fontSize: "21px",
        color: "#c9a84c",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0);
    this.content.add(txt);

    return y + 30;
  }

  /** Rule block: title + body text in a subtle bordered box.  Returns new y. */
  private addRuleBlock(x: number, y: number, w: number, rule: Rule): number {
    const bodyObj = this.add.text(x + 14, y + 26, rule.body, {
      fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
      fontSize: "16px",
      color: "#c4a882",
      wordWrap: { width: w - 28 },
      lineSpacing: 3,
    });
    const bodyH = bodyObj.height;

    const boxH = bodyH + 40;
    const bg = this.add.graphics();
    bg.fillStyle(C.bg1, 1);
    bg.fillRoundedRect(x, y, w, boxH, 6);
    bg.lineStyle(1, C.border, 0.6);
    bg.strokeRoundedRect(x, y, w, boxH, 6);
    // blood left accent
    bg.fillStyle(C.blood, 1);
    bg.fillRect(x, y + 8, 3, boxH - 16);

    this.content.add(bg);

    const titleObj = this.add.text(x + 14, y + 10, rule.title, {
      fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
      fontSize: "17px",
      color: "#e8c9a0",
      stroke: "#000000",
      strokeThickness: 2,
    });
    this.content.add(titleObj);
    this.content.add(bodyObj);

    return y + boxH + 10;
  }

  // ── Annotated card diagram ──────────────────────────────────────────────────
  /**
   * Draws:
   *   • the card sprite on the left
   *   • four callout arrows pointing to: cost badge, name bar, art, effect line
   *   • label text on the right of each arrow
   * Returns new y after the whole block.
   */
  private addAnnotatedCard(
    padL: number,
    y: number,
    sceneW: number,
    card: Card,
  ): number {
    const CW = 130;
    const CH = 152;
    const CX = padL + CW / 2 + 10;
    const CY = y + CH / 2 + 8;

    // ── actual game card ────────────────────────────────────────────────────
    const cardImg = this.add.image(CX, CY, "card-blank");
    cardImg.setDisplaySize(CW, CH);
    this.content.add(cardImg);

    const dropX = CX - CW / 2 + 16;
    const dropY = CY - CH / 2 + 11;
    const costIcon = this.add.image(dropX, dropY, "health-cost");
    costIcon.setDisplaySize(18, 26);
    costIcon.setOrigin(0.5);
    this.content.add(costIcon);

    const costTxt = this.add
      .text(dropX, dropY, `${card.cost}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        color: "#ffffff",
        stroke: "#000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.content.add(costTxt);

    const nameTxt = this.add
      .text(CX + 2, CY - CH / 2 + 26, card.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000",
        strokeThickness: 2,
      })
      .setOrigin(0.4, 0.5);
    this.content.add(nameTxt);

    const artY = CY - 6;
    const art = this.add.image(CX, artY, card.art);
    art.setDisplaySize(50, 50);
    art.setOrigin(0.5);
    this.content.add(art);

    const kindLabel =
      card.kind === "attack" ? "DMG" : card.kind === "heal" ? "HEAL" : "BLOCK";
    const effectTxt = this.add
      .text(CX, CY + CH / 2 - 22, `${kindLabel} ${card.value}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        color: "#e0c060",
        stroke: "#000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.content.add(effectTxt);

    // ── annotation arrows ─────────────────────────────────────────────────────
    // Each annotation: { fromX, fromY, label }
    // All arrows sweep right from the card edge to a label column.

    const LABEL_X = CX + CW / 2 + 20; // arrow tip x
    const LABEL_COL = LABEL_X + 12; // text starts here
    const LABEL_W = sceneW - LABEL_COL - 52;

    const annotations: Array<{
      fromX: number;
      fromY: number;
      labelY?: number;
      title: string;
      body: string;
      tipColor: number;
    }> = [
      {
        fromX: dropX + 9,
        fromY: dropY,
        labelY: dropY - 30,
        title: "HP cost",
        body: "Playing this card costs you this much HP immediately.",
        tipColor: C.blood,
      },
      {
        fromX: CX + CW / 2,
        fromY: CY - CH / 2 + 11,
        title: "Card name",
        body: "Tells you the card's kind — strike, shield8…",
        tipColor: C.gold,
      },
      {
        fromX: CX + CW / 2,
        fromY: artY,
        title: "Art",
        body: "Visual only — hover over a card in combat to see full stats.",
        tipColor: C.textDim,
      },
      {
        fromX: CX + CW / 2,
        fromY: CY + CH / 2 - 14,
        title: "Effect",
        body: "DMG = damage dealt.  BLOCK = shield gained.  HEAL = HP restored.",
        tipColor: C.goldBright,
      },
    ];

    const annGfx = this.add.graphics();

    for (const ann of annotations) {
      const ly = ann.labelY ?? ann.fromY;
      annGfx.lineStyle(1, ann.tipColor, 0.5);
      // Line from label column → card element (reversed direction)
      if (ly !== ann.fromY) {
        annGfx.lineBetween(LABEL_X, ly, ann.fromX, ann.fromY);
      } else {
        annGfx.lineBetween(LABEL_X, ly, ann.fromX, ly);
      }
      // Arrowhead pointing left at card element
      annGfx.fillStyle(ann.tipColor, 0.8);
      annGfx.fillTriangle(
        ann.fromX,
        ann.fromY,
        ann.fromX + 8,
        ann.fromY - 4,
        ann.fromX + 8,
        ann.fromY + 4,
      );
      // Dot at label origin
      annGfx.fillStyle(ann.tipColor, 0.9);
      annGfx.fillCircle(LABEL_X, ly, 3);
    }

    this.content.add(annGfx);

    for (const ann of annotations) {
      const ly = ann.labelY ?? ann.fromY;
      const titleObj = this.add.text(LABEL_COL, ly - 10, ann.title, {
        fontFamily: "Georgia, serif",
        fontSize: "15px",
        color: Phaser.Display.Color.IntegerToColor(ann.tipColor).rgba,
        stroke: "#000",
        strokeThickness: 2,
      });
      this.content.add(titleObj);

      const bodyObj = this.add.text(LABEL_COL, ly + 5, ann.body, {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#a08060",
        wordWrap: { width: LABEL_W },
        lineSpacing: 1,
      });
      this.content.add(bodyObj);
    }

    return y + CH + 60;
  }
}
