import Phaser from "phaser";

export interface DialogPage {
  text: string;
}

export interface DialogScript {
  speaker: string;
  pages: DialogPage[];
  onComplete?: () => void;
}

export class DialogBox {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private boxBg: Phaser.GameObjects.Graphics;
  private portrait: Phaser.GameObjects.Image;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private continueHint: Phaser.GameObjects.Text;

  private queue: DialogScript[] = [];
  private currentScript: DialogScript | null = null;
  private currentPage = 0;
  private charIndex = 0;
  private typewriterTimer = 0;
  private typewriterSpeed = 25;
  private isTyping = false;
  private isVisible = false;

  private boxW = 640;
  private boxH = 140;
  private portraitSize = 72;

  // Reusable shadow graphic.
  private shadow: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const { width, height } = scene.scale;
    const boxX = width / 2;
    const boxY = height - this.boxH / 2 - 12;

    this.container = scene.add.container(0, 0).setDepth(100).setAlpha(0);

    // Drop shadow.
    this.shadow = scene.add.graphics().setAlpha(0.5);
    this.shadow.fillStyle(0x000000, 1);
    this.shadow.fillRoundedRect(
      boxX - this.boxW / 2 + 4,
      boxY - this.boxH / 2 + 4,
      this.boxW,
      this.boxH,
      8,
    );
    this.container.add(this.shadow);

    // Box background.
    this.boxBg = scene.add.graphics();
    this.drawBoxBg();
    this.container.add(this.boxBg);

    // Portrait frame + portrait.
    const portraitX = boxX - this.boxW / 2 + 14 + this.portraitSize / 2;
    const portraitY = boxY;

    // Portrait background fill.
    const portraitFrame = scene.add.graphics();
    portraitFrame.fillStyle(0x98d8a0, 0.35);
    portraitFrame.fillRect(
      portraitX - this.portraitSize / 2 - 2,
      portraitY - this.portraitSize / 2 - 2,
      this.portraitSize + 4,
      this.portraitSize + 4,
    );
    portraitFrame.lineStyle(2, 0x5a9a8a, 1);
    portraitFrame.strokeRect(
      portraitX - this.portraitSize / 2 - 2,
      portraitY - this.portraitSize / 2 - 2,
      this.portraitSize + 4,
      this.portraitSize + 4,
    );
    this.container.add(portraitFrame);

    this.portrait = scene.add
      .image(portraitX, portraitY, "portrait-lifeguard")
      .setDisplaySize(this.portraitSize, this.portraitSize);
    this.container.add(this.portrait);

    // Name tag.
    const nameX = portraitX + this.portraitSize / 2 + 14;
    const nameY = portraitY - this.portraitSize / 2 + 4;

    this.nameText = scene.add.text(nameX, nameY, "", {
      fontFamily: '"Fredoka", system-ui, sans-serif',
      fontSize: "13px",
      color: "#ffd700",
      stroke: "#000000",
      strokeThickness: 3,
    });
    this.container.add(this.nameText);

    // Body text.
    const textX = nameX;
    const textY = nameY + 22;
    this.bodyText = scene.add.text(textX, textY, "", {
      fontFamily: '"Fredoka", system-ui, sans-serif',
      fontSize: "14px",
      color: "#ffffff",
      wordWrap: { width: this.boxW - 170 },
      lineSpacing: 4,
      stroke: "#1a1a2e",
      strokeThickness: 2,
    });
    this.container.add(this.bodyText);

    // Continue hint.
    this.continueHint = scene.add
      .text(boxX + this.boxW / 2 - 24, boxY + this.boxH / 2 - 14, "▼", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#ffd700",
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.container.add(this.continueHint);

    // Click anywhere to advance.
    const hitZone = scene.add
      .zone(boxX, boxY, this.boxW, this.boxH)
      .setInteractive({ useHandCursor: true });
    hitZone.on("pointerdown", () => this.advance());
    this.container.add(hitZone);
  }

  private drawBoxBg(): void {
    const { width } = this.scene.scale;
    const boxX = width / 2;
    const boxY = this.scene.scale.height - this.boxH / 2 - 12;

    this.boxBg.clear();

    // Main fill.
    this.boxBg.fillStyle(0x1a2a4a, 0.95);
    this.boxBg.fillRoundedRect(
      boxX - this.boxW / 2,
      boxY - this.boxH / 2,
      this.boxW,
      this.boxH,
      8,
    );

    // Accent bar at top.
    this.boxBg.fillStyle(0x5a9a8a, 1);
    this.boxBg.fillRoundedRect(
      boxX - this.boxW / 2,
      boxY - this.boxH / 2,
      this.boxW,
      3,
      { tl: 8, tr: 8, bl: 0, br: 0 },
    );

    // Border.
    this.boxBg.lineStyle(2, 0x5a9a8a, 0.6);
    this.boxBg.strokeRoundedRect(
      boxX - this.boxW / 2,
      boxY - this.boxH / 2,
      this.boxW,
      this.boxH,
      8,
    );
  }

  show(script: DialogScript): void {
    this.queue.push(script);
    if (!this.isVisible) {
      this.playNext();
    }
  }

  showImmediate(script: DialogScript): void {
    this.queue = [script, ...this.queue];
    if (!this.isVisible) {
      this.playNext();
    }
  }

  get visible(): boolean {
    return this.isVisible;
  }

  private playNext(): void {
    if (this.queue.length === 0) {
      this.hide();
      return;
    }

    this.currentScript = this.queue.shift()!;
    this.currentPage = 0;
    this.isVisible = true;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 200,
      ease: "Power1",
    });
    this.showPage();
  }

  private showPage(): void {
    if (!this.currentScript) return;

    const page = this.currentScript.pages[this.currentPage];
    this.nameText.setText(this.currentScript.speaker.toUpperCase());
    this.bodyText.setText("");
    this.charIndex = 0;
    this.isTyping = true;
    this.typewriterTimer = 0;
    this.continueHint.setAlpha(0);

    // Pre-store full text for typewriter.
    (this as any)._pageFullText = page.text;
  }

  private advance(): void {
    if (!this.currentScript) return;

    if (this.isTyping) {
      // Skip to end of current page.
      this.finishTyping();
    } else if (this.currentPage < this.currentScript.pages.length - 1) {
      this.currentPage++;
      this.showPage();
    } else {
      this.finishScript();
    }
  }

  private finishTyping(): void {
    this.isTyping = false;
    this.bodyText.setText((this as any)._pageFullText);
    this.continueHint.setAlpha(0.7);
    this.scene.tweens.add({
      targets: this.continueHint,
      y: this.continueHint.y - 3,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private finishScript(): void {
    const callback = this.currentScript?.onComplete;
    this.currentScript = null;
    this.playNext();
    callback?.();
  }

  private hide(): void {
    this.isVisible = false;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 200,
      ease: "Power1",
    });
  }

  update(delta: number): void {
    if (!this.isTyping || !this.currentScript) return;

    this.typewriterTimer += delta;
    if (this.typewriterTimer >= this.typewriterSpeed) {
      this.typewriterTimer -= this.typewriterSpeed;
      this.charIndex++;
      const full = (this as any)._pageFullText as string;
      if (this.charIndex >= full.length) {
        this.finishTyping();
      } else {
        this.bodyText.setText(full.slice(0, this.charIndex));
      }
    }
  }
}
