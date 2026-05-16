import Phaser from "phaser";
import { Card } from "../cards/Card";
import { ALL_CARDS } from "../cards/cards";
import { RunState } from "../state/RunState";
import { getAudioManager } from "../audio/AudioManager";

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
        fontSize: "34px",
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
        fontSize: "24px",
        color: "#888888",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);

    skipBtn.on("pointerover", () => skipBtn.setColor("#ffffff"));
    skipBtn.on("pointerout", () => skipBtn.setColor("#888888"));
    skipBtn.on("pointerdown", () => this.proceed());

    const audio = getAudioManager(this);
    audio.transitionTo("ambient");
    audio.playSfx(this, "sfx-ui-reward");
  }

  private renderChoiceCard(x: number, y: number, card: Card): void {
    const cardContainer = this.add.container(x, y).setDepth(5);

    const bg = this.add.image(0, 0, "card-blank");
    bg.setDisplaySize(CARD_W, CARD_H);

    const art = this.add.image(0, -8, card.art);
    art.setDisplaySize(64, 64);

    const nameText = this.add
      .text(0, -CARD_H / 2 + 5, card.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
        wordWrap: { width: CARD_W - 60 },
        maxLines: 2,
        align: "center",
      })
      .setOrigin(0.5, 0);

    const costIcon = this.add.image(
      -CARD_W / 2 + 22,
      -CARD_H / 2 + 22,
      "health-cost",
    );
    costIcon.setDisplaySize(18, 26);
    costIcon.setOrigin(0.5);

    const costText = this.add
      .text(-CARD_W / 2 + 24, -CARD_H / 2 + 24, `${card.cost}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    const kindLabel =
      card.kind === "attack" ? "DMG" : card.kind === "heal" ? "HEAL" : "BLOCK";
    const valueText = this.add
      .text(0, CARD_H / 2 - 24, `${kindLabel} ${card.value}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#e0c060",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    cardContainer.add([bg, art, nameText, costIcon, costText, valueText]);
    cardContainer.setSize(CARD_W, CARD_H);
    cardContainer.setInteractive({ useHandCursor: true });

    cardContainer.on("pointerover", () => {
      cardContainer.y = y - 12;
    });

    cardContainer.on("pointerout", () => {
      cardContainer.y = y;
    });

    cardContainer.on("pointerdown", () => {
      this.runState.deck.push(card);
      const audio = getAudioManager(this);
      audio.playSfx(this, "sfx-ui-booster");
      this.proceed();
    });
  }

  private proceed(): void {
    this.registry.set("runState", this.runState);
    this.scene.start("MapScene");
  }
}
