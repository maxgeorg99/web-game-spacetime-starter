import Phaser from "phaser";
import { ManifestEntry } from "../types";
import { Card } from "../cards/Card";
import { registerAnimations } from "../cards/AnimationFactory";
import { getStarterDeck } from "../cards/cards";
import { canPlayCard, applyCardEffect } from "../cards/effects";
import { PlayerState } from "../state/PlayerState";
import { EnemyState } from "../state/EnemyState";
import { DeckState } from "../state/DeckState";
import { HpBar } from "../ui/HpBar";
import { HandUI } from "../ui/HandUI";
import { Combo } from "../combat/Combo";
import { ComboHud } from "../ui/ComboHud";

export class CombatScene extends Phaser.Scene {
  private player!: PlayerState;
  private enemy!: EnemyState;
  private deck!: DeckState;
  private playerHpBar!: HpBar;
  private enemyHpBar!: HpBar;
  private handUI!: HandUI;
  private demon!: Phaser.GameObjects.Sprite;
  private skull!: Phaser.GameObjects.Sprite;
  private endTurnBtn!: Phaser.GameObjects.Text;
  private shieldIcon!: Phaser.GameObjects.Image;
  private shieldText!: Phaser.GameObjects.Text;
  private combo!: Combo;
  private comboHud!: ComboHud;
  private playerTurn = true;

