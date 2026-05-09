import Phaser from "phaser";
import { ManifestEntry } from "../types";
import { registerAnimations } from "../cards/AnimationFactory";
import { PlayerState } from "../state/PlayerState";
import { HpBar } from "../ui/HpBar";

export class CombatScene extends Phaser.Scene {
  private player!: PlayerState;
  private playerHpBar!: HpBar;

  constructor() {
    super("CombatScene");
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#1a0a0a");

    const manifest = this.registry.get("assets") as ManifestEntry;
    registerAnimations(this.anims, manifest.spritesheets);

    this.player = new PlayerState(80, 80);

    const demon = this.add.sprite(width * 0.25, height * 0.5, "char-demon-idle");
    demon.play("char-demon-idle");

    this.playerHpBar = new HpBar(this, width * 0.25, height * 0.85, "bar-big-base", "bar-big-fill");
    this.playerHpBar.setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
    this.playerHpBar.setPercent(this.player.hpPercent);
    this.playerHpBar.setDepth(10);
  }
}
