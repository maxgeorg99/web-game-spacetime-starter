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

    this.skull = this.add.sprite(width * 0.75, height * 0.5, "enemy-skull-idle");
    this.skull.play("enemy-skull-idle");

    this.playerHpBar = new HpBar(this, width * 0.1, height * 0.9, 200, 24);
    this.playerHpBar.setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
    this.playerHpBar.setPercent(this.player.hpPercent);
    this.playerHpBar.setDepth(10);

    this.enemyHpBar = new HpBar(this, width * 0.75, height * 0.35, 140, 18);
    this.enemyHpBar.setText(`HP: ${this.enemy.hp}/${this.enemy.maxHp}`);
    this.enemyHpBar.setPercent(this.enemy.hpPercent);
    this.enemyHpBar.setDepth(10);

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

    this.endTurnBtn.on("pointerover", () => this.endTurnBtn.setColor("#ffffff"));
    this.endTurnBtn.on("pointerout", () => this.endTurnBtn.setColor("#888888"));
    this.endTurnBtn.on("pointerdown", () => this.endPlayerTurn());

    this.deck = new DeckState(getStarterDeck());
    this.startPlayerTurn();
  }

  private startPlayerTurn(): void {
    this.playerTurn = true;
    this.endTurnBtn.setAlpha(1);
    this.drawHand();
  }

  private drawHand(): void {
    this.deck.draw(5);
    this.refreshHand();
  }

  private refreshHand(): void {
    const canAfford = this.deck.hand.map((c) => canPlayCard(c, this.player));
    this.handUI.show(this.deck.hand, canAfford);
  }

  private playCard(card: Card): void {
    if (!this.playerTurn) return;
    if (!canPlayCard(card, this.player)) return;

    this.player.takeDamage(card.cost);
    const result = applyCardEffect(card, this.player, this.enemy);

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
    }

    this.playerHpBar.setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
    this.playerHpBar.setPercent(this.player.hpPercent);

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

      if (this.player.hp <= 0) {
        this.onDefeat();
      } else {
        this.time.delayedCall(400, () => this.startPlayerTurn());
      }
    });
  }

  private flashSprite(
    sprite: Phaser.GameObjects.Sprite,
    color: number,
  ): void {
    sprite.setTint(color);
    this.time.delayedCall(150, () => sprite.clearTint());
  }

  private onVictory(): void {
    this.handUI.clear();
    this.skull.play("enemy-skull-death");
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, "VICTORY", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "48px",
        color: "#e0c060",
      })
      .setOrigin(0.5)
      .setDepth(50);
  }

  private onDefeat(): void {
    this.handUI.clear();
    this.demon.play("char-demon-death");
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, "DEFEATED", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "48px",
        color: "#ff4040",
      })
      .setOrigin(0.5)
      .setDepth(50);
  }
}