  constructor() {
    super("CombatScene");
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#1a0a0a");

    const manifest = this.registry.get("assets") as ManifestEntry;
    registerAnimations(this.anims, manifest.spritesheets);

    this.player = new PlayerState(80, 80);
    this.enemy = new EnemyState("Skull", 30);

    this.demon = this.add.sprite(width * 0.25, height * 0.5, "char-demon-idle");
    this.demon.play("char-demon-idle");

    this.skull = this.add
      .sprite(width * 0.75, height * 0.5, "enemy-skull-idle")
      .setFlipX(true);
    this.skull.play("enemy-skull-idle");

    this.playerHpBar = new HpBar(this, width * 0.1, height * 0.9, 200, 24);
    this.playerHpBar.setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
    this.playerHpBar.setPercent(this.player.hpPercent);
    this.playerHpBar.setDepth(10);

    this.enemyHpBar = new HpBar(this, width * 0.75, height * 0.35, 140, 18);
    this.enemyHpBar.setText(`HP: ${this.enemy.hp}/${this.enemy.maxHp}`);
    this.enemyHpBar.setPercent(this.enemy.hpPercent);
    this.enemyHpBar.setDepth(10);

    this.shieldIcon = this.add.image(width * 0.1 + 115, height * 0.9, "icon-shield");
    this.shieldIcon.setDisplaySize(20, 20);
    this.shieldIcon.setOrigin(0.5);
    this.shieldIcon.setDepth(10);
    this.shieldIcon.setVisible(false);

    this.shieldText = this.add
      .text(width * 0.1 + 130, height * 0.9, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#66ccff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setDepth(10);

    this.handUI = new HandUI(this, (card) => this.playCard(card));

    this.endTurnBtn = this.add
      .text(width - 80, height - 30, "[ End Turn ]", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#888888",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);

    this.endTurnBtn.on("pointerover", () =>
      this.endTurnBtn.setColor("#ffffff"),
    );
    this.endTurnBtn.on("pointerout", () => this.endTurnBtn.setColor("#888888"));
    this.endTurnBtn.on("pointerdown", () => this.endPlayerTurn());

    this.combo = new Combo();
    this.comboHud = new ComboHud(this);

    this.deck = new DeckState(getStarterDeck());
    this.startPlayerTurn();
  }

  private startPlayerTurn(): void {
    this.playerTurn = true;
    this.endTurnBtn.setAlpha(1);
    this.player.clearShield();
    this.updateShieldDisplay();
    this.combo.reset();
    this.comboHud.hide();
    this.drawHand();
  }

  private drawHand(): void {
    this.deck.draw(5);
    this.refreshHand();
  }

  private refreshHand(): void {
    const canAfford = this.deck.hand.map((c) => canPlayCard(c, this.player));
    this.handUI.show(this.deck.hand, canAfford, this.combo.nextCost);
  }

  private playCard(card: Card): void {
    if (!this.playerTurn) return;
    if (!canPlayCard(card, this.player)) return;

    const comboResult = this.combo.recordPlay(card.cost);
    const comboBonus = comboResult.advanced ? 1 : 0;

    this.player.takeDamage(card.cost);
    const result = applyCardEffect(card, this.player, this.enemy, comboBonus);

    this.deck.discard(card);

    if (this.sound.get("sfx-attack-soft")) {
      this.sound.play("sfx-attack-soft");
    }

    if (result.damageDealt > 0) {
      this.flashSprite(this.skull, 0xff0000);
      this.enemyHpBar.setText(`HP: ${this.enemy.hp}/${this.enemy.maxHp}`);
      this.enemyHpBar.setPercent(this.enemy.hpPercent);
    }

    if (result.healAmount > 0) {
      this.flashSprite(this.demon, 0x00ff00);
      this.healVfx(this.demon.x, this.demon.y);
      if (this.cache.audio.exists("sfx-attack-fire")) {
        this.sound.play("sfx-attack-fire");
      }
    }

    if (result.blockGained > 0) {
      this.blockVfx(this.demon.x, this.demon.y);
      if (this.cache.audio.exists("sfx-attack-fire")) {
        this.sound.play("sfx-attack-fire");
      }
    }

    if (comboResult.advanced) {
      const pos = this.handUI.lastPlayedPosition;
      this.goldBurst(pos.x, pos.y);
    }
    this.comboHud.show(this.combo.tier);

    this.playerHpBar.setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
    this.playerHpBar.setPercent(this.player.hpPercent);
    this.updateShieldDisplay();

    this.refreshHand();

    if (this.enemy.hp <= 0) {
      this.onVictory();
    } else if (this.player.hp <= 0) {
      this.onDefeat();
    } else if (this.deck.hand.length === 0) {
      this.endPlayerTurn();
    }
  }

  private endPlayerTurn(): void {
    if (!this.playerTurn) return;
    this.playerTurn = false;
    this.endTurnBtn.setAlpha(0.4);
    this.handUI.clear();
    this.deck.discardAll();

    this.time.delayedCall(600, () => this.enemyTurn());
  }

  private enemyTurn(): void {
    if (this.enemy.hp <= 0 || this.player.hp <= 0) return;

    this.skull.play("enemy-skull-attack");
    this.skull.once("animationcomplete", () => {
      this.skull.play("enemy-skull-idle");

      if (this.sound.get("sfx-player-damage")) {
        this.sound.play("sfx-player-damage");
      }

      this.player.takeDamage(8);
      this.flashSprite(this.demon, 0xff0000);
      this.playerHpBar.setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
      this.playerHpBar.setPercent(this.player.hpPercent);
      this.updateShieldDisplay();

      if (this.player.hp <= 0) {
        this.onDefeat();
      } else {
        this.time.delayedCall(400, () => this.startPlayerTurn());
      }
    });
  }

  private healVfx(x: number, y: number): void {
    const circle = this.add.graphics();
    circle.setDepth(30);
    circle.fillStyle(0x00ff66, 0.6);
    circle.fillCircle(x, y, 10);
    this.tweens.add({
      targets: circle,
      alpha: 0,
      duration: 500,
      onUpdate: (tween) => {
        circle.clear();
        const radius = 10 + tween.progress * 50;
        circle.fillStyle(0x00ff66, 0.6 * (1 - tween.progress));
        circle.fillCircle(x, y, radius);
      },
      onComplete: () => circle.destroy(),
    });
  }

  private updateShieldDisplay(): void {
    if (this.player.shield > 0) {
      this.shieldIcon.setVisible(true);
      this.shieldText.setText(`${this.player.shield}`);
    } else {
      this.shieldIcon.setVisible(false);
      this.shieldText.setText("");
    }
  }

  private blockVfx(x: number, y: number): void {
    const circle = this.add.graphics();
    circle.setDepth(30);
    circle.fillStyle(0x6644cc, 0.5);
    circle.fillCircle(x, y, 15);
    this.tweens.add({
      targets: circle,
      alpha: 0,
      duration: 600,
      onUpdate: (tween) => {
        circle.clear();
        const radius = 15 + tween.progress * 40;
        circle.fillStyle(0x6644cc, 0.5 * (1 - tween.progress));
        circle.fillCircle(x, y, radius);
      },
      onComplete: () => circle.destroy(),
    });
  }

  private goldBurst(x: number, y: number): void {
    const circle = this.add.graphics();
    circle.setDepth(35);
    circle.fillStyle(0xffd700, 0.7);
    circle.fillCircle(x, y, 8);
    this.tweens.add({
      targets: circle,
      alpha: 0,
      duration: 400,
      onUpdate: (tween) => {
        circle.clear();
        const radius = 8 + tween.progress * 30;
        circle.fillStyle(0xffd700, 0.7 * (1 - tween.progress));
        circle.fillCircle(x, y, radius);
      },
      onComplete: () => circle.destroy(),
    });
  }

  private flashSprite(sprite: Phaser.GameObjects.Sprite, color: number): void {
    sprite.setTint(color);
    this.time.delayedCall(150, () => sprite.clearTint());
  }

  private onVictory(): void {
    this.handUI.clear();
    this.skull.play("enemy-skull-death");
    this.time.delayedCall(800, () => this.showEndScreen("screen-victory"));
  }

  private onDefeat(): void {
    this.handUI.clear();
    this.demon.play("char-demon-death");
    this.time.delayedCall(1200, () => this.showEndScreen("screen-loss"));
  }

  private showEndScreen(key: string): void {
    const { width, height } = this.scale;
    const bg = this.add.image(width / 2, height / 2, key);
    bg.setDisplaySize(width, height);
    bg.setDepth(50);
    bg.setInteractive();
    bg.on("pointerdown", () => this.scene.start("TitleScene"));
  }
}
