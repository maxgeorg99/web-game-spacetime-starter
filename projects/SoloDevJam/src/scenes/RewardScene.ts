import Phaser from "phaser";
import { Card } from "../cards/Card";
import { ALL_CARDS } from "../cards/cards";
import { RunState } from "../state/RunState";


function pickRandomCards(count: number): Card[] {
  const pool = [...ALL_CARDS];
  const result: Card[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

const CARD_W = 140;
const CARD_H = 196;

export class RewardScene extends Phaser.Scene {
  private runState!: RunState;
  private choices: Card[] = [];

  constructor() {
    super("RewardScene");
  }

  create(): void {
    const { width, height } = this.scale;
    this.runState = this.registry.get("runState") as RunState;
    this.choices = pickRandomCards(3);

    this.cameras.main.setBackgroundColor("#0a0a0a");

    this.add
      .text(width / 2, 60, "Choose a Reward", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "32px",
        color: "#e0c060",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(10);

    const totalW = this.choices.length * (CARD_W + 16);
    const startX = (width - totalW) / 2 + CARD_W / 2;
    const cardY = height / 2 - 20;

    for (let i = 0; i < this.choices.length; i++) {
      const card = this.choices[i];
      const x = startX + i * (CARD_W + 16);
      this.renderChoiceCard(x, cardY, card);
    }

    const skipBtn = this.add
      .text(width / 2, height - 60, "[ Skip ]", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        color: "#888888",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);

    skipBtn.on("pointerover", () => skipBtn.setColor("#ffffff"));
    skipBtn.on("pointerout", () => skipBtn.setColor("#888888"));
    skipBtn.on("pointerdown", () => this.proceed());

    if (this.cache.audio.exists("sfx-ui-reward")) {
      this.sound.play("sfx-ui-reward");
    }
  }

  private renderChoiceCard(x: number, y: number, card: Card): void {
    const bg = this.add.image(x, y, "card-blank");
    bg.setDisplaySize(CARD_W, CARD_H);
    bg.setDepth(5);

    const art = this.add.image(x, y - 8, card.art);
    art.setDisplaySize(64, 64);
    art.setDepth(6);

    const nameText = this.add
      .text(x, y - CARD_H / 2 + 18, card.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(6);

    const costIcon = this.add.image(x - CARD_W / 2 + 22, y - CARD_H / 2 + 22, "health-cost");
    costIcon.setDisplaySize(18, 26);
    costIcon.setOrigin(0.5);
    costIcon.setDepth(6);

    this.add
      .text(x - CARD_W / 2 + 24, y - CARD_H / 2 + 24, `${card.cost}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(6);

    const kindLabel =
      card.kind === "attack" ? "DMG" : card.kind === "heal" ? "HEAL" : "BLOCK";
    const valueText = this.add
      .text(x, y + CARD_H / 2 - 24, `${kindLabel} ${card.value}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#e0c060",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(6);

    const hitArea = this.add.rectangle(x, y, CARD_W, CARD_H);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.setDepth(7);
    hitArea.setAlpha(0.001);

    hitArea.on("pointerover", () => {
      bg.setAlpha(0.8);
      nameText.setY(y - CARD_H / 2 + 18 - 10);
      art.setY(y - 8 - 10);
      valueText.setY(y + CARD_H / 2 - 24 - 10);
    });

    hitArea.on("pointerout", () => {
      bg.setAlpha(1);
      nameText.setY(y - CARD_H / 2 + 18);
      art.setY(y - 8);
      valueText.setY(y + CARD_H / 2 - 24);
    });

    hitArea.on("pointerdown", () => {
      this.runState.deck.push(card);
      if (this.cache.audio.exists("sfx-ui-booster")) {
        this.sound.play("sfx-ui-booster");
      }
      this.proceed();
    });
  }

  private proceed(): void {
    this.registry.set("runState", this.runState);
    this.scene.start("MapScene");
  }
}
