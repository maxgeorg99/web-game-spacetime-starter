import Phaser from "phaser";
import { RunState } from "../state/RunState";
import { getAudioManager } from "../audio/AudioManager";

export class TitleScene extends Phaser.Scene {
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
      const runState = new RunState();
      this.registry.set("runState", runState);
      this.scene.start("MapScene");
    });

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
}
