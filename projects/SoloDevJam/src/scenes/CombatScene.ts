import Phaser from "phaser";
import { ManifestEntry } from "../types";
import { registerAnimations } from "../cards/AnimationFactory";
import { getStarterDeck } from "../cards/cards";
import { PlayerState } from "../state/PlayerState";
import { EnemyState } from "../state/EnemyState";
import { DeckState } from "../state/DeckState";
import { HpBar } from "../ui/HpBar";
import { HandUI } from "../ui/HandUI";

export class CombatScene extends Phaser.Scene {
  private player!: PlayerState;
  private playerHpBar!: HpBar;
  private enemy!: EnemyState;
  private enemyHpBar!: HpBar;
  private deck!: DeckState;
  private handUI!: HandUI;

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

    const demon = this.add.sprite(
      width * 0.25,
      height * 0.5,
      "char-demon-idle",
    );
    demon.play("char-demon-idle");

    const skull = this.add.sprite(
      width * 0.75,
      height * 0.5,
      "enemy-skull-idle",
    );
    skull.play("enemy-skull-idle");

    this.playerHpBar = new HpBar(this, width * 0.1, height * 0.9, 200, 24);
    this.playerHpBar.setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
    this.playerHpBar.setPercent(this.player.hpPercent);
    this.playerHpBar.setDepth(10);

    this.enemyHpBar = new HpBar(this, width * 0.75, height * 0.35, 140, 18);
    this.enemyHpBar.setText(`HP: ${this.enemy.hp}/${this.enemy.maxHp}`);
    this.enemyHpBar.setPercent(this.enemy.hpPercent);
    this.enemyHpBar.setDepth(10);

    this.deck = new DeckState(getStarterDeck());
    this.deck.draw(5);

    this.handUI = new HandUI(this);
    this.handUI.show(this.deck.hand);
  }
}
