import Phaser from "phaser";
import { RunState } from "../state/RunState";
import { getAudioManager } from "../audio/AudioManager";
import { getHighestUnlockedAscension } from "../state/AscensionState";

export class TitleScene extends Phaser.Scene {
  private ascension = 0;
  private ascLabel: Phaser.GameObjects.Text | null = null;

  constructor() {
    super("TitleScene");
  }

  create(): void {
    const { width, height } = this.scale;

    // Deep violet → blood red gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x07000e, 0x07000e, 0x2a0008, 0x2a0008, 1);
    bg.fillRect(0, 0, width, height);

    this.add
      .text(width / 2, height / 2 - 60, "Pay in Blood", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "52px",
        color: "#e0c060",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2, "Everything has a cost", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        color: "#c0a050",
      })
      .setOrigin(0.5);

    const startText = this.add
      .text(width / 2, height / 2 + 80, "[ START ]", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "30px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    startText.setInteractive({ useHandCursor: true });
    startText.on("pointerover", () => startText.setColor("#e0c060"));
    startText.on("pointerout", () => startText.setColor("#ffffff"));
    startText.on("pointerdown", () => {
      const runState = new RunState(this.ascension);
      this.registry.set("runState", runState);
      this.scene.start("MapScene");
    });

    const ascY = height / 2 + 170;
    const maxUnlocked = getHighestUnlockedAscension();

    this.ascLabel = this.add
      .text(width / 2, ascY, "Normal", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#aa8888",
      })
      .setOrigin(0.5);

    if (maxUnlocked > 0) {
      const leftBtn = this.add
        .text(width / 2 - 80, ascY, "<", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "22px",
          color: "#888888",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      const rightBtn = this.add
        .text(width / 2 + 80, ascY, ">", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "22px",
          color: "#888888",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      leftBtn.on("pointerover", () => leftBtn.setColor("#ffffff"));
      leftBtn.on("pointerout", () => leftBtn.setColor("#888888"));
      leftBtn.on("pointerdown", () => this.setAscension(this.ascension - 1));

      rightBtn.on("pointerover", () => rightBtn.setColor("#ffffff"));
      rightBtn.on("pointerout", () => rightBtn.setColor("#888888"));
      rightBtn.on("pointerdown", () => this.setAscension(this.ascension + 1));
    }

    this.setAscension(0);

    const rulesText = this.add
      .text(width / 2, height / 2 + 130, "[ How to Play ]", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        color: "#888888",
      })
      .setOrigin(0.5);

    rulesText.setInteractive({ useHandCursor: true });
    rulesText.on("pointerover", () => rulesText.setColor("#c8a84a"));
    rulesText.on("pointerout", () => rulesText.setColor("#888888"));
    rulesText.on("pointerdown", () => this.scene.start("TutorialScene"));

    const audio = getAudioManager(this);
    audio.transitionTo("title");
  }

  private setAscension(lvl: number): void {
    const maxUnlocked = getHighestUnlockedAscension();
    this.ascension = Phaser.Math.Clamp(lvl, 0, maxUnlocked);
    if (this.ascLabel) {
      this.ascLabel.setText(this.ascensionLabel());
    }
  }

  private ascensionLabel(): string {
    return this.ascension === 0 ? "Normal" : `Ascension ${this.ascension}`;
  }
}
