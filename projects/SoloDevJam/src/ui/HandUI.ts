import Phaser from "phaser";
import { Card } from "../cards/Card";

const CARD_WIDTH = 120;
const CARD_HEIGHT = 168;
const LIFT_Y = 20;

export class HandUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private cardObjects: Array<{
    card: Card;
    bg: Phaser.GameObjects.Image;
    costIcon: Phaser.GameObjects.Image;
    costText: Phaser.GameObjects.Text;
    artIcon: Phaser.GameObjects.Image;
    nameText: Phaser.GameObjects.Text;
    valueText: Phaser.GameObjects.Text;
    container: Phaser.GameObjects.Container;
    baseY: number;
  }> = [];

  private onPlayCard: ((card: Card) => void) | null = null;
  private lastPlayedX = 0;
  private lastPlayedY = 0;

  constructor(scene: Phaser.Scene, onPlayCard?: (card: Card) => void) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.onPlayCard = onPlayCard ?? null;
  }

  get lastPlayedPosition(): { x: number; y: number } {
    return { x: this.lastPlayedX, y: this.lastPlayedY };
  }

  show(cards: Card[], canAfford: boolean[], comboNextCost: number | null = null): void {
    this.clear();
    const { width, height } = this.scene.scale;
    const totalWidth = cards.length * (CARD_WIDTH + 8);
    const startX = (width - totalWidth) / 2 + CARD_WIDTH / 2;
    const y = height - CARD_HEIGHT / 2 - 16;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const x = startX + i * (CARD_WIDTH + 8);
      const affordable = canAfford[i];

      const bg = this.scene.add.image(0, 0, "card-blank");
      bg.setDisplaySize(CARD_WIDTH, CARD_HEIGHT);
      if (!affordable) bg.setAlpha(0.4);

      const costIcon = this.scene.add.image(
        -CARD_WIDTH / 2 + 18,
        -CARD_HEIGHT / 2 + 18,
        "health-cost",
      );
      costIcon.setDisplaySize(20, 30);
      costIcon.setOrigin(0.5);

      const costText = this.scene.add
        .text(-CARD_WIDTH / 2 + 20, -CARD_HEIGHT / 2 + 20, `${card.cost}`, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "16px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5);

      const artIcon = this.scene.add.image(0, -4, card.art);
      artIcon.setDisplaySize(56, 56);
      artIcon.setOrigin(0.5);

      const nameText = this.scene.add
        .text(0, -CARD_HEIGHT / 2 + 20, card.name, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "13px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.4);

      const isComboCard = comboNextCost !== null && card.cost === comboNextCost;
      const kindLabel =
        card.kind === "attack"
          ? "DMG"
          : card.kind === "heal"
            ? "HEAL"
            : "BLOCK";
      const valueLabel = isComboCard
        ? `${kindLabel} ${card.value * 2}`
        : `${kindLabel} ${card.value}`;
      const valueText = this.scene.add
        .text(0, CARD_HEIGHT / 2 - 24, valueLabel, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          color: isComboCard ? "#ff4444" : "#e0c060",
          fontStyle: isComboCard ? "bold" : "normal",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5);

      const cardContainer = this.scene.add.container(x, y, [
        bg,
        costIcon,
        costText,
        artIcon,
        nameText,
        valueText,
      ]);
      cardContainer.setSize(CARD_WIDTH, CARD_HEIGHT);
      cardContainer.setInteractive({ useHandCursor: true });
      cardContainer.setDepth(20);

      const baseY = y;
      cardContainer.on("pointerover", () => {
        cardContainer.y = baseY - LIFT_Y;
      });
      cardContainer.on("pointerout", () => {
        cardContainer.y = baseY;
      });

      if (affordable && this.onPlayCard) {
        cardContainer.on("pointerdown", () => {
          this.lastPlayedX = cardContainer.x;
          this.lastPlayedY = cardContainer.y;
          this.onPlayCard!(card);
        });
      }

      this.cardObjects.push({
        card,
        bg,
        costIcon,
        costText,
        artIcon,
        nameText,
        valueText,
        container: cardContainer,
        baseY,
      });
      this.container.add(cardContainer);
    }
  }

  clear(): void {
    for (const obj of this.cardObjects) {
      obj.container.destroy();
    }
    this.cardObjects = [];
  }
}
